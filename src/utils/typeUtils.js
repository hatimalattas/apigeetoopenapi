import { TYPE_MAPPING } from '../constants/openapi.js';

/**
 * Type utility functions
 */
export class TypeUtils {
  /**
   * Convert XML type to OpenAPI type
   * @param {string} paramType - XML parameter type
   * @returns {string} OpenAPI type
   */
  static convertType(paramType) {
    return TYPE_MAPPING[paramType] || paramType || 'string';
  }

  /**
   * Get JavaScript type for schema generation
   * @param {any} value - Value to check
   * @returns {string} Type string
   */
  static getType(value) {
    const type = typeof value;
    switch (type) {
      case 'number':
        return Number.isInteger(value) ? 'integer' : 'number';
      case 'string':
        return 'string';
      case 'boolean':
        return 'boolean';
      default:
        return 'object';
    }
  }

  /**
   * Check if value exists and is not null/undefined
   * @param {any} value - Value to check
   * @returns {boolean} True if value exists
   */
  static exists(value) {
    return value !== null && value !== undefined;
  }

  /**
   * Safely get array element
   * @param {Array} arr - Array to check
   * @param {number} index - Index to access
   * @returns {any} Array element or undefined
   */
  static safeArrayAccess(arr, index = 0) {
    return Array.isArray(arr) && arr.length > index ? arr[index] : undefined;
  }
}