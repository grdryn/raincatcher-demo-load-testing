'use strict';

module.exports = function makeWorkorder(userId, workflowId) {
  return {
    assignee: userId,
    title: `Load test workorder for ${userId}`,
    type: "Job Order",
    status: "New",
    workflowId: workflowId,
    address: "The Moon, Earth Orbit",
    location: [4, 4],
    summary: "Do the work",
    startTimestamp: "2018-02-23T00:00:00Z",
    finishTimestamp: "2029-02-23T00:00:00Z"
  };
};
