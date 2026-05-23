// Expo Config Plugin — adds a Share Extension to the iOS app.
//
// What this does at `expo prebuild` time:
//  1. Copies Swift source files into ios/ShareExtension/
//  2. Copies the App Group bridge files into ios/<ProjectName>/
//  3. Adds an app_extension target (ShareExtension) to the Xcode project
//  4. Adds the bridge files to the main app target
//  5. Wires up App Group entitlements in both the main app and the extension

const {
  withXcodeProject,
  withEntitlementsPlist,
  withDangerousMod,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const EXT_NAME = 'ShareExtension';
const EXT_BUNDLE_SUFFIX = '.ShareExtension';
const APP_GROUP_ID = 'group.com.ama.spendingtracker';

const SHARE_EXT_SOURCES = path.join(__dirname, 'shareExtension');
const BRIDGE_SOURCES = path.join(__dirname, 'appGroupBridge');

// ─── Step 1: copy files into ios/ during prebuild ─────────────────────────────

function withCopyFiles(config) {
  return withDangerousMod(config, [
    'ios',
    (mod) => {
      const iosRoot = mod.modRequest.platformProjectRoot;
      const projectName = mod.modRequest.projectName;

      // ios/ShareExtension/
      const extDir = path.join(iosRoot, EXT_NAME);
      if (!fs.existsSync(extDir)) fs.mkdirSync(extDir, { recursive: true });
      for (const file of [
        'ShareViewController.swift',
        'Info.plist',
        `${EXT_NAME}.entitlements`,
      ]) {
        const src = path.join(SHARE_EXT_SOURCES, file);
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(extDir, file));
      }

      // ios/<ProjectName>/ — bridge files
      const appDir = path.join(iosRoot, projectName);
      if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true });
      for (const file of ['AppGroupBridge.swift', 'AppGroupBridge.m']) {
        const src = path.join(BRIDGE_SOURCES, file);
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(appDir, file));
      }

      return mod;
    },
  ]);
}

// ─── Step 2: main app entitlements ───────────────────────────────────────────

function withAppGroupEntitlement(config) {
  return withEntitlementsPlist(config, (mod) => {
    const groups =
      mod.modResults['com.apple.security.application-groups'] || [];
    if (!groups.includes(APP_GROUP_ID)) {
      mod.modResults['com.apple.security.application-groups'] = [
        ...groups,
        APP_GROUP_ID,
      ];
    }
    return mod;
  });
}

// ─── Step 3: Xcode project modifications ─────────────────────────────────────

function withXcodeChanges(config) {
  return withXcodeProject(config, (mod) => {
    const proj = mod.modResults;
    const bundleId = mod.ios?.bundleIdentifier ?? 'com.ama.spendingtracker';
    const projectName = mod.modRequest.projectName;

    addBridgeFilesToMainTarget(proj, projectName);
    addShareExtensionTarget(proj, bundleId);

    return mod;
  });
}

// Strip the surrounding quotes xcode sometimes stores on string values,
// e.g. '"LogIt"' → 'LogIt'. Simple identifiers are stored without quotes.
function unquote(s) {
  return String(s || '').replace(/^"(.*)"$/, '$1');
}

// Add AppGroupBridge.swift + .m to the main app target (idempotent)
function addBridgeFilesToMainTarget(proj, projectName) {
  // Idempotency: skip if the file reference already exists
  const fileRefs = proj.hash.project.objects['PBXFileReference'] || {};
  const alreadyAdded = Object.values(fileRefs).some((f) => {
    if (typeof f !== 'object') return false;
    const base = unquote(f.path).split('/').pop();
    return base === 'AppGroupBridge.swift';
  });
  if (alreadyAdded) return;

  // Find the main app target (product type = application)
  const nativeTargets = proj.hash.project.objects['PBXNativeTarget'] || {};
  let mainTargetUuid = null;
  for (const [uuid, t] of Object.entries(nativeTargets)) {
    if (typeof t !== 'object') continue;
    if (unquote(t.productType) === 'com.apple.product-type.application') {
      mainTargetUuid = uuid;
      break;
    }
  }
  if (!mainTargetUuid) return;

  // Find the group for the main app directory by name OR path.
  // The xcode package stores simple identifiers WITHOUT quotes.
  const groups = proj.hash.project.objects['PBXGroup'] || {};
  let mainGroupUuid = null;
  for (const [uuid, g] of Object.entries(groups)) {
    if (typeof g !== 'object') continue;
    if (unquote(g.name) === projectName || unquote(g.path) === projectName) {
      mainGroupUuid = uuid;
      break;
    }
  }
  // Always fall back to the root project main group so addSourceFile never
  // receives null — a null group triggers addPluginFile → correctForPluginsPath
  // which crashes when there is no 'Plugins' group (Expo projects don't have one).
  if (!mainGroupUuid) {
    mainGroupUuid = proj.getFirstProject().firstProject.mainGroup;
  }

  proj.addSourceFile(
    `${projectName}/AppGroupBridge.swift`,
    { target: mainTargetUuid },
    mainGroupUuid,
  );
  proj.addSourceFile(
    `${projectName}/AppGroupBridge.m`,
    { target: mainTargetUuid },
    mainGroupUuid,
  );
}

// Add the ShareExtension app_extension target (idempotent)
function addShareExtensionTarget(proj, mainBundleId) {
  const extBundleId = `${mainBundleId}${EXT_BUNDLE_SUFFIX}`;

  // Idempotency: names may or may not be quoted in the stored pbxproj
  const nativeTargets = proj.hash.project.objects['PBXNativeTarget'] || {};
  const exists = Object.values(nativeTargets).some(
    (t) => typeof t === 'object' && unquote(t.name) === EXT_NAME,
  );
  if (exists) return;

  // Create a PBX group for the extension files
  const extGroup = proj.addPbxGroup([], EXT_NAME, EXT_NAME);
  const mainGroupUuid = proj.getFirstProject().firstProject.mainGroup;
  proj.addToPbxGroup(extGroup.uuid, mainGroupUuid);

  // Create the extension target
  const extTarget = proj.addTarget(
    EXT_NAME,
    'app_extension',
    EXT_NAME,
    extBundleId,
  );

  // Add source file (automatically added to the target's Sources build phase)
  proj.addSourceFile(
    `${EXT_NAME}/ShareViewController.swift`,
    { target: extTarget.uuid },
    extGroup.uuid,
  );

  // Add Info.plist and entitlements to the group (not build phases — referenced via settings)
  proj.addFile(`${EXT_NAME}/Info.plist`, extGroup.uuid, {
    defaultEncoding: 4,
  });
  proj.addFile(`${EXT_NAME}/${EXT_NAME}.entitlements`, extGroup.uuid, {
    defaultEncoding: 4,
  });

  // Set build settings for the new target's configurations
  const configListUuid = extTarget.pbxNativeTarget.buildConfigurationList;
  const configLists =
    proj.hash.project.objects['XCConfigurationList'] || {};
  const buildConfigs =
    proj.hash.project.objects['XCBuildConfiguration'] || {};

  const configList = configLists[configListUuid];
  if (configList?.buildConfigurations) {
    for (const { value: cfgUuid } of configList.buildConfigurations) {
      const cfg = buildConfigs[cfgUuid];
      if (!cfg?.buildSettings) continue;

      Object.assign(cfg.buildSettings, {
        ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES: '"NO"',
        CLANG_ENABLE_MODULES: '"YES"',
        CODE_SIGN_ENTITLEMENTS: `"${EXT_NAME}/${EXT_NAME}.entitlements"`,
        INFOPLIST_FILE: `"${EXT_NAME}/Info.plist"`,
        IPHONEOS_DEPLOYMENT_TARGET: '"16.0"',
        LD_RUNPATH_SEARCH_PATHS:
          '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
        PRODUCT_BUNDLE_IDENTIFIER: `"${extBundleId}"`,
        SKIP_INSTALL: '"YES"',
        SWIFT_VERSION: '"5.0"',
        TARGETED_DEVICE_FAMILY: '"1,2"',
      });
    }
  }
}

// ─── Compose and export ───────────────────────────────────────────────────────

module.exports = function withShareExtension(config) {
  config = withCopyFiles(config);
  config = withAppGroupEntitlement(config);
  config = withXcodeChanges(config);
  return config;
};
