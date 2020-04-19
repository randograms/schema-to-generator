const lib = require('../../lib');

const sandbox = sinon.createSandbox();

describe('lib.validate', function () {
  context('when the data is valid', function () {
    before(function () {
      sandbox.spy(lib.schemaValidator, 'validate');

      lib.validate({
        schema: { type: 'string' },
        data: 'hello',
      });
    });
    after(sandbox.restore);

    it('validates the data and then does nothing', function () {
      expect(lib.schemaValidator.validate).to.be.called
        .and.to.be.calledWithExactly({ type: 'string' }, 'hello');
    });
  });

  context('when the data is invalid', function () {
    context('without an error strategy', function () {
      it('throws a default error', function () {
        const testFn = () => {
          lib.validate({
            schema: { type: 'string' },
            data: 7,
          });
        };

        expect(testFn).to.throw('data should be string');
      });
    });

    context('with an error strategy', function () {
      before(function () {
        this.errorStrategy = sinon.spy();

        lib.validate({
          schema: { type: 'string' },
          data: 7,
          errorStrategy: this.errorStrategy,
        });
      });

      it('calls the errorStrategy with the default error message', function () {
        expect(this.errorStrategy).to.be.called
          .and.to.be.calledWithExactly('data should be string');
      });
    });
  });
});
