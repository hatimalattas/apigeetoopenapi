import { ERROR_CODES, DEFAULT_ERROR_MESSAGES, DEFAULT_TRACKING_ID } from '../constants/errorCodes.js';
import { CONTENT_TYPES } from '../constants/openapi.js';

/**
 * Error Generator - creates OpenAPI error responses
 */
export class ErrorGenerator {
  constructor() {
    this.errorCollections = this.initializeErrorCollections();
  }

  /**
   * Initialize error collections for different HTTP status codes
   * @returns {Object} Error collections by status code
   */
  initializeErrorCollections() {
    const collections = {};

    Object.entries(ERROR_CODES).forEach(([key, code]) => {
      collections[code] = [{
        code,
        message: DEFAULT_ERROR_MESSAGES[code]
      }];
    });

    return collections;
  }

  /**
   * Add error to appropriate collection
   * @param {Object} error - Error object with code and message
   */
  addError(error) {
    if (!error || !error.code || !error.message) {return;}

    const { code, message } = error;

    if (this.errorCollections[code]) {
      this.errorCollections[code].push({ code, message });
    }
  }

  /**
   * Generate error responses for all collected errors
   * @returns {Object} Error responses by status code
   */
  generateErrorResponses() {
    const responses = {};

    Object.entries(this.errorCollections).forEach(([statusCode, errors]) => {
      responses[statusCode] = this.createErrorResponse(errors);
    });

    return responses;
  }

  /**
   * Create error response for a specific status code
   * @param {Array} errorList - List of errors for this status code
   * @returns {Object} OpenAPI error response
   */
  createErrorResponse(errorList) {
    const response = {
      description: errorList.length === 1
        ? 'An error response'
        : 'A list of possible error responses',
      content: {
        [CONTENT_TYPES.JSON]: {
          schema: {}
        }
      }
    };

    if (errorList.length === 1) {
      response.content[CONTENT_TYPES.JSON].schema = this.createSingleErrorSchema(errorList[0]);
    } else {
      response.content[CONTENT_TYPES.JSON].schema = this.createMultipleErrorSchema(errorList);
      response.content[CONTENT_TYPES.JSON].examples = this.createErrorExamples(errorList);
    }

    return response;
  }

  /**
   * Create schema for single error
   * @param {Object} error - Error object
   * @returns {Object} OpenAPI schema
   */
  createSingleErrorSchema(error) {
    return {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The error code representing the type of error.'
        },
        message: {
          type: 'string',
          description: 'A message providing more details about the error.'
        },
        tracking_id: {
          type: 'string',
          description: 'A unique identifier for this error.'
        }
      },
      required: ['code', 'message', 'tracking_id'],
      example: {
        code: error.code,
        message: error.message,
        tracking_id: DEFAULT_TRACKING_ID
      }
    };
  }

  /**
   * Create schema for multiple errors
   * @param {Array} errorList - List of errors
   * @returns {Object} OpenAPI schema with oneOf
   */
  createMultipleErrorSchema(errorList) {
    return {
      oneOf: errorList.map(error => ({
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The error code representing the type of error.'
          },
          message: {
            type: 'string',
            description: 'A message providing more details about the error.'
          }
        },
        required: ['code', 'message', 'tracking_id'],
        example: {
          code: error.code,
          message: error.message,
          tracking_id: DEFAULT_TRACKING_ID
        }
      }))
    };
  }

  /**
   * Create examples for multiple errors
   * @param {Array} errorList - List of errors
   * @returns {Object} OpenAPI examples
   */
  createErrorExamples(errorList) {
    return errorList.reduce((examples, error, index) => {
      const exampleKey = `example${index + 1}`;
      examples[exampleKey] = {
        summary: `Example ${index + 1}`,
        value: {
          code: error.code,
          message: error.message,
          tracking_id: DEFAULT_TRACKING_ID
        }
      };
      return examples;
    }, {});
  }

  /**
   * Reset error collections to default state
   */
  reset() {
    this.errorCollections = this.initializeErrorCollections();
  }
}