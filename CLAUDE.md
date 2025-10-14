# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ApigeeToOpenAPI is a Node.js CLI tool that converts Apigee Proxy Bundles into OpenAPI 3.0.0 specifications. The project was recently refactored from a monolithic structure into a modern, modular architecture.

## Essential Commands

### Development
```bash
# Install dependencies
npm install

# Run linting
npx eslint src/

# Auto-fix linting issues
npx eslint src/ --fix

# Run tests (currently no test files exist)
npm test
```

### Testing the CLI
```bash
# Test with a zip bundle
npx apigeetoopenapi -i ./bundle.zip -o ./output -n "API Name" -b "https://api.example.com" -a apiKey

# Test with unzipped directory
npx apigeetoopenapi -i ./apiproxy -o ./output -n "API Name" -b "https://api.example.com" -a oauth2 -t "https://auth.example.com/token"

# Multiple base URLs
npx apigeetoopenapi -i ./bundle.zip -o ./output -n "API Name" -b "https://dev.api.com,https://prod.api.com" -a bearer

# Custom API key header
npx apigeetoopenapi -i ./bundle.zip -o ./output -n "API Name" -b "https://api.example.com" -a apiKey -k "X-API-Key"
```

## Architecture Overview

### Entry Points
- **CLI Entry**: `apigeetoopenapi.js` - Commander.js-based CLI that processes options and delegates to `fetchApi.js`
- **Processing**: `fetchApi.js` - Handles file extraction, directory processing, and calls the conversion logic
- **Main Export**: `src/index.js` - Exports all modular components for programmatic use

### Core Architecture (src/)

The refactored codebase follows a layered architecture:

```
src/
├── converter.js           # Main orchestrator - coordinates the entire conversion process
├── index.js              # Module exports - clean API for external consumers
├── proxy2openapi-refactored.js  # Backward compatibility wrapper
├── parsers/              # Input parsing layer
├── generators/           # Output generation layer
├── utils/               # Shared utilities
└── constants/           # Configuration and constants
```

### Key Components

#### Converter Class (`src/converter.js`)
The main orchestrator that coordinates the entire conversion process:
- Instantiates all parser and generator classes
- Manages the conversion workflow: parse → process flows → generate schemas → add security
- Handles error propagation and provides clean async/await interface

#### Parsing Layer (`src/parsers/`)
- **ApigeeParser**: Parses main API proxy XML, extracts base paths, versions, OAuth scopes
- **PolicyParser**: Loads and parses individual policy files (ExtractVariables, RaiseFault, AssignMessage, JavaScript)

#### Generation Layer (`src/generators/`)
- **OpenApiGenerator**: Creates core OpenAPI specification structure
- **ParameterGenerator**: Handles parameters and request body generation, including nested JSON objects and array support
- **ErrorGenerator**: Manages error response schemas from RaiseFault policies and JavaScript error patterns
- **SecurityGenerator**: Configures authentication schemes (Basic, API Key, Bearer, OAuth2)

#### Utilities (`src/utils/`)
- **XMLLoader**: XML file loading and parsing with xml2js
- **TypeUtils**: Type conversion, safe array access, validation utilities, array type detection and conversion

#### Constants (`src/constants/`)
- **errorCodes.js**: HTTP status codes and standard error messages
- **openapi.js**: OpenAPI-related constants, content types, authentication types, array item type mappings

### Data Flow

1. **CLI Processing**: `apigeetoopenapi.js` → `fetchApi.js` → extracts/processes Apigee bundle
2. **Conversion Pipeline**:
   - `Converter.convert()` orchestrates the process
   - `ApigeeParser` extracts API metadata and proxy endpoint information
   - `PolicyParser` processes individual policies from request/response flows
   - Generators create OpenAPI components (paths, parameters, responses, security)
3. **Output**: Complete OpenAPI 3.0.0 specification saved as JSON

### Key Features

#### Array Support
The tool supports array parameters in ExtractVariables policies using the `nodeset` type with custom `itemType` attribute:

```xml
<ExtractVariables name="ExtractUserData">
  <Source>request</Source>
  <JSONPayload>
    <!-- Integer array -->
    <Variable name="userIds" type="nodeset" itemType="integer"
              placeholder="[1, 2, 3, 4, 5]"
              description="Array of user IDs" />

    <!-- Object array -->
    <Variable name="users" type="nodeset" itemType="object"
              placeholder='[{"id": 1, "name": "John"}, {"id": 2, "name": "Jane"}]'
              description="Array of user objects" />

    <!-- Mixed type array -->
    <Variable name="mixedData" type="nodeset" itemType="string,integer,boolean"
              placeholder='["hello", 42, true]'
              description="Mixed type array" />
  </JSONPayload>
</ExtractVariables>
```

Supported `itemType` values: `string`, `integer`, `number`, `boolean`, `object`, and comma-separated combinations for mixed arrays.

#### Nested JSON Support
The tool intelligently handles nested JSON objects in ExtractVariables policies. Dot notation in variable names (e.g., `individual.name_en`) automatically creates nested object structures in the OpenAPI schema.

#### Parameter Extraction Intelligence
- Required vs optional fields determined by `IgnoreUnresolvedVariables` setting
- Extracts `description` and `placeholder` attributes for rich documentation
- Supports Query, Header, Form, and JSON payload parameters

#### Security Configuration
Supports multiple authentication types with automatic OpenAPI security scheme generation:
- Basic Auth, API Key (header-based with configurable header name), Bearer tokens, OAuth2 client credentials

## Important Implementation Details

### Backward Compatibility
The refactored code maintains backward compatibility through `src/proxy2openapi-refactored.js`, which wraps the new Converter class in the original function signature.

#### JavaScript Error Handling
The tool supports extracting error information from JavaScript policies:

```xml
<Javascript name="ValidateRequest" timeLimit="200">
    <ResourceURL>jsc://validate-request.js</ResourceURL>
</Javascript>
```

JavaScript files are parsed for error patterns like:
```javascript
context.setVariable("error_message", "Email is required");
context.setVariable("error_code", 400);
```

The tool automatically generates OpenAPI error responses based on these patterns.

### Error Handling Strategy
- Each component has defensive programming with null/undefined checks
- Errors are logged but don't stop processing of other components
- The ErrorGenerator accumulates errors from RaiseFault policies and JavaScript files across all flows

### XML Processing Approach
- Uses xml2js for parsing with UTF-8 encoding support
- Safe array access patterns throughout to handle missing XML elements
- Regex-based extraction for flow conditions and path/method detection

### Module Dependencies
- **xml2js**: XML parsing
- **commander**: CLI argument processing
- **node-unzip-2**: ZIP file extraction
- **async**: Flow control for processing multiple proxy files
- **glob**: File pattern matching

The project uses ES6 modules (`"type": "module"` in package.json) and targets modern Node.js environments.