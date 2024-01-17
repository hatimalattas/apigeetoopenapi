# ApigeeToOpenAPI

## Introduction

**ApigeeToOpenAPI** tool is a powerful utility for converting Apigee Proxy Bundles into OpenAPI specifications. It is designed to simplify API documentation and assist developers in managing API endpoints more efficiently.

## Features

### 1. Proxy Bundle Parsing

- **Input Acceptance**: Processes zipped Apigee Proxy Bundles containing XML configurations of API properties.
- **Endpoint Parsing**: Analyzes "Request Proxy Endpoint" flows to construct detailed OpenAPI paths, parameters, and methods.

### 2. Parameter Extraction

The tool parses various elements from the Apigee Proxy Bundle, including query parameters, form parameters, and JSON payloads. It constructs OpenAPI Spec paths, parameters, and HTTP methods from the "Request Proxy Endpoint" flows. The differentiation between optional and required fields is based on the `IgnoreUnresolvedVariables` element:

- **Optional Fields**: If `IgnoreUnresolvedVariables` is set to `true`, the field is considered optional.

  Example:
  ```xml
  <ExtractVariables name="ExtractVariables-2">
     <DisplayName>Extract a value from a query parameter</DisplayName>
     <Source>request</Source>
     <QueryParam name="code">
        <Pattern ignoreCase="true">DBN{dbncode}</Pattern>
     </QueryParam>
     <IgnoreUnresolvedVariables>true</IgnoreUnresolvedVariables>
  </ExtractVariables>
    ```
- **Required Fields**: If `IgnoreUnresolvedVariables` is set to `false`, the field is considered required.

Example:
```xml
<ExtractVariables name="ExtractVariables-3">
   <DisplayName>Extract a value from a query parameter</DisplayName>
   <Source>request</Source>
   <QueryParam name="code">
      <Pattern ignoreCase="true">DBN{dbncode}</Pattern>
   </QueryParam>
   <IgnoreUnresolvedVariables>false</IgnoreUnresolvedVariables>
</ExtractVariables>
```

> **Note**: If an endpoint contains both optional and required fields, there must be two separate "Extract Variables Policies" attached to the "Proxy Endpoint Request" flow — one with `IgnoreUnresolvedVariables` set to `true` (for optional fields) and another with `IgnoreUnresolvedVariables` set to `false` (for required fields).

In addition to parsing standard parameters, the tool specifically extracts and utilizes description and placeholder attributes. This functionality enriches the OpenAPI specification with detailed descriptions and sample values for various parameters.

```xml
<ExtractVariables async="false" continueOnError="false" enabled="true" name="Extract-Date-Range-Query">
    <DisplayName>Extract Date Range Query</DisplayName>
    <QueryParam name="start_date" description="This parameter specifies the beginning of the time period for which you want to retrieve manager's timesheets. The value should be provided in a standard date format MM/DD/YYYY." placeholder="01/01/2022">
        <Pattern ignoreCase="true">{start_date}</Pattern>
    </QueryParam>
    <QueryParam name="end_date" description="This parameter defines the end of the time period for querying manager's timesheets. Similar to the start_date parameter, the date should be in a standard format." placeholder="12/29/2023">
        <Pattern ignoreCase="true">{end_date}</Pattern>
    </QueryParam>
    <IgnoreUnresolvedVariables>false</IgnoreUnresolvedVariables>
</ExtractVariables>
```

In this `ExtractVariables` policy, the tool extracts the descriptions and placeholders for `start_date` and `end_date` query parameters. These details are then incorporated into the OpenAPI specification to provide clear documentation and examples for API consumers.

Here is an example of how the tool processes these attributes:

### 3. Response Schema Generation

The tool parses the "AssignMessage" policy within the "Proxy Endpoint Response Flow" to build OpenAPI response schemas.

Example:
```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<AssignMessage async="false" continueOnError="false" enabled="false" name="OAS">
    <DisplayName>OAS</DisplayName>
    <Set>
        <Payload contentType="application/json">
            {"name":"foo", "type":"bar"}
        </Payload>
    </Set>
    <Source clearPayload="false">response</Source>
</AssignMessage>
```

### 4. Error Response Handling

The tool also parses the `RaiseFault` policies within the ProxyEndpoint Request Flow. These policies are typically used to handle error conditions in Apigee API proxies. By parsing these policies, the tool can accurately represent error responses in the generated OpenAPI specification.

Example
```xml
<RaiseFault async="false" continueOnError="false" enabled="true" name="Raise-Missing-Date-Range">
    <DisplayName>Raise Missing Date Range</DisplayName>
    <FaultResponse>
        <AssignVariable>
            <Name>error_message</Name>
            <Value>Missing Date Parameters.</Value>
        </AssignVariable>
        <AssignVariable>
            <Name>error_code</Name>
            <Value>400</Value>
        </AssignVariable>
    </FaultResponse>
</RaiseFault>
```


### 5. Authentication Configuration

- **Security Scheme Setup**: Configures various authentication types for security schemes in the OpenAPI spec, including OAuth2, API Key, and Basic Auth.

## Usage

1. **Installation**: Install the tool via npm:

    ```bash
    npm install apigeetoopenapi
    ```

2. **Running the Tool**: To convert an API Proxy Bundle:

    ```bash
    apigeetoopenapi [options]
    ```

    Options include:
    - `-o, --output <file>`: Outout path for the openapi spec.
    - `-l, --local <file>`: Path to your bundle.zip file.
    - `-n, --name <API name>`: Name of the API proxy.
    - `-b, --baseurl <API proxy endpoint>`: Base URL of the API proxy.
    - `-a, --auth <type>`: Authentication type (basic, apiKey, oauth2, none).

## Conclusion

ApigeeToOpenAPI is a robust tool that automates the conversion of Apigee Proxy Bundles to OpenAPI specifications, helping developers to streamline their API documentation process and focus on API development.
