import { PARAMETER_LOCATIONS, CONTENT_TYPES } from '../constants/openapi.js';
import { TypeUtils } from '../utils/typeUtils.js';

/**
 * Parameter Generator - creates OpenAPI parameters and request bodies
 */
export class ParameterGenerator {
  /**
   * Add parameters and request body to operation
   * @param {Array} paramArr - Array of parameters
   * @param {string} openapiType - Type of parameter (header, query, formData, requestBody)
   * @param {Object} operation - OpenAPI operation object
   * @param {string|boolean} ignoreUnresolvedVariables - Whether variables are optional
   */
  static addParametersAndRequestBody(paramArr, openapiType, operation, ignoreUnresolvedVariables) {
    // Check if paramArr is valid
    if (!paramArr || !Array.isArray(paramArr) || paramArr.length === 0) {
      return;
    }

    const isRequired = ignoreUnresolvedVariables !== 'true';

    if (openapiType === 'requestBody') {
      this.addRequestBody(paramArr, operation, isRequired);
    } else {
      this.addParameters(paramArr, openapiType, operation, isRequired);
    }
  }

  /**
   * Add request body to operation
   * @param {Array} paramArr - Array of parameters
   * @param {Object} operation - OpenAPI operation object
   * @param {boolean} isRequired - Whether the request body is required
   */
  static addRequestBody(paramArr, operation, isRequired) {
    if (!operation.requestBody) {
      operation.requestBody = {
        required: isRequired,
        content: {
          [CONTENT_TYPES.JSON]: {
            schema: {
              type: 'object',
              properties: {},
              required: []
            }
          }
        }
      };
    }

    const requestBodySchema = operation.requestBody.content[CONTENT_TYPES.JSON].schema;

    paramArr.forEach(param => {
      const paramName = param.$.name;
      const paramType = TypeUtils.convertType(param.$.type);
      const description = param.$.description || '';
      const placeholder = param.$.placeholder || '';

      this.addNestedProperty(requestBodySchema, paramName, {
        type: paramType,
        description,
        example: placeholder
      }, isRequired);
    });
  }

  /**
   * Add parameters to operation
   * @param {Array} paramArr - Array of parameters
   * @param {string} location - Parameter location (header, query, etc.)
   * @param {Object} operation - OpenAPI operation object
   * @param {boolean} isRequired - Whether parameters are required
   */
  static addParameters(paramArr, location, operation, isRequired) {
    if (!operation.parameters) {
      operation.parameters = [];
    }

    paramArr.forEach(param => {
      const paramName = param.$.name;
      const paramType = TypeUtils.convertType(param.$.type);
      const description = param.$.description || '';
      const placeholder = param.$.placeholder || '';

      const parameterObj = {
        name: paramName,
        in: location,
        description,
        required: isRequired,
        schema: {
          type: paramType
        },
        example: placeholder
      };

      operation.parameters.push(parameterObj);
    });
  }

  /**
   * Add nested property to schema (for request body)
   * @param {Object} schema - Schema object
   * @param {string} propertyPath - Dot-separated property path
   * @param {Object} propertyDef - Property definition
   * @param {boolean} isRequired - Whether property is required
   */
  static addNestedProperty(schema, propertyPath, propertyDef, isRequired) {
    const properties = propertyPath.split('.');
    let currentSchema = schema;

    properties.forEach((property, index) => {
      const isLastProperty = index === properties.length - 1;

      if (!currentSchema.properties[property]) {
        currentSchema.properties[property] = isLastProperty
          ? propertyDef
          : {
            type: 'object',
            properties: {},
            required: []
          };
      }

      if (isRequired && isLastProperty) {
        if (!currentSchema.required.includes(property)) {
          currentSchema.required.push(property);
        }
      }

      if (!isLastProperty) {
        currentSchema = currentSchema.properties[property];
      }
    });
  }

  /**
   * Extract path parameters from path string
   * @param {string} path - API path with parameters
   * @returns {Array} Array of path parameters
   */
  static extractPathParameters(path) {
    const paramRegex = /\{([^}]+)\}/g;
    const parameters = [];
    let match;

    while ((match = paramRegex.exec(path)) !== null) {
      parameters.push({
        name: match[1],
        in: PARAMETER_LOCATIONS.PATH,
        required: true,
        schema: {
          type: 'string'
        }
      });
    }

    return parameters;
  }
}