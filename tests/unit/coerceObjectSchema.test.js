const lib = require('../../lib');

const sandbox = sinon.createSandbox();

describe('lib.coerceObjectSchema', function () {
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
