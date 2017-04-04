#!/usr/bin/env node
'use strict';

const rp = require('request-promise');
const yargopts = require('../util/yargopts');

function run(argv) {
  const request = rp.defaults({
    json: true
  });

  console.log('Calling Reset Data endpoint...');
  return request({
    url: `${argv.app}/admin/data`,
    method: 'DELETE'
  })
  // send delete request
  .then(() => console.log('Reset Data call successful'))
  .catch((err, response) => console.error('Reset Data call failed', err, response));

  // TODO: change this to login beforehand (see util/login) if endpoint
  // is changed to require authentication
}

// https://nodejs.org/docs/latest/api/all.html#modules_accessing_the_main_module
if (require.main === module) {
  // configure request to app url
  const appConfig = yargopts.app;
  const argv = require('yargs')
    .reset()
    .option('app', appConfig)
    .argv;
  return run(argv);
}

module.exports = run.bind(null, yargopts.argv);
