/* eslint-disable global-require */

const chai = require('chai')
  .use(require('sinon-chai'));

Object.assign(global, {
  expect: chai.expect,
  sinon: require('sinon'),
});
