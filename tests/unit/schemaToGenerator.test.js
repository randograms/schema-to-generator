const { schemaToGenerator } = require('../../lib');

describe('lib.schemaToGenerator', function () {
  context('without a schema', function () {
    it('throws an error', function () {
      const testFn = () => {
        schemaToGenerator();
      };

      expect(testFn).to.throw('A json-schema must be provided');
    });
  });

  context('with a json-schema', function () {
    it('returns a dataGenerator function', function () {
      const dataGenerator = schemaToGenerator({ type: 'string' });
      expect(dataGenerator).to.be.a('function');
      expect(dataGenerator.name).to.equal('dataGenerator');
    });
  });
});
