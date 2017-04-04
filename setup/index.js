#!/usr/bin/env node
'use strict';
const usersWorkorders = require('./usersWorkorders');
const dataReset = require('./dataReset');

dataReset().then(usersWorkorders);
