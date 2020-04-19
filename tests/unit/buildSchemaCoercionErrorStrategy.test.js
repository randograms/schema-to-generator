const lib = require('../../lib');

describe('lib.buildSchemaCoercionErrorStrategy', function () {
  it('replaces the default error message "data" keyword with the schema path', function () {
    this.exampleError = null;
    const errorStrategy = lib.buildSchemaCoercionErrorStrategy('override.field1.field2[0]');

    const testFn = () => {
      lib.validate({
        schema: {
          oneOf: [
            { type: 'string' },
            { type: 'number' },
          ],
        },
        errorStrategy,
      });
    };

    expect(testFn).to.throw('override.field1.field2[0] should be string, override.field1.field2[0] should be number, override.field1.field2[0] should match exactly one schema in oneOf');
  });
});
