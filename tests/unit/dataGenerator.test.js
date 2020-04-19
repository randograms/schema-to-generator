const jsf = require('json-schema-faker');
const _ = require('lodash');
const lib = require('../../lib');

const sandbox = sinon.createSandbox();

describe('lib.schemaToGenerator->dataGenerator', function () {
  const registerBeforeAndAfter = () => {
    before(function () {
      this.schema = Symbol('schema');
      this.coercedSchema = Symbol('coerced schema');

      if (!_.has(this, 'override')) {
        throw new Error('Invalid test setup: Need to set "this.override"');
      }

      this.generatedData = Symbol('generated data');
      this.mergedData = Symbol('merged data');

      sandbox.stub(lib, 'coerceSchemaToMatchOverride').returns(this.coercedSchema);
      sandbox.stub(jsf, 'generate').returns(this.generatedData);
      sandbox.stub(_, 'merge').returns(this.mergedData);
      sandbox.stub(lib, 'validate');

      const dataGenerator = lib.schemaToGenerator(this.schema);
      this.result = dataGenerator(this.override);
    });
    after(sandbox.restore);
  };

  const itCoercesTheSchemaAndGeneratesBaseDataAndValidatesTheReturnedData = ({ expectMerge = false } = {}) => {
    it('coerces the schema to match the override', function () {
      expect(lib.coerceSchemaToMatchOverride).to.be.called
        .and.to.be.calledWithExactly(
          this.schema,
          this.override,
          'override',
        );
    });

    it('generates base mock data from the coerced schema', function () {
      expect(jsf.generate).to.be.called
        .and.to.be.calledWithExactly(this.coercedSchema);
    });

    if (expectMerge) {
      it('merges the generated data with the override', function () {
        expect(_.merge).to.be.called
          .and.to.be.calledWithExactly(this.generatedData, this.override);
      });
    } else {
      it('does not merge data', function () {
        expect(_.merge).to.not.be.called;
      });
    }

    it('validates the returned data', function () {
      expect(lib.validate).to.be.called
        .and.to.be.calledWithExactly({
          schema: this.schema,
          data: this.result,
          errorStrategy: sinon.match.func,
        });
    });
  };

  context('without an override', function () {
    before(function () {
      this.override = undefined;
    });
    registerBeforeAndAfter();

    itCoercesTheSchemaAndGeneratesBaseDataAndValidatesTheReturnedData();

    it('returns the generated data', function () {
      expect(this.result).to.equal(this.generatedData);
    });
  });

  [
    ['a "null"', null],
    ['a "string"', 'test'],
    ['an "integer"', 2],
    ['a "number"', 7.4],
    ['a "boolean"', false],
  ].forEach(([clause, override]) => {
    context(`with ${clause} override`, function () {
      before(function () {
        this.override = override;
      });
      registerBeforeAndAfter();

      itCoercesTheSchemaAndGeneratesBaseDataAndValidatesTheReturnedData();

      it('returns the override', function () {
        expect(this.result).to.equal(override);
      });
    });
  });

  context('with an object override', function () {
    before(function () {
      this.override = { field1: 'test' };
    });
    registerBeforeAndAfter();

    itCoercesTheSchemaAndGeneratesBaseDataAndValidatesTheReturnedData({ expectMerge: true });

    it('returns the merged data', function () {
      expect(this.result).to.equal(this.mergedData);
    });
  });

  context('with an array override', function () {
    before(function () {
      this.override = [1, 2, 3];
    });
    registerBeforeAndAfter();

    itCoercesTheSchemaAndGeneratesBaseDataAndValidatesTheReturnedData({ expectMerge: true });

    it('returns the merged data', function () {
      expect(this.result).to.equal(this.mergedData);
    });
  });

  describe('error strategy', function () {
    before(function () {
      sandbox.stub(lib, 'validate');

      const dataGenerator = lib.schemaToGenerator({ type: 'string' });
      dataGenerator('hello');

      ([{ errorStrategy: this.errorStrategy }] = lib.validate.lastCall.args);
    });
    after(sandbox.restore);

    it('throws an error', function () {
      const testFn = () => {
        this.errorStrategy('mock error message');
      };

      expect(testFn).to.throw(/mock error message/);
    });
  });
});
