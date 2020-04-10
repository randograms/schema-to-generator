const _ = require('lodash');
const jsf = require('json-schema-faker');
const schemaValidator = require('./schemaValidator');

const getDataType = (data) => {
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
};

const coerceObjectSchema = (schema, override) => ({
  ...schema,
  properties: _.mapValues(
    schema.properties,
    (propertySchema, propertyName) => coerceSchemaToMatchOverride(propertySchema, override[propertyName]), // eslint-disable-line no-use-before-define
  ),
});

const coerceArraySchema = (schema, override) => ({
  ...schema,
  items: override.map((innerOverride) => coerceSchemaToMatchOverride(schema.items, innerOverride)), // eslint-disable-line no-use-before-define
  minItems: override.length,
  maxItems: override.length,
});

const coerceSchemaToMatchOverride = (schema, override) => {
  const overrideDataType = getDataType(override);

  if (overrideDataType === 'undefined') {
    return schema;
  }

  if (
    overrideDataType !== schema.type
    && !(overrideDataType === 'integer' && schema.type === 'number')
  ) {
    throw new Error(`Invalid override type "${overrideDataType}" for schema type "${schema.type}"`);
  }

  let coercedSchema = schema;
  if (overrideDataType === 'object') {
    coercedSchema = coerceObjectSchema(schema, override);
  } else if (overrideDataType === 'array') {
    if (_.isArray(schema.items)) {
      throw new Error('Tuple array overrides are not currently supported');
    }

    coercedSchema = coerceArraySchema(schema, override);
  }

  return coercedSchema;
};

const schemaToGenerator = (schema) => {
  if (!schema) {
    throw new Error('A json-schema must be provided');
  }

  if (_.isArray(schema.type)) {
    throw new Error('Multi-typed schemas are not currently supported');
  }

  if (!_.isString(schema.type)) {
    throw new Error('Schemas without a type are not currently supported');
  }

  const dataGenerator = (override) => {
    const overrideDataType = getDataType(override);
    const coercedSchema = coerceSchemaToMatchOverride(schema, override);

    const baseData = jsf.generate(coercedSchema);
    if (overrideDataType === 'undefined') {
      return baseData;
    }

    const isMergeable = overrideDataType === 'object' || overrideDataType === 'array';
    const mockData = isMergeable
      ? _.merge(baseData, override)
      : override;

    const isValid = schemaValidator.validate(schema, mockData);
    if (!isValid) {
      throw new Error(schemaValidator.errorsText());
    }

    return mockData;
  };

  return dataGenerator;
};

module.exports = {
  schemaToGenerator,
};
