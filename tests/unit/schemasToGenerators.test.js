const lib = require('../../lib');

const sandbox = sinon.createSandbox();

describe('lib.schemasToGenerators', function () {
  const setupContext = () => {
    before(function () {
      this.schemas = {
        name1: { type: 'string' },
        name2: { type: 'number' },
      };

      this.firstReturn = Symbol('1');
      this.secondReturn = Symbol('2');

      const stub = sandbox.stub(lib, 'schemaToGenerator');
      stub.onFirstCall().returns(this.firstReturn);
      stub.onSecondCall().returns(this.secondReturn);
    });
    after(sandbox.restore);
  };

  context('with schemas keyed by name and without options', function () {
    setupContext();
    before(function () {
      this.result = lib.schemasToGenerators(this.schemas);
    });

    it('passes the schemas and options in order to schemaToGenerator', function () {
      expect(lib.schemaToGenerator).to.be.calledTwice;
      expect(lib.schemaToGenerator.firstCall).to.be.calledWithExactly(
        { type: 'string' },
        { immutable: undefined },
      );
      expect(lib.schemaToGenerator.secondCall).to.be.calledWithExactly(
        { type: 'number' },
        { immutable: undefined },
      );
    });

    it('returns dataGenerator functions keyed by name', function () {
      expect(this.result).to.eql({
        name1: this.firstReturn,
        name2: this.secondReturn,
      });
    });
  });

  context('with schemas keyed by name and options', function () {
    setupContext();
    before(function () {
      this.result = lib.schemasToGenerators(this.schemas, { immutable: true });
    });

    it('passes the schemas and options in order to schemaToGenerator', function () {
      expect(lib.schemaToGenerator).to.be.calledTwice;
      expect(lib.schemaToGenerator.firstCall).to.be.calledWithExactly(
        { type: 'string' },
        { immutable: true },
      );
      expect(lib.schemaToGenerator.secondCall).to.be.calledWithExactly(
        { type: 'number' },
        { immutable: true },
      );
    });

    it('returns dataGenerator functions keyed by name', function () {
      expect(this.result).to.eql({
        name1: this.firstReturn,
        name2: this.secondReturn,
      });
    });
  });
});
