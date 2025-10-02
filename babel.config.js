module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
          '@/': './src/',
          '@components': './src/components',
          '@screens': './src/screens',
          '@services': './src/services',
          '@store': './src/store',
          '@utils': './src/utils',
          '@theme': './src/theme',
          '@constants': './src/constants',
          '@hooks': './src/hooks',
          '@types': './src/types',
          '@assets': './src/assets',
          '@navigation': './src/navigation',
        },
      },
    ],
  ],
};
