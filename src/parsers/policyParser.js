import { XMLLoader } from '../utils/xmlLoader.js';
import { TypeUtils } from '../utils/typeUtils.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * Policy Parser - handles parsing of Apigee policies
 */
export class PolicyParser {
  constructor() {
    this.xmlLoader = new XMLLoader();
  }

  /**
   * Parse ExtractVariables policy
   * @param {Object} policy - Parsed policy XML
   * @returns {Object} Extracted parameters
   */
  parseExtractVariables(policy) {
    const extractVars = policy.ExtractVariables;
    if (!extractVars) {return null;}

    const source = this.extractSource(extractVars);
    const ignoreUnresolved = TypeUtils.safeArrayAccess(extractVars.IgnoreUnresolvedVariables);

    return {
      source,
      ignoreUnresolved,
      headers: extractVars.Header || [],
      queryParams: extractVars.QueryParam || [],
      formParams: extractVars.FormParam || [],
      jsonPayload: extractVars.JSONPayload?.[0]?.Variable || null
    };
  }

  /**
   * Parse RaiseFault policy
   * @param {Object} policy - Parsed policy XML
   * @returns {Object|null} Error information
   */
  parseRaiseFault(policy) {
    const raiseFault = policy.RaiseFault;
    if (!raiseFault) {return null;}

    try {
      const faultResponse = TypeUtils.safeArrayAccess(raiseFault.FaultResponse);
      if (!faultResponse) {return null;}

      let errorMessage, errorCode;

      if (faultResponse.AssignVariable) {
        errorMessage = TypeUtils.safeArrayAccess(faultResponse.AssignVariable[0]?.Value);
        errorCode = TypeUtils.safeArrayAccess(faultResponse.AssignVariable[1]?.Value);
      } else if (faultResponse.Set?.[0]) {
        const payload = JSON.parse(TypeUtils.safeArrayAccess(faultResponse.Set[0].Payload)?._);
        errorMessage = payload.error_message;
        errorCode = TypeUtils.safeArrayAccess(faultResponse.Set[0].StatusCode);
      }

      return { code: errorCode, message: errorMessage };
    } catch (error) {
      console.warn('Failed to parse RaiseFault policy:', error.message);
      return null;
    }
  }

  /**
   * Parse AssignMessage policy for response
   * @param {Object} policy - Parsed policy XML
   * @returns {Object|null} Response information
   */
  parseAssignMessage(policy) {
    const assignMessage = policy.AssignMessage;
    if (!assignMessage) {return null;}

    const source = this.extractSource(assignMessage, 'response');
    if (source !== 'response') {return null;}

    try {
      const setBlock = TypeUtils.safeArrayAccess(assignMessage.Set);
      if (!setBlock) {return null;}

      const payload = setBlock.Payload?.[0]?._;
      const contentType = setBlock.Payload?.[0]?.$?.contentType;
      const statusCode = TypeUtils.safeArrayAccess(setBlock.StatusCode) || '200';

      return {
        payload,
        contentType,
        statusCode
      };
    } catch (error) {
      console.warn('Failed to parse AssignMessage policy:', error.message);
      return null;
    }
  }

  /**
   * Extract source from policy
   * @param {Object} policyBlock - Policy block (ExtractVariables or AssignMessage)
   * @param {string} defaultSource - Default source if not specified
   * @returns {string} Source value
   */
  extractSource(policyBlock, defaultSource = 'request') {
    if (!policyBlock.Source) {
      return defaultSource;
    }

    const source = TypeUtils.safeArrayAccess(policyBlock.Source);
    if (typeof source === 'object' && source._) {
      return source._;
    }

    return source || defaultSource;
  }

  /**
   * Load and parse policy file
   * @param {string} location - Directory path
   * @param {string} policyName - Policy name
   * @returns {Promise<Object>} Parsed policy
   */
  async loadPolicy(location, policyName) {
    return await this.xmlLoader.loadXMLDoc(`${location}/policies/${policyName}.xml`);
  }
}