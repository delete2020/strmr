declare module 'react-native-pixel-perfect' {
  interface DesignResolution {
    width: number;
    height: number;
  }

  export function create(designResolution: DesignResolution): (size: number) => number;
}
