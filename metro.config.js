const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Le profil « hermes-stable » laisse passer les champs privés `#x`, que le
// binaire hermesc livré avec react-native 0.81 refuse de compiler. Le profil
// par défaut les transpile, ce qui rend le bundle compatible.
config.transformer.unstable_transformProfile = 'default';

module.exports = config;
