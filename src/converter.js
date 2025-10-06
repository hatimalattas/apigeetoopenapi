import fs from 'fs';
import { ApigeeParser } from './parsers/apigeeParser.js';
import { PolicyParser } from './parsers/policyParser.js';
import { OpenApiGenerator } from './generators/openApiGenerator.js';
import { ParameterGenerator } from './generators/parameterGenerator.js';
import { ErrorGenerator } from './generators/errorGenerator.js';
import { SecurityGenerator } from './generators/securityGenerator.js';
import { TypeUtils } from './utils/typeUtils.js';

/**
 * Main Converter class - orchestrates the conversion process
 */
export class Converter {
  constructor() {
    this.apigeeParser = new ApigeeParser();
    this.policyParser = new PolicyParser();
    this.openApiGenerator = new OpenApiGenerator();
    this.errorGenerator = new ErrorGenerator();
  }

  /**
   * Convert Apigee proxy to OpenAPI specification
   * @param {string} location - Directory path containing Apigee proxy
   * @param {Object} options - Conversion options
   * @param {string} xmlFile - Path to proxy endpoint XML file
   * @returns {Promise<Object>} Generated OpenAPI specification
   */
  async convert(location, options, xmlFile) {
    try {
      // Parse API proxy information
      const apiInfo = await this.apigeeParser.parseApiProxy(location, options.name);

      // Parse proxy endpoint
      const proxyEndpoint = await this.apigeeParser.parseProxyEndpoint(xmlFile);

      // Extract base path and version
      const { basePath, version } = this.apigeeParser.extractBasePathAndVersion(proxyEndpoint);
      apiInfo.version = version;

      // Initialize OpenAPI specification
      this.openApiGenerator.initialize(apiInfo);
      this.openApiGenerator.addServers(options.baseUrl, basePath);

      // Parse OAuth scopes
      const scopes = await this.apigeeParser.parseOAuthScopes(location, proxyEndpoint);

      // Process flows
      await this.processFlows(location, proxyEndpoint);

      // Add security schema
      const spec = this.openApiGenerator.getSpec();
      SecurityGenerator.addSecuritySchema(spec, options.auth, options.tokenUrl, scopes);

      return spec;
    } catch (error) {
      throw new Error(`Conversion failed: ${error.message}`);
    }
  }

  /**
   * Process flows from proxy endpoint
   * @param {string} location - Directory path
   * @param {Object} proxyEndpoint - Parsed proxy endpoint
   */
  async processFlows(location, proxyEndpoint) {
    const flows = this.apigeeParser.parseFlows(proxyEndpoint);

    for (const flow of flows) {
      await this.processFlow(location, flow);
    }
  }

  /**
   * Process individual flow
   * @param {string} location - Directory path
   * @param {Object} flow - Flow object
   */
  async processFlow(location, flow) {
    const condition = TypeUtils.safeArrayAccess(flow.Condition);
    if (!condition) {return;}

    // Extract path and method from condition
    const pathInfo = this.extractPathAndMethod(condition);
    if (!pathInfo) {return;}

    const { path, method } = pathInfo;

    // Create operation
    const operation = {
      operationId: flow.$.name,
      summary: TypeUtils.safeArrayAccess(flow.Description) || flow.$.name,
      parameters: [],
      responses: {}
    };

    // Add path parameters
    const pathParams = ParameterGenerator.extractPathParameters(path);
    operation.parameters.push(...pathParams);

    // Reset error generator for this operation
    this.errorGenerator.reset();

    // Process request policies
    await this.processRequestPolicies(location, flow, operation);

    // Process response policies
    await this.processResponsePolicies(location, flow, operation);

    // Add error responses
    const errorResponses = this.errorGenerator.generateErrorResponses();
    Object.assign(operation.responses, errorResponses);

    // Add operation to OpenAPI spec
    this.openApiGenerator.addPath(path, method, operation);
  }

  /**
   * Extract path and method from flow condition
   * @param {string} condition - Flow condition string
   * @returns {Object|null} Path and method information
   */
  extractPathAndMethod(condition) {
    const verbRegex = /request\.verb = "(.*?)"/g;
    const pathRegex = /proxy\.pathsuffix MatchesPath "(.*?)"/g;

    const verbMatch = verbRegex.exec(condition);
    const pathMatch = pathRegex.exec(condition);

    if (!verbMatch || !pathMatch) {return null;}

    return {
      path: pathMatch[1],
      method: verbMatch[1].toLowerCase()
    };
  }

  /**
   * Process request policies
   * @param {string} location - Directory path
   * @param {Object} flow - Flow object
   * @param {Object} operation - OpenAPI operation
   */
  async processRequestPolicies(location, flow, operation) {
    const requestSteps = flow.Request?.[0]?.Step;
    if (!Array.isArray(requestSteps)) {return;}

    for (const step of requestSteps) {
      const policyName = TypeUtils.safeArrayAccess(step.Name);
      if (!policyName) {continue;}

      try {
        const policy = await this.policyParser.loadPolicy(location, policyName);

        // Process ExtractVariables policy
        const extractVars = this.policyParser.parseExtractVariables(policy);
        if (extractVars && extractVars.source === 'request') {
          this.processExtractVariables(extractVars, operation);
        }

        // Process RaiseFault policy
        const raiseFault = this.policyParser.parseRaiseFault(policy);
        if (raiseFault) {
          this.errorGenerator.addError(raiseFault);
        }
      } catch (error) {
        console.warn(`Failed to process policy ${policyName}:`, error.message);
      }
    }
  }

  /**
   * Process response policies
   * @param {string} location - Directory path
   * @param {Object} flow - Flow object
   * @param {Object} operation - OpenAPI operation
   */
  async processResponsePolicies(location, flow, operation) {
    const responseSteps = flow.Response?.[0]?.Step;
    if (!Array.isArray(responseSteps)) {return;}

    for (const step of responseSteps) {
      const policyName = TypeUtils.safeArrayAccess(step.Name);
      if (!policyName?.includes('OAS')) {continue;}

      try {
        const policy = await this.policyParser.loadPolicy(location, policyName);
        const assignMessage = this.policyParser.parseAssignMessage(policy);

        if (assignMessage) {
          const response = this.openApiGenerator.generateResponseSchema(
            assignMessage.payload,
            assignMessage.contentType
          );
          operation.responses[assignMessage.statusCode] = response;
        }
      } catch (error) {
        console.warn(`Failed to process response policy ${policyName}:`, error.message);
      }
    }
  }

  /**
   * Process ExtractVariables policy
   * @param {Object} extractVars - Parsed ExtractVariables
   * @param {Object} operation - OpenAPI operation
   */
  processExtractVariables(extractVars, operation) {
    const { ignoreUnresolved } = extractVars;

    // Process headers
    if (extractVars.headers.length > 0) {
      ParameterGenerator.addParametersAndRequestBody(
        extractVars.headers, 'header', operation, ignoreUnresolved
      );
    }

    // Process query parameters
    if (extractVars.queryParams.length > 0) {
      ParameterGenerator.addParametersAndRequestBody(
        extractVars.queryParams, 'query', operation, ignoreUnresolved
      );
    }

    // Process form parameters
    if (extractVars.formParams.length > 0) {
      ParameterGenerator.addParametersAndRequestBody(
        extractVars.formParams, 'formData', operation, ignoreUnresolved
      );
    }

    // Process JSON payload
    if (extractVars.jsonPayload) {
      ParameterGenerator.addParametersAndRequestBody(
        extractVars.jsonPayload, 'requestBody', operation, ignoreUnresolved
      );
    }
  }

  /**
   * Save OpenAPI specification to file
   * @param {Object} spec - OpenAPI specification
   * @param {string} outputPath - Output file path
   * @returns {Promise<void>}
   */
  async saveToFile(spec, outputPath) {
    return new Promise((resolve, reject) => {
      const content = JSON.stringify(spec, null, 2);
      fs.writeFile(outputPath, content, (err) => {
        if (err) {
          reject(new Error(`Failed to write file: ${err.message}`));
        } else {
          console.log(`OpenAPI specification saved to: ${outputPath}`);
          resolve();
        }
      });
    });
  }
}