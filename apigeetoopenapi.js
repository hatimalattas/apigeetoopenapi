#!/usr/bin/env node

import { Command } from 'commander';
import fetch from './fetchApi.js';

const program = new Command();

program
  .usage('<options>')
  .option('-o, --output <file>', 'Outout path for the openapi spec')
  .option('-i, --input <file>', 'Path to your bundle.zip file or apiproxy directory')
  .option('-n, --name <API name>', 'API proxy name. Required if local bundle is used')
  .option('-b, --baseUrl <API proxy base URL>', 'One or more API proxy base URLs. Required if local bundle is used. Separate multiple URLs with a comma.', commaSeparatedList)
  .option('-a, --auth <type>', 'Specify the authentication type (basic, apiKey, oauth2, none).')
  .option('-t, --tokenUrl <tokenUrl>', 'OAuth2 token URL (https://example.com/token). Required if auth type is oauth2.')
  .description('Generates openapi 3.0.0 Spec from Apigee Proxy');

program.parse(process.argv);
const options = program.opts();

checkRequiredOptions();

fetch(options, function (err) {
  if (err) {
    console.log(err);
  }
  else {
    // nothing for now..
  }
});

function checkRequiredOptions() {
  if (!options.output) {
    console.log('Output  direcotry path is required');
    process.exit(1);
  }
  if (!options.input) {
    console.log('Input file path is required');
    process.exit(1);
  }
  if (!options.name) {
    console.log('API name is required');
    process.exit(1);
  }
  if (!options.baseUrl) {
    console.log('API proxy base URL is required');
    process.exit(1);
  }
  if (!options.auth) {
    console.log('Authentication type is required');
    process.exit(1);
  }
  if (options.auth === 'oauth2' && !options.tokenUrl) {
    console.log('Token URL is required for OAuth2 authentication');
    process.exit(1);
  }
}

function commaSeparatedList(value, dummyPrevious) {
  return value.split(',');
}
