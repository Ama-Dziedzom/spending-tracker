const {
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

/**
 * Expo Config Plugin to copy native Kotlin SmsReceiver.kt files.
 */
function withCopyAndroidFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (mod) => {
      const androidRoot = mod.modRequest.platformProjectRoot;
      const destDir = path.join(androidRoot, 'app/src/main/java/com/ama/spendingtracker');
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // 1. Copy SmsReceiver.kt
      const srcReceiver = path.join(__dirname, 'android/SmsReceiver.kt');
      const destReceiver = path.join(destDir, 'SmsReceiver.kt');
      if (fs.existsSync(srcReceiver)) {
        fs.copyFileSync(srcReceiver, destReceiver);
      }

      // 2. Copy AppGroupBridge.kt
      const srcBridge = path.join(__dirname, 'android/AppGroupBridge.kt');
      const destBridge = path.join(destDir, 'AppGroupBridge.kt');
      if (fs.existsSync(srcBridge)) {
        fs.copyFileSync(srcBridge, destBridge);
      }

      // 3. Copy AppGroupBridgePackage.kt
      const srcPackage = path.join(__dirname, 'android/AppGroupBridgePackage.kt');
      const destPackage = path.join(destDir, 'AppGroupBridgePackage.kt');
      if (fs.existsSync(srcPackage)) {
        fs.copyFileSync(srcPackage, destPackage);
      }

      // 4. Modify MainApplication.kt to register AppGroupBridgePackage
      const mainAppPath = path.join(destDir, 'MainApplication.kt');
      if (fs.existsSync(mainAppPath)) {
        let content = fs.readFileSync(mainAppPath, 'utf8');

        // Inject Package in getPackages() if not present
        if (!content.includes('AppGroupBridgePackage()')) {
          content = content.replace(
            '// add(MyReactNativePackage())',
            '// add(MyReactNativePackage())\n              add(AppGroupBridgePackage())'
          );
          fs.writeFileSync(mainAppPath, content, 'utf8');
        }
      }

      return mod;
    },
  ]);
}

/**
 * Expo Config Plugin to inject permissions and BroadcastReceiver into AndroidManifest.xml.
 */
function withReceiverManifest(config) {
  return withAndroidManifest(config, async (mod) => {
    const androidManifest = mod.modResults;
    const manifest = androidManifest.manifest;

    // 1. Add RECEIVE_SMS and READ_SMS permissions
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permissions = ['android.permission.RECEIVE_SMS', 'android.permission.READ_SMS'];
    for (const p of permissions) {
      const exists = manifest['uses-permission'].some((item) => item.$['android:name'] === p);
      if (!exists) {
        manifest['uses-permission'].push({
          $: { 'android:name': p },
        });
      }
    }

    // 2. Add BroadcastReceiver inside the <application> tag
    const application = androidManifest.manifest.application[0];
    if (!application.receiver) {
      application.receiver = [];
    }

    const receiverExists = application.receiver.some(
      (item) => item.$['android:name'] === '.SmsReceiver',
    );

    if (!receiverExists) {
      application.receiver.push({
        $: {
          'android:name': '.SmsReceiver',
          'android:exported': 'true',
          'android:permission': 'android.permission.BROADCAST_SMS',
        },
        'intent-filter': [
          {
            $: { 'android:priority': '999' },
            action: [{ $: { 'android:name': 'android.provider.Telephony.SMS_RECEIVED' } }],
          },
        ],
      });
    }

    return mod;
  });
}

module.exports = function withAndroidSmsReceiver(config) {
  config = withCopyAndroidFiles(config);
  config = withReceiverManifest(config);
  return config;
};
