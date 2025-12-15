declare module 'react-native-vlc-media-player' {
  import type { Component } from 'react';
  import type { StyleProp, ViewStyle } from 'react-native';

  export type PlayerAspectRatio = '16:9' | '1:1' | '4:3' | '3:2' | '21:9' | '9:16';
  export type PlayerResizeMode = 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';

  export type Track = {
    id: number;
    name: string;
  };

  export interface VLCPlayerSource {
    uri: string;
    initType?: 1 | 2;
    initOptions?: string[];
  }

  export type VideoInfo = {
    duration: number;
    target: number;
    videoSize: { width: number; height: number };
    audioTracks: Track[];
    textTracks: Track[];
  };

  export type ProgressEvent = {
    currentTime: number;
    duration: number;
    position: number;
    remainingTime: number;
    target: number;
  };

  export type SimpleEvent = {
    target: number;
  };

  export interface VLCPlayerProps {
    source: VLCPlayerSource;
    paused?: boolean;
    repeat?: boolean;
    muted?: boolean;
    volume?: number;
    rate?: number;
    seek?: number;
    audioTrack?: number;
    textTrack?: number;
    playInBackground?: boolean;
    videoAspectRatio?: PlayerAspectRatio;
    autoAspectRatio?: boolean;
    resizeMode?: PlayerResizeMode;
    style?: StyleProp<ViewStyle>;
    autoplay?: boolean;
    acceptInvalidCertificates?: boolean;
    onPlaying?: (event: { duration: number; target: number; seekable: boolean }) => void;
    onProgress?: (event: ProgressEvent) => void;
    onPaused?: (event: SimpleEvent) => void;
    onStopped?: (event: SimpleEvent) => void;
    onBuffering?: (event: SimpleEvent) => void;
    onEnd?: (event: SimpleEvent) => void;
    onError?: (event: unknown) => void;
    onLoad?: (info: VideoInfo) => void;
    onRecordingCreated?: (path: string) => void;
    onSnapshot?: (event: { success: boolean; path?: string; error?: string }) => void;
  }

  export class VLCPlayer extends Component<VLCPlayerProps> {
    seek(position: number): void;
    resume(): void;
    snapshot(path: string): void;
  }

  export class VlCPlayerView extends Component<any> {
    seek(position: number): void;
  }

  const control: {
    VLCPlayer: typeof VLCPlayer;
    VlCPlayerView: typeof VlCPlayerView;
  };

  export default control;
}
