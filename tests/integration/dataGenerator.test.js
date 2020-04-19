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
