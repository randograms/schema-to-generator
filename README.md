# schema-to-generator

Domain driven data generators thanks to the power of [json-schema](https://json-schema.org/understanding-json-schema/), [schema-to-data](https://www.npmjs.com/package/@randograms/schema-to-data) and [lodash merge](https://lodash.com/docs/4.17.15#merge). Great for creating domain-specific functions to generate mock data based on json-schema data definitions.

## Getting Started

### Installation

```
$ npm i @randograms/schema-to-generator
```

### Import

```javascript
const {
  schemaToGenerator,
  schemasToGenerators,
} = require('@randograms/schema-to-generator');
```

### Schema to Generator

Converts a json-schema object to a dataGenerator function.

```javascript
const myJsonSchema = {
  type: 'object',
  properties: {
    firstName: { type: 'string' },
    lastName: { type: 'string' },
  },
  required: [
    'firstName',
    'lastName',
  ],
};

const dataGenerator = schemaToGenerator(myJsonSchema);
```

### Schemas to Generators

Converts an object whose values are json-schema objects, into an object with the same keys, but the values are now dataGenerators. Make sure all schemas are dereferenced before passing them to `schemasToGenerators`. The resulting dataGenerator functions will not be able to resolve refs.

```javascript
const myJsonSchemas = {
  user: {
    type: 'object',
    properties: {
      firstName: { type: 'string' },
      lastName: { type: 'string' },
    },
    required: [
      'firstName',
      'lastName',
    ],
  },
  task: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
    },
    required: [
      'title',
      'description',
    ],
  },
};

const dataGenerators = schemasToGenerators(myJsonSchemas);
dataGenerators.user //  a dataGenerator
dataGenerators.task // a dataGenerator
```

### Data Generators

Data generators are functions created from a json-schema object. When called, a data generator will return random data that matches the schema. Data generators can take an optional argument called an **override** to completely or partially override the randomly generated data. Every time a data generator is called, the resulting mock data will be validated against the original schema.

#### Without an override

```javascript
const dataGenerator = schemaToGenerator({
  type: 'object',
  properties: {
    firstName: { type: 'string' },
    lastName: { type: 'string' },
  },
  required: [
    'firstName',
    'lastName',
  ],
});

const mockUser = dataGenerator();
```

mockUser:

```json
{
  "firstName": "dolor magna mollit fugiat Lorem", // random value
  "lastName": "mollit sed"                        // random value
}
```

#### With an override
```javascript
const dataGenerator = schemaToGenerator({
  type: 'object',
  properties: {
    firstName: { type: 'string' },
    lastName: { type: 'string' },
  },
  required: [
    'firstName',
    'lastName',
  ],
});

const mockUser = dataGenerator({
  firstName: 'sam',
});
```

mockUser:

```json
{
  "firstName": "sam",             // the overridden value
  "lastName": "ipsum est dolore"  // random value
}
```

#### Array Overrides

The type of the override must always match the type of the schema. For array schemas, pass an array override. The length of the resulting mock array will always be the length of the array override. Use `undefined` to leave placeholder spaces for random array items.

```javascript
const dataGenerator = schemaToGenerator({
  type: 'array',
  items: {
    type: 'object',
    properties: {
      firstName: { type: 'string' },
      lastName: { type: 'string' },
    },
    required: [
      'firstName',
      'lastName',
    ],
  },
});

const mockUsers = dataGenerator([
  undefined,
  { firstName: 'neo' },
  {
    firstName: 'agent',
    lastName: 'smith',
  }
]);
```

mockUsers:
```json
[                                // array length matches override length
  {
    "firstName": "dolore nulla", // both firstName and lastName are random
    "lastName": "tempor quis"
  },
  {
    "firstName": "neo",          // only lastName is random
    "lastName": "quis labore"
  },
  {
    "firstName": "agent",        // neither field is random
    "lastName": "smith"
  }
]
```

## Options

### GenerateBaseData

A function that takes a json-schema and returns mock data. This allows the user to use their own schema-to-data instance or a different library such as [json-schema-faker](https://www.npmjs.com/package/json-schema-faker). A dataGenerator will call `generateBaseData` and then merge any overridden data on top of it.

```javascript
// with schema-to-data
const { createWithDefaults } = require('@randograms/schema-to-data');
const schemaToData = createWithDefaults({ /* custom defaults */ });

const dataGenerator = schemaToGenerator({ type: 'string' }, { generateBaseData: (schema) => schemaToData(schema) });
const dataGenerators = schemasToGenerators(
  {
    username: { type: 'string' },
    userId: { type: 'integer' },
  },
  { generateBaseData: (schema) => schemaToData(schema) },
);

// with json-schema-faker
const jsf = require('json-schema-faker');
/* set additional jsf options here */
const dataGenerator = schemaToGenerator({ type: 'string' }, { generateBaseData: (schema) => jsf.generate(schema) });
```

### Immutable

All mock data, including overridden values, are always validated against the original schema when a dataGenerator is called. Therefore it might be necessary to prevent further mutation of data after generation. Pass the immutable option when creating the dataGenerator function to make that function return immutable mock data. This library uses [deep-freeze](https://www.npmjs.com/package/deep-freeze) to freeze all nested objects and arrays.

```javascript
const dataGenerator = schemaToGenerator({ type: 'string' }, { immutable: true });
const dataGenerators = schemasToGenerators(
  {
    username: { type: 'string' },
    userId: { type: 'integer' },
  },
  { immutable: true }
);
```

## Limitations

- Schemas cannot have '$ref' attributes. All refs must be dereferenced before using this library. This library does not provide a mechanism to dereference schemas
