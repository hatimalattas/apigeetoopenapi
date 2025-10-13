import { TYPE_MAPPING, ARRAY_ITEM_TYPES } from '../constants/openapi.js';

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

  /**
   * Convert array item type to OpenAPI type
   * @param {string} itemType - Array item type
   * @returns {string} OpenAPI type
   */
  static convertArrayItemType(itemType) {
    return ARRAY_ITEM_TYPES[itemType] || itemType || 'string';
  }

  /**
   * Parse comma-separated item types for mixed arrays
   * @param {string} itemTypes - Comma-separated types (e.g., "string,integer,boolean")
   * @returns {Array} Array of OpenAPI type objects
   */
  static parseMultipleItemTypes(itemTypes) {
    if (!itemTypes || typeof itemTypes !== 'string') {
      return [{ type: 'string' }];
    }

    const types = itemTypes.split(',').map(type => type.trim());
    return types.map(type => ({
      type: this.convertArrayItemType(type)
    }));
  }

  /**
   * Validate and parse JSON placeholder
   * @param {string} placeholder - JSON string placeholder
   * @returns {any} Parsed JSON or null if invalid
   */
  static parseJsonPlaceholder(placeholder) {
    if (!placeholder || typeof placeholder !== 'string') {
      return null;
    }

    try {
      return JSON.parse(placeholder);
    } catch (error) {
      console.warn(`Invalid JSON placeholder: ${placeholder}`, error);
      return null;
    }
  }

  /**
   * Check if a type represents an array
   * @param {string} type - Type to check
   * @returns {boolean} True if type is array-like
   */
  static isArrayType(type) {
    return type === 'nodeset' || TYPE_MAPPING[type] === 'array';
  }
}