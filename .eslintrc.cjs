module.exports = {
  env: { browser: true, es2022: true, node: true },
  extends: [
    'standard',
    'plugin:import/recommended',
    'plugin:n/recommended',
    'plugin:promise/recommended',
    'prettier'
  ],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  rules: {
    'n/no-unsupported-features/es-syntax': 'off',
    'import/no-unresolved': 'off'
  },
}

