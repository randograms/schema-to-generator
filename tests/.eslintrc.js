module.exports = {
  env: {
    mocha: true,
  },
  extends: [
    '../.eslintrc.js',
  ],
  globals: {
    expect: 'readonly',
    sinon: 'readonly',
  },
  plugins: [
    'mocha',
  ],
  rules: {
    'func-names': 'off',
    'mocha/no-exclusive-tests': 'error',
    'no-unused-expressions': 'off',
    'prefer-arrow-callback': 'off',
  },
};
