# ApigeeToOpenAPI

[![npm version](https://badge.fury.io/js/apigeetoopenapi.svg)](https://badge.fury.io/js/apigeetoopenapi)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful CLI tool that converts Apigee Proxy Bundles into comprehensive OpenAPI 3.0.0 specifications with intelligent policy parsing and schema generation.

## 🚀 Quick Start

```bash
# Install globally
npm install -g apigeetoopenapi@latest

# Convert an Apigee bundle
apigeetoopenapi -i ./api-bundle.zip -o ./openapi-output -n "My API" -b "https://api.example.com" -a apiKey

# Use without installation
npx apigeetoopenapi -i ./bundle.zip -o ./output -n "API Name" -b "https://api.example.com" -a oauth2 -t "https://auth.example.com/token"
```

## 🆕 What's New in v5.1.0

- **🏗️ Modular Architecture**: Complete rewrite with separation of concerns
- **🔧 Enhanced Parameter Detection**: Improved logic for required vs optional fields
- **📄 Better Documentation**: Comprehensive policy support documentation
- **🔒 Multiple Auth Types**: Enhanced authentication scheme support
- **⚡ Performance Improvements**: Optimized parsing and generation pipeline

## 📦 Installation

### Global Installation (Recommended)
```bash
npm install -g apigeetoopenapi@latest
```

### Using npx (No Installation)
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

#### Required Options
- `-i, --input <path>` - Path to bundle.zip file or apiproxy directory
- `-o, --output <path>` - Output directory for OpenAPI specification
- `-n, --name <name>` - API proxy name
- `-b, --baseUrl <url>` - Base URL(s) (comma-separated for multiple environments)
- `-a, --auth <type>` - Authentication type: `basic`, `apiKey`, `bearer`, `oauth2`, `none`

#### Optional Options
- `-t, --tokenUrl <url>` - OAuth2 token URL (required when using `--auth oauth2`)
- `-k, --apiKeyHeader <name>` - Header name for API key authentication (defaults to "apikey")
- `-v, --verbose` - Enable verbose output for debugging

### Examples

#### Basic Usage
```bash
apigeetoopenapi \
  --input ./payment-api.zip \
  --output ./docs \
  --name "Payment API" \
  --baseUrl "https://api.payment.com" \
  --auth apiKey
```

#### Multiple Environments
```bash
apigeetoopenapi \
  --input ./user-api \
  --output ./openapi-specs \
  --name "User Management" \
  --baseUrl "https://dev-api.example.com,https://api.example.com" \
  --auth oauth2 \
  --tokenUrl "https://auth.example.com/token"
```

#### Directory Input
```bash
apigeetoopenapi \
  --input ./apiproxy \
  --output ./output \
  --name "Notification API" \
  --baseUrl "https://api.example.com/v1" \
  --auth bearer
```

#### Custom API Key Header
```bash
apigeetoopenapi \
  --input ./api-bundle.zip \
  --output ./docs \
  --name "Payment API" \
  --baseUrl "https://api.payment.com" \
  --auth apiKey \
  --apiKeyHeader "X-API-Key"
```

#### Verbose Mode for Debugging
```bash
apigeetoopenapi \
  --input ./bundle.zip \
  --output ./output \
  --name "API Name" \
  --baseUrl "https://api.example.com" \
  --auth apiKey \
  --verbose
```

## 🔧 How It Works

The tool analyzes your Apigee Proxy Bundle and converts it into OpenAPI 3.0.0 specification by:

1. **Parsing Proxy Endpoints** - Extracts flows, conditions, and routing information
2. **Processing Policies** - Analyzes ExtractVariables, AssignMessage, and RaiseFault policies
3. **Generating Schemas** - Creates OpenAPI paths, parameters, and response schemas
4. **Adding Security** - Configures authentication schemes based on your choice

## 📚 Apigee Policy Support

### Parameter Extraction (ExtractVariables)

The tool extracts API parameters from `ExtractVariables` policies in request flows:

#### Query Parameters
```xml
<ExtractVariables name="EV-ExtractQueryParams">
    <QueryParam name="user_id" description="Unique identifier for the user" placeholder="12345">
        <Pattern ignoreCase="true">{user_id}</Pattern>
    </QueryParam>
    <QueryParam name="filter" description="Filter criteria for results" placeholder="active">
        <Pattern ignoreCase="true">{filter}</Pattern>
    </QueryParam>
    <IgnoreUnresolvedVariables>false</IgnoreUnresolvedVariables>
</ExtractVariables>
```

#### Header Parameters
```xml
<ExtractVariables name="EV-ExtractHeaders">
    <Header name="Authorization" description="Bearer token for authentication" placeholder="Bearer abc123">
        <Pattern ignoreCase="false">Bearer {token}</Pattern>
    </Header>
    <Header name="Content-Type" description="Media type of the request" placeholder="application/json">
        <Pattern ignoreCase="true">{content_type}</Pattern>
    </Header>
    <IgnoreUnresolvedVariables>true</IgnoreUnresolvedVariables>
</ExtractVariables>
```

#### Form Parameters
```xml
<ExtractVariables name="EV-ExtractFormData">
    <FormParam name="username" description="User's login name" placeholder="john_doe">
        <Pattern ignoreCase="true">{username}</Pattern>
    </FormParam>
    <FormParam name="password" description="User's password" placeholder="********">
        <Pattern ignoreCase="true">{password}</Pattern>
    </FormParam>
    <IgnoreUnresolvedVariables>false</IgnoreUnresolvedVariables>
</ExtractVariables>
```

#### JSON Request Body with Nested Objects
```xml
<ExtractVariables name="EV-ExtractPayload">
    <JSONPayload>
        <Variable name="user.name" type="string" description="User's full name" placeholder="John Doe">
            <JSONPath>$.user.name</JSONPath>
        </Variable>
        <Variable name="user.email" type="string" description="User's email address" placeholder="john@example.com">
            <JSONPath>$.user.email</JSONPath>
        </Variable>
        <Variable name="user.age" type="integer" description="User's age" placeholder="30">
            <JSONPath>$.user.age</JSONPath>
        </Variable>
        <Variable name="user.salary" type="float" description="User's salary" placeholder="75000.50">
            <JSONPath>$.user.salary</JSONPath>
        </Variable>
        <Variable name="preferences.notifications" type="boolean" description="Enable notifications" placeholder="true">
            <JSONPath>$.preferences.notifications</JSONPath>
        </Variable>
    </JSONPayload>
    <IgnoreUnresolvedVariables>false</IgnoreUnresolvedVariables>
    <Source>request</Source>
</ExtractVariables>
```

#### Array Parameters
The tool supports array parameters using `type="nodeset"` with custom `itemType` attribute:

```xml
<ExtractVariables name="EV-ExtractArrays">
    <JSONPayload>
        <!-- Integer array -->
        <Variable name="userIds" type="nodeset" itemType="integer"
                  description="Array of user IDs"
                  placeholder="[1, 2, 3, 4, 5]">
            <JSONPath>$.userIds</JSONPath>
        </Variable>

        <!-- Object array -->
        <Variable name="users" type="nodeset" itemType="object"
                  description="Array of user objects"
                  placeholder='[{"id": 1, "name": "John"}, {"id": 2, "name": "Jane"}]'>
            <JSONPath>$.users</JSONPath>
        </Variable>

        <!-- String array -->
        <Variable name="categories" type="nodeset" itemType="string"
                  description="Product categories"
                  placeholder='["electronics", "books", "clothing"]'>
            <JSONPath>$.categories</JSONPath>
        </Variable>

        <!-- Mixed type array -->
        <Variable name="mixedData" type="nodeset" itemType="string,integer,boolean"
                  description="Mixed type array"
                  placeholder='["hello", 42, true, "world", 99, false]'>
            <JSONPath>$.mixedData</JSONPath>
        </Variable>
    </JSONPayload>
    <IgnoreUnresolvedVariables>false</IgnoreUnresolvedVariables>
    <Source>request</Source>
</ExtractVariables>
```

**Array ItemTypes Supported:**
- `string` - Array of strings
- `integer` - Array of integers
- `number` - Array of numbers
- `boolean` - Array of booleans
- `object` - Array of objects (default if not specified)
- `string,integer,boolean` - Mixed arrays (comma-separated types)

**Generated OpenAPI Schema Examples:**

For `itemType="integer"`:
```json
{
  "type": "array",
  "items": {
    "type": "integer"
  },
  "example": [1, 2, 3, 4, 5]
}
```

For `itemType="string,integer,boolean"`:
```json
{
  "type": "array",
  "items": {
    "anyOf": [
      {"type": "string"},
      {"type": "integer"},
      {"type": "boolean"}
    ]
  },
  "example": ["hello", 42, true]
}
```

#### Required vs Optional Parameters

Parameters are marked as required/optional based on `IgnoreUnresolvedVariables`:
- `IgnoreUnresolvedVariables="false"` → **Required parameters**
- `IgnoreUnresolvedVariables="true"` → **Optional parameters**

#### Supported Data Types for JSON Variables

The `type` attribute is only supported for JSON payload variables. The tool supports these types that are automatically converted to OpenAPI schema types:

| Input Type | OpenAPI Type | Description |
|------------|--------------|-------------|
| `string` | `string` | Text values (default if no type specified) |
| `integer` | `integer` | Whole numbers |
| `boolean` | `boolean` | True/false values |
| `float` | `number` | Floating-point numbers |
| `double` | `number` | Double-precision numbers |
| `long` | `number` | Long integer numbers |
| `nodeset` | `array` | Array of values (requires `itemType` attribute) |
| `object` | `object` | Object values |

**Default Behavior**: If no `type` attribute is specified, the parameter defaults to `string` type.

**Array Types**: When using `type="nodeset"`, you must specify the `itemType` attribute to define what type of items the array contains.

**Note**:
- Query parameters, headers, and form parameters are automatically typed as strings in the OpenAPI specification
- Nested objects are automatically created using dot notation (e.g., `user.name` creates a `user` object with a `name` property)

#### Description and Placeholder Support

All parameter types support `description` and `placeholder` attributes:
- **`description`**: Provides documentation for the parameter in the OpenAPI specification
- **`placeholder`**: Sets the example value for the parameter in the OpenAPI specification

These attributes enhance the generated OpenAPI documentation with meaningful descriptions and example values.

### Response Schema Generation (AssignMessage)

Generate OpenAPI response schemas using `AssignMessage` policies in response flows:

#### Requirements
1. Policy name **must contain "OAS"**
2. Policy **must be disabled** (`enabled="false"`)
3. Policy **must be in Response section** of a conditional flow

#### Example Policy
```xml
<AssignMessage continueOnError="false" enabled="false" name="AM-UserResponseOAS">
    <DisplayName>User API Response Schema</DisplayName>
    <Set>
        <Payload contentType="application/json">
            {
                "user_id": "12345",
                "username": "john_doe",
                "email": "john@example.com",
                "profile": {
                    "first_name": "John",
                    "last_name": "Doe",
                    "age": 30,
                    "active": true
                },
                "created_at": "2023-01-15T10:30:00Z",
                "last_login": "2023-12-01T14:22:33Z"
            }
        </Payload>
    </Set>
</AssignMessage>
```

#### ProxyEndpoint Placement
```xml
<Flow name="Get User">
    <Request>
        <Step>
            <Name>EV-ExtractUserId</Name>
        </Step>
    </Request>
    <Response>
        <Step>
            <Name>AM-UserResponseOAS</Name>
        </Step>
    </Response>
    <Condition>(proxy.pathsuffix MatchesPath "/users/{user_id}") and (request.verb = "GET")</Condition>
</Flow>
```

### Error Response Handling (RaiseFault)

Generate error response documentation from `RaiseFault` policies:

```xml
<RaiseFault continueOnError="false" enabled="true" name="RF-UserNotFound">
    <DisplayName>User Not Found Error</DisplayName>
    <FaultResponse>
        <AssignVariable>
            <Name>error_message</Name>
            <Value>User not found</Value>
        </AssignVariable>
        <AssignVariable>
            <Name>error_code</Name>
            <Value>404</Value>
        </AssignVariable>
    </FaultResponse>
</RaiseFault>
```

The tool automatically generates error responses based on `error_code` and `error_message` variables.

### JavaScript Error Handling

Generate error response documentation from JavaScript policies that set error context variables:

#### JavaScript Policy Structure
```xml
<Javascript name="ValidateUserRequest" timeLimit="200">
    <DisplayName>Validate User Request Data</DisplayName>
    <ResourceURL>jsc://validate-user-request.js</ResourceURL>
</Javascript>
```

#### JavaScript File Content (validate-user-request.js)
```javascript
// Parse request data
var requestData = JSON.parse(request.content);

// Email validation
if (!requestData.email) {
    context.setVariable("error_message", "Email is required");
    context.setVariable("error_code", 400);
    throw new Error("Email validation failed");
}

// Age validation
if (requestData.age < 18) {
    context.setVariable("error_message", "User must be at least 18 years old");
    context.setVariable("error_code", 403);
    throw new Error("Age validation failed");
}

// Authorization check
if (!hasPermission(requestData.userId)) {
    context.setVariable("error_message", "Insufficient permissions for this operation");
    context.setVariable("error_code", 403);
    throw new Error("Authorization failed");
}

// Invalid format check
if (!isValidFormat(requestData.data)) {
    context.setVariable("error_message", "Invalid data format provided");
    context.setVariable("error_code", 422);
    throw new Error("Format validation failed");
}
```

#### How It Works
The tool automatically:
1. **Detects JavaScript policies** in request flows
2. **Loads JavaScript files** from `resources/jsc/` directory
3. **Parses error patterns** using regex to find `context.setVariable` calls
4. **Matches error messages with codes** based on their proximity in the code
5. **Generates OpenAPI error responses** for each detected error scenario

#### Supported Patterns
The tool recognizes these JavaScript error patterns:

```javascript
// Standard pattern
context.setVariable("error_message", "Your error message here");
context.setVariable("error_code", 400);

// Mixed quotes
context.setVariable('error_message', 'Your error message here');
context.setVariable('error_code', 400);

// Extra spacing (automatically handled)
context.setVariable( "error_message" , "Your error message here" );
context.setVariable(  "error_code"  ,  400  );
```

#### Generated OpenAPI Error Responses
From the JavaScript example above, the tool generates:

```json
{
  "400": {
    "description": "Bad Request",
    "content": {
      "application/json": {
        "schema": {
          "oneOf": [
            {
              "type": "object",
              "properties": {
                "error_message": {
                  "type": "string",
                  "example": "Email is required"
                },
                "error_code": {
                  "type": "string",
                  "example": "400"
                }
              }
            }
          ]
        }
      }
    }
  },
  "403": {
    "description": "Forbidden",
    "content": {
      "application/json": {
        "schema": {
          "oneOf": [
            {
              "type": "object",
              "properties": {
                "error_message": {
                  "type": "string",
                  "example": "User must be at least 18 years old"
                }
              }
            },
            {
              "type": "object",
              "properties": {
                "error_message": {
                  "type": "string",
                  "example": "Insufficient permissions for this operation"
                }
              }
            }
          ]
        }
      }
    }
  }
}
```

## 🔐 Authentication Support

Configure authentication schemes using the `-a` option:

### API Key Authentication
```bash
apigeetoopenapi ... --auth apiKey
```

Generates (using default header name):
```yaml
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: apikey
```

#### Custom API Key Header Name
```bash
apigeetoopenapi ... --auth apiKey --apiKeyHeader "X-API-Key"
```

Generates:
```yaml
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
```

### Basic Authentication
```bash
apigeetoopenapi ... --auth basic
```

### Bearer Token
```bash
apigeetoopenapi ... --auth bearer
```

### OAuth 2.0
```bash
apigeetoopenapi ... --auth oauth2 --tokenUrl "https://auth.example.com/token"
```

#### Automatic OAuth Scope Detection
When using OAuth 2.0 authentication, the tool automatically detects OAuth scopes from `OAuthV2` policies in the PreFlow:

```xml
<OAuthV2 name="OAuthV2-VerifyAccessToken">
    <DisplayName>Verify OAuth v2.0 Access Token</DisplayName>
    <Operation>VerifyAccessToken</Operation>
    <Scope>read write admin</Scope>
</OAuthV2>
```

The scopes are automatically extracted and included in the OpenAPI specification:
```yaml
components:
  securitySchemes:
    oauth2ClientCredentials:
      type: oauth2
      flows:
        clientCredentials:
          tokenUrl: https://auth.example.com/token
          scopes:
            read: ""
            write: ""
            admin: ""
```

### No Authentication
```bash
apigeetoopenapi ... --auth none
```

## 🏗️ Architecture

The tool uses a modular architecture:

```
src/
├── converter.js           # Main orchestrator
├── parsers/              # XML and policy parsers
│   ├── apigeeParser.js   # Proxy endpoint parsing
│   └── policyParser.js   # Individual policy parsing
├── generators/           # OpenAPI component generators
│   ├── openApiGenerator.js     # Core OpenAPI structure
│   ├── parameterGenerator.js   # Parameters and request bodies
│   ├── errorGenerator.js       # Error responses
│   └── securityGenerator.js    # Authentication schemes
├── utils/                # Utility functions
└── constants/           # Configuration constants
```

## 📝 Programmatic Usage

```javascript
import { Converter } from 'apigeetoopenapi';

const converter = new Converter();
const options = {
    name: 'My API',
    baseUrl: ['https://api.example.com'],
    auth: 'apiKey'
};

try {
    const spec = await converter.convert(
        './apiproxy',
        options,
        './apiproxy/proxies/default.xml'
    );

    await converter.saveToFile(spec, './openapi.json');
    console.log('OpenAPI specification generated successfully!');
} catch (error) {
    console.error('Conversion failed:', error.message);
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues

Report bugs and feature requests at: https://github.com/hatimalattas/ApigeeToOpenAPI/issues

## 📊 NPM Package

View on NPM: https://www.npmjs.com/package/apigeetoopenapi