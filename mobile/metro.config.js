// The translation dictionaries and shared types live in ../shared, outside this
// package, so Metro has to be told to watch (and bundle from) that folder.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders || []), path.resolve(__dirname, '..', 'shared')];

module.exports = config;
