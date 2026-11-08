// Expo Config Plugin — iOS build fixes for Xcode 27 that the SDK 58 template
// doesn't cover yet.
//
// What this does at `expo prebuild` time:
//  1. Raises every pod's deployment target to 15.1 (Xcode 27 rejects lower).
//  2. Embeds the prebuilt React.framework, which CocoaPods can leave out of the
//     embed script ("Library not loaded: @rpath/React.framework/React").
//  3. Disables user script sandboxing so the JS bundling phase can write
//     main.jsbundle into the build products.
//
// Removed in the SDK 58 upgrade because the template now handles them:
//  - UIScene lifecycle (template ships SceneDelegate.swift + scene manifest).
//  - Quoting the react-native-xcode.sh call (template quotes it; re-quoting broke it).
//  - Building fmt as C++17 (RN 0.88 ships fmt 12.1.0).

const {
  withXcodeProject,
  withDangerousMod,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const MARKER = '@xcode27-fixes';

// ─── Steps 1 & 2: Podfile ──────────────────────────────────────────────────────

const DEPLOYMENT_TARGET_FIX = `
    # ${MARKER}
    installer.pods_project.targets.each do |target|
      # Xcode 27 rejects deployment targets below iOS 15.
      target.build_configurations.each do |config|
        if config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.1
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
      end
    end
`;

const EMBED_REACT_FRAMEWORK = `
  # ${MARKER}: the prebuilt React.framework (RCT_USE_PREBUILT_RNCORE) is linked but
  # CocoaPods can leave it out of the embed script, so the app crashes at launch with
  # "Library not loaded: @rpath/React.framework/React". Embed it explicitly.
  post_integrate do |installer|
    installer.aggregate_targets.each do |aggregate_target|
      script = File.join(installer.sandbox.target_support_files_root, aggregate_target.name, "#{aggregate_target.name}-frameworks.sh")
      next unless File.exist?(script)
      contents = File.read(script)
      next if contents.include?('React-Core-prebuilt/React.framework')
      line = %Q(  install_framework "\\\${PODS_XCFRAMEWORKS_BUILD_DIR}/React-Core-prebuilt/React.framework"\\n)
      contents.gsub!(%r{(  install_framework "\\$\\{PODS_XCFRAMEWORKS_BUILD_DIR\\}/ReactNativeDependencies/ReactNativeDependencies.framework"\\n)}) { $1 + line }
      File.write(script, contents)
    end
  end
`;

function withPodfileFixes(config) {
  return withDangerousMod(config, [
    'ios',
    (mod) => {
      const podfilePath = path.join(mod.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');
      if (podfile.includes(MARKER)) return mod;

      // Append inside post_install, right after react_native_post_install(...).
      const postInstallCall = /(\n    react_native_post_install\([\s\S]*?\n    \)\n)/;
      if (!postInstallCall.test(podfile)) {
        throw new Error('withXcode27Fixes: could not find react_native_post_install in Podfile');
      }
      podfile = podfile.replace(postInstallCall, `$1${DEPLOYMENT_TARGET_FIX}`);

      // Add post_integrate before the final `end` of the target block.
      podfile = podfile.replace(/\nend\s*$/, `\n${EMBED_REACT_FRAMEWORK}end\n`);

      fs.writeFileSync(podfilePath, podfile);
      return mod;
    },
  ]);
}

// ─── Step 3: script sandboxing ────────────────────────────────────────────────

function withScriptSandboxingDisabled(config) {
  return withXcodeProject(config, (mod) => {
    const configurations = mod.modResults.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configurations)) {
      const buildSettings = configurations[key].buildSettings;
      if (buildSettings) buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
    }
    return mod;
  });
}

module.exports = function withXcode27Fixes(config) {
  config = withPodfileFixes(config);
  config = withScriptSandboxingDisabled(config);
  return config;
};
