'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const configureRequest = require('../util/configureRequest');
const sync = require('../util/sync');
const syncDataset = require('../util/syncDataset');
const createRecord = require('../util/createRecord');
const promiseAct = require('../util/promiseAct');
const makeSyncBody = require('../util/fixtures/makeSyncBody');
const makeResult = require('../util/fixtures/makeResult');
const queryParams = require('../util/fixtures/queryParams');
const acknowledge = require('../util/acknowledge');

module.exports = function mobileFlow(runner, argv, clientId) {
  return function mobileFlowAct(sessionToken) {
    runner.actStart('Mobile Flow');

    const baseUrl = argv.app;
    const request = configureRequest(clientId, sessionToken);
    const datasets = ['workorders', 'workflows', 'messages', 'result'];

    // partially apply constant params so further calls are cleaner
    const create = createRecord.bind(this, baseUrl, request, clientId);
    const doSync = sync.bind(this, request);
    const doSyncRecords = syncDataset.bind(this, baseUrl, request, clientId);
    const doAcknowledge = acknowledge.bind(this, doSync, doSyncRecords, makeSyncBody, baseUrl, clientId, datasets);
    const act = promiseAct.bind(this, runner);

    const syncPromise = request.get({url: `${baseUrl}/api/wfm/user`})
          .then(users => _.find(users, {username: `loaduser${process.env.LR_RUN_NUMBER}`}))
          .then(user => act(
            'Initial sync and syncRecords dance',
            // First do a sync of each dataset
            () => Promise.all(datasets.map(ds => doSync(`${baseUrl}/mbaas/sync/${ds}`, makeSyncBody(ds, clientId, null, queryParams(user.id)[ds]))))
            // Then do a syncRecords for each datasets (no clientRecs yet)
              .then(() => Promise.all(datasets.map(ds => doSyncRecords(ds, {}, queryParams(user.id)[ds]))))
              .map(dsResponse => dsResponse.clientRecs)
            // Then do another sync of each dataset
              .then(clientRecs => Promise.all([
                Promise.all(datasets.map(ds => doSync(`${baseUrl}/mbaas/sync/${ds}`, makeSyncBody(ds, clientId, null, queryParams(user.id)[ds])))),
                Promise.resolve(clientRecs)
              ]))
            // Then do another syncRecords, this time with clientRecs
              .spread((syncResults, clientRecs) => Promise.all([
                // TODO: in the browser, I see a hash in the response from syncRecords, but not here in the script
                Promise.resolve(_.zipObject(datasets, syncResults.map(x => x.hash))),
                Promise.all(datasets.map(ds => doSyncRecords(ds, clientRecs[datasets.indexOf(ds)], queryParams(user.id)[ds]))),
                Promise.resolve(user)
              ]))));

    return syncPromise.spread((hashes, clientRecs, user) => Promise.all([
      Promise.resolve(hashes),
      Promise.resolve(clientRecs),
      Promise.resolve(user),

      doSyncRecords('workorders', {}, queryParams(user.id).workorders)
        .then(workorders => _.keys(workorders.clientRecs)[0])
    ]))

      .spread(
        (hashes, clientRecs, user, myWorkorderId) =>
          act('Device: create New Result', () => {
            console.log(`CLIENTRECS: ${JSON.stringify(clientRecs)}`);
            return create('result', makeResult.createNew(), null, hashes.result, queryParams(user.id).result, [], 'create');
          })
          .then(res => doAcknowledge('result', clientRecs[datasets.indexOf('result')].clientRecs, res))

          .spread((syncResponse, createdRecord, resultDatasetClientRecs) => act('Device: sync In Progress result', () =>
            // console.log(`syncResponse: ${syncResponse}`);
            // console.log(`createdRecord: ${createdRecord}`);
            // console.log(`resultDatasetClientRecs: ${resultDatasetClientRecs}`);

             create(
            'result',
            makeResult.updateInProgress(createdRecord.data.id, user.id, myWorkorderId),
            createdRecord, hashes.result, queryParams(user.id).result, [], 'update'))
                  .then(res => doAcknowledge('result', resultDatasetClientRecs, res)))

          .spread((syncResponse, updatedRecord, resultDatasetClientRecs) => act('Device: sync Complete result', () => create(
            'result',
            makeResult.updateComplete(updatedRecord.data.id, user.id, myWorkorderId),
            updatedRecord, hashes.result, queryParams(user.id).result, [], 'update'))
                  .then(res => doAcknowledge('result', resultDatasetClientRecs, res))))
      .then(() => runner.actEnd('Mobile Flow'))
      .then(() => sessionToken);
  };
};
