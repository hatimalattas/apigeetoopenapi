import * as unzip from 'node-unzip-2';
import genopenapi from './proxy2openapi.js';
import glob from 'glob';
import async from 'async';
import path from 'path';
import fs from 'fs';

function fetchProxy(options, cb) {
  if (options.file && options.api && options.proxyEndPoint) {
    // process local proxy bundle to generate openapi spec
    fetchProxyLocal(options, cb);
  }
}

function fetchProxyLocal(options, cb) {
  if (!options.destination) {
    options.destination = path.join(__dirname, '../api_bundles') + '/' + options.api;
  }
  generateOpenapi(options, cb);
}

function generateOpenapi(options, cb) {
  // Unzip folder.....
  const stream = fs.createReadStream(options.file).pipe(unzip.Extract({ path: options.destination }));
  let hadError = false;
  stream.on('error', function (err) {
    hadError = true;
    return cb(err, {});
  });
  stream.on('close', function () {
    if (!hadError) {
      if (options.password) {
        delete options['password'];
      }
      glob(options.destination + '/apiproxy/proxies' + '/*.xml', options, function (er, files) {
        async.each(
          Object.keys(files),
          function (i, callback) {
            genopenapi(options.destination, options, files[i], function (err) {
              if (err) {
                callback(err, {});
              } else {
                callback(null, {});
              }
            });
          },
          function (err) {
            // if any of the file processing produced an error, err would equal that error
            if (err) {
              cb(err, {});
            } else {
              cb(null, {});
            }
          }
        );
      });
    }
  });
}

export default fetchProxy;
