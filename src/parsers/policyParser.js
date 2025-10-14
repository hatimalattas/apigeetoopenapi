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
      headers: this.enhanceParametersWithArrayInfo(extractVars.Header || []),
      queryParams: this.enhanceParametersWithArrayInfo(extractVars.QueryParam || []),
      formParams: this.enhanceParametersWithArrayInfo(extractVars.FormParam || []),
      jsonPayload: this.enhanceParametersWithArrayInfo(extractVars.JSONPayload?.[0]?.Variable || [])
    };
  }

  /**
   * Enhance parameters with array information
   * @param {Array} parameters - Array of parameter objects
   * @returns {Array} Enhanced parameters with array info
   */
  enhanceParametersWithArrayInfo(parameters) {
    if (!Array.isArray(parameters)) {
      return [];
    }

    return parameters.map(param => {
      if (!param || !param.$) {
        return param;
      }

      const enhanced = { ...param };

      // Extract itemType if it exists
      if (param.$.itemType) {
        enhanced.$.itemType = param.$.itemType;
      }

      // Check if this is an array type
      if (TypeUtils.isArrayType(param.$.type)) {
        enhanced.$.isArray = true;
      }

      return enhanced;
    });
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
   * Parse JavaScript policy
   * @param {Object} policy - Parsed policy XML
   * @param {string} location - Directory path
   * @returns {Promise<Array>} Array of error objects
   */
  async parseJavaScript(policy, location) {
    const javascript = policy.Javascript;
    if (!javascript) { return []; }

    try {
      const resourceUrl = TypeUtils.safeArrayAccess(javascript.ResourceURL);
      if (!resourceUrl) { return []; }

      // Extract JavaScript file name from ResourceURL (e.g., "jsc://validate-request.js")
      const jsFileName = resourceUrl.replace(/^jsc:\/\//, '');
      const jsFilePath = `${location}/resources/jsc/${jsFileName}`;

      // Load JavaScript file content
      const jsContent = await this.loadJavaScriptFile(jsFilePath);
      if (!jsContent) { return []; }

      // Extract error patterns from JavaScript content
      return this.extractJavaScriptErrors(jsContent);
    } catch (error) {
      console.warn('Failed to parse JavaScript policy:', error.message);
      return [];
    }
  }

  /**
   * Load JavaScript file content
   * @param {string} filePath - Path to JavaScript file
   * @returns {Promise<string|null>} JavaScript content
   */
  async loadJavaScriptFile(filePath) {
    try {
      const fs = await import('fs');
      return await fs.promises.readFile(filePath, 'utf8');
    } catch (error) {
      console.warn(`Failed to load JavaScript file ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Extract error patterns from JavaScript content
   * @param {string} jsContent - JavaScript file content
   * @returns {Array} Array of error objects
   */
  extractJavaScriptErrors(jsContent) {
    const errors = [];

    // Find all error_message and error_code pairs
    const messagePattern = /context\.setVariable\s*\(\s*["']error_message["']\s*,\s*["']([^"']+)["']/g;
    const codePattern = /context\.setVariable\s*\(\s*["']error_code["']\s*,\s*(\d+)\s*\)/g;

    // Extract all error messages with their positions
    const messages = [];
    let messageMatch;
    while ((messageMatch = messagePattern.exec(jsContent)) !== null) {
      messages.push({
        message: messageMatch[1],
        position: messageMatch.index
      });
    }

    // Extract all error codes with their positions
    const codes = [];
    let codeMatch;
    while ((codeMatch = codePattern.exec(jsContent)) !== null) {
      codes.push({
        code: parseInt(codeMatch[1]),
        position: codeMatch.index
      });
    }

    // Match messages with their closest following error codes
    messages.forEach((msgObj) => {
      // Find the closest error code that comes after this message
      let closestCode = 400; // default
      let minDistance = Infinity;

      codes.forEach(codeObj => {
        if (codeObj.position > msgObj.position) {
          const distance = codeObj.position - msgObj.position;
          if (distance < minDistance) {
            minDistance = distance;
            closestCode = codeObj.code;
          }
        }
      });

      // If no code found after this message, try to find codes before it
      if (minDistance === Infinity && codes.length > 0) {
        // Use the most recent code before this message, or first available code
        for (let i = codes.length - 1; i >= 0; i--) {
          if (codes[i].position < msgObj.position) {
            closestCode = codes[i].code;
            break;
          }
        }
        // If still no match, use the first available code
        if (closestCode === 400 && codes.length > 0) {
          closestCode = codes[0].code;
        }
      }

      errors.push({
        code: closestCode.toString(),
        message: msgObj.message
      });
    });

    return errors;
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