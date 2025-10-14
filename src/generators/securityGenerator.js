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
  static addSecuritySchema(openAPIObj, authType, tokenUrl, scopes = {}, apiKeyHeader = 'apikey') {
    if (!authType || authType === AUTH_TYPES.NONE) {
      return;
    }

    if (!openAPIObj.components) {
      openAPIObj.components = {};
    }

    if (!openAPIObj.components.securitySchemes) {
      openAPIObj.components.securitySchemes = {};
    }

    const securitySchemeKey = this.createSecurityScheme(
      openAPIObj.components.securitySchemes,
      authType,
      tokenUrl,
      scopes,
      apiKeyHeader
    );

    if (securitySchemeKey) {
      this.applyGlobalSecurity(openAPIObj, securitySchemeKey);
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
  static applyGlobalSecurity(openAPIObj, securitySchemeKey) {
    openAPIObj.security = [{
      [securitySchemeKey]: []
    }];
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

    if (!authType) {
      result.valid = false;
      result.errors.push('Authentication type is required');
      return result;
    }

    if (!this.getSupportedAuthTypes().includes(authType)) {
      result.valid = false;
      result.errors.push(`Unsupported authentication type: ${authType}`);
    }

    if (authType === AUTH_TYPES.OAUTH2 && !tokenUrl) {
      result.valid = false;
      result.errors.push('Token URL is required for OAuth2 authentication');
    }

    return result;
  }
}