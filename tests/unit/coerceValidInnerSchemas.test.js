const lib = require('../../lib');

const sandbox = sinon.createSandbox();

describe('lib.coerceValidInnerSchemas', function () {
  context('when at least one inner schema works with the override', function () {
    before(function () {
      this.coercedFirstSchema = Symbol('coerced first schema');
      const stub = sandbox.stub(lib, 'coerceSchemaToMatchOverride');
      stub.onFirstCall().throws(new Error('mock error'));
      stub.onSecondCall().returns(this.coercedFirstSchema);

      this.firstSchema = Symbol('second schema');
      this.secondSchema = Symbol('second schema');
      const combinedSchema = [
        this.firstSchema,
        this.secondSchema,
      ];

      this.override = Symbol('override');
      this.result = lib.coerceValidInnerSchemas(combinedSchema, this.override, 'testSchemaPath', 'testSchemaPathKey');
    });
    after(sandbox.restore);

    it('attempts to coerce the inner schemas to work with the override', function () {
      expect(lib.coerceSchemaToMatchOverride).to.be.calledTwice;
      expect(lib.coerceSchemaToMatchOverride.firstCall).to.be.calledWithExactly(
        this.firstSchema,
        this.override,
        'testSchemaPath<testSchemaPathKey[0]>',
      );
      expect(lib.coerceSchemaToMatchOverride.secondCall).to.be.calledWithExactly(
        this.secondSchema,
        this.override,
        'testSchemaPath<testSchemaPathKey[1]>',
      );
    });

    it('returns the coerced schemas that work with the override', function () {
      expect(this.result).to.eql([
        this.coercedFirstSchema,
      ]);
    });
  });

  context('when none of the inner shcemas works with the override', function () {
    before(function () {
      this.coercedInnerSchema = Symbol('coerced inner schema');
      const stub = sandbox.stub(lib, 'coerceSchemaToMatchOverride');
      stub.onFirstCall().throws(new Error('mock error 1'));
      stub.onSecondCall().returns(new Error('mock error 2'));

      const combinedSchema = [
        Symbol('first schema'),
        Symbol('second schema'),
      ];

      this.testFn = () => {
        lib.coerceValidInnerSchemas(combinedSchema, Symbol('override'), 'testSchemaPath', 'testSchemaPathKey');
      };
    });
    after(sandbox.restore);

    it('throws an error with all of the error reasons combined', function () {
      expect(this.testFn).to.throw('mock error 1, mock error 2');
    });
  });
});
