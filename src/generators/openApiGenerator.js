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
   * Generate response schema from JSON payload. Trailing `// ...` comments
   * on a property's line become that property's OpenAPI `description`.
   */
  generateResponseSchema(payload, contentType) {
    try {
      const { stripped, descriptions } = this.parsePayloadWithComments(payload);
      const jsonObject = JSON.parse(stripped);
      return {
        description: 'Successful Operation',
        content: {
          [contentType]: {
            schema: this.generateSchemaFromJson(jsonObject, descriptions, ''),
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

  generateSchemaFromJson(jsonObject, descriptions = new Map(), currentPath = '') {
    if (typeof jsonObject !== 'object' || jsonObject === null) {
      return { type: TypeUtils.getType(jsonObject) };
    }

    const schema = {};
    if (Array.isArray(jsonObject)) {
      schema.type = 'array';
      schema.items = jsonObject.length > 0
        ? this.generateSchemaFromJson(jsonObject[0], descriptions, currentPath)
        : {};
    } else {
      schema.type = 'object';
      schema.properties = {};
      for (const key in jsonObject) {
        const childPath = currentPath ? `${currentPath}.${key}` : key;
        schema.properties[key] = this.generateSchemaFromJson(jsonObject[key], descriptions, childPath);
        const desc = descriptions.get(childPath);
        if (desc) {
          schema.properties[key].description = desc;
        }
      }
    }
    return schema;
  }

  parsePayloadWithComments(payload) {
    const descriptions = new Map();
    let stripped = '';
    let pendingKey = null;
    let lastCompletedPath = null;
    const stack = [];

    const pathFromStack = () => {
      const parts = [];
      for (const f of stack) {
        if (f.type === 'object' && f.currentKey !== null) {
          parts.push(f.currentKey);
        }
      }
      return parts.join('.');
    };

    for (let i = 0; i < payload.length; i++) {
      const ch = payload[i];
      const next = payload[i + 1];

      if (ch === '"') {
        let j = i + 1;
        let esc = false;
        while (j < payload.length) {
          const c = payload[j];
          if (esc) { esc = false; j++; continue; }
          if (c === '\\') { esc = true; j++; continue; }
          if (c === '"') {break;}
          j++;
        }
        const literal = payload.slice(i, j + 1);
        stripped += literal;
        pendingKey = literal.slice(1, -1);
        i = j;
        continue;
      }

      if (ch === '/' && next === '/') {
        let j = i + 2;
        let comment = '';
        while (j < payload.length && payload[j] !== '\n') {
          comment += payload[j];
          j++;
        }
        const trimmed = comment.trim();
        if (trimmed) {
          let target = lastCompletedPath;
          if (!target) {
            const top = stack[stack.length - 1];
            if (top && top.type === 'object' && top.currentKey !== null) {
              target = pathFromStack();
            }
          }
          if (target) {
            descriptions.set(target, trimmed);
          }
        }
        stripped += ' '.repeat(j - i);
        i = j - 1;
        continue;
      }

      if (ch === '{') {
        stack.push({ type: 'object', currentKey: null });
        pendingKey = null;
        stripped += ch;
        continue;
      }
      if (ch === '[') {
        stack.push({ type: 'array', currentKey: null });
        pendingKey = null;
        stripped += ch;
        continue;
      }
      if (ch === '}' || ch === ']') {
        const containerPath = pathFromStack();
        stack.pop();
        lastCompletedPath = containerPath || null;
        const parent = stack[stack.length - 1];
        if (parent && parent.type === 'object') {
          parent.currentKey = null;
        }
        stripped += ch;
        continue;
      }

      if (ch === ':') {
        const top = stack[stack.length - 1];
        if (top && top.type === 'object' && pendingKey !== null) {
          top.currentKey = pendingKey;
        }
        pendingKey = null;
        stripped += ch;
        continue;
      }

      if (ch === ',') {
        const top = stack[stack.length - 1];
        if (top && top.type === 'object' && top.currentKey !== null) {
          lastCompletedPath = pathFromStack();
          top.currentKey = null;
        }
        stripped += ch;
        continue;
      }

      if (ch === '\n') {
        lastCompletedPath = null;
        stripped += ch;
        continue;
      }

      stripped += ch;
    }

    return { stripped, descriptions };
  }

  /**
   * Get the complete OpenAPI specification
   * @returns {Object} Complete OpenAPI spec
   */
  getSpec() {
    return this.openapiJson;
  }
}