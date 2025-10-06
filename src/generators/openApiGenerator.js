import { OPENAPI_VERSION, CONTENT_TYPES } from '../constants/openapi.js';
import { TypeUtils } from '../utils/typeUtils.js';

/**
 * OpenAPI Generator - creates OpenAPI specification
 */
export class OpenApiGenerator {
  constructor() {
    this.openapiJson = {};
  }

  /**
   * Initialize OpenAPI structure
   * @param {Object} apiInfo - API information
   * @param {Array} servers - Server configurations
   * @returns {Object} Initialized OpenAPI object
   */
  initialize(apiInfo, servers = []) {
    this.openapiJson = {
      openapi: OPENAPI_VERSION,
      info: {
        description: apiInfo.description,
        title: apiInfo.title,
        version: apiInfo.version || ''
      },
      servers: servers,
      paths: {}
    };

    return this.openapiJson;
  }

  /**
   * Add server configuration
   * @param {Array} baseUrls - Array of base URLs
   * @param {string} basePath - API base path
   */
  addServers(baseUrls, basePath) {
    const servers = [];

    for (const baseUrl of baseUrls) {
      try {
        const url = new URL(baseUrl);
        const protocol = url.protocol.slice(0, -1); // Remove trailing ':'
        servers.push({
          url: `${protocol}://${url.host}${basePath}`
        });
      } catch (error) {
        console.warn(`Invalid base URL: ${baseUrl}`);
      }
    }

    this.openapiJson.servers = servers;
  }

  /**
   * Add path to OpenAPI spec
   * @param {string} path - API path
   * @param {string} method - HTTP method
   * @param {Object} operation - Operation details
   */
  addPath(path, method, operation) {
    if (!this.openapiJson.paths[path]) {
      this.openapiJson.paths[path] = {};
    }

    this.openapiJson.paths[path][method] = operation;
  }

  /**
   * Generate response schema from JSON payload
   * @param {string} payload - JSON payload string
   * @param {string} contentType - Content type
   * @returns {Object} OpenAPI response schema
   */
  generateResponseSchema(payload, contentType) {
    try {
      const jsonObject = JSON.parse(payload);
      return {
        description: 'Successful Operation',
        content: {
          [contentType]: {
            schema: this.generateSchemaFromJson(jsonObject),
            example: jsonObject
          }
        }
      };
    } catch (error) {
      console.warn('Failed to parse JSON payload:', error.message);
      return {
        description: 'Successful Operation'
      };
    }
  }

  /**
   * Generate schema from JSON object
   * @param {any} jsonObject - JSON object
   * @returns {Object} OpenAPI schema
   */
  generateSchemaFromJson(jsonObject) {
    if (typeof jsonObject !== 'object' || jsonObject === null) {
      return { type: TypeUtils.getType(jsonObject) };
    }

    const schema = {};
    if (Array.isArray(jsonObject)) {
      schema.type = 'array';
      schema.items = jsonObject.length > 0 ? this.generateSchemaFromJson(jsonObject[0]) : {};
    } else {
      schema.type = 'object';
      schema.properties = {};
      for (const key in jsonObject) {
        schema.properties[key] = this.generateSchemaFromJson(jsonObject[key]);
      }
    }
    return schema;
  }

  /**
   * Get the complete OpenAPI specification
   * @returns {Object} Complete OpenAPI spec
   */
  getSpec() {
    return this.openapiJson;
  }
}