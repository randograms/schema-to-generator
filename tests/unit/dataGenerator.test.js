const jsf = require('json-schema-faker');
const schemaValidator = require('../../schemaValidator');
const { schemaToGenerator } = require('../../index');

const sandbox = sinon.createSandbox();

describe('dataGenerator', function () {
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

      expect(testFn).to.throw('Invalid override type "number" for schema type "string"');
    });
  });

  context('with an "array" override', function () {
    it('throws an error for now', function () {
      const dataGenerator = schemaToGenerator({ type: 'array' });
      const testFn = () => {
        dataGenerator([1, 2, 3]);
      };

      expect(testFn).to.throw('Array overrides are not currently supported');
    });
  });

  [
    ['null', null],
    ['string', 'test'],
    ['number', 7],
    ['integer', 3],
    ['boolean', true],
  ].forEach(([type, value]) => {
    context(`with a "${type}" override`, function () {
      before(function () {
        this.schema = { type };
        sandbox.spy(schemaValidator, 'validate');

        const dataGenerator = schemaToGenerator(this.schema);
        this.result = dataGenerator(value);
      });
      after(sandbox.restore);

      it('validates the override', function () {
        expect(schemaValidator.validate).to.be.called
          .and.to.be.calledWithExactly(this.schema, value);
      });

      it('returns the override', function () {
        expect(this.result).to.equal(value);
      });
    });
  });

  context('with a full object override', function () {
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

      sandbox.spy(schemaValidator, 'validate');

      const dataGenerator = schemaToGenerator(this.schema);
      this.mockData = dataGenerator({
        field1: 'abcd',
        field2: 1234,
      });
    });
    after(sandbox.restore);

    it('validates the returned object', function () {
      expect(schemaValidator.validate).to.be.called
        .and.to.be.calledWithExactly(this.schema, this.mockData);
    });

    it('returns an object with the overridden fields', function () {
      expect(this.mockData).to.eql({
        field1: 'abcd',
        field2: 1234,
      });
    });
  });

  context('with a partial object override', function () {
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

      sandbox.spy(schemaValidator, 'validate');

      const dataGenerator = schemaToGenerator(this.schema);
      this.result = dataGenerator({
        field1: 'abcd',
      });
    });
    after(sandbox.restore);

    it('validates the returned object', function () {
      expect(schemaValidator.validate).to.be.called
        .and.to.be.calledWithExactly(this.schema, this.result);
    });

    it('returns an object with the overridden fields', function () {
      expect(this.result.field1).to.equal('abcd');
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
