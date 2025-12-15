// Expo config plugin to configure Xcode project for tvOS builds
// Sets correct SDK, supported platforms, and build settings

const { withXcodeProject } = require('@expo/config-plugins');

/**
 * Configure Xcode project for tvOS build
 */
const withTvOSXcodeConfig = (config) => {
    return withXcodeProject(config, (config) => {
        const isTvOS = process.env.EXPO_TV === '1';

        if (isTvOS) {
            console.log('🍎 Configuring Xcode project for tvOS...');
            const xcodeProject = config.modResults;

            // Get all build configurations
            const configurations = xcodeProject.pbxXCBuildConfigurationSection();

            for (const key in configurations) {
                const buildConfig = configurations[key];

                // Skip the comment entries
                if (typeof buildConfig === 'string' || !buildConfig.buildSettings) {
                    continue;
                }

                // Set tvOS-specific build settings
                buildConfig.buildSettings.SDKROOT = 'appletvos';
                buildConfig.buildSettings.SUPPORTED_PLATFORMS = ['appletvos', 'appletvsimulator'];
                buildConfig.buildSettings.TARGETED_DEVICE_FAMILY = '3';  // 3 = Apple TV

                // Remove iOS-specific settings
                delete buildConfig.buildSettings.IPHONEOS_DEPLOYMENT_TARGET;

                // Set tvOS deployment target
                if (!buildConfig.buildSettings.TVOS_DEPLOYMENT_TARGET) {
                    buildConfig.buildSettings.TVOS_DEPLOYMENT_TARGET = '17.0';
                }

                console.log(`  ✅ Configured ${buildConfig.name || 'build config'} for tvOS`);
            }

            console.log('✅ tvOS Xcode configuration complete');
        }

        return config;
    });
};

module.exports = withTvOSXcodeConfig;
