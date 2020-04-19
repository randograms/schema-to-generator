const lib = require('../../lib');

const sandbox = sinon.createSandbox();

describe('lib.coerceAllOf', function () {
  before(function () {
    this.firstCoercedSchema = Symbol('first coerced schema');
    this.secondCoercedSchema = Symbol('second coerced schema');
    const stub = sandbox.stub(lib, 'coerceSchemaToMatchOverride');
    stub.onFirstCall().returns(this.firstCoercedSchema);
    stub.onSecondCall().returns(this.secondCoercedSchema);

    this.firstSchema = Symbol('first schema');
    this.secondSchema = Symbol('second schema');
    const allOf = [
      this.firstSchema,
      this.secondSchema,
    ];
    this.override = Symbol('override');

    this.result = lib.coerceAllOf(allOf, this.override, 'testSchemaPath');
  });
  after(sandbox.restore);

  it('coereces each schema in the allOf', function () {
    expect(lib.coerceSchemaToMatchOverride).to.be.calledTwice;
    expect(lib.coerceSchemaToMatchOverride.firstCall).to.be.calledWithExactly(
      this.firstSchema,
      this.override,
      'testSchemaPath<allOf[0]>',
    );
    expect(lib.coerceSchemaToMatchOverride.secondCall).to.be.calledWithExactly(
      this.secondSchema,
      this.override,
      'testSchemaPath<allOf[1]>',
    );
  });

  it('returns the coerced allOf', function () {
    expect(this.result).to.eql([
      this.firstCoercedSchema,
      this.secondCoercedSchema,
    ]);
  });
});
