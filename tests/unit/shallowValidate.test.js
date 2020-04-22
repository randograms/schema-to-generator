const lib = require('../../lib');

const sandbox = sinon.createSandbox();

describe('lib.shallowValidate', function () {
  const registerStubs = () => {
    before(function () {
      this.errorStrategy = Symbol('error strategy');

      sandbox.stub(lib, 'validate');
      sandbox.stub(lib, 'buildSchemaCoercionErrorStrategy').returns(this.errorStrategy);
    });
    after(sandbox.restore);
  };

  context('with an object schema and object override', function () {
    registerStubs();
    before(function () {
      this.additionalSchemaInfo = Symbol('additional schema info');

      const schema = {
        type: 'object',
        properties: {
          field1: Symbol('field1 schema'),
          field2: Symbol('field1 schema'),
        },
        patternProperties: {
          '[ab][cd]': Symbol('pattern1 schema'),
          '[ef][gh]': Symbol('pattern2 schema'),
        },
        allOf: Symbol('combined schema'),
        anyOf: Symbol('combined schema'),
        oneOf: Symbol('combined schema'),
        additionalSchemaInfo: this.additionalSchemaInfo,
      };
      this.schemaPath = Symbol('schemaPath');

      lib.shallowValidate(schema, { field2: 5 }, this.schemaPath);
    });

    it('builds a schema coercion error strategy', function () {
      expect(lib.buildSchemaCoercionErrorStrategy).to.be.called
        .and.to.be.calledWithExactly(this.schemaPath);
    });

    it('validates a shallow version of the schema', function () {
      expect(lib.validate).to.be.called
        .and.to.be.calledWithExactly({
          schema: {
            type: 'object',
            properties: {
              field1: {},
              field2: {},
            },
            patternProperties: {
              '[ab][cd]': {},
              '[ef][gh]': {},
            },
            additionalSchemaInfo: this.additionalSchemaInfo,
          },
          data: {
            field1: null,
            field2: 5,
          },
          errorStrategy: this.errorStrategy,
        });
    });
  });

  context('with a list array schema and array override', function () {
    registerStubs();
    before(function () {
      this.additionalSchemaInfo = Symbol('additional schema info');

      const schema = {
        type: 'array',
        items: { type: 'string' },
        allOf: Symbol('combined schema'),
        anyOf: Symbol('combined schema'),
        oneOf: Symbol('combined schema'),
        additionalSchemaInfo: this.additionalSchemaInfo,
      };

      this.arrayOverride = Symbol('array');
      this.schemaPath = Symbol('schemaPath');

      lib.shallowValidate(schema, this.arrayOverride, this.schemaPath);
    });

    it('builds a schema coercion error strategy', function () {
      expect(lib.buildSchemaCoercionErrorStrategy).to.be.called
        .and.to.be.calledWithExactly(this.schemaPath);
    });

    it('validates a shallow version of the schema', function () {
      expect(lib.validate).to.be.called
        .and.to.be.calledWithExactly({
          schema: {
            type: 'array',
            items: {},
            additionalSchemaInfo: this.additionalSchemaInfo,
          },
          data: this.arrayOverride,
          errorStrategy: this.errorStrategy,
        });
    });
  });

  context('with a tuple array schema and array override', function () {
    registerStubs();
    before(function () {
      this.additionalSchemaInfo = Symbol('additional schema info');

      const schema = {
        type: 'array',
        items: [
          Symbol('item1 schema'),
          Symbol('item2 schema'),
          Symbol('item3 schema'),
        ],
        allOf: Symbol('combined schema'),
        anyOf: Symbol('combined schema'),
        oneOf: Symbol('combined schema'),
        additionalSchemaInfo: this.additionalSchemaInfo,
      };

      this.schemaPath = Symbol('schemaPath');

      lib.shallowValidate(schema, ['override value 1', 'override value 2'], this.schemaPath);
    });

    it('builds a schema coercion error strategy', function () {
      expect(lib.buildSchemaCoercionErrorStrategy).to.be.called
        .and.to.be.calledWithExactly(this.schemaPath);
    });

    it('validates a shallow version of the schema against coerced override', function () {
      expect(lib.validate).to.be.called
        .and.to.be.calledWithExactly({
          schema: {
            type: 'array',
            items: [{}, {}, {}],
            additionalSchemaInfo: this.additionalSchemaInfo,
          },
          data: ['override value 1', 'override value 2', undefined],
          errorStrategy: this.errorStrategy,
        });
    });
  });
});
