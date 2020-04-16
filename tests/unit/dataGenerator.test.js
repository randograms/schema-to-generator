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
      sandbox.stub(schemaValidator, 'validate').returns(true);

      this.schema = { type: 'string' };
      const dataGenerator = schemaToGenerator(this.schema);
      this.result = dataGenerator();
    });
    after(sandbox.restore);

    it('calls jsf.generate with the schema', function () {
      expect(jsf.generate).to.be.called
        .and.to.be.calledWithExactly(this.schema);
    });

    it('validates the data', function () {
      expect(schemaValidator.validate).to.be.called
        .and.to.be.calledWithExactly(this.schema, this.returnValue);
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

  context('when an object override has additionalProperties', function () {
    it('throws an error', function () {
      const dataGenerator = schemaToGenerator({
        type: 'object',
        properties: {
          field1: { type: 'string' },
        },
        required: ['field1'],
        additionalProperties: false,
      });

      const testFn = () => {
        dataGenerator({
          field2: 3,
          field3: 4,
        });
      };

      expect(testFn).to.throw('Invalid additional properties "field2", "field3" on override');
    });
  });

  context('when a nested override property does not match the nested schema type', function () {
    it('throws an error', function () {
      const dataGenerator = schemaToGenerator({
        type: 'object',
        properties: {
          field1: {
            type: 'object',
            properties: {
              field2: { type: 'string' },
            },
            required: ['field2'],
          },
        },
        required: ['field1'],
      });
      const testFn = () => {
        dataGenerator({
          field1: {
            field2: 7,
          },
        });
      };

      expect(testFn).to.throw('Invalid override.field1.field2 type "integer" for schema type "string"');
    });
  });

  context('when a nested tuple array item override does not match the nested schema type', function () {
    it('throws an error', function () {
      const dataGenerator = schemaToGenerator({
        type: 'array',
        items: [
          { type: 'number' },
          { type: 'string' },
        ],
      });
      const testFn = () => {
        dataGenerator([1, 2]);
      };

      expect(testFn).to.throw('Invalid override[1] type "integer" for schema type "string"');
    });
  });

  context('when a nested list array item override does not match the nested schema type', function () {
    it('throws an error', function () {
      const dataGenerator = schemaToGenerator({
        type: 'array',
        items: { type: 'number' },
      });
      const testFn = () => {
        dataGenerator([1, '2', 3]);
      };

      expect(testFn).to.throw('Invalid override[1] type "string" for schema type "number"');
    });
  });

  context('when a nested allOf override does not match the nested schema type', function () {
    it('throws an error', function () {
      const dataGenerator = schemaToGenerator({
        allOf: [
          {
            type: 'object',
            properties: {
              field: { type: 'string' },
            },
            required: ['field1'],
          },
          {
            type: 'object',
            properties: {
              field2: { type: 'string' },
            },
            required: ['field2'],
          },
        ],
      });
      const testFn = () => {
        dataGenerator({ field2: 3 });
      };

      expect(testFn).to.throw('Invalid override<allOf[1]>.field2 type "integer" for schema type "string"');
    });
  });

  context('when a nested anyOf override does not match any of the schema types', function () {
    it('throws an error', function () {
      const dataGenerator = schemaToGenerator({
        anyOf: [
          {
            type: 'array',
            items: { type: 'string' },
          },
          {
            type: 'array',
            items: { type: 'number' },
          },
        ],
      });
      const testFn = () => {
        dataGenerator([2, true]);
      };

      expect(testFn).to.throw('Invalid override<anyOf[0]>[0] type "integer" for schema type "string", Invalid override<anyOf[1]>[1] type "boolean" for schema type "number"');
    });
  });

  context('when a nested oneOf override does not match any of the schema types', function () {
    it('throws an error', function () {
      const dataGenerator = schemaToGenerator({
        oneOf: [
          {
            type: 'array',
            items: { type: 'string' },
          },
          {
            type: 'array',
            items: { type: 'number' },
          },
        ],
      });
      const testFn = () => {
        dataGenerator([2, true]);
      };

      expect(testFn).to.throw('Invalid override<oneOf[0]>[0] type "integer" for schema type "string", Invalid override<oneOf[1]>[1] type "boolean" for schema type "number"');
    });
  });

  context('when a deeply nested override value does not match the nested schema type', function () {
    it('throws an error', function () {
      const dataGenerator = schemaToGenerator({
        type: 'object',
        properties: {
          field1: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field2: { type: 'string' },
              },
              required: ['field2'],
            },
          },
        },
        required: ['fiedl1'],
      });
      const testFn = () => {
        dataGenerator({
          field1: [undefined, { field2: 3 }],
        });
      };

      expect(testFn).to.throw('Invalid override.field1[1].field2 type "integer" for schema type "string"');
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

  context('with a primitive override that matches one of the schema types', function () {
    setupValidatorStub();
    before(function () {
      this.schema = { type: ['string', 'number', 'boolean'] };

      const dataGenerator = schemaToGenerator(this.schema);
      this.result = dataGenerator('test');
    });

    itValidatesTheReturnedData();

    it('returns the override', function () {
      expect(this.result).to.equal('test');
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

  context('with an object override for a nullable schema', function () {
    setupValidatorStub();
    before(function () {
      this.schema = {
        type: ['object', 'null'],
        properties: {
          field1: { type: 'string' },
          field2: { type: 'number' },
        },
        required: [
          'field1',
          'field2',
        ],
      };

      this.dataGenerator = schemaToGenerator(this.schema);
    });

    it('always returns a complete object with the overridden field', function () {
      _.times(10, () => {
        const result = this.dataGenerator({
          field2: 7.5,
        });

        expect(schemaValidator.validate).to.be.called
          .and.to.be.calledWithExactly(this.schema, result);

        expect(result).to.be.an('object');
        expect(result.field2).to.equal(7.5);
      });
    });
  });

  context('with a tuple array override', function () {
    setupValidatorStub();
    before(function () {
      this.schema = {
        type: 'array',
        items: [
          { type: 'string' },
          { type: 'integer' },
          {
            type: 'object',
            properties: {
              field1: { type: 'integer' },
              field2: { type: 'string' },
            },
            required: [
              'field1',
              'field2',
            ],
          },
          { type: 'boolean' },
        ],
      };

      const dataGenerator = schemaToGenerator(this.schema);
      this.result = dataGenerator([undefined, 5, { field1: 3 }]);
    });

    itValidatesTheReturnedData();

    it('returns an array with the overridden data', function () {
      expect(this.result[1]).to.equal(5);
      expect(this.result[2].field1).to.equal(3);
    });
  });

  context('with a tuple array override for a nullable schema', function () {
    setupValidatorStub();
    before(function () {
      this.schema = {
        type: ['array', 'null'],
        items: [
          { type: 'number' },
          { type: 'string' },
          { type: 'boolean' },
        ],
      };

      this.dataGenerator = schemaToGenerator(this.schema);
    });

    it('always returns an array', function () {
      _.times(10, () => {
        const result = this.dataGenerator([1, '2', true]);

        expect(schemaValidator.validate).to.be.called
          .and.to.be.calledWithExactly(this.schema, result);

        expect(result).to.eql([1, '2', true]);
      });
    });
  });

  context('with a list array override', function () {
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

  context('with a partial item override on a list array schema', function () {
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

  context('with list array overrides of varying length', function () {
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

  context('with nested list array overrides on an object schema', function () {
    setupValidatorStub();
    before(function () {
      this.schema = {
        type: 'object',
        properties: {
          field1: { type: 'string' },
          field2: {
            type: 'array',
            items: { type: 'number' },
          },
          field3: {
            type: 'array',
            items: { type: 'number' },
          },
          field4: {
            type: 'array',
            items: { type: 'number' },
          },
        },
        required: [
          'field1',
          'field2',
          'field3',
          'field4',
        ],
      };

      const dataGenerator = schemaToGenerator(this.schema);
      this.result = dataGenerator({
        field2: [1, 2, 3],
        field3: [1, 2, 3, 4, 5],
        field4: [1],
      });
    });

    itValidatesTheReturnedData();

    it('respects the length of the inner array overrides', function () {
      expect(this.result.field2).to.eql([1, 2, 3]);
      expect(this.result.field3).to.eql([1, 2, 3, 4, 5]);
      expect(this.result.field4).to.eql([1]);
    });
  });

  context('with nested list array overrides on an array schema', function () {
    setupValidatorStub();
    before(function () {
      this.schema = {
        type: 'array',
        items: {
          type: 'array',
          items: { type: 'number' },
        },
      };

      const dataGenerator = schemaToGenerator(this.schema);
      this.result = dataGenerator([
        [1, 2, 3],
        [1, 2, 3, 4, 5],
        [1],
      ]);
    });

    itValidatesTheReturnedData();

    it('respects the length of the inner array overrides', function () {
      expect(this.result).to.eql([
        [1, 2, 3],
        [1, 2, 3, 4, 5],
        [1],
      ]);
    });
  });

  context('with a list array override for a nullable schema', function () {
    setupValidatorStub();
    before(function () {
      this.schema = {
        type: ['array', 'null'],
        items: { type: 'number' },
      };

      this.dataGenerator = schemaToGenerator(this.schema);
    });

    it('always returns an array', function () {
      _.times(10, () => {
        const result = this.dataGenerator([1, 2, 3]);

        expect(schemaValidator.validate).to.be.called
          .and.to.be.calledWithExactly(this.schema, result);

        expect(result).to.eql([1, 2, 3]);
      });
    });
  });

  context('with an override on an "allOf" schema', function () {
    setupValidatorStub();
    before(function () {
      this.schema = {
        allOf: [
          {
            type: 'object',
            properties: {
              field1: {
                type: 'array',
                items: { type: 'number' },
              },
            },
            required: ['field1'],
          },
          {
            type: 'object',
            properties: {
              field2: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['field2'],
          },
        ],
      };

      const dataGenerator = schemaToGenerator(this.schema);
      this.result = dataGenerator({
        field1: [1, 2],
        field2: ['1', '2'],
      });
    });

    itValidatesTheReturnedData();

    it('returns data with the overridden values', function () {
      expect(this.result).to.eql({
        field1: [1, 2],
        field2: ['1', '2'],
      });
    });
  });

  context('with an override on an "anyOf" schema', function () {
    setupValidatorStub();
    before(function () {
      this.schema = {
        anyOf: [
          {
            type: 'array',
            items: { type: 'number' },
          },
          {
            type: 'array',
            items: { type: 'string' },
          },
        ],
      };

      const dataGenerator = schemaToGenerator(this.schema);
      this.result = dataGenerator([1, 2]);
    });

    itValidatesTheReturnedData();

    it('returns data with the overridden values', function () {
      expect(this.result).to.eql([1, 2]);
    });
  });

  context('with an override on a "oneOf" schema', function () {
    setupValidatorStub();
    before(function () {
      this.schema = {
        oneOf: [
          {
            type: 'array',
            items: {
              type: 'number',
              minimum: 5,
            },
          },
          {
            type: 'array',
            items: { type: 'integer' },
          },
        ],
      };

      const dataGenerator = schemaToGenerator(this.schema);
      this.result = dataGenerator([1, 2]);
    });

    itValidatesTheReturnedData();

    it('returns data with the overridden values', function () {
      expect(this.result).to.eql([1, 2]);
    });
  });

  context('with nested overrides for a schema without types', function () {
    setupValidatorStub();
    before(function () {
      this.schema = {
        properties: {
          field1: {
            items: { type: 'string' },
          },
          field2: {
            items: [
              { type: 'number' },
              {
                items: { type: 'boolean' },
              },
            ],
          },
        },
        required: [
          'field1',
          'field2',
        ],
      };

      const dataGenerator = schemaToGenerator(this.schema);
      this.result = dataGenerator({
        field1: ['1', '2', '3'],
        field2: [
          3,
          [true, false, true],
        ],
      });
    });

    itValidatesTheReturnedData();

    it('returns the overridden data', function () {
      expect(this.result).to.eql({
        field1: ['1', '2', '3'],
        field2: [
          3,
          [true, false, true],
        ],
      });
    });
  });

  context('when the override fails schema validation', function () {
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

  context('without the immutable option', function () {
    context('with an object schema', function () {
      before(function () {
        const schema = {
          type: 'object',
          properties: {
            field1: { type: 'string' },
          },
          required: ['field1'],
        };

        const dataGenerator = schemaToGenerator(schema);
        this.result = dataGenerator({ field1: 'hi' });
        this.result.field1 = 'hello';
      });

      it('returns an object that can be mutated', function () {
        expect(this.result).to.eql({
          field1: 'hello',
        });
      });
    });

    context('with an array schema', function () {
      before(function () {
        const schema = {
          type: 'array',
          items: { type: 'number' },
        };

        const dataGenerator = schemaToGenerator(schema);
        this.result = dataGenerator([1, 2, 3]);
        this.result.push(4);
      });

      it('returns an array that can be mutated', function () {
        expect(this.result).to.eql([1, 2, 3, 4]);
      });
    });
  });

  context('with the immutable option', function () {
    context('with an object schema', function () {
      before(function () {
        const schema = {
          type: 'object',
          properties: {
            field1: {
              type: 'array',
              items: [
                { type: 'string' },
                { type: 'number' },
              ],
            },
          },
          required: ['field1'],
        };

        const dataGenerator = schemaToGenerator(schema, { immutable: true });
        this.result = dataGenerator({
          field1: ['hello', 3],
        });
      });

      it('does not allow the object to be mutated', function () {
        this.result.field1 = [1, 2, 3];
        expect(this.result.field1).eql(['hello', 3]);
      });

      it('does not allow nested data to be mutated', function () {
        const testFn = () => {
          this.result.field1.push(10);
        };

        expect(testFn).to.throw('Cannot add property 2, object is not extensible');
      });
    });

    context('with an array schema', function () {
      before(function () {
        const schema = {
          type: 'array',
          items: [
            { type: 'string' },
            { type: 'number' },
            {
              type: 'object',
              properties: {
                field1: { type: 'string' },
              },
              required: ['field1'],
            },
          ],
        };

        const dataGenerator = schemaToGenerator(schema, { immutable: true });
        this.result = dataGenerator([
          undefined,
          undefined,
          { field1: 'hello' },
        ]);
      });

      it('does not allow the array to be mutated', function () {
        const testFn = () => {
          this.result.push(10);
        };

        expect(testFn).to.throw('Cannot add property 3, object is not extensible');
      });

      it('does not allow nested data to be mutated', function () {
        this.result[2].field1 = 7;
        expect(this.result[2].field1).to.equal('hello');
      });
    });
  });
});
