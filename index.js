const _ = require('lodash');
const jsf = require('json-schema-faker');
const schemaValidator = require('./schemaValidator');

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
    const defaultOverrideType = _.isArray(override) ? 'array' : typeof override;
    const overrideDataType = override === null ? 'null' : defaultOverrideType;
    const schemaDataType = schema.type === 'integer' ? 'number' : schema.type;

    if (overrideDataType !== 'undefined' && overrideDataType !== schemaDataType) {
      throw new Error(`Invalid override type "${overrideDataType}" for schema type "${schema.type}"`);
    }

    if (overrideDataType === 'array') {
      throw new Error('Array overrides are not currently supported');
    }

    const baseData = jsf.generate(schema);
    if (overrideDataType === 'undefined') {
      return baseData;
    }

    const mockData = overrideDataType === 'object'
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
