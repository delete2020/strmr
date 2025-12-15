const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withNowPlayingManager = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfileContent = fs.readFileSync(podfilePath, 'utf-8');

      // Add the local pod reference if not already present
      if (!podfileContent.includes("pod 'NowPlayingManager'")) {
        // Find the target block and add our pod
        const targetMatch = podfileContent.match(/(target\s+['"][^'"]+['"]\s+do)/);
        if (targetMatch) {
          const insertPoint = podfileContent.indexOf(targetMatch[0]) + targetMatch[0].length;
          const podLine = `\n  # Now Playing Manager for VLC\n  pod 'NowPlayingManager', :path => '../modules/now-playing-manager'\n`;
          podfileContent = podfileContent.slice(0, insertPoint) + podLine + podfileContent.slice(insertPoint);

          fs.writeFileSync(podfilePath, podfileContent);
          console.log('✅ [NowPlayingManager] Added pod to Podfile');
        }
      }

      return config;
    },
  ]);
};

module.exports = withNowPlayingManager;
