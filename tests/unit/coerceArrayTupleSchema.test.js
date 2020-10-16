const lib = require('../../lib');

const sandbox = sinon.createSandbox();

describe('lib.coerceArrayTupleSchema', function () {
  before(function () {
    this.item1Schema = Symbol('item1 schema');
    this.item2Schema = Symbol('item2 schema');
    this.item3Schema = Symbol('item3 schema');

    const schema = {
      type: 'array',
      items: [
        this.item1Schema,
        this.item2Schema,
        this.item3Schema,
      ],
      additionalItems: true,
      additionalSchemaInfo: this.additionalSchemaInfo,
    };

    this.firstCoercedSchema = Symbol('coerced field1 schema');
    this.secondCoercedSchema = Symbol('coerced field1 schema');
    this.thirdCoercedSchema = Symbol('coerced field1 schema');
    const stub = sandbox.stub(lib, 'coerceSchemaToMatchOverride');
    stub.onFirstCall().returns(this.firstCoercedSchema);
    stub.onSecondCall().returns(this.secondCoercedSchema);
    stub.onThirdCall().returns(this.thirdCoercedSchema);

    this.result = lib.coerceArrayTupleSchema(schema, ['override value 1', 'override value 2'], 'schemaPath');
  });
  after(sandbox.restore);

  it('coerces the item schemas against their respective override item', function () {
    expect(lib.coerceSchemaToMatchOverride).to.be.calledThrice;
    expect(lib.coerceSchemaToMatchOverride.firstCall).to.be.calledWithExactly(
      this.item1Schema,
      'override value 1',
      'schemaPath[0]',
    );
    expect(lib.coerceSchemaToMatchOverride.secondCall).to.be.calledWithExactly(
      this.item2Schema,
      'override value 2',
      'schemaPath[1]',
    );
    expect(lib.coerceSchemaToMatchOverride.thirdCall).to.be.calledWithExactly(
      this.item3Schema,
      undefined,
      'schemaPath[2]',
    );
  });

  it('returns a schema with coerced item schemas', function () {
    expect(this.result).to.eql({
      type: 'array',
      items: [
        this.firstCoercedSchema,
        this.secondCoercedSchema,
        this.thirdCoercedSchema,
      ],
      additionalSchemaInfo: this.additionalSchemaInfo,
      minItems: 2,
      additionalItems: false,
    });
  });
});
