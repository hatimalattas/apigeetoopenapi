import { Command } from 'commander';
import fetch from './fetchApi.js';

const program = new Command();

program
  .usage('<options>')
  .option('-d, --destination <file>', 'API Bundle destination location....')
  .option('-l, --local <file>', 'Use local API bundle')
  .option('-n, --name <API name>', 'API proxy name. Required if local bundle is used')
  .option('-e, --endpoint <API proxy endpoint>', 'API proxy endpoint e.g. https://api.exmaple.com. Required if local bundle is used.')
  .option('-a, --auth <type>', 'Specify the authentication type (basic, apiKey, oauth2, none).')

  .description('Generates openapi 3.0.0 Spec from Apigee Proxy');

program.parse(process.argv);

const options = {};
options.destination = program.destination;
options.file = program.local;
options.api = program.name;
options.proxyEndPoint = program.endpoint;
options.authType = program.auth;

fetch(options, function (err) {
  if (err) {
    console.log(err);
  }
  else {
    // nothing for now..
  }
});
