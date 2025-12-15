// Stub file for web platform - VLC player is not available on web
// This prevents the bundler from trying to import react-native-vlc-media-player on web

import React from 'react';
import type { VideoPlayerHandle, VideoPlayerProps } from './types';

const VlcVideoPlayer = React.forwardRef<VideoPlayerHandle, VideoPlayerProps>((_props, _ref) => {
  // This should never be rendered on web, but we provide a stub to prevent import errors
  console.error('VLC player is not available on web platform');
  return null;
});

VlcVideoPlayer.displayName = 'VlcVideoPlayer.web-stub';

export default VlcVideoPlayer;
