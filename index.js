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

const coerceObjectSchema = (schema, override, schemaPath) => ({
  ...schema,
  type: 'object',
  properties: _.mapValues(
    schema.properties,
    (propertySchema, propertyName) => coerceSchemaToMatchOverride(propertySchema, override[propertyName], `${schemaPath}.${propertyName}`), // eslint-disable-line no-use-before-define
  ),
});

const coerceTupleArraySchema = (schema, override, schemaPath) => ({
  ...schema,
  type: 'array',
  items: schema.items.map((tupleItemSchema, index) => coerceSchemaToMatchOverride(tupleItemSchema, override[index], `${schemaPath}[${index}]`)), // eslint-disable-line no-use-before-define
});

const coerceListArraySchema = (schema, override, schemaPath) => ({
  ...schema,
  type: 'array',
  items: override.map((innerOverride, index) => coerceSchemaToMatchOverride(schema.items, innerOverride, `${schemaPath}[${index}]`)), // eslint-disable-line no-use-before-define
  minItems: override.length,
  maxItems: override.length,
});

const coerceSchemaToMatchOverride = (schema, override, schemaPath = 'override') => {
  const overrideDataType = getDataType(override);
  const schemaTypes = _.castArray(schema.type);

  if (overrideDataType === 'undefined') {
    return schema;
  }

  if (
    !schemaTypes.includes(overrideDataType)
    && !(overrideDataType === 'integer' && schemaTypes.includes('number'))) {
    throw new Error(`Invalid ${schemaPath} type "${overrideDataType}" for schema type "${schema.type}"`);
  }

  let coercedSchema = schema;
  if (overrideDataType === 'object') {
    coercedSchema = coerceObjectSchema(schema, override, schemaPath);
  } else if (overrideDataType === 'array') {
    coercedSchema = _.isArray(schema.items)
      ? coerceTupleArraySchema(schema, override, schemaPath)
      : coerceListArraySchema(schema, override, schemaPath);
  }

  return coercedSchema;
};

const schemaToGenerator = (schema) => {
  if (!schema) {
    throw new Error('A json-schema must be provided');
  }

  if (!_.isString(schema.type) && !_.isArray(schema.type)) {
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
