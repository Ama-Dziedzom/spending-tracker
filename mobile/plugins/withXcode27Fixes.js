// Expo Config Plugin — makes the iOS app build and launch with Xcode 27 / iOS 27.
//
// What this does at `expo prebuild` time:
//  1. Adopts the UIScene lifecycle (SceneDelegate + Info.plist scene manifest).
//     Apps built with the iOS 27 SDK are killed at launch without it.
//     Debug builds create the window early so expo-dev-client's launcher works.
//  2. Raises every pod's deployment target to 15.1 (Xcode 27 rejects lower).
//  3. Embeds the prebuilt React.framework, which CocoaPods can leave out of the
//     embed script ("Library not loaded: @rpath/React.framework/React").
//  4. Disables user script sandboxing so the JS bundling phase can write
//     main.jsbundle into the build products.
//  5. Builds the fmt pod as C++17 (Xcode 26.4+ rejects fmt 11.0.2's consteval use).
//  6. Quotes the react-native-xcode.sh invocation in the JS bundling phase, which
//     otherwise breaks when the project path contains a space ("My Projects").

const {
  withAppDelegate,
  withInfoPlist,
  withXcodeProject,
  withDangerousMod,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const MARKER = '@xcode27-fixes';

// ─── Step 1: UIScene lifecycle ────────────────────────────────────────────────

const WINDOW_SETUP = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`;

const WINDOW_SETUP_REPLACEMENT = `    // ${MARKER}: the window and React Native root are created in SceneDelegate:
    // apps built with the iOS 27 SDK must adopt the UIScene lifecycle or they are killed at launch.
#if DEBUG
    // ${MARKER}: Debug builds include expo-dev-client, whose launcher needs a window and a
    // React root *before* super.application(...) runs (else "Cannot find the keyWindow").
    // Create them here; SceneDelegate attaches this window to the scene when it connects.
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`;

const SCENE_DELEGATE = `// ${MARKER}
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }

#if DEBUG
    // Dev client: reuse the window AppDelegate already handed to the launcher.
    if let existing = appDelegate.window {
      existing.windowScene = windowScene
      self.window = existing
      existing.makeKeyAndVisible()
      if let userActivity = connectionOptions.userActivities.first {
        self.scene(scene, continue: userActivity)
      }
      return
    }
#endif

    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)

    if let userActivity = connectionOptions.userActivities.first {
      self.scene(scene, continue: userActivity)
    }
  }

  // Linking API
  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      _ = RCTLinkingManager.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  // Universal Links
  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = RCTLinkingManager.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}

`;

function withSceneDelegate(config) {
  return withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== 'swift') {
      throw new Error('withXcode27Fixes: expected a Swift AppDelegate');
    }
    let src = mod.modResults.contents;
    if (src.includes(MARKER)) return mod;

    if (!src.includes(WINDOW_SETUP)) {
      throw new Error('withXcode27Fixes: could not find the window setup in AppDelegate.swift');
    }
    src = src.replace(WINDOW_SETUP, WINDOW_SETUP_REPLACEMENT);

    const anchor = 'class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {';
    if (!src.includes(anchor)) {
      throw new Error('withXcode27Fixes: could not find ReactNativeDelegate in AppDelegate.swift');
    }
    src = src.replace(anchor, SCENE_DELEGATE + anchor);

    mod.modResults.contents = src;
    return mod;
  });
}

function withSceneManifest(config) {
  return withInfoPlist(config, (mod) => {
    mod.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return mod;
  });
}

// ─── Steps 2, 3 & 5: Podfile ─────────────────────────────────────────────────────

const DEPLOYMENT_TARGET_FIX = `
    # ${MARKER}
    installer.pods_project.targets.each do |target|
      # Workaround for Xcode 26.4+ (Apple Clang 21) rejecting fmt 11.0.2's
      # consteval FMT_STRING usage. Consteval doesn't exist pre-C++20, so
      # building just the \`fmt\` pod against C++17 falls back to its
      # runtime-checked format path. Remove once RN ships fmt >= 12.1.0
      # (tracked in facebook/react-native#55601).
      if target.name == 'fmt'
        target.build_configurations.each do |config|
          config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'gnu++17'
        end
      end

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

// ─── Step 4: script sandboxing ────────────────────────────────────────────────

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

// ─── Step 6: quote the JS bundling script path ────────────────────────────────

const UNQUOTED_BUNDLE_CALL =
  '`\\"$NODE_BINARY\\" --print \\"require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'\\"`';
const QUOTED_BUNDLE_CALL =
  'source \\"$(\\"$NODE_BINARY\\" --print \\"require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'\\")\\"';

function withQuotedBundleScript(config) {
  return withXcodeProject(config, (mod) => {
    const phases = mod.modResults.hash.project.objects['PBXShellScriptBuildPhase'] || {};
    for (const phase of Object.values(phases)) {
      if (typeof phase !== 'object' || !phase.shellScript) continue;
      phase.shellScript = phase.shellScript.replace(UNQUOTED_BUNDLE_CALL, QUOTED_BUNDLE_CALL);
    }
    return mod;
  });
}

module.exports = function withXcode27Fixes(config) {
  config = withSceneDelegate(config);
  config = withSceneManifest(config);
  config = withPodfileFixes(config);
  config = withScriptSandboxingDisabled(config);
  config = withQuotedBundleScript(config);
  return config;
};
