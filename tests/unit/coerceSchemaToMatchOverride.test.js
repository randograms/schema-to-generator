const lib = require('../../lib');

const sandbox = sinon.createSandbox();

describe('lib.coerceSchemaToMatchOverride', function () {
  context('when the override is undefined', function () {
    before(function () {
      this.schema = { type: 'string' };
      this.result = lib.coerceSchemaToMatchOverride(this.schema, undefined, 'testSchemaPath');
    });

    it('returns the original schema', function () {
      expect(this.result).to.equal(this.schema);
    });
  });

  context('when the override type does not match the schema type', function () {
    it('throws an error', function () {
      const testFn = () => {
        lib.coerceSchemaToMatchOverride({ type: 'string' }, 7, 'testSchemaPath');
      };

      expect(testFn).to.throw('Invalid testSchemaPath type "integer" for schema type "string"');
    });
  });

  context('when the override type does not match any schema type', function () {
    it('throws an error', function () {
      const testFn = () => {
        lib.coerceSchemaToMatchOverride({ type: ['string', 'number'] }, true, 'testSchemaPath');
      };

      expect(testFn).to.throw('Invalid testSchemaPath type "boolean" for schema type "string,number"');
    });
  });

  context('with a number override on an integer schema', function () {
    it('throws an error', function () {
      const testFn = () => {
        lib.coerceSchemaToMatchOverride({ type: 'integer' }, 7.5, 'testSchemaPath');
      };

      expect(testFn).to.throw('Invalid testSchemaPath type "number" for schema type "integer"');
    });
  });

  context('with a number override on an integer schema that has other types', function () {
    it('throws an error', function () {
      const testFn = () => {
        lib.coerceSchemaToMatchOverride({ type: ['integer', 'string'] }, 8.1, 'testSchemaPath');
      };

      expect(testFn).to.throw('Invalid testSchemaPath type "number" for schema type "integer,string"');
    });
  });

  context('with a primitive override on a schema with multiple types', function () {
    before(function () {
      this.additionalSchemaInformation = Symbol('additional schema info');

      const schema = {
        type: ['string', 'number', 'null'],
        additionalSchemaInformation: this.additionalSchemaInformation,
      };

      this.result = lib.coerceSchemaToMatchOverride(schema, null, 'testSchemaPath');
    });

    it('returns a copy of the schema with the specific type', function () {
      expect(this.result).to.eql({
        type: 'null',
        additionalSchemaInformation: this.additionalSchemaInformation,
      });
    });
  });

  context('with an integer override on a number schema', function () {
    before(function () {
      this.additionalSchemaInformation = Symbol('additional schema info');

      const schema = {
        type: 'number',
        additionalSchemaInformation: this.additionalSchemaInformation,
      };

      this.result = lib.coerceSchemaToMatchOverride(schema, 9, 'testSchemaPath');
    });

    it('returns a copy of the original schema', function () {
      expect(this.result).to.eql({
        type: 'integer',
        additionalSchemaInformation: this.additionalSchemaInformation,
      });
    });
  });

  context('with an integer override on a number schema that has other types', function () {
    before(function () {
      this.additionalSchemaInformation = Symbol('additional schema info');

      const schema = {
        type: ['number', 'string'],
        additionalSchemaInformation: this.additionalSchemaInformation,
      };

      this.result = lib.coerceSchemaToMatchOverride(schema, 20, 'testSchemaPath');
    });

    it('returns a copy of the original schema with a more specific type', function () {
      expect(this.result).to.eql({
        type: 'integer',
        additionalSchemaInformation: this.additionalSchemaInformation,
      });
    });
  });

  context('with an override on a schema without a type', function () {
    before(function () {
      this.additionalSchemaInformation = Symbol('additional schema info');

      const schema = { additionalSchemaInformation: this.additionalSchemaInformation };

      this.result = lib.coerceSchemaToMatchOverride(schema, {}, 'testSchemaPath');
    });

    it('returns a copy of the schema with the type set to the type of the override', function () {
      expect(this.result).to.eql({
        type: 'object',
        additionalSchemaInformation: this.additionalSchemaInformation,
      });
    });
  });

  context('when the override is an object and the schema has properties', function () {
    before(function () {
      this.propertySchemas = Symbol('properties');
      this.additionalSchemaInformation = Symbol('additional schema info');
      const originalSchema = {
        type: ['object', 'null'],
        properties: this.propertySchemas,
        additionalSchemaInformation: this.additionalSchemaInformation,
      };

      this.fullyCoercedSchema = {};
      sandbox.stub(lib, 'shallowValidate');
      sandbox.stub(lib, 'coerceObjectSchema').returns(this.fullyCoercedSchema);

      this.override = { field1: 'test' };
      this.result = lib.coerceSchemaToMatchOverride(originalSchema, this.override, 'testSchemaPath');
    });
    after(sandbox.restore);

    it('shallow validates the modified schema against the override', function () {
      expect(lib.shallowValidate).to.be.called
        .and.to.be.calledWithExactly(
          {
            type: 'object',
            properties: this.propertySchemas,
            additionalSchemaInformation: this.additionalSchemaInformation,
          },
          this.override,
          'testSchemaPath',
        );
    });

    it('coerces the property schemas of the modified schema', function () {
      expect(lib.coerceObjectSchema).to.be.called
        .and.to.be.calledWithExactly(
          {
            type: 'object',
            properties: this.propertySchemas,
            additionalSchemaInformation: this.additionalSchemaInformation,
          },
          this.override,
          'testSchemaPath',
        );
    });

    it('returns the fully coerced schema', function () {
      expect(this.result).to.equal(this.fullyCoercedSchema);
    });
  });

  context('when the override is an object and the schema has patternProperties', function () {
    before(function () {
      this.patternPropertySchemas = Symbol('properties');
      this.additionalSchemaInformation = Symbol('additional schema info');
      const originalSchema = {
        type: ['object', 'null'],
        patternProperties: this.patternPropertySchemas,
        additionalSchemaInformation: this.additionalSchemaInformation,
      };

      this.fullyCoercedSchema = {};
      sandbox.stub(lib, 'shallowValidate');
      sandbox.stub(lib, 'coerceObjectSchema').returns(this.fullyCoercedSchema);

      this.override = { field1: 'test' };
      this.result = lib.coerceSchemaToMatchOverride(originalSchema, this.override, 'testSchemaPath');
    });
    after(sandbox.restore);

    it('shallow validates the modified schema against the override', function () {
      expect(lib.shallowValidate).to.be.called
        .and.to.be.calledWithExactly(
          {
            type: 'object',
            patternProperties: this.patternPropertySchemas,
            additionalSchemaInformation: this.additionalSchemaInformation,
          },
          this.override,
          'testSchemaPath',
        );
    });

    it('coerces the patternProperty schemas of the modified schema', function () {
      expect(lib.coerceObjectSchema).to.be.called
        .and.to.be.calledWithExactly(
          {
            type: 'object',
            patternProperties: this.patternPropertySchemas,
            additionalSchemaInformation: this.additionalSchemaInformation,
          },
          this.override,
          'testSchemaPath',
        );
    });

    it('returns the fully coerced schema', function () {
      expect(this.result).to.equal(this.fullyCoercedSchema);
    });
  });

  context('with an array override on a list array schema', function () {
    before(function () {
      this.itemsSchema = {};
      this.additionalSchemaInformation = Symbol('additional schema info');
      const originalSchema = {
        type: ['array', 'null'],
        items: this.itemsSchema,
        additionalSchemaInformation: this.additionalSchemaInformation,
      };

      this.fullyCoercedSchema = [];
      sandbox.stub(lib, 'shallowValidate');
      sandbox.stub(lib, 'coerceArrayListSchema').returns(this.fullyCoercedSchema);

      this.override = [];
      this.result = lib.coerceSchemaToMatchOverride(originalSchema, this.override, 'testSchemaPath');
    });
    after(sandbox.restore);

    it('shallow validates the modified schema against the override', function () {
      expect(lib.shallowValidate).to.be.called
        .and.to.be.calledWithExactly(
          {
            type: 'array',
            items: this.itemsSchema,
            additionalSchemaInformation: this.additionalSchemaInformation,
          },
          this.override,
          'testSchemaPath',
        );
    });

    it('coerces the items schema of the modified schema', function () {
      expect(lib.coerceArrayListSchema).to.be.called
        .and.to.be.calledWithExactly(
          {
            type: 'array',
            items: this.itemsSchema,
            additionalSchemaInformation: this.additionalSchemaInformation,
          },
          this.override,
          'testSchemaPath',
        );
    });

    it('returns the fully coerced schema', function () {
      expect(this.result).to.equal(this.fullyCoercedSchema);
    });
  });

  context('with an array override on a tuple array schema', function () {
    before(function () {
      this.itemsSchema = [{ type: 'integer' }, { type: 'integer' }];
      this.additionalSchemaInformation = Symbol('additional schema info');
      const originalSchema = {
        type: ['array', 'null'],
        items: this.itemsSchema,
        additionalSchemaInformation: this.additionalSchemaInformation,
      };

      this.fullyCoercedSchema = [];
      sandbox.stub(lib, 'shallowValidate');
      sandbox.stub(lib, 'coerceArrayTupleSchema').returns(this.fullyCoercedSchema);

      this.override = [1, 2];
      this.result = lib.coerceSchemaToMatchOverride(originalSchema, this.override, 'testSchemaPath');
    });
    after(sandbox.restore);

    it('shallow validates the modified schema against the override', function () {
      expect(lib.shallowValidate).to.be.called
        .and.to.be.calledWithExactly(
          {
            type: 'array',
            items: this.itemsSchema,
            additionalSchemaInformation: this.additionalSchemaInformation,
          },
          this.override,
          'testSchemaPath',
        );
    });

    it('coerces the items schema of the modified schema', function () {
      expect(lib.coerceArrayTupleSchema).to.be.called
        .and.to.be.calledWithExactly(
          {
            type: 'array',
            items: this.itemsSchema,
            additionalSchemaInformation: this.additionalSchemaInformation,
          },
          this.override,
          'testSchemaPath',
        );
    });

    it('returns the fully coerced schema', function () {
      expect(this.result).to.equal(this.fullyCoercedSchema);
    });
  });

  context('with a schema with "const"', function () {
    context('and a matching primitive override', function () {
      it('returns the schema', function () {
        const schema = { const: 2 };
        const result = lib.coerceSchemaToMatchOverride(schema, 2, 'testSchemaPath');
        expect(result).to.eql({
          type: 'integer',
          const: 2,
        });
      });
    });

    context('and a matching non-primitive override', function () {
      it('returns the schema', function () {
        const schema = {
          const: { foo: 2, bar: 'hello' },
        };
        const result = lib.coerceSchemaToMatchOverride(schema, { foo: 2, bar: 'hello' }, 'testSchemaPath');
        expect(result).to.eql({
          type: 'object',
          const: { foo: 2, bar: 'hello' },
        });
      });
    });

    context('a mismatched override', function () {
      it('throws an error', function () {
        const testFn = () => {
          lib.coerceSchemaToMatchOverride({ const: 2 }, 3, 'testSchemaPath');
        };

        expect(testFn).to.throw('testSchemaPath does not deep equal "const"');
      });
    });
  });

  context('with a schema with "enum"', function () {
    context('and a valid primitive override', function () {
      it('returns the schema', function () {
        const schema = { enum: [1, 2, 3] };
        const result = lib.coerceSchemaToMatchOverride(schema, 2, 'testSchemaPath');
        expect(result).to.eql({
          type: 'integer',
          enum: [2],
        });
      });
    });

    context('and a matching non-primitive override', function () {
      it('returns the schema', function () {
        const schema = {
          enum: [
            { foo: 1 },
            { foo: 2 },
            { foo: 3 },
          ],
        };
        const result = lib.coerceSchemaToMatchOverride(schema, { foo: 2 }, 'testSchemaPath');
        expect(result).to.eql({
          type: 'object',
          enum: [
            { foo: 2 },
          ],
        });
      });
    });

    context('a mismatched override', function () {
      it('throws an error', function () {
        const testFn = () => {
          lib.coerceSchemaToMatchOverride({ enum: [1, 2] }, 3, 'testSchemaPath');
        };

        expect(testFn).to.throw('testSchemaPath does not deep equal a member of "enum"');
      });
    });
  });

  context('with a schema with "allOf"', function () {
    before(function () {
      this.allOfArray = Symbol('allOf');
      this.additionalSchemaInformation = Symbol('additional schema info');
      const originalSchema = {
        allOf: this.allOfArray,
        additionalSchemaInformation: this.additionalSchemaInformation,
      };

      this.coercedAllOf = Symbol('coerced allOf');
      sandbox.stub(lib, 'coerceAllOf').returns(this.coercedAllOf);

      this.override = { field1: 'test' };
      this.result = lib.coerceSchemaToMatchOverride(originalSchema, this.override, 'testSchemaPath');
    });
    after(sandbox.restore);

    it('coerces the allOf', function () {
      expect(lib.coerceAllOf).to.be.called
        .and.to.be.calledWithExactly(
          this.allOfArray,
          this.override,
          'testSchemaPath',
        );
    });

    it('returns the fully coerced schema', function () {
      expect(this.result).to.eql({
        type: 'object',
        allOf: this.coercedAllOf,
        additionalSchemaInformation: this.additionalSchemaInformation,
      });
    });
  });

  context('with a schema with "anyOf"', function () {
    before(function () {
      this.anyOfArray = Symbol('anyOf');
      this.additionalSchemaInformation = Symbol('additional schema info');
      const originalSchema = {
        anyOf: this.anyOfArray,
        additionalSchemaInformation: this.additionalSchemaInformation,
      };

      this.coercedAnyOf = Symbol('coerced anyOf');
      sandbox.stub(lib, 'coerceValidInnerSchemas').returns(this.coercedAnyOf);

      this.override = { field1: 'test' };
      this.result = lib.coerceSchemaToMatchOverride(originalSchema, this.override, 'testSchemaPath');
    });
    after(sandbox.restore);

    it('coerces the anyOf', function () {
      expect(lib.coerceValidInnerSchemas).to.be.called
        .and.to.be.calledWithExactly(
          this.anyOfArray,
          this.override,
          'testSchemaPath',
          'anyOf',
        );
    });

    it('returns the fully coerced schema', function () {
      expect(this.result).to.eql({
        type: 'object',
        anyOf: this.coercedAnyOf,
        additionalSchemaInformation: this.additionalSchemaInformation,
      });
    });
  });

  context('with a schema with "oneOf"', function () {
    before(function () {
      this.oneOfArray = Symbol('oneOf');
      this.additionalSchemaInformation = Symbol('additional schema info');
      const originalSchema = {
        oneOf: this.oneOfArray,
        additionalSchemaInformation: this.additionalSchemaInformation,
      };

      this.coercedOneOf = Symbol('coerced oneOf');
      sandbox.stub(lib, 'coerceValidInnerSchemas').returns(this.coercedOneOf);

      this.override = { field1: 'test' };
      this.result = lib.coerceSchemaToMatchOverride(originalSchema, this.override, 'testSchemaPath');
    });
    after(sandbox.restore);

    it('coerces the oneOf', function () {
      expect(lib.coerceValidInnerSchemas).to.be.called
        .and.to.be.calledWithExactly(
          this.oneOfArray,
          this.override,
          'testSchemaPath',
          'oneOf',
        );
    });

    it('returns the fully coerced schema', function () {
      expect(this.result).to.eql({
        type: 'object',
        oneOf: this.coercedOneOf,
        additionalSchemaInformation: this.additionalSchemaInformation,
      });
    });
  });
});
