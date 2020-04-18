const Ajv = require('ajv');
const _ = require('lodash');
const {
  red,
  green,
  blue,
  reset,
} = require('ansi-colors');
const jsf = require('json-schema-faker');
const deepFreeze = require('deep-freeze');

const lib = {
  coerceAllOf: (allOf, override, schemaPath) => (
    allOf.map((innerSchema, index) => lib.coerceSchemaToMatchOverride(innerSchema, override, `${schemaPath}<allOf[${index}]>`)) // eslint-disable-line no-use-before-define
  ),
  coerceListArraySchema: (schema, override, schemaPath) => ({
    ...schema,
    items: override.map((innerOverride, index) => lib.coerceSchemaToMatchOverride(schema.items, innerOverride, `${schemaPath}[${index}]`)), // eslint-disable-line no-use-before-define
    minItems: override.length,
    maxItems: override.length,
  }),
  coerceObjectSchema: (schema, override, schemaPath) => {
    if (schema.additionalProperties === false) {
      const invalidAdditionalProperties = (
        _(override)
          .keys()
          .reject((propertyName) => _.has(schema.properties, propertyName))
          .value()
      );

      if (invalidAdditionalProperties.length > 0) {
        const formattedInvalidPropertyNames = invalidAdditionalProperties.map((propertyName) => `"${propertyName}"`).join(', ');
        throw new Error(`Invalid additional properties ${formattedInvalidPropertyNames} on ${schemaPath}`);
      }
    }

    return {
      ...schema,
      properties: _.mapValues(
        schema.properties,
        (propertySchema, propertyName) => lib.coerceSchemaToMatchOverride(propertySchema, override[propertyName], `${schemaPath}.${propertyName}`), // eslint-disable-line no-use-before-define
      ),
    };
  },
  coerceSchemaToMatchOverride: (schema, override, schemaPath = 'override') => {
    const overrideDataType = lib.getDataType(override);
    const schemaAllowsAnyType = schema.type === undefined;
    const schemaTypes = _.castArray(schema.type);

    if (overrideDataType === 'undefined') {
      return schema;
    }

    if (
      !schemaAllowsAnyType
      && !schemaTypes.includes(overrideDataType)
      && !(overrideDataType === 'integer' && schemaTypes.includes('number'))) {
      throw new Error(`Invalid ${schemaPath} type "${overrideDataType}" for schema type "${schema.type}"`);
    }

    let coercedSchema = {
      ...schema,
      type: overrideDataType,
    };

    if (overrideDataType === 'object' && coercedSchema.properties !== undefined) {
      coercedSchema = lib.coerceObjectSchema(coercedSchema, override, schemaPath);
    }

    if (overrideDataType === 'array' && schema.items !== undefined) {
      coercedSchema = _.isArray(coercedSchema.items)
        ? lib.coerceTupleArraySchema(coercedSchema, override, schemaPath)
        : lib.coerceListArraySchema(coercedSchema, override, schemaPath);
    }

    if (coercedSchema.allOf !== undefined) {
      coercedSchema.allOf = lib.coerceAllOf(coercedSchema.allOf, override, schemaPath);
    }

    if (coercedSchema.anyOf !== undefined) {
      coercedSchema.anyOf = lib.coerceValidInnerSchemas(coercedSchema.anyOf, override, schemaPath, 'anyOf');
    }

    if (coercedSchema.oneOf !== undefined) {
      coercedSchema.oneOf = lib.coerceValidInnerSchemas(coercedSchema.oneOf, override, schemaPath, 'oneOf');
    }

    return coercedSchema;
  },
  coerceTupleArraySchema: (schema, override, schemaPath) => ({
    ...schema,
    items: schema.items.map((tupleItemSchema, index) => lib.coerceSchemaToMatchOverride(tupleItemSchema, override[index], `${schemaPath}[${index}]`)), // eslint-disable-line no-use-before-define
  }),
  coerceValidInnerSchemas: (allInnerSchemas, override, schemaPath, schemaPathKey) => {
    const coercedInnerSchemas = allInnerSchemas.map((innerSchema, index) => {
      try {
        return lib.coerceSchemaToMatchOverride(innerSchema, override, `${schemaPath}<${schemaPathKey}[${index}]>`); // eslint-disable-line no-use-before-define
      } catch (error) {
        return error;
      }
    });

    const validInnerSchemas = _.reject(coercedInnerSchemas, _.isError);
    if (validInnerSchemas.length === 0) {
      const invalidInnerSchemaMessages = _.chain(coercedInnerSchemas).filter(_.isError).map('message').join(', ');
      throw new Error(invalidInnerSchemaMessages);
    }

    return validInnerSchemas;
  },
  getDataType: (data) => {
    switch (true) {
      case data === null:
        return 'null';
      case _.isArray(data):
        return 'array';
      case _.isInteger(data):
        return 'integer';
      default:
        return typeof data;
    }
  },
  schemaToGenerator: (schema, { immutable = false } = {}) => {
    if (!schema) {
      throw new Error('A json-schema must be provided');
    }

    const dataGenerator = (override) => {
      const overrideDataType = lib.getDataType(override);
      const coercedSchema = lib.coerceSchemaToMatchOverride(schema, override);
      const baseData = jsf.generate(coercedSchema);
      const isMergeable = overrideDataType === 'object' || overrideDataType === 'array';

      let mockData;
      if (overrideDataType === 'undefined') {
        mockData = baseData;
      } else if (isMergeable) {
        mockData = _.merge(baseData, override);
      } else {
        mockData = override;
      }

      const isValid = lib.schemaValidator.validate(schema, mockData);
      if (!isValid) {
        const validationError = `${reset('Validation error:')} ${red(lib.schemaValidator.errorsText())}`;
        const errorMessage = [
          red('Data Generator Error'),
          validationError,
          reset('Original Schema:'),
          green(JSON.stringify(schema, null, 2)),
          validationError,
          reset('Generated Mock Data:'),
          blue(JSON.stringify(mockData, null, 2)),
        ].join('\n');
        throw new Error(errorMessage);
      }

      if (immutable && mockData !== null && typeof mockData === 'object') {
        return deepFreeze(mockData);
      }

      return mockData;
    };

    return dataGenerator;
  },
  schemasToGenerators: (schemas, { immutable } = {}) => (
    _.mapValues(schemas, (schema) => lib.schemaToGenerator(schema, { immutable }))
  ),
  schemaValidator: new Ajv(),
  setJsfPatternHandler: (patternHandler) => {
    jsf.define('pattern', patternHandler);
  },
};

module.exports = lib;
