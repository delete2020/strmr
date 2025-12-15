import { useEffect } from 'react';
import { useRouter, useLocalSearchParams, useGlobalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { Linking } from 'react-native';

/**
 * Route handler for external player success callback
 * Called when playback completes successfully in an external player like Outplayer or Infuse
 */
export default function PlaybackDidFinish() {
  const router = useRouter();
  const localParams = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();

  useEffect(() => {
    // Get the initial URL to see the raw callback
    Linking.getInitialURL().then((url) => {
      console.log('=== EXTERNAL PLAYER CALLBACK (SUCCESS) ===');
      console.log('Raw callback URL:', url);

      // Parse URL manually to extract all parameters
      if (url) {
        try {
          const parsedUrl = new URL(url);
          console.log('Parsed URL pathname:', parsedUrl.pathname);
          console.log('Parsed URL search:', parsedUrl.search);
          console.log('Parsed URL hash:', parsedUrl.hash);

          // Log all search params
          const searchParams: Record<string, string> = {};
          parsedUrl.searchParams.forEach((value, key) => {
            searchParams[key] = value;
            console.log(`  - ${key}: ${value}`);
          });
          console.log('All search params:', searchParams);
        } catch (e) {
          console.log('Failed to parse URL:', e);
        }
      }

      console.log('Local search params:', localParams);
      console.log('Local parameter keys:', Object.keys(localParams));
      console.log('Global search params:', globalParams);
      console.log('Global parameter keys:', Object.keys(globalParams));
      console.log('Raw local params object:', JSON.stringify(localParams, null, 2));
      console.log('Raw global params object:', JSON.stringify(globalParams, null, 2));

      // Log individual parameters that might be returned
      const allParams = { ...globalParams, ...localParams };
      if (allParams.position !== undefined) {
        console.log('Playback position:', allParams.position);
      }
      if (allParams.duration !== undefined) {
        console.log('Video duration:', allParams.duration);
      }
      if (allParams.time !== undefined) {
        console.log('Time:', allParams.time);
      }
      if (allParams.percent !== undefined) {
        console.log('Percent complete:', allParams.percent);
      }
      if (allParams.resumePosition !== undefined) {
        console.log('Resume position:', allParams.resumePosition);
      }
      if (allParams.resumeTime !== undefined) {
        console.log('Resume time:', allParams.resumeTime);
      }

      console.log('=== END EXTERNAL PLAYER CALLBACK ===');
    });

    // Also listen for URL changes while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('=== URL EVENT RECEIVED ===');
      console.log('Event URL:', event.url);

      try {
        const parsedUrl = new URL(event.url);
        console.log('Event pathname:', parsedUrl.pathname);
        console.log('Event search:', parsedUrl.search);

        const searchParams: Record<string, string> = {};
        parsedUrl.searchParams.forEach((value, key) => {
          searchParams[key] = value;
          console.log(`  - ${key}: ${value}`);
        });
        console.log('Event search params:', searchParams);
      } catch (e) {
        console.log('Failed to parse event URL:', e);
      }

      console.log('=== END URL EVENT ===');
    });

    // Navigate back to the previous screen (usually the details page)
    // Small delay to ensure logs are captured
    setTimeout(() => {
      router.replace('/');
    }, 100);

    return () => {
      subscription.remove();
    };
  }, [router, localParams, globalParams]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
    </>
  );
}
