const lib = require('../../lib');

const sandbox = sinon.createSandbox();

describe('lib.coerceArrayListSchema', function () {
  before(function () {
    this.itemsSchema = Symbol('items schema');

    const schema = {
      type: 'array',
      items: this.itemsSchema,
      additionalItems: true,
      additionalSchemaInfo: this.additionalSchemaInfo,
    };

    this.firstCoercedSchema = Symbol('coerced field1 schema');
    this.secondCoercedSchema = Symbol('coerced field1 schema');
    const stub = sandbox.stub(lib, 'coerceSchemaToMatchOverride');
    stub.onFirstCall().returns(this.firstCoercedSchema);
    stub.onSecondCall().returns(this.secondCoercedSchema);

    this.result = lib.coerceArrayListSchema(schema, ['override value 1', 'override value 2'], 'schemaPath');
  });
  after(sandbox.restore);

  it('coerces each override item against the item schema', function () {
    expect(lib.coerceSchemaToMatchOverride).to.be.calledTwice;
    expect(lib.coerceSchemaToMatchOverride.firstCall).to.be.calledWithExactly(
      this.itemsSchema,
      'override value 1',
      'schemaPath[0]',
    );
    expect(lib.coerceSchemaToMatchOverride.secondCall).to.be.calledWithExactly(
      this.itemsSchema,
      'override value 2',
      'schemaPath[1]',
    );
  });

  it('returns a schema with coerced item schemas', function () {
    expect(this.result).to.eql({
      type: 'array',
      items: [
        this.firstCoercedSchema,
        this.secondCoercedSchema,
      ],
      additionalSchemaInfo: this.additionalSchemaInfo,
      additionalItems: false,
    });
  });
});
