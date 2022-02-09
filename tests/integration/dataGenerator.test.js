const { expect } = require('chai');
const _ = require('lodash');
const { schemaToGenerator } = require('../../index');

describe('index.schemaToGenerator->dataGenerator', function () {
  context('when a deeply nested override value does not match the nested schema type', function () {
    it('throws an error', function () {
      const dataGenerator = schemaToGenerator({
        type: 'object',
        properties: {
          field1: {
            type: 'array',
            items: {
              type: 'array',
              items: [
                { type: 'string' },
                { type: 'number' },
                {
                  allOf: [
                    { type: 'integer' },
                    {
                      anyOf: [
                        { type: 'boolean' },
                        {
                          oneOf: [
                            { type: 'null' },
                            { type: 'string' },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
        required: ['field1'],
      });
      const testFn = () => {
        const badIntegerValue = 7;
        dataGenerator({
          field1: [undefined, ['test', 3, badIntegerValue]],
        });
      };

      expect(testFn).to.throw('Invalid override.field1[1][2]<allOf[1]><anyOf[0]> type "integer" for schema type "boolean", Invalid override.field1[1][2]<allOf[1]><anyOf[1]><oneOf[0]> type "integer" for schema type "null", Invalid override.field1[1][2]<allOf[1]><anyOf[1]><oneOf[1]> type "integer" for schema type "string"');
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
      before(function () {
        this.schema = { type: schemaType };

        const dataGenerator = schemaToGenerator(this.schema);
        this.result = dataGenerator(overrideValue);
      });

      it('returns the override', function () {
        expect(this.result).to.equal(overrideValue);
      });
    });
  });

  context('with a primitive override that matches one of the schema types', function () {
    before(function () {
      this.schema = { type: ['string', 'number', 'boolean'] };

      const dataGenerator = schemaToGenerator(this.schema);
      this.result = dataGenerator('test');
    });

    it('returns the override', function () {
      expect(this.result).to.equal('test');
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
        additionalProperties: false,
      };

      const dataGenerator = schemaToGenerator(this.schema);
      this.result = dataGenerator({
        field1: 'abcd',
        field2: 1234,
      });
    });

    it('returns an object with the overridden fields', function () {
      expect(this.result).to.eql({
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

      const dataGenerator = schemaToGenerator(this.schema);
      this.result = dataGenerator({
        field1: 'abcd',
      });
    });

    it('returns an object with the overridden fields', function () {
      expect(this.result.field1).to.equal('abcd');
    });
  });

  context('with an object override for a nullable schema', function () {
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

        expect(result).to.be.an('object');
        expect(result.field2).to.equal(7.5);
      });
    });
  });

  context('without an override on a pattern property schema', function () {
    before(function () {
      const dataGenerator = schemaToGenerator({
        type: 'object',
        patternProperties: {
          '^[ab][cd]$': { type: 'string' },
        },
      });

      const results = _.range(10).map(() => dataGenerator());
      this.someMockDataHaveKeys = results.some((mockObject) => Object.keys(mockObject).length > 0);
    });

    it('sometimes generates mock keys', function () {
      expect(this.someMockDataHaveKeys).to.be.true;
    });
  });

  context('with an override on a pattern property schema', function () {
    before(function () {
      const dataGenerator = schemaToGenerator({
        patternProperties: {
          '^[ab][cd]$': { type: 'string' },
        },
      });

      this.results = _.range(10)
        .map(() => ({
          ad: 'hello',
          bc: 'hi',
        }))
        .map(dataGenerator);
    });

    it('does not generate additional keys and values', function () {
      this.results.forEach((mockData) => {
        expect(mockData).to.eql({
          ad: 'hello',
          bc: 'hi',
        });
      });
    });
  });

  context('with a partial object override on a pattern property schema', function () {
    before(function () {
      const dataGenerator = schemaToGenerator({
        patternProperties: {
          '[ab][cd]': {
            type: 'object',
            properties: {
              field1: { type: 'string' },
              field2: { type: 'number' },
            },
            required: ['field1', 'field2'],
          },
        },
      });

      this.results = _.range(10)
        .map(() => ({
          ad: { field1: 'hello' },
          bc: { field2: 7 },
        }))
        .map(dataGenerator);
    });

    it('populates the additional fields', function () {
      this.results.forEach((mockData) => {
        expect(mockData.ad.field1).to.equal('hello');
        expect(mockData.bc.field2).to.equal(7);
      });
    });
  });

  context('with a nested array override on a pattern property schema', function () {
    before(function () {
      this.dataGenerator = schemaToGenerator({
        patternProperties: {
          '[ab][cd]': {
            type: 'array',
            items: { type: 'number' },
          },
        },
      });
    });

    it('always respects the length of the override', function () {
      [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 4, 5].forEach((arrayLength) => {
        const arrayOverride = _.range(arrayLength);
        const result = this.dataGenerator({
          ac: arrayOverride,
        });
        expect(result.ac).to.be.an('array')
          .and.to.have.lengthOf(arrayLength);
      });
    });
  });

  context('with a tuple array override', function () {
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
        minItems: 4,
      };

      const dataGenerator = schemaToGenerator(this.schema);
      this.result = dataGenerator([undefined, 5, { field1: 3 }]);
    });

    it('returns an array with the overridden data', function () {
      expect(this.result[1]).to.equal(5);
      expect(this.result[2].field1).to.equal(3);
    });
  });

  context('with a tuple array override for a nullable schema', function () {
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
        expect(result).to.eql([1, '2', true]);
      });
    });
  });

  context('when a tuple override does not have all the items', function () {
    before(function () {
      const schema = {
        type: 'array',
        items: [
          { type: 'boolean' },
          { type: 'string' },
          { type: 'number' },
        ],
        minItems: 3,
      };

      const dataGenerator = schemaToGenerator(schema);
      this.result = dataGenerator([undefined, 'abcd']);
    });

    it('populates the rest of the items', function () {
      expect(this.result[1]).to.equal('abcd');
    });
  });

  context('with a list array override', function () {
    before(function () {
      this.schema = {
        type: 'array',
        items: { type: 'number' },
      };

      const dataGenerator = schemaToGenerator(this.schema);
      this.result = dataGenerator([1, 2, 3]);
    });

    it('returns an array', function () {
      expect(this.result).to.eql([1, 2, 3]);
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

    it('respects the length of the inner array overrides', function () {
      expect(this.result.field2).to.eql([1, 2, 3]);
      expect(this.result.field3).to.eql([1, 2, 3, 4, 5]);
      expect(this.result.field4).to.eql([1]);
    });
  });

  context('with nested list array overrides on a list array schema', function () {
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

    it('respects the length of the inner array overrides', function () {
      expect(this.result).to.eql([
        [1, 2, 3],
        [1, 2, 3, 4, 5],
        [1],
      ]);
    });
  });

  context('with a list array override for a nullable schema', function () {
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
        expect(result).to.eql([1, 2, 3]);
      });
    });
  });

  context('with an override on an "allOf" schema', function () {
    before(function () {
      this.schema = {
        properties: {
          field1: true,
          field2: true,
        },
        required: ['field1', 'field2'],
        additionalProperties: false,
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

    it('returns data with the overridden values', function () {
      expect(this.result).to.eql({
        field1: [1, 2],
        field2: ['1', '2'],
      });
    });
  });

  context('with an override on an "anyOf" schema', function () {
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

    it('returns data with the overridden values', function () {
      expect(this.result).to.eql([1, 2]);
    });
  });

  context('with an override on a "oneOf" schema', function () {
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

    it('returns data with the overridden values', function () {
      expect(this.result).to.eql([1, 2]);
    });
  });

  describe('overrides on combined schemas with "const"', function () {
    context('with a primitive const override', function () {
      before(function () {
        this.schema = {
          oneOf: [
            {
              type: 'number',
              const: 7,
            },
            {
              type: 'number',
              const: 5,
            },
          ],
        };

        const dataGenerator = schemaToGenerator(this.schema);
        this.result = dataGenerator(7);
      });

      it('returns the number', function () {
        expect(this.result).to.eq(7);
      });
    });

    context('with a property const override', function () {
      before(function () {
        this.schema = {
          oneOf: [
            {
              type: 'object',
              properties: {
                foo: {
                  const: 'hello',
                },
                bar: {
                  type: 'string',
                },
              },
              required: ['foo', 'bar'],
              additionalProperties: false,
            },
            {
              type: 'object',
              properties: {
                foo: {
                  const: 'hi',
                },
                bar: {
                  type: 'number',
                },
              },
              required: ['foo', 'bar'],
              additionalProperties: false,
            },
          ],
        };

        const dataGenerator = schemaToGenerator(this.schema);
        this.result = dataGenerator({ foo: 'hello' });
      });

      it('returns data with the overridden value', function () {
        expect(this.result.foo).to.eq('hello');
      });

      it('returns data narrowed to a specific schema in the oneOf', function () {
        expect(this.result.bar).to.be.a('string');
      });
    });

    context('with an object const override', function () {
      before(function () {
        this.schema = {
          oneOf: [
            {
              type: 'object',
              const: {
                foo: 1,
                bar: 2,
              },
            },
            {
              type: 'object',
              const: {
                foo: 3,
                bar: 4,
              },
            },
          ],
        };

        const dataGenerator = schemaToGenerator(this.schema);
        this.result = dataGenerator({ foo: 1, bar: 2 });
      });

      it('returns the const data', function () {
        expect(this.result).to.eql({ foo: 1, bar: 2 });
      });
    });

    context('with a partial object const override', function () {
      it('throws an error', function () {
        this.schema = {
          oneOf: [
            {
              type: 'object',
              const: {
                foo: 1,
                bar: 2,
              },
            },
            {
              type: 'object',
              const: {
                foo: 3,
                bar: 4,
              },
            },
          ],
        };

        const dataGenerator = schemaToGenerator(this.schema);
        expect(() => dataGenerator({ foo: 1 })).to.throw('override<oneOf[0]> does not deep equal "const", override<oneOf[1]> does not deep equal "const"');
      });
    });
  });

  context('with nested overrides for a schema without types', function () {
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
        additionalProperties: false,
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
          additionalProperties: false,
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

  context('with a schema with "const"', function () {
    context('without an override', function () {
      before(function () {
        this.schema = {
          const: 1,
        };

        const dataGenerator = schemaToGenerator(this.schema);
        this.result = dataGenerator();
      });

      it('returns the const value', function () {
        expect(this.result).to.eq(1);
      });
    });

    context('with an override', function () {
      before(function () {
        this.schema = {
          const: { foo: 'bar' },
        };

        const dataGenerator = schemaToGenerator(this.schema);
        this.result = dataGenerator({ foo: 'bar' });
      });

      it('returns the const value', function () {
        expect(this.result).to.eql({ foo: 'bar' });
      });
    });

    context('with an invalid override', function () {
      it('throws an error', function () {
        this.schema = {
          properties: {
            type: 'object',
            foo: {
              const: 1,
            },
          },
          required: ['foo'],
        };

        const dataGenerator = schemaToGenerator(this.schema);

        expect(() => dataGenerator({ foo: 5 })).to.throw('override.foo does not deep equal "const"');
      });
    });
  });

  context('with a schema with an enum', function () {
    context('without an override', function () {
      before(function () {
        this.schema = {
          enum: [1, 2, 3],
        };

        const dataGenerator = schemaToGenerator(this.schema);
        this.result = dataGenerator();
      });

      it('returns a random item from the enum', function () {
        expect([1, 2, 3]).to.include(this.result);
      });
    });

    context('with an override', function () {
      before(function () {
        this.schema = {
          enum: [1, 2, 3],
        };

        const dataGenerator = schemaToGenerator(this.schema);
        this.result = dataGenerator(2);
      });

      it('returns the overridden value', function () {
        expect(this.result).to.eq(2);
      });
    });

    context('with an invalid override', function () {
      it('throws an error', function () {
        this.schema = {
          properties: {
            type: 'object',
            foo: {
              enum: [1, 2, 3],
            },
          },
          required: ['foo'],
        };

        const dataGenerator = schemaToGenerator(this.schema);

        expect(() => dataGenerator({ foo: 5 })).to.throw('override.foo does not deep equal a member of "enum"');
      });
    });
  });
});
