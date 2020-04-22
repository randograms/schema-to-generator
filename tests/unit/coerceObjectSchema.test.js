const lib = require('../../lib');

const sandbox = sinon.createSandbox();

describe('lib.coerceObjectSchema', function () {
  context('with a schema with properties', function () {
    before(function () {
      this.field1Schema = Symbol('field1 schema');
      this.field2Schema = Symbol('field2 schema');

      const schema = {
        type: 'object',
        properties: {
          field1: this.field1Schema,
          field2: this.field2Schema,
        },
        additionalSchemaInfo: this.additionalSchemaInfo,
      };

      this.firstCoercedSchema = Symbol('coerced field1 schema');
      this.secondCoercedSchema = Symbol('coerced field1 schema');
      const stub = sandbox.stub(lib, 'coerceSchemaToMatchOverride');
      stub.onFirstCall().returns(this.firstCoercedSchema);
      stub.onSecondCall().returns(this.secondCoercedSchema);

      this.result = lib.coerceObjectSchema(schema, { field2: 'test value' }, 'schemaPath');
    });
    after(sandbox.restore);

    it('coerces the property schemas against the override properties', function () {
      expect(lib.coerceSchemaToMatchOverride).to.be.calledTwice;
      expect(lib.coerceSchemaToMatchOverride.firstCall).to.be.calledWithExactly(
        this.field1Schema,
        undefined,
        'schemaPath.field1',
      );
      expect(lib.coerceSchemaToMatchOverride.secondCall).to.be.calledWithExactly(
        this.field2Schema,
        'test value',
        'schemaPath.field2',
      );
    });

    it('returns a schema with coerced property schemas', function () {
      expect(this.result).to.eql({
        type: 'object',
        properties: {
          field1: this.firstCoercedSchema,
          field2: this.secondCoercedSchema,
        },
        additionalSchemaInfo: this.additionalSchemaInfo,
      });
    });
  });

  context('with a schema with patternProperties', function () {
    before(function () {
      this.property1Schema = Symbol('property1 schema');
      this.property2Schema = Symbol('property2 schema');

      const schema = {
        type: 'object',
        patternProperties: {
          '[ab]c': this.property1Schema,
          'a[bc]': this.property2Schema,
        },
        additionalSchemaInfo: this.additionalSchemaInfo,
      };

      this.firstCoercedSchema = Symbol('firstCoercedSchema');
      this.secondCoercedSchema = Symbol('secondCoercedSchema');
      this.thirdCoercedSchema = Symbol('thirdCoercedSchema');
      this.fourthCoercedSchema = Symbol('fourthCoercedSchema');
      const stub = sandbox.stub(lib, 'coerceSchemaToMatchOverride');
      stub.onCall(0).returns(this.firstCoercedSchema);
      stub.onCall(1).returns(this.secondCoercedSchema);
      stub.onCall(2).returns(this.thirdCoercedSchema);
      stub.onCall(3).returns(this.fourthCoercedSchema);

      this.override = {
        ac: 'test value 1', // matches both patterns
        bc: 'test value 2', // matches first pattern
        ab: 'test value 3', // matches second pattern
      };
      this.result = lib.coerceObjectSchema(schema, this.override, 'schemaPath');
    });
    after(sandbox.restore);

    it('coerces the property schemas against the override properties', function () {
      expect(lib.coerceSchemaToMatchOverride).to.have.callCount(4);
      expect(lib.coerceSchemaToMatchOverride.getCall(0)).to.be.calledWithExactly(
        this.property1Schema,
        'test value 1',
        'schemaPath."ac"',
      );
      expect(lib.coerceSchemaToMatchOverride.getCall(1)).to.be.calledWithExactly(
        this.property2Schema,
        'test value 1',
        'schemaPath."ac"',
      );
      expect(lib.coerceSchemaToMatchOverride.getCall(2)).to.be.calledWithExactly(
        this.property1Schema,
        'test value 2',
        'schemaPath."bc"',
      );
      expect(lib.coerceSchemaToMatchOverride.getCall(3)).to.be.calledWithExactly(
        this.property2Schema,
        'test value 3',
        'schemaPath."ab"',
      );
    });

    it('returns a schema with coerced patternProperty schemas', function () {
      expect(this.result).to.eql({
        type: 'object',
        properties: {
          ac: {
            allOf: [
              this.firstCoercedSchema,
              this.secondCoercedSchema,
            ],
          },
          bc: {
            allOf: [
              this.thirdCoercedSchema,
            ],
          },
          ab: {
            allOf: [
              this.fourthCoercedSchema,
            ],
          },
        },
        required: ['ac', 'bc', 'ab'],
        additionalSchemaInfo: this.additionalSchemaInfo,
      });
    });
  });
});
