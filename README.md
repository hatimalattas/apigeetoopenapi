# ApigeeToOpenAPI

[![npm version](https://badge.fury.io/js/apigeetoopenapi.svg)](https://badge.fury.io/js/apigeetoopenapi)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Introduction

**ApigeeToOpenAPI** is a powerful command-line utility that automatically converts Apigee Proxy Bundles into OpenAPI 3.0.0 specifications. Built with a modern, modular architecture, it simplifies API documentation generation and helps developers manage API endpoints more efficiently.

## 🆕 What's New in v5.1.0

### 🏗️ **Refactored Architecture**
- **Modular Design**: Complete rewrite with separation of concerns - parsers, generators, and utilities are now independent modules
- **Better Maintainability**: Single responsibility principle applied throughout the codebase
- **Enhanced Error Handling**: Improved error propagation and graceful degradation

### 🔧 **Enhanced Features**
- **Smart Parameter Detection**: Improved logic for determining required vs optional fields
- **Nested JSON Support**: Better handling of complex nested object structures from dot notation
- **Multiple Authentication Types**: Enhanced support for Basic, API Key, Bearer, OAuth2, and custom authentication
- **Backward Compatibility**: Legacy function signatures maintained for seamless migration

## 🚀 Features

### 1. **Comprehensive Proxy Bundle Parsing**
- **Multi-format Input**: Processes both zipped Apigee Proxy Bundles (`.zip`) and unzipped `apiproxy` directories
- **Smart Endpoint Analysis**: Analyzes Request Proxy Endpoint flows to construct detailed OpenAPI paths, parameters, and HTTP methods
- **Policy Recognition**: Automatically detects and processes various Apigee policies including ExtractVariables, AssignMessage, RaiseFault, and OAuth policies

### 2. **Advanced Parameter Extraction**
The tool intelligently parses various parameter types from Apigee policies:

- **Query Parameters**: Extracted from `QueryParam` elements
- **Header Parameters**: Extracted from `Header` elements
- **Form Parameters**: Extracted from `FormParam` elements
- **Request Body**: Extracted from `JSONPayload` elements
- **Path Parameters**: Automatically detected from dynamic path segments

#### **Required vs Optional Fields**
Field requirements are determined by the `IgnoreUnresolvedVariables` setting:

**Optional Fields** (`IgnoreUnresolvedVariables="true"`):
```xml
<ExtractVariables name="ExtractVariables-Optional">
   <DisplayName>Extract optional parameters</DisplayName>
   <Source>request</Source>
   <QueryParam name="filter">
      <Pattern ignoreCase="true">{filter}</Pattern>
   </QueryParam>
   <IgnoreUnresolvedVariables>true</IgnoreUnresolvedVariables>
</ExtractVariables>
```

**Required Fields** (`IgnoreUnresolvedVariables="false"`):
```xml
<ExtractVariables name="ExtractVariables-Required">
   <DisplayName>Extract required parameters</DisplayName>
   <Source>request</Source>
   <QueryParam name="user_id">
      <Pattern ignoreCase="true">{user_id}</Pattern>
   </QueryParam>
   <IgnoreUnresolvedVariables>false</IgnoreUnresolvedVariables>
</ExtractVariables>
```

#### **Rich Parameter Documentation**
The tool extracts `description` and `placeholder` attributes to enhance OpenAPI documentation:

```xml
<ExtractVariables name="Extract-Date-Range-Query">
    <DisplayName>Extract Date Range Query</DisplayName>
    <QueryParam name="start_date"
                description="Beginning of the time period (MM/DD/YYYY format)"
                placeholder="01/01/2024">
        <Pattern ignoreCase="true">{start_date}</Pattern>
    </QueryParam>
    <QueryParam name="end_date"
                description="End of the time period (MM/DD/YYYY format)"
                placeholder="12/31/2024">
        <Pattern ignoreCase="true">{end_date}</Pattern>
    </QueryParam>
    <IgnoreUnresolvedVariables>false</IgnoreUnresolvedVariables>
</ExtractVariables>
```

#### **Nested JSON Object Support**
The tool intelligently handles nested JSON objects in request bodies, automatically creating proper OpenAPI schema structures with nested properties:

```xml
<ExtractVariables continueOnError="true" enabled="false" name="EV-ExtractGeneratePayload">
  <DisplayName>EV-ExtractGeneratePayload</DisplayName>
  <JSONPayload>
    <Variable name="reference_id" description="Unique identifier from the requester system." placeholder="1">
      <JSONPath>$.reference_id</JSONPath>
    </Variable>
    <Variable name="date.issuance" description="Date of issuance (YYYY-MM-DD)." placeholder="2023-01-24">
      <JSONPath>$.date.issuance</JSONPath>
    </Variable>
    <Variable name="individual.name_en" description="Individual's name in English." placeholder="Hatim">
      <JSONPath>$.individual.name_en</JSONPath>
    </Variable>
    <Variable name="individual.name_ar" description="Individual's name in Arabic." placeholder="حاتم">
      <JSONPath>$.individual.name_ar</JSONPath>
    </Variable>
    <Variable name="individual.id" description="Individual's ID." placeholder="1012345678">
      <JSONPath>$.individual.id</JSONPath>
    </Variable>
    <Variable name="individual.id_type" description="Type of ID (muqeem or saudi)." placeholder="saudi">
      <JSONPath>$.individual.id_type</JSONPath>
    </Variable>
    <Variable name="group_code" description="Group code in the system (sdaia_ai_2022 or FAL)." placeholder="FAL">
      <JSONPath>$.group_code</JSONPath>
    </Variable>
    <Variable name="certificate_type" description="Type of certificate (completion, professional, attendance)." placeholder="completion">
      <JSONPath>$.certificate_type</JSONPath>
    </Variable>
  </JSONPayload>
  <IgnoreUnresolvedVariables>false</IgnoreUnresolvedVariables>
  <Source clearPayload="false">request</Source>
</ExtractVariables>
```

This generates a nested OpenAPI schema structure like:
```json
{
  "requestBody": {
    "required": true,
    "content": {
      "application/json": {
        "schema": {
          "type": "object",
          "properties": {
            "reference_id": {
              "type": "string",
              "description": "Unique identifier from the requester system.",
              "example": "1"
            },
            "date": {
              "type": "object",
              "properties": {
                "issuance": {
                  "type": "string",
                  "description": "Date of issuance (YYYY-MM-DD).",
                  "example": "2023-01-24"
                }
              }
            },
            "individual": {
              "type": "object",
              "properties": {
                "name_en": {
                  "type": "string",
                  "description": "Individual's name in English.",
                  "example": "Hatim"
                },
                "name_ar": {
                  "type": "string",
                  "description": "Individual's name in Arabic.",
                  "example": "حاتم"
                },
                "id": {
                  "type": "string",
                  "description": "Individual's ID.",
                  "example": "1012345678"
                },
                "id_type": {
                  "type": "string",
                  "description": "Type of ID (muqeem or saudi).",
                  "example": "saudi"
                }
              }
            },
            "group_code": {
              "type": "string",
              "description": "Group code in the system (sdaia_ai_2022 or FAL).",
              "example": "FAL"
            },
            "certificate_type": {
              "type": "string",
              "description": "Type of certificate (completion, professional, attendance).",
              "example": "completion"
            }
          }
        }
      }
    }
  }
}
```

### 3. **Intelligent Response Schema Generation**
Automatically generates OpenAPI response schemas from `AssignMessage` policies:

```xml
<AssignMessage name="OAS-Success-Response">
    <DisplayName>Success Response Schema</DisplayName>
    <Set>
        <StatusCode>200</StatusCode>
        <Payload contentType="application/json">
            {
                "user_id": "12345",
                "username": "john_doe",
                "email": "john@example.com",
                "profile": {
                    "first_name": "John",
                    "last_name": "Doe"
                }
            }
        </Payload>
    </Set>
    <Source>response</Source>
</AssignMessage>
```

### 4. **Comprehensive Error Response Handling**
Processes `RaiseFault` policies to generate accurate error response documentation:

```xml
<RaiseFault name="Raise-Validation-Error">
    <DisplayName>Validation Error</DisplayName>
    <FaultResponse>
        <Set>
            <StatusCode>400</StatusCode>
            <Payload contentType="application/json">
                {
                    "error_code": "VALIDATION_FAILED",
                    "error_message": "Required parameters are missing or invalid"
                }
            </Payload>
        </Set>
    </FaultResponse>
</RaiseFault>
```

### 5. **Multi-Authentication Support**
Configures various authentication schemes in the OpenAPI specification:

- **Basic Authentication**: HTTP Basic Auth
- **API Key**: Header-based API key authentication
- **Bearer Token**: JWT or other bearer token authentication
- **OAuth2**: Client credentials flow with scope support
- **None**: No authentication required

### 6. **Modern Modular Architecture**
Built with a clean, maintainable architecture:

```
src/
├── constants/          # Application constants and configurations
├── parsers/            # XML and policy parsing logic
├── generators/         # OpenAPI specification generation
├── utils/              # Utility functions and helpers
└── converter.js        # Main orchestration logic
```

## 📦 Installation

Install ApigeeToOpenAPI globally to use it as a command-line tool:

### Global Installation (Recommended)
```bash
npm install -g apigeetoopenapi@latest
```

### Using npx (No Installation Required)
```bash
npx apigeetoopenapi [options]
```

### Local Installation
```bash
npm install apigeetoopenapi
```

### Verify Installation
```bash
apigeetoopenapi --help
```

## 🛠️ Usage

### Command Line Interface

```bash
apigeetoopenapi [options]
```

#### **Required Options:**
- `-i, --input <path>`: Path to your bundle.zip file or apiproxy directory
- `-o, --output <path>`: Output directory for the generated OpenAPI specification
- `-n, --name <name>`: Name of the API proxy
- `-b, --baseUrl <url>`: Base URL(s) of the API proxy (comma-separated for multiple)
- `-a, --auth <type>`: Authentication type (`basic`, `apiKey`, `bearer`, `oauth2`, `none`)

#### **Optional Options:**
- `-t, --tokenUrl <url>`: OAuth2 token URL (required when `--auth oauth2`)

### Examples

#### **Basic Usage with ZIP Bundle**
```bash
apigeetoopenapi \
  --input ./my-api-bundle.zip \
  --output ./docs \
  --name "User Management API" \
  --baseUrl "https://api.example.com" \
  --auth apiKey
```

#### **Usage with Directory**
```bash
apigeetoopenapi \
  --input ./apiproxy \
  --output ./openapi-specs \
  --name "Payment API" \
  --baseUrl "https://api.payment.com/v1" \
  --auth oauth2 \
  --tokenUrl "https://auth.payment.com/token"
```

#### **Multiple Base URLs**
```bash
apigeetoopenapi \
  --input ./api-bundle.zip \
  --output ./specs \
  --name "Multi-Environment API" \
  --baseUrl "https://dev-api.example.com,https://staging-api.example.com,https://api.example.com" \
  --auth bearer
```

### Programmatic Usage

#### **Using the Refactored Converter Class**
```javascript
import { Converter } from 'apigeetoopenapi';

const converter = new Converter();
const options = {
  name: 'My API',
  baseUrl: ['https://api.example.com'],
  auth: 'apiKey',
  output: './output'
};

try {
  const spec = await converter.convert('./apiproxy', options, './apiproxy/proxies/default.xml');
  await converter.saveToFile(spec, './output/openapi.json');
  console.log('OpenAPI specification generated successfully!');
} catch (error) {
  console.error('Conversion failed:', error.message);
}
```

#### **Using Individual Components**
```javascript
import {
  ApigeeParser,
  OpenApiGenerator,
  SecurityGenerator
} from 'apigeetoopenapi';

const parser = new ApigeeParser();
const generator = new OpenApiGenerator();

// Parse Apigee proxy information
const apiInfo = await parser.parseApiProxy('./apiproxy', 'my-api');

// Generate OpenAPI specification
generator.initialize(apiInfo);
generator.addServers(['https://api.example.com'], '/v1');

// Add security configuration
const spec = generator.getSpec();
SecurityGenerator.addSecuritySchema(spec, 'apiKey', null, {});
```

#### **Backward Compatibility**
```javascript
import genopenapi from 'apigeetoopenapi';

// Legacy function signature still supported
await genopenapi('./apiproxy', options, './apiproxy/proxies/default.xml', (err, result) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Success!');
  }
});
```

## 📝 Output

The tool generates a complete OpenAPI 3.0.0 specification including:

- **API Information**: Title, description, version
- **Server Configuration**: Base URLs and environments
- **Path Operations**: HTTP methods, parameters, request/response schemas
- **Component Schemas**: Reusable data models
- **Security Schemes**: Authentication configuration
- **Error Responses**: Comprehensive error documentation

### Sample Output Structure
```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "User Management API",
    "description": "API for managing user accounts",
    "version": "v1"
  },
  "servers": [
    {
      "url": "https://api.example.com/users/v1"
    }
  ],
  "paths": {
    "/users/{user_id}": {
      "get": {
        "operationId": "GetUserById",
        "parameters": [...],
        "responses": {...}
      }
    }
  },
  "components": {
    "securitySchemes": {...}
  },
  "security": [...]
}
```

## 🧪 Testing

### Run Linting
```bash
npm run lint
```

### Manual Testing
```bash
# Test with a sample bundle
apigeetoopenapi -i ./test-bundle.zip -o ./test-output -n test-api -b https://test.api.com -a none
```

## 🔧 Configuration

### Type Mapping
The tool automatically maps Apigee data types to OpenAPI types:

- `string` → `string`
- `float` → `number`
- `long` → `number`
- `double` → `number`
- `nodeset` → `object`

### Error Codes
Standard HTTP error responses are automatically generated:
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/hatimalattas/ApigeeToOpenAPI/issues)
- **Documentation**: [Wiki](https://github.com/hatimalattas/ApigeeToOpenAPI/wiki)
- **Email**: hatimalattas@outlook.com

## 🙏 Acknowledgments

- Built for the Apigee developer community
- Inspired by the need for automated API documentation
- Thanks to all contributors and users who provided feedback

---

**ApigeeToOpenAPI** - Streamlining API documentation, one proxy at a time! 🚀
