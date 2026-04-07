import { AUTH_TYPES } from '../constants/openapi.js';

/**
 * Security Generator - creates OpenAPI security schemes
 */
export class SecurityGenerator {
  /**
   * Add security schema to OpenAPI specification
   * @param {Object} openAPIObj - OpenAPI specification object
   * @param {string} authType - Authentication type
   * @param {string} tokenUrl - OAuth2 token URL
   * @param {Object} scopes - OAuth2 scopes
   * @param {string} apiKeyHeader - Header name for API key authentication
   */
  static addSecuritySchema(openAPIObj, authType, tokenUrl, scopes = {}, apiKeyHeader = 'apikey', authMode = 'and') {
    if (!authType) {
      return;
    }

    const authTypes = (Array.isArray(authType) ? authType : [authType])
      .map(t => t && t.trim())
      .filter(t => t && t !== AUTH_TYPES.NONE);

    if (authTypes.length === 0) {
      return;
    }

    if (!openAPIObj.components) {
      openAPIObj.components = {};
    }

    if (!openAPIObj.components.securitySchemes) {
      openAPIObj.components.securitySchemes = {};
    }

    const securitySchemeKeys = [];
    for (const type of authTypes) {
      const key = this.createSecurityScheme(
        openAPIObj.components.securitySchemes,
        type,
        tokenUrl,
        scopes,
        apiKeyHeader
      );
      if (key && !securitySchemeKeys.includes(key)) {
        securitySchemeKeys.push(key);
      }
    }

    if (securitySchemeKeys.length > 0) {
      this.applyGlobalSecurity(openAPIObj, securitySchemeKeys, authMode);
    }
  }

  /**
   * Create security scheme based on auth type
   * @param {Object} securitySchemes - Security schemes object
   * @param {string} authType - Authentication type
   * @param {string} tokenUrl - OAuth2 token URL
   * @param {Object} scopes - OAuth2 scopes
   * @param {string} apiKeyHeader - Header name for API key authentication
   * @returns {string|null} Security scheme key
   */
  static createSecurityScheme(securitySchemes, authType, tokenUrl, scopes, apiKeyHeader = 'apikey') {
    switch (authType) {
      case AUTH_TYPES.BASIC:
        securitySchemes.basicAuth = {
          type: 'http',
          scheme: 'basic'
        };
        return 'basicAuth';

      case AUTH_TYPES.API_KEY:
        securitySchemes.apiKeyAuth = {
          type: 'apiKey',
          in: 'header',
          name: apiKeyHeader
        };
        return 'apiKeyAuth';

      case AUTH_TYPES.BEARER:
        securitySchemes.bearerAuth = {
          type: 'http',
          scheme: 'bearer'
        };
        return 'bearerAuth';

      case AUTH_TYPES.OAUTH2:
        if (!tokenUrl) {
          console.warn('Token URL is required for OAuth2 authentication');
          return null;
        }

        securitySchemes.oauth2ClientCredentials = {
          type: 'oauth2',
          flows: {
            clientCredentials: {
              tokenUrl: tokenUrl,
              scopes: scopes
            }
          }
        };
        return 'oauth2ClientCredentials';

      default:
        console.warn(`Unsupported authentication type: ${authType}`);
        return null;
    }
  }

  /**
   * Apply security globally to all operations
   * @param {Object} openAPIObj - OpenAPI specification object
   * @param {string} securitySchemeKey - Security scheme key
   */
  static applyGlobalSecurity(openAPIObj, securitySchemeKeys, authMode = 'and') {
    const keys = Array.isArray(securitySchemeKeys) ? securitySchemeKeys : [securitySchemeKeys];
    // OpenAPI semantics:
    //   AND => single requirement object listing all schemes (all must be satisfied).
    //   OR  => array of requirement objects (any one suffices).
    if (authMode === 'or') {
      openAPIObj.security = keys.map(key => ({ [key]: [] }));
    } else {
      openAPIObj.security = [keys.reduce((obj, key) => { obj[key] = []; return obj; }, {})];
    }
  }

  /**
   * Get supported authentication types
   * @returns {Array} Array of supported auth types
   */
  static getSupportedAuthTypes() {
    return Object.values(AUTH_TYPES);
  }

  /**
   * Validate authentication configuration
   * @param {string} authType - Authentication type
   * @param {string} tokenUrl - OAuth2 token URL
   * @returns {Object} Validation result
   */
  static validateAuthConfig(authType, tokenUrl) {
    const result = { valid: true, errors: [] };

    if (!authType || (Array.isArray(authType) && authType.length === 0)) {
      result.valid = false;
      result.errors.push('Authentication type is required');
      return result;
    }

    const authTypes = Array.isArray(authType) ? authType : [authType];
    const supported = this.getSupportedAuthTypes();

    for (const type of authTypes) {
      if (!supported.includes(type)) {
        result.valid = false;
        result.errors.push(`Unsupported authentication type: ${type}`);
      }
    }

    if (authTypes.includes(AUTH_TYPES.OAUTH2) && !tokenUrl) {
      result.valid = false;
      result.errors.push('Token URL is required for OAuth2 authentication');
    }

    return result;
  }
}