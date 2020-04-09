const jsf = require('json-schema-faker');
const _ = require('lodash');
const schemaValidator = require('../../schemaValidator');
const { schemaToGenerator } = require('../../index');

const sandbox = sinon.createSandbox();

describe('dataGenerator', function () {
  const setupValidatorStub = () => {
    before(function () {
      sinon.spy(schemaValidator, 'validate');
    });
    after(function () {
      schemaValidator.validate.restore();
    });
  };

  const itValidatesTheReturnedData = () => {
    it('validates the returned data', function () {
      expect(schemaValidator.validate).to.be.called
        .and.to.be.calledWithExactly(this.schema, this.result);
    });
  };

  context('without an override', function () {
    before(function () {
      this.returnValue = Symbol('return value');
      sandbox.stub(jsf, 'generate').returns(this.returnValue);
      sandbox.spy(schemaValidator, 'validate');

      this.schema = { type: 'string' };
      const dataGenerator = schemaToGenerator(this.schema);
      this.result = dataGenerator();
    });
    after(sandbox.restore);

    it('calls jsf.generate with the schema', function () {
      expect(jsf.generate).to.be.called
        .and.to.be.calledWithExactly(this.schema);
    });

    it('does not validate the data', function () {
      expect(schemaValidator.validate).to.not.be.called;
    });

    it('returns the generated data', function () {
      expect(this.result).to.equal(this.returnValue);
    });
  });

  context('when the override type does not match the schema type', function () {
    it('throws an error', function () {
      const dataGenerator = schemaToGenerator({ type: 'string' });
      const testFn = () => {
        dataGenerator(1);
      };

      expect(testFn).to.throw('Invalid override type "integer" for schema type "string"');
    });
  });

  context('with a "number" override on an "integer" schema', function () {
    it('throws an error', function () {
      const dataGenerator = schemaToGenerator({ type: 'integer' });
      const testFn = () => {
        dataGenerator(3.5);
      };

      expect(testFn).to.throw('Invalid override type "number" for schema type "integer"');
    });
  });

  [
    ['null', 'null', null],
    ['string', 'string', 'test'],
    ['integer', 'integer', 3],
    ['number', 'integer', 4],
    ['number', 'number', 7.1],
    ['boolean', 'boolean', true],
  ].forEach(([schemaType, overrideType, overrideValue]) => {
    context(`with a "${overrideType}" override on a "${schemaType}" schema`, function () {
      setupValidatorStub();
      before(function () {
        this.schema = { type: schemaType };

        const dataGenerator = schemaToGenerator(this.schema);
        this.result = dataGenerator(overrideValue);
      });

      itValidatesTheReturnedData();

      it('returns the override', function () {
        expect(this.result).to.equal(overrideValue);
      });
    });
  });

  context('with a full object override', function () {
    setupValidatorStub();
    before(function () {
      this.schema = {
        type: 'object',
        properties: {
          field1: { type: 'string' },
          field2: { type: 'number' },
        },
        required: [
          'field1',
          'field2',
        ],
      };

      const dataGenerator = schemaToGenerator(this.schema);
      this.result = dataGenerator({
        field1: 'abcd',
        field2: 1234,
      });
    });

    itValidatesTheReturnedData();

    it('returns an object with the overridden fields', function () {
      expect(this.result).to.eql({
        field1: 'abcd',
        field2: 1234,
      });
    });
  });

  context('with a partial object override', function () {
    setupValidatorStub();
    before(function () {
      this.schema = {
        type: 'object',
        properties: {
          field1: { type: 'string' },
          field2: { type: 'number' },
        },
        required: [
          'field1',
          'field2',
        ],
      };

      const dataGenerator = schemaToGenerator(this.schema);
      this.result = dataGenerator({
        field1: 'abcd',
      });
    });

    itValidatesTheReturnedData();

    it('returns an object with the overridden fields', function () {
      expect(this.result.field1).to.equal('abcd');
    });
  });

  context('with an array override', function () {
    setupValidatorStub();
    before(function () {
      this.schema = {
        type: 'array',
        items: { type: 'number' },
      };

      const dataGenerator = schemaToGenerator(this.schema);
      this.result = dataGenerator([1, 2, 3]);
    });

    itValidatesTheReturnedData();

    it('returns an array', function () {
      expect(this.result).to.eql([1, 2, 3]);
    });
  });

  context('with a partial item override on an array schema', function () {
    setupValidatorStub();
    before(function () {
      this.schema = {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field1: { type: 'string' },
            field2: { type: 'number' },
          },
          required: [
            'field1',
            'field2',
          ],
        },
      };

      const dataGenerator = schemaToGenerator(this.schema);
      this.result = dataGenerator([{ field2: 7 }]);
    });

    itValidatesTheReturnedData();

    it('returns an array with the overridden object', function () {
      expect(this.result).to.be.an('array');
      expect(this.result[0].field2).to.equal(7);
    });
  });

  context('with array overrides of varying length', function () {
    before(function () {
      this.dataGenerator = schemaToGenerator({
        type: 'array',
        items: { type: 'number' },
      });
    });

    it('always respects the length of the override', function () {
      [0, 1, 2, 3, 4, 5].forEach((arrayLength) => {
        const override = _.range(arrayLength);
        const result = this.dataGenerator(override);
        expect(result).to.be.an('array')
          .and.to.have.lengthOf(arrayLength);
      });
    });
  });

  context('when the override is not compatible with the schema', function () {
    it('throws an error with the ajv error text', function () {
      const dataGenerator = schemaToGenerator({
        type: 'number',
        maximum: 3,
      });

      const testFn = () => {
        dataGenerator(4);
      };

      expect(testFn).to.throw('data should be <= 3');
    });
  });
});
