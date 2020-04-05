const jsf = require('json-schema-faker');
const { schemaToGenerator } = require('../../index');

describe('dataGenerator', function () {
  before(function () {
    this.returnValue = Symbol('return value');
    sinon.stub(jsf, 'generate').returns(this.returnValue);

    this.schema = { type: 'string' };
    const dataGenerator = schemaToGenerator(this.schema);
    this.result = dataGenerator();
  });

  it('calls jsf.generate with the schema', function () {
    expect(jsf.generate).to.be.called
      .and.to.be.calledWithExactly(this.schema);
  });

  it('returns the generated data', function () {
    expect(this.result).to.equal(this.returnValue);
  });
});
