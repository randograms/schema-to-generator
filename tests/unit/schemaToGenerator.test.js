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

  context('with a custom generateBaseData function', function () {
    before(function () {
      this.generateBaseData = sinon.stub().returns('test');
      const dataGenerator = schemaToGenerator({ type: 'string' }, { generateBaseData: this.generateBaseData });
      expect(this.generateBaseData).to.not.be.called;

      this.result = dataGenerator();
    });

    it('calls the function with the coerced schema', function () {
      expect(this.generateBaseData).to.be.called
        .and.to.be.calledWithExactly({ type: 'string' });
    });

    it('uses the generated result by default', function () {
      expect(this.result).to.equal('test');
    });
  });
});
