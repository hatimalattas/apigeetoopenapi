import * as unzip from 'node-unzip-2';
import { Converter } from './src/index.js';
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
  let callbackCalled = false;

  stream.on('error', function (err) {
    hadError = true;
    if (!callbackCalled) {
      callbackCalled = true;
      return cb(err, {});
    }
  });

  stream.on('close', function () {
    if (!hadError && !callbackCalled) {
      callbackCalled = true;
      // Add a small delay to ensure files are fully written
      setTimeout(() => {
        processApiProxyDirectory(path.join(options.output, 'apiproxy'), options, cb);
      }, 100);
    }
  });
}

async function processApiProxyDirectory(apiproxyPath, options, cb) {
  try {
    const globPattern = apiproxyPath + '/proxies/*.xml';

    if (options.verbose) {
      console.log(`Searching for proxy files in: ${globPattern}`);
    }

    const files = await new Promise((resolve, reject) => {
      glob(globPattern, {}, function (er, files) {
        if (er) reject(er);
        else resolve(files);
      });
    });

    if (options.verbose) {
      console.log(`Found ${files.length} proxy files:`, files);
    }

    if (files.length === 0) {
      return cb(new Error('No proxy files found'), {});
    }

    // Process all proxy files and collect specifications
    const converter = new Converter();
    const specifications = [];

    for (const file of files) {
      try {
        const spec = await converter.convert(apiproxyPath, options, file);
        specifications.push(spec);
      } catch (error) {
        if (options.verbose) {
          console.warn(`Failed to process proxy file ${file}:`, error.message);
        }
      }
    }

    if (specifications.length === 0) {
      return cb(new Error('No specifications could be generated'), {});
    }

    if (options.verbose) {
      console.log(`Successfully processed ${specifications.length} specifications`);
    }

    // Merge all specifications into one
    const mergedSpec = mergeOpenAPISpecifications(specifications, options);

    // Save merged specification
    const outputPath = `${options.output}/openapi.json`;
    await converter.saveToFile(mergedSpec, outputPath);

    cb(null, {});
  } catch (error) {
    cb(error, {});
  }
}

/**
 * Merge multiple OpenAPI specifications into a single specification
 * @param {Array} specifications - Array of OpenAPI specification objects
 * @param {Object} options - Options object
 * @returns {Object} Merged OpenAPI specification
 */
function mergeOpenAPISpecifications(specifications, options) {
  if (specifications.length === 1) {
    return specifications[0];
  }

  // Use first specification as base
  const baseSpec = JSON.parse(JSON.stringify(specifications[0]));

  // Initialize components if not present
  if (!baseSpec.components) {
    baseSpec.components = {};
  }
  if (!baseSpec.components.securitySchemes) {
    baseSpec.components.securitySchemes = {};
  }

  // Merge paths from all specifications
  for (let i = 1; i < specifications.length; i++) {
    const spec = specifications[i];

    // Merge paths
    if (spec.paths) {
      Object.keys(spec.paths).forEach(path => {
        if (baseSpec.paths[path]) {
          // Path exists, merge methods
          Object.keys(spec.paths[path]).forEach(method => {
            if (!baseSpec.paths[path][method]) {
              baseSpec.paths[path][method] = spec.paths[path][method];
            } else {
              console.warn(`Duplicate path and method found: ${method.toUpperCase()} ${path}. Keeping first occurrence.`);
            }
          });
        } else {
          // New path, add it
          baseSpec.paths[path] = spec.paths[path];
        }
      });
    }

    // Merge security schemes (keep first occurrence of each scheme)
    if (spec.components && spec.components.securitySchemes) {
      Object.keys(spec.components.securitySchemes).forEach(schemeKey => {
        if (!baseSpec.components.securitySchemes[schemeKey]) {
          baseSpec.components.securitySchemes[schemeKey] = spec.components.securitySchemes[schemeKey];
        }
      });
    }
  }

  return baseSpec;
}

export default fetchProxy;
