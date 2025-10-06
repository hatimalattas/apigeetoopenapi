// Main converter
export { Converter } from './converter.js';

// Parsers
export { ApigeeParser } from './parsers/apigeeParser.js';
export { PolicyParser } from './parsers/policyParser.js';

// Generators
export { OpenApiGenerator } from './generators/openApiGenerator.js';
export { ParameterGenerator } from './generators/parameterGenerator.js';
export { ErrorGenerator } from './generators/errorGenerator.js';
export { SecurityGenerator } from './generators/securityGenerator.js';

// Utils
export { XMLLoader } from './utils/xmlLoader.js';
export { TypeUtils } from './utils/typeUtils.js';

// Constants
export * from './constants/errorCodes.js';
export * from './constants/openapi.js';

// Main function (backward compatibility)
export { default as genopenapi } from './proxy2openapi-refactored.js';