'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const path = require('path');
const fs = Promise.promisifyAll(require('fs'));
const yargs = require('yargs');

const argv = yargs
      .reset()
      .option('dir', {
        demand: true,
        type: 'string',
        describe: 'Full path to the load-runner output directory to collect results from'
      })
      .option('csv', {
        demand: true,
        type: 'string',
        describe: 'Full path to the CSV spreadsheet file to write a new result line to'
      })
      .option('header', {
        demand: false,
        default: false,
        type: 'boolean',
        describe: 'Set this option to write the CSV header'
      })
      .argv;

function getFieldsFromFileContents(contents) {
  const pattern = _.get(contents, 'pattern', []).join('-');
  const portalRuns = _.get(_.find(contents.actions, {action: 'Portal Flow'}), 'count');
  const deviceRuns = _.get(_.find(contents.actions, {action: 'Mobile Flow'}), 'count');
  const errorCount = _.get(contents, 'errorRuns.status.total', 0) +
        _.get(contents, 'successRuns.status.error', 0);

  return parseScriptArgs(contents.invocation)
    .then(invocationArgs => ({
      'Command': contents.invocation,
      'Concurrency': contents.concurrency,
      'Total Executions': contents.numUsers,
      'Portal Executions': portalRuns,
      'Device Executions': deviceRuns,
      'Errors': errorCount,
      'Ramp up': contents.rampUp,
      'Pattern': pattern,
      'Total Completed': contents.successRuns.status.total,
      'Failed (but completed)': contents.successRuns.status.failed,
      'Completed duration min': contents.successRuns.duration.min,
      'Completed duration max': contents.successRuns.duration.max,
      'Completed duration avg': contents.successRuns.duration.avg,
      'Completed duration median': contents.successRuns.duration.median,
      'Completed duration 95th percentile': contents.successRuns.duration['95%'],
      'Completed duration 99th percentile': contents.successRuns.duration['99%'],
      'Start': contents.startTime,
      'End': contents.endTime,
      'Total duration': contents.duration,
      'Results directory': argv.dir,
      'Target host': invocationArgs.app
    }));
}

function parseScriptArgs(invocation) {
  const scriptYargs = require('./yargopts');

  const scriptArgs = invocation.split(' -- ')[1];
  const parsed = scriptYargs.parse(scriptArgs);

  return Promise.resolve(parsed);
}

function writeFieldsToCsvFile(fieldsObject, csvFile, writeHeader) {
  const header = _.keys(fieldsObject);
  const line = _.values(fieldsObject);
  const contents = writeHeader ? `${header}\n${line}\n` : `${line}\n`;
  return fs.appendFileAsync(csvFile, contents);
}

// Execution starts here
Promise.resolve(path.join(argv.dir, 'summary.json'))
  .then(fs.readFileAsync)
  .then(JSON.parse)
  .then(getFieldsFromFileContents)
  .then(fields => writeFieldsToCsvFile(fields, argv.csv, argv.header))
  .catch(console.error);
