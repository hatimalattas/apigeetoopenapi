import * as unzip from 'node-unzip-2';
import genopenapi from './proxy2openapi.js';
import glob from 'glob';
import async from 'async';
import path from 'path';
import fs from 'fs';

function fetchProxy(options, cb) {
  if (options.input && options.name && options.baseUrl) {
    // process local proxy bundle to generate openapi spec
    fetchProxyLocal(options, cb);
  }
}

function fetchProxyLocal(options, cb) {
  if (!options.output) {
    options.output = path.join(__dirname, '../api_bundles') + '/' + options.name;
  }
  // Check if the directory is already unzipped
  const apiproxyPath = path.join(options.output, 'apiproxy');
  if (fs.existsSync(apiproxyPath)) {
    // process local proxy bundle to generate openapi spec
    processApiProxyDirectory(apiproxyPath, options, cb);
  } else {
    // Unzip folder.....
    processZippedApiProxy(options, cb);
  }
}

function processZippedApiProxy(options, cb) {
  // Unzip folder.....
  const stream = fs.createReadStream(options.input).pipe(unzip.Extract({ path: options.output }));
  let hadError = false;
  stream.on('error', function (err) {
    hadError = true;
    return cb(err, {});
  });
  stream.on('close', function () {
    if (!hadError) {
      processApiProxyDirectory(path.join(options.output, 'apiproxy'), options, cb);
    }
  });
}

function processApiProxyDirectory(apiproxyPath, options, cb) {
  glob(apiproxyPath + '/proxies/*.xml', options, function (er, files) {
    async.each(
      files,
      function (file, callback) {
        genopenapi(apiproxyPath, options, file, function (err) {
          if (err) {
            callback(err, {});
          } else {
            callback(null, {});
          }
        });
      },
      function (err) {
        if (err) {
          cb(err, {});
        } else {
          cb(null, {});
        }
      }
    );
  });
}

export default fetchProxy;
