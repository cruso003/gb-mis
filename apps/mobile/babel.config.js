module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    // Required for WatermelonDB decorators (@field, @text, @date, @readonly).
    // Must come BEFORE @babel/plugin-transform-class-properties (handled by expo preset).
    ['@babel/plugin-proposal-decorators', { legacy: true }],
  ],
};
