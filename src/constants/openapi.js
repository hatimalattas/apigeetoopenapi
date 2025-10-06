/**
 * OpenAPI Constants
 */
export const OPENAPI_VERSION = '3.0.0';

export const CONTENT_TYPES = {
  JSON: 'application/json',
  XML: 'application/xml',
  FORM: 'application/x-www-form-urlencoded'
};

export const PARAMETER_LOCATIONS = {
  HEADER: 'header',
  QUERY: 'query',
  PATH: 'path',
  FORM_DATA: 'formData'
};

export const HTTP_METHODS = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  DELETE: 'delete',
  PATCH: 'patch',
  OPTIONS: 'options',
  HEAD: 'head'
};

export const AUTH_TYPES = {
  BASIC: 'basic',
  API_KEY: 'apiKey',
  BEARER: 'bearer',
  OAUTH2: 'oauth2',
  NONE: 'none'
};

export const TYPE_MAPPING = {
  nodeset: 'object',
  float: 'number',
  long: 'number',
  double: 'number',
  integer: 'integer',
  string: 'string',
  boolean: 'boolean'
};