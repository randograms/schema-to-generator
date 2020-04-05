const jsf = require('json-schema-faker');

const schemaToGenerator = (schema) => {
  if (!schema) {
    throw new Error('A json-schema must be provided');
  }

  const dataGenerator = () => jsf.generate(schema);

  return dataGenerator;
};

module.exports = {
  schemaToGenerator,
};
