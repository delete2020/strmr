module.exports = {
  dependencies: {
    // Exclude react-native-webview for tvOS builds
    ...(process.env.EXPO_TV === '1' && {
      'react-native-webview': {
        platforms: {
          ios: null,
          android: null,
        },
      },
    }),
  },
};
