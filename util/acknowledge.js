'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

function getCreatedRecord(syncResponse, syncRecordsResponse) {
  console.log(`syncResponse: ${JSON.stringify(syncResponse)}`);
  console.log(`syncRecordsResponse: ${JSON.stringify(syncRecordsResponse)}`);
  const newAndUpdated = _.merge(_.get(syncRecordsResponse, 'res.create', {}),
                                _.get(syncRecordsResponse, 'res.update', {}));

  console.log(`newandupdated: ${JSON.stringify(newAndUpdated)}`);
  console.log(`returning: ${_.find(newAndUpdated, r => r.data.id === _.map(syncResponse.updates.applied, a => a.uid)[0]) || {data: {}}}`);
  return _.find(newAndUpdated, r => r.data.id === _.map(syncResponse.updates.applied, a => a.uid)[0]) || {data: {}};
}

module.exports = function acknowledge(sync, syncRecords, makeSyncBody, baseUrl, clientId, datasets, dataset, incomingClientRecs, incomingSyncResponse) {

  const datasetUrl = `${baseUrl}/mbaas/sync/${dataset}`;
  console.log('---');
  console.log(datasetUrl);
  console.log('---');
  console.log(incomingClientRecs);
  console.log('---');

  return syncRecords(dataset, incomingClientRecs)

    .then(syncRecordsResponse => Promise.all([
      Promise.resolve(incomingSyncResponse),
      Promise.resolve(getCreatedRecord(incomingSyncResponse, syncRecordsResponse)),
      Promise.resolve(syncRecordsResponse.clientRecs)
    ]))

    .spread((syncResponse, createdRecord, clientRecs) => Promise.all([
      sync(datasetUrl, makeSyncBody(dataset, clientId, syncResponse.hash, {}, [], _.values(_.get(syncResponse, 'updates.applied')))),
      Promise.resolve(createdRecord),
      Promise.resolve(clientRecs)
    ]))

    .spread((syncResponse, createdRecord, clientRecs) =>
            syncRecords(dataset, clientRecs)
            .then(doSyncRecordsResult => Promise.all([
              Promise.resolve(syncResponse),
              Promise.resolve(createdRecord),
              Promise.resolve(doSyncRecordsResult.clientRecs)
            ])))

    .spread((syncResponse, createdRecord, clientRecs) => Promise.all([
      sync(datasetUrl, makeSyncBody(dataset, clientId, syncResponse.hash, {}, [], _.values(_.get(syncResponse, 'updates.applied')))),
      Promise.resolve(createdRecord),
      Promise.resolve(clientRecs)
    ]));
};
