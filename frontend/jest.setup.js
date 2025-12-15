jest.mock('react-native/src/private/devsupport/devmenu/specs/NativeDevMenu', () => ({
  show: jest.fn(),
  reload: jest.fn(),
  setProfilingEnabled: jest.fn(),
  setHotLoadingEnabled: jest.fn(),
}));

jest.mock('react-native/src/private/specs_DEPRECATED/modules/NativeSettingsManager', () => ({
  getConstants: () => ({
    userInterfaceStyle: 'dark',
    Settings: {},
  }),
  setValues: jest.fn(),
}));

jest.mock('react-native-vlc-media-player', () => {
  const React = require('react');

  const assignRef = (ref, instance) => {
    if (!ref) {
      return;
    }

    if (typeof ref === 'function') {
      ref(instance);
    } else {
      ref.current = instance;
    }
  };

  const MockPlayer = React.forwardRef((_props, ref) => {
    const instance = {
      seek: jest.fn(),
      resume: jest.fn(),
      snapshot: jest.fn(),
    };

    assignRef(ref, instance);

    return null;
  });

  return {
    VLCPlayer: MockPlayer,
    VlCPlayerView: MockPlayer,
  };
});
