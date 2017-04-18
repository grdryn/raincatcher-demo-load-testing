'use strict';

const recordUtils = require('./generate_record');
const makeSyncBody = require('./fixtures/makeSyncBody');
const sync = require('./sync');
const Promise = require('bluebird');
const _ = require('lodash');

function isApplied(hash, syncResult) {
  console.log(`Expected Hash: ${hash}`);
  return _.find(_.get(syncResult, 'updates.applied', {}), {'hash': hash}) || false;
}

function syncLoop(mainFn, compareFn, interval, initialSyncResult) {
  return new Promise(resolve => {

    function next(previousResult) {
      return mainFn(previousResult).then(result => {
        if (compareFn(result)) {
          return resolve(result);
        } else {
          return Promise.delay(interval).then(() => next(result));
        }
      });
    }

    return next(initialSyncResult);
  })
  // Loop for a max of 5 minutes
    .timeout(300000);
}

module.exports = function createRecord(baseUrl, request, clientId, dataset, postData, preDataAndHash, dataset_hash, query_params, acknowledgements, action) {

  const pending = [recordUtils.generateRecord(postData, preDataAndHash, {}, action)];
  const payload = makeSyncBody(dataset, clientId, dataset_hash, query_params, pending, acknowledgements);

  // This just partially applies sync so that it can be passed to the sync loop in the `.then` below
  const syncp = sync.bind(null, request, `${baseUrl}/mbaas/sync/${dataset}`, makeSyncBody(dataset, clientId, dataset_hash, query_params, null, acknowledgements));

  return sync(request, `${baseUrl}/mbaas/sync/${dataset}`, payload)
  // then loop until server says it applied the changes
  // TODO: should *all* datasets be synced as part of this loop, or is just the relevant one enough?
    .then(syncDatasetResult => syncLoop(syncp, isApplied.bind(null, payload.pending[0].hash), 5000, syncDatasetResult));
};
