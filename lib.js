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
  buildSchemaCoercionErrorStrategy: (schemaPath) => (validationErrorMessage) => {
    const errorMessage = validationErrorMessage.replace(/data/g, schemaPath);
    throw new Error(errorMessage);
  },
  coerceAllOf: (allOf, override, schemaPath) => (
    allOf.map((innerSchema, index) => lib.coerceSchemaToMatchOverride(innerSchema, override, `${schemaPath}<allOf[${index}]>`))
  ),
  coerceArrayListSchema: (schema, override, schemaPath) => ({
    ...schema,
    items: override.map((innerOverride, index) => lib.coerceSchemaToMatchOverride(schema.items, innerOverride, `${schemaPath}[${index}]`)),
    additionalItems: false,
  }),
  coerceArrayTupleSchema: (schema, override, schemaPath) => ({
    ...schema,
    items: schema.items.map((tupleItemSchema, index) => lib.coerceSchemaToMatchOverride(tupleItemSchema, override[index], `${schemaPath}[${index}]`)),
    additionalItems: false,
  }),
  coerceObjectSchema: (schema, override, schemaPath) => {
    const coercedSchema = { ...schema };

    if (schema.properties) {
      coercedSchema.properties = _.mapValues(
        schema.properties,
        (propertySchema, propertyName) => lib.coerceSchemaToMatchOverride(propertySchema, override[propertyName], `${schemaPath}.${propertyName}`),
      );
    }

    if (schema.patternProperties) {
      const coercedPatternPropertiesByOverrideKeys = _.mapValues(override, (overrideValue, overrideKey) => ({
        allOf: (
          _(schema.patternProperties)
            .toPairs()
            .filter(([pattern]) => (new RegExp(pattern)).test(overrideKey))
            .map(([/* pattern */, patternPropertySchema]) => lib.coerceSchemaToMatchOverride(patternPropertySchema, overrideValue, `${schemaPath}."${overrideKey}"`))
            .value()
        ),
      }));

      delete coercedSchema.patternProperties;
      coercedSchema.properties = coercedSchema.properties || {};
      coercedSchema.required = coercedSchema.required || [];

      _.forEach(coercedPatternPropertiesByOverrideKeys, (coercedPatternPropertySchema, overrideKey) => {
        coercedSchema.properties[overrideKey] = coercedPatternPropertySchema;
        coercedSchema.required.push(overrideKey);
      });
    }

    return coercedSchema;
  },
  coerceSchemaToMatchOverride: (schema, override, schemaPath) => {
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

    if (overrideDataType === 'object' && (coercedSchema.properties !== undefined || coercedSchema.patternProperties !== undefined)) {
      lib.shallowValidate(coercedSchema, override, schemaPath);
      coercedSchema = lib.coerceObjectSchema(coercedSchema, override, schemaPath);
    }

    if (overrideDataType === 'array' && schema.items !== undefined) {
      lib.shallowValidate(coercedSchema, override, schemaPath);
      coercedSchema = _.isArray(coercedSchema.items)
        ? lib.coerceArrayTupleSchema(coercedSchema, override, schemaPath)
        : lib.coerceArrayListSchema(coercedSchema, override, schemaPath);
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
  coerceValidInnerSchemas: (allInnerSchemas, override, schemaPath, schemaPathKey) => {
    const coercedInnerSchemas = allInnerSchemas.map((innerSchema, index) => {
      try {
        return lib.coerceSchemaToMatchOverride(innerSchema, override, `${schemaPath}<${schemaPathKey}[${index}]>`);
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
  schemaToGenerator: (
    schema,
    {
      generateBaseData = (coercedSchema) => jsf.generate(coercedSchema),
      immutable = false,
    } = {},
  ) => {
    if (!schema) {
      throw new Error('A json-schema must be provided');
    }

    const dataGenerator = (override) => {
      const overrideDataType = lib.getDataType(override);
      const coercedSchema = lib.coerceSchemaToMatchOverride(schema, override, 'override');
      const baseData = generateBaseData(coercedSchema);
      const isMergeable = overrideDataType === 'object' || overrideDataType === 'array';

      let mockData;
      if (overrideDataType === 'undefined') {
        mockData = baseData;
      } else if (isMergeable) {
        mockData = _.merge(baseData, override);
      } else {
        mockData = override;
      }

      lib.validate({
        schema,
        data: mockData,
        errorStrategy: (validationErrorMessage) => {
          const validationError = `${reset('Validation error:')} ${red(validationErrorMessage)}`;
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
        },
      });

      if (immutable && mockData !== null && typeof mockData === 'object') {
        return deepFreeze(mockData);
      }

      return mockData;
    };

    return dataGenerator;
  },
  schemasToGenerators: (schemas, { generateBaseData, immutable } = {}) => (
    _.mapValues(schemas, (schema) => lib.schemaToGenerator(schema, { generateBaseData, immutable }))
  ),
  schemaValidator: new Ajv(),
  shallowValidate: (schemaWithKnownType, override, schemaPath) => {
    const shallowSchema = { ...schemaWithKnownType };
    delete shallowSchema.allOf;
    delete shallowSchema.anyOf;
    delete shallowSchema.oneOf;

    const buildEmptySchema = () => ({});

    let coercedOverride = override;
    if (schemaWithKnownType.type === 'object') {
      if (schemaWithKnownType.properties) {
        shallowSchema.properties = _.mapValues(schemaWithKnownType.properties, buildEmptySchema);
        const placeHolderProperties = _.mapValues(schemaWithKnownType.properties, () => null);
        coercedOverride = {
          ...placeHolderProperties,
          ...override,
        };
      }

      if (schemaWithKnownType.patternProperties) {
        shallowSchema.patternProperties = _.mapValues(schemaWithKnownType.patternProperties, buildEmptySchema);
      }
    } else if (_.isArray(schemaWithKnownType.items)) {
      shallowSchema.items = schemaWithKnownType.items.map(buildEmptySchema);

      if (shallowSchema.items.length > override.length) {
        coercedOverride = shallowSchema.items.map((itemSchema, index) => override[index]);
      }
    } else {
      shallowSchema.items = {};
    }

    lib.validate({
      schema: shallowSchema,
      data: coercedOverride,
      errorStrategy: lib.buildSchemaCoercionErrorStrategy(schemaPath),
    });
  },
  validate: ({
    schema,
    data,
    errorStrategy,
  }) => {
    const isValid = lib.schemaValidator.validate(schema, data);
    if (!isValid) {
      const validationErrorMessage = lib.schemaValidator.errorsText();

      if (errorStrategy) {
        errorStrategy(validationErrorMessage);
        return;
      }

      throw new Error(validationErrorMessage);
    }
  },
};

module.exports = lib;
