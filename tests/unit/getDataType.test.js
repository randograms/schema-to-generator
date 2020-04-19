const lib = require('../../lib');

describe('lib.getDataType', function () {
  [
    ['undefined', undefined, 'undefined'],
    ['null', null, 'null'],
    ['a string', 'test', 'string'],
    ['an integer', 7, 'integer'],
    ['a number', 7.1, 'number'],
    ['a boolean', true, 'boolean'],
    ['an object', {}, 'object'],
    ['an array', [], 'array'],
  ].forEach(([inputLabel, data, expectedType]) => {
    context(`with ${inputLabel}`, function () {
      it(`returns "${expectedType}"`, function () {
        expect(lib.getDataType(data)).to.equal(expectedType);
      });
    });
  });
});
