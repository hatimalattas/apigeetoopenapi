import { Converter } from './converter.js';

/**
 * Main function to generate OpenAPI specification from Apigee proxy
 * @param {string} location - Directory path containing Apigee proxy
 * @param {Object} options - Conversion options
 * @param {string} xmlFile - Path to proxy endpoint XML file
 * @param {Function} callback - Callback function
 */
async function genopenapi(location, options, xmlFile, callback) {
  try {
    const converter = new Converter();

    // Convert Apigee proxy to OpenAPI spec
    const spec = await converter.convert(location, options, xmlFile);

    // Save to file
    const outputPath = `${options.output}/openapi.json`;
    await converter.saveToFile(spec, outputPath);

    callback(null, {});
  } catch (error) {
    console.error('Conversion failed:', error.message);
    callback(error, {});
  }
}

export default genopenapi;