import fs from 'fs';
import xml2js from 'xml2js';
import url from 'url';

async function genopenapi(location, answers, xmlFile, cb) {
  let badRequestErrors = [{ code: '400', message: 'Bad Request' }];
  let unauthorizedRequestErrors = [{ code: '401', message: 'Unauthorized' }];
  let forbiddenRequestErrors = [{ code: '403', message: 'Forbidden' }];
  let pageNotFoundErrors = [{ code: '404', message: 'Not Found' }];
  let internalServerErrors = [{ code: '500', message: 'Internal Server Error' }];
  const openapiJson = {};
  const reply = await loadXMLDoc(location + '/' + answers.name + '.xml');
  openapiJson.openapi = '3.0.0';
  // Info Section
  openapiJson.info = {};
  try {
    openapiJson.info.description = reply.APIProxy.Description ? reply.APIProxy.Description[0] : '';
    openapiJson.info.title = reply.APIProxy.DisplayName ? reply.APIProxy.DisplayName[0] : answers.name;
    if (openapiJson.info.title === '') {
      openapiJson.info.title = answers.name;
    }
  } catch (ex) {
    console.log(ex);
  }
  // Host & BasePath Section..
  const servers = [];
  openapiJson.servers = servers;

  const replyProxy = await loadXMLDoc(xmlFile);
  try {
    // Add base path
    const basePath = replyProxy.ProxyEndpoint.HTTPProxyConnection[0].BasePath[0];
    for (const baseUrl of answers.baseUrl) {
      const proxy = url.parse(baseUrl);
      const protocol = proxy.protocol ? proxy.protocol : 'http';
      servers.push({
        url: protocol.substring(0, protocol.length - 1) + '://' + proxy.host + basePath,
      });
    }
    // Add version
    const version = /\/([^/]+)\/?$/.exec(basePath);
    openapiJson.info.version = version ? version[1] : '';
  } catch (ex) {
    openapiJson.info.version = "";
    console.log(ex);
  }

  // Add Paths
  openapiJson.paths = {};
  for (const key in replyProxy.ProxyEndpoint.Flows[0].Flow) {
    const openapiPath = JSON.parse(JSON.stringify(replyProxy.ProxyEndpoint.Flows[0].Flow[key]));
    if (openapiPath['Condition'] !== null && openapiPath['Condition'] !== undefined) {
      const flowCondition = openapiPath['Condition'].pop();
      // Get Path & Verb...
      const rxVerb = /request.verb = "(.*?)"/g;
      const rxPath = /proxy.pathsuffix MatchesPath "(.*?)"/g;
      const verbArr = rxVerb.exec(flowCondition);
      const pathArr = rxPath.exec(flowCondition);
      let resourcePath = '';
      let resourceVerb = '';
      if (verbArr !== null && pathArr !== null) {
        resourcePath = pathArr[1];
        resourceVerb = verbArr[1].toLowerCase();
        if (!openapiJson.paths[resourcePath]) {
          openapiJson.paths[resourcePath] = {};
        }
        openapiJson.paths[resourcePath][resourceVerb] = {};
        openapiJson.paths[resourcePath][resourceVerb].operationId = openapiPath.$.name;
        if (openapiPath.Description !== null) {
          openapiJson.paths[resourcePath][resourceVerb].summary = openapiPath.Description[0];
        }

        // Initialize Responses
        const resourceResponse = {};
        openapiJson.paths[resourcePath][resourceVerb].responses = resourceResponse;

        // Add parameters if path includes dynamic value....
        const rxParam = /\{(.*?)\}/g;
        const rxParamArr = pathArr[1].match(rxParam);
        if (rxParamArr !== null) {
          // Add Parameters
          openapiJson.paths[resourcePath][resourceVerb].parameters = [];
          for (const i in rxParamArr) {
            const resourceParameter = rxParamArr[i];
            const rxResourceParameter = /\{(.*?)\}/g;
            const resourceParameterArr = rxResourceParameter.exec(resourceParameter);
            const parameterObj = {
              name: resourceParameterArr[1],
              in: 'path',
              required: true,
              schema: {
                type: 'string',
              },
            };
            openapiJson.paths[resourcePath][resourceVerb].parameters.push(parameterObj);
          }
        }

        if (!openapiJson.paths[resourcePath][resourceVerb].parameters) {
          openapiJson.paths[resourcePath][resourceVerb].parameters = [];
        }
        // Loop through policies in Request
        for (const stepKey in openapiPath.Request[0].Step) {
          const flowStepPath = JSON.parse(JSON.stringify(openapiPath.Request[0].Step[stepKey]));
          const replyStep = await loadXMLDoc(location + '/policies/' + flowStepPath.Name + '.xml');
          // Check if this is Extract variables policy
          if (replyStep.ExtractVariables) {
            // If source is 'request' then capture as parameters
            let source = '';
            if (!replyStep.ExtractVariables.Source) {
              // If source is not defined and since we are in Request flow then default is request
              source = 'request';
            } else if (replyStep.ExtractVariables.Source[0]['_']) {
              // If source include att, then capture content as such
              source = replyStep.ExtractVariables.Source[0]['_'];
            } else {
              // Otherwise just read content
              source = replyStep.ExtractVariables.Source;
            }
            if (source === 'request') {
              try {
                // Capture Header parameters
                addParametersAndRequestBody(
                  replyStep.ExtractVariables.Header,
                  'header',
                  openapiJson.paths[resourcePath][resourceVerb],
                  replyStep.ExtractVariables['IgnoreUnresolvedVariables'][0]
                );
              } catch (error) {
                console.log(error.message);
              }
              try {
                // Capture QueryParam
                addParametersAndRequestBody(
                  replyStep.ExtractVariables.QueryParam,
                  'query',
                  openapiJson.paths[resourcePath][resourceVerb],
                  replyStep.ExtractVariables['IgnoreUnresolvedVariables'][0]
                );
              } catch (error) {
                console.log(error.message);
              }
              try {
                // Capture FormParam
                addParametersAndRequestBody(
                  replyStep.ExtractVariables.FormParam,
                  'formData',
                  openapiJson.paths[resourcePath][resourceVerb],
                  replyStep.ExtractVariables['IgnoreUnresolvedVariables'][0]
                );
              } catch (error) {
                console.log(error.message);
              }
              try {
                // Capture JSON Body
                addParametersAndRequestBody(
                  replyStep.ExtractVariables.JSONPayload[0]['Variable'],
                  'requestBody',
                  openapiJson.paths[resourcePath][resourceVerb],
                  replyStep.ExtractVariables['IgnoreUnresolvedVariables'][0]
                );
              } catch (error) {
                console.log(error.message);
              }
            }
          }
          let errorMessage;
          let errorCode;
          let errorPayload;
          if (replyStep.RaiseFault) {
            try {
              if (Object.prototype.hasOwnProperty.call(replyStep.RaiseFault.FaultResponse[0], 'AssignVariable')) {
                errorMessage = replyStep.RaiseFault.FaultResponse[0].AssignVariable[0].Value[0];
                errorCode = replyStep.RaiseFault.FaultResponse[0].AssignVariable[1].Value[0];
              } else {
                errorMessage = JSON.parse(replyStep.RaiseFault.FaultResponse[0].Set[0]['Payload'][0]['_'])['error_message'];
                errorCode = replyStep.RaiseFault.FaultResponse[0].Set[0]['StatusCode'][0];
              }
              if (errorCode === '400') {
                errorPayload = {
                  code: errorCode,
                  message: errorMessage,
                };
                badRequestErrors.push(errorPayload);
              }
              if (errorCode === '401') {
                errorPayload = {
                  code: errorCode,
                  message: errorMessage,
                };
                unauthorizedRequestErrors.push(errorPayload);
              }
              if (errorCode === '403') {
                errorPayload = {
                  code: errorCode,
                  message: errorMessage,
                };
                forbiddenRequestErrors.push(errorPayload);
              }
              if (errorCode === '404') {
                errorPayload = {
                  code: errorCode,
                  message: errorMessage,
                };
                pageNotFoundErrors.push(errorPayload);
              }
              if (errorCode === '500') {
                errorPayload = {
                  code: errorCode,
                  message: errorMessage,
                };
                internalServerErrors.push(errorPayload);
              }
            } catch (error) {
              console.log(error.message);
            }
          }
        }
        openapiJson.paths[resourcePath][resourceVerb].responses['400'] = createErrorResponse(badRequestErrors);
        badRequestErrors = [{ code: '400', message: 'Bad Request' }];

        openapiJson.paths[resourcePath][resourceVerb].responses['401'] = createErrorResponse(unauthorizedRequestErrors);
        unauthorizedRequestErrors = [{ code: '401', message: 'Unauthorized' }];

        openapiJson.paths[resourcePath][resourceVerb].responses['403'] = createErrorResponse(forbiddenRequestErrors);
        forbiddenRequestErrors = [{ code: '403', message: 'Forbidden' }];

        openapiJson.paths[resourcePath][resourceVerb].responses['404'] = createErrorResponse(pageNotFoundErrors);
        pageNotFoundErrors = [{ code: '404', message: 'Not Found' }];

        openapiJson.paths[resourcePath][resourceVerb].responses['500'] = createErrorResponse(internalServerErrors);
        internalServerErrors = [{ code: '500', message: 'Internal Server Error' }];

        for (const stepKey in openapiPath.Response[0].Step) {
          const flowStepPath = JSON.parse(JSON.stringify(openapiPath.Response[0].Step[stepKey]));
          if (flowStepPath.Name[0].includes('OAS')) {
            const replyStep = await loadXMLDoc(location + '/policies/' + flowStepPath.Name + '.xml');
            // Check if this is Assign Message policy
            if (replyStep.AssignMessage) {
              // If source is 'response' then capture as parameters
              let source = '';
              if (!replyStep.AssignMessage.Source) {
                // If source is not defined and since we are in Response flow then default is response
                source = 'response';
              } else if (replyStep.AssignMessage.Source[0]['_']) {
                // If source include att, then capture content as such
                source = replyStep.AssignMessage.Source[0]['_'];
              } else {
                // Otherwise just read content
                source = replyStep.AssignMessage.Source;
              }

              if (source === 'response') {
                try {
                  const payload = replyStep.AssignMessage.Set[0]['Payload'][0]['_'];
                  const contentType = replyStep.AssignMessage.Set[0]['Payload'][0]['$']['contentType'];
                  if (Object.prototype.hasOwnProperty.call(replyStep.AssignMessage.Set[0], 'StatusCode')) {
                    const httpStatusCode = replyStep.AssignMessage.Set[0]['StatusCode'][0];
                    openapiJson.paths[resourcePath][resourceVerb].responses[httpStatusCode] = generateResponseSchema(payload, contentType);
                  } else {
                    openapiJson.paths[resourcePath][resourceVerb].responses['200'] = generateResponseSchema(payload, contentType);
                  }
                } catch (error) {
                  console.log(error.message);
                }
              }
            }
          }
        }
      }
    }
  }



  // Add Security Schema
  addSecuritySchema(openapiJson, answers.auth, answers.tokenUrl);

  const rxJsonName = /proxies\/(.*?).xml/g;
  const jsonNameArr = rxJsonName.exec(xmlFile);
  let jsonFileName = answers.name;
  // if (jsonNameArr !== null) {
  //   if (jsonNameArr[1] !== 'default') {
  //     jsonFileName = jsonNameArr[1];
  //   }
  // }

  fs.writeFile(answers.output + '/' + "openapi" + '.json', JSON.stringify(openapiJson, null, 2), function (err) {
    if (err) {
      cb(err, {});
    }
    console.log('openapi JSON File successfully generated in : ' + answers.output + '/' + "openapi" + '.json');
    cb(null, {});
  });
}


function addParametersAndRequestBody(paramArr, openapiType, openapiPath, IgnoreUnresolvedVariables) {
  const isRequired = IgnoreUnresolvedVariables !== 'true';

  const typeMapping = {
    'nodeset': 'object',
    'float': 'number',
    'long': 'number',
    'double': 'number',
    // Add more mappings as needed
  };

  function convertType(paramType) {
    return typeMapping[paramType] || paramType || 'string';
  }

  if (openapiType === 'requestBody') {
    if (!openapiPath.requestBody) {
      openapiPath.requestBody = {
        required: isRequired,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
        },
      };
    }
    const requestBodySchema = openapiPath.requestBody.content['application/json'].schema;

    paramArr.forEach((param) => {
      const paramName = param.$.name;
      const paramType = convertType(param.$.type);
      const propertyDescription = param.$.description !== undefined ? param.$.description : '';
      const propertyPlaceholder = param.$.placeholder !== undefined ? param.$.placeholder : '';

      // Handle nested properties
      const nestedProperties = paramName.split('.');
      let currentSchema = requestBodySchema;
      nestedProperties.forEach((property, index) => {
        if (!currentSchema.properties[property]) {
          currentSchema.properties[property] = {
            type: (index === nestedProperties.length - 1) ? paramType : 'object',
            description: (index === nestedProperties.length - 1) ? propertyDescription : undefined,
            example: (index === nestedProperties.length - 1) ? propertyPlaceholder : undefined,
          };
          
          if (index !== nestedProperties.length - 1) {
            currentSchema.properties[property].properties = {};
            currentSchema.properties[property].required = [];
          }
        }

        if (isRequired && index === nestedProperties.length - 1) {
          currentSchema.required.push(property);
        }

        // Move to the next level of nesting if not the last property
        if (index < nestedProperties.length - 1) {
          currentSchema = currentSchema.properties[property];
        }
      });
    });
  } else {
    if (!openapiPath.parameters) {
      openapiPath.parameters = [];
    }

    paramArr.forEach((param) => {
      const paramName = param.$.name;
      const paramType = convertType(param.$.type);
      const paramDescription = param.$.description !== undefined ? param.$.description : '';
      const paramPlaceholder = param.$.placeholder !== undefined ? param.$.placeholder : '';

      const parameterObj = {
        name: paramName,
        in: openapiType,
        description: paramDescription,
        required: isRequired,
        schema: {
          type: paramType,
        },
        example: paramPlaceholder,
      };
      openapiPath.parameters.push(parameterObj);
    });
  }
}

function generateSchemaFromJson(jsonObject) {
  if (typeof jsonObject !== 'object' || jsonObject === null) {
    return { type: getType(jsonObject) };
  }

  const schema = {};
  if (Array.isArray(jsonObject)) {
    schema.type = 'array';
    schema.items = jsonObject.length > 0 ? generateSchemaFromJson(jsonObject[0]) : {};
  } else {
    schema.type = 'object';
    schema.properties = {};
    for (const key in jsonObject) {
      schema.properties[key] = generateSchemaFromJson(jsonObject[key]);
    }
  }
  return schema;
}

function generateResponseSchema(payload, contentType) {
  try {
    const jsonObject = JSON.parse(payload);
    return {
      description: 'Successful Operation',
      content: {
        [contentType]: {
          schema: generateSchemaFromJson(jsonObject),
          example: jsonObject,
        },
      },
    };
  } catch (error) {
    console.log('Failed to parse JSON string: ', error);
    return {
      description: 'Successful Operation',
    };
  }
}

function createErrorResponse(errorList) {
  const response = {
    description: 'A list of possible errors for the given status code',
    content: {
      'application/json': {
        schema: {},
        // Examples will be added only if there is more than one error message
      },
    },
  };

  // Set the description based on the number of errors
  if (errorList.length === 1) {
    response.description = 'An error response';
  } else {
    response.description = 'A list of possible error responses';
  }

  // Check if there is only one error in the list
  if (errorList.length === 1) {
    const error = errorList[0];
    response.content['application/json'].schema = {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The error code representing the type of error.',
        },
        message: {
          type: 'string',
          description: 'A message providing more details about the error.',
        },
        tracking_id: {
          type: 'string',
          description: 'A unique identifier for this error.',
        },
      },
      required: ['code', 'message', 'tracking_id'],
      example: {
        code: error.code,
        message: error.message,
        tracking_id: '-04-630999-158927-2',
      },
    };
  } else {
    // For multiple errors, use 'oneOf' to define multiple schemas
    response.content['application/json'].schema.oneOf = errorList.map((error) => ({
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The error code representing the type of error.',
        },
        message: {
          type: 'string',
          description: 'A message providing more details about the error.',
        },
      },
      required: ['code', 'message', 'tracking_id'],
      example: {
        code: error.code,
        message: error.message,
        tracking_id: '-04-630999-158927-2',
      },
    }));

    // Add 'examples' only when there are multiple error messages
    response.content['application/json'].examples = errorList.reduce((examples, error, index) => {
      const exampleKey = `example${index + 1}`;
      examples[exampleKey] = {
        summary: `Example ${index + 1}`,
        value: {
          code: error.code,
          message: error.message,
          tracking_id: '-04-630999-158927-2',
        },
      };
      return examples;
    }, {});
  }
  return response;
}

function getType(value) {
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

function addSecuritySchema(openAPIObj, authType, tokenUrl, scopes) {
  if (!authType) {
    return;
  }
  if (!openAPIObj.components) {
    openAPIObj.components = {};
  }
  if (!openAPIObj.components.securitySchemes) {
    openAPIObj.components.securitySchemes = {};
  }
  let securitySchemeKey;

  switch (authType) {
    case 'basic':
      securitySchemeKey = 'basicAuth';
      openAPIObj.components.securitySchemes.basicAuth = {
        type: 'http',
        scheme: 'basic',
      };
      break;
    case 'apiKey':
      securitySchemeKey = 'apiKeyAuth';
      openAPIObj.components.securitySchemes.apiKeyAuth = {
        type: 'apiKey',
        in: 'header',
        name: 'apikey',
      };
      break;
    case 'bearer':
      securitySchemeKey = 'bearerAuth';
      // Bearer token authentication
      openAPIObj.components.securitySchemes.bearerAuth = {
        type: 'http',
        scheme: 'bearer',
      };
      break;
    case 'oauth2':
      securitySchemeKey = 'oauth2ClientCredentials';
      openAPIObj.components.securitySchemes.oauth2ClientCredentials = {
        type: 'oauth2',
        flows: {
          clientCredentials: {
            tokenUrl: tokenUrl,
            // scopes: {
            //   read: 'Grants read access',
            //   write: 'Grants write access',
            // },
          },
        },
      };
      break;
    case 'none':
      return; // No security scheme is required
    default:
      console.log(`Unsupported authentication type: ${authType}`);
      return; // Exit if the auth type is not supported
  }
  // Apply the security globally to all operations
  openAPIObj.security = [
    {
      [securitySchemeKey]: [],
    },
  ];
}

function loadXMLDoc(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const fileData = fs.readFileSync(filePath, 'utf-8'); // Change 'ascii' to 'utf-8' to read Arabic characters
      const parser = new xml2js.Parser();
      parser.parseString(fileData, (err, result) => {
        // No need for substring
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

export default genopenapi;
