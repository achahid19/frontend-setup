// babel.config.js
module.exports = {
  presets: [
    '@babel/preset-env',
    [
      '@babel/preset-react',
      {
        // Use the 'classic' runtime to enable custom pragmas
        runtime: 'classic',

        // Tell Babel to use 'Jarvis.createElement' instead of 'React.createElement'
        pragma: 'Jarvis.createElement',
      },
    ],
  ],
};
