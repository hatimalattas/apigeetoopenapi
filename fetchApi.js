var inquirer = require('inquirer');
var pathLib = require('path');
var unzip = require('node-unzip-2');
var fs = require('fs');
var proxy = require('./proxy2openapi.js');
var glob = require('glob');
var async = require('async');

module.exports = {
  fetchProxy: fetchProxy
};

function fetchProxy(options, cb) {
  if (options.file && options.api && options.proxyEndPoint) {
    // process local proxy bundle to generate openapi spec
    fetchProxyLocal(options, cb)
  }
}

function fetchProxyLocal(options, cb) {
  if (!options.destination) {
    options.destination = pathLib.join(__dirname, '../api_bundles') + "/" + options.api;
  }
  generateOpenapi(options, cb)
}

function generateOpenapi(options, cb) {
  // Unzip folder.....
  var stream = fs.createReadStream(options.file).pipe(unzip.Extract({ path: options.destination }));
  var had_error = false;
  stream.on('error', function (err) {
    had_error = true;
    return cb(err, {});
  });
  stream.on('close', function () {
    if (!had_error) {
      if (options.password)
        delete options['password'];

      // generate openapi...
      // Generate multiple openapi files based on number of files in proxies.
      // Read through proxy files..
      glob(options.destination + "/apiproxy/proxies" + "/*.xml", options, function (er, files) {
        async.each(Object.keys(files), function (i, callback) {
          proxy.genopenapi(options.destination, options, files[i], function (err, reply) {
            if (err) {
              callback(err, {});
            } else {
              callback(null, {});
            }

          });
        }, function (err) {
          // if any of the file processing produced an error, err would equal that error
          if (err) {
            cb(err, {})
          }
          else {
            cb(null, {});
          }
        });
      });
    }
  });
}
