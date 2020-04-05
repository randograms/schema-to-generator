const { schemaToGenerator } = require('../../index');

describe('schemaToGenerator', function () {
  context('without a schema', function () {
    it('throws an error', function () {
      const testFn = () => {
        schemaToGenerator();
      };

      expect(testFn).to.throw('A json-schema must be provided');
    });
  });

  context('with a json-schema that supports multiple types', function () {
    it('throws an error for now', function () {
      const testFn = () => {
        schemaToGenerator({
          type: ['string', 'number'],
        });
      };

      expect(testFn).to.throw('Multi-typed schemas are not currently supported');
    });
  });

  context('with a json-schema that does not have a type', function () {
    it('throws an error for now', function () {
      const testFn = () => {
        schemaToGenerator({});
      };

      expect(testFn).to.throw('Schemas without a type are not currently supported');
    });
  });

  context('with a compatible json-schema', function () {
    it('returns a dataGenerator function', function () {
      const dataGenerator = schemaToGenerator({ type: 'string' });
      expect(dataGenerator).to.be.a('function');
      expect(dataGenerator.name).to.equal('dataGenerator');
    });
  });
});
