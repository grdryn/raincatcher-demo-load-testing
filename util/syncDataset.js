'use strict';

const _ = require('lodash');

function getUpdatedClientRecs(inRecs, syncRecordsResponse) {
  const deletedRecs = _.keys(syncRecordsResponse.delete);
  const createdRecs = _.transform(_.filter(syncRecordsResponse.create, rec => rec.data.id), (acc, rec) => acc[rec.data.id] = rec.hash, {});
  const updatedRecs = _.transform(_.filter(syncRecordsResponse.update, rec => rec.data.id), (acc, rec) => acc[rec.data.id] = rec.hash, {});
  const outRecs = _.merge(_.omit(inRecs, deletedRecs), createdRecs, updatedRecs);

  return outRecs;
}

module.exports = function syncDataset(baseUrl, request, clientId, dataset, clientRecs, query_params) {

  const payload = {
    fn: 'syncRecords',
    dataset_id: dataset,
    query_params: query_params || {},
    meta_data: {
      clientIdentifier: clientId
    },
    clientRecs: clientRecs || {}
  };

  return request.post({
    url: `${baseUrl}/mbaas/sync/${dataset}`,
    body: payload,
    json: true
  })
    .then(res => ({
      clientRecs: getUpdatedClientRecs(clientRecs, res),
      res: res
    }));
};
