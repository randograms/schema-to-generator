const { schemasToGenerators } = require('../../index');

describe('schemasToGenerators', function () {
  before(function () {
    this.schemas = {
      schema1: {
        type: 'object',
        properties: {
          field1: { type: 'string' },
        },
        required: ['field1'],
      },
      schema2: {
        type: 'array',
        items: { type: 'number' },
      },
    };
  });

  context('with schemas keyed by name', function () {
    before(function () {
      this.dataGenerators = schemasToGenerators(this.schemas);
    });

    it('returns data generators keyed by name', function () {
      expect(Object.keys(this.dataGenerators)).to.eql([
        'schema1',
        'schema2',
      ]);

      expect(this.dataGenerators.schema1.name).to.equal('dataGenerator');
      expect(this.dataGenerators.schema2.name).to.equal('dataGenerator');
    });
  });

  context('with schemas and options', function () {
    before(function () {
      this.dataGenerators = schemasToGenerators(this.schemas, { immutable: true });
    });

    it('passes options to the dataGenerators', function () {
      const result1 = this.dataGenerators.schema1({ field1: 'hello' });
      result1.field1 = 'hi';
      expect(result1).to.eql({ field1: 'hello' });

      const result2 = this.dataGenerators.schema2([1, 2, 3]);
      const testFn = () => {
        result2.push(4);
      };
      expect(testFn).to.throw('Cannot add property 3, object is not extensible');
    });
  });
});
