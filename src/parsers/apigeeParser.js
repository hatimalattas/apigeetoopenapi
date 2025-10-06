import { XMLLoader } from '../utils/xmlLoader.js';
import { TypeUtils } from '../utils/typeUtils.js';

/**
 * Apigee XML Parser - handles parsing of Apigee proxy configurations
 */
export class ApigeeParser {
  constructor() {
    this.xmlLoader = new XMLLoader();
  }

  /**
   * Parse main API proxy XML file
   * @param {string} location - Directory path
   * @param {string} name - API name
   * @returns {Promise<Object>} Parsed API proxy info
   */
  async parseApiProxy(location, name) {
    const mainXmlFile = this.xmlLoader.findMainXmlFile(location, name);
    const apiProxy = await this.xmlLoader.loadXMLDoc(`${location}/${mainXmlFile}`);

    return {
      description: TypeUtils.safeArrayAccess(apiProxy.APIProxy?.Description) || '',
      title: TypeUtils.safeArrayAccess(apiProxy.APIProxy?.DisplayName) || name,
      name: mainXmlFile
    };
  }

  /**
   * Parse proxy endpoint XML file
   * @param {string} xmlFile - Path to proxy endpoint XML
   * @returns {Promise<Object>} Parsed proxy endpoint
   */
  async parseProxyEndpoint(xmlFile) {
    return await this.xmlLoader.loadXMLDoc(xmlFile);
  }

  /**
   * Extract base path and version from proxy endpoint
   * @param {Object} proxyEndpoint - Parsed proxy endpoint
   * @returns {Object} Base path and version info
   */
  extractBasePathAndVersion(proxyEndpoint) {
    try {
      const basePath = TypeUtils.safeArrayAccess(
        proxyEndpoint.ProxyEndpoint?.HTTPProxyConnection?.[0]?.BasePath
      );

      if (!basePath) {
        return { basePath: '', version: '' };
      }

      const version = /\/([^/]+)\/?$/.exec(basePath);
      return {
        basePath,
        version: version ? version[1] : ''
      };
    } catch (ex) {
      return { basePath: '', version: '' };
    }
  }

  /**
   * Parse OAuth policies and extract scopes
   * @param {string} location - Directory path
   * @param {Object} proxyEndpoint - Parsed proxy endpoint
   * @returns {Promise<Object>} OAuth scopes
   */
  async parseOAuthScopes(location, proxyEndpoint) {
    const scopesObj = {};

    try {
      const preFlowPolicies = proxyEndpoint.ProxyEndpoint?.PreFlow?.[0]?.Request?.[0]?.Step;

      if (!Array.isArray(preFlowPolicies)) {
        return scopesObj;
      }

      for (const policy of preFlowPolicies) {
        const policyName = TypeUtils.safeArrayAccess(policy.Name);

        if (policyName?.includes('OAuthV2')) {
          const oauthPolicy = await this.xmlLoader.loadXMLDoc(`${location}/policies/${policyName}.xml`);

          if (oauthPolicy.OAuthV2?.Scope) {
            const scopes = oauthPolicy.OAuthV2.Scope.toString().split(' ');
            scopes.forEach(scope => {
              scopesObj[scope] = '';
            });
          }
        }
      }
    } catch (error) {
      console.warn('Failed to parse OAuth scopes:', error.message);
    }

    return scopesObj;
  }

  /**
   * Parse flows from proxy endpoint
   * @param {Object} proxyEndpoint - Parsed proxy endpoint
   * @returns {Array} Array of flows
   */
  parseFlows(proxyEndpoint) {
    const flows = proxyEndpoint.ProxyEndpoint?.Flows?.[0]?.Flow;
    return flows ? Object.values(flows) : [];
  }
}