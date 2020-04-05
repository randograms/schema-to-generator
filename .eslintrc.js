module.exports = {
  extends: [
    'eslint-config-airbnb-base',
  ],
  rules: {
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'index',
          'sibling',
          'parent',
        ],
      },
    ],
    'require-await': 'error',
  },
};
