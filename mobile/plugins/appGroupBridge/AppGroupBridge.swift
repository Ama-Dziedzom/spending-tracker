import Foundation

// Writes key-value pairs into the App Group shared UserDefaults so the
// Share Extension can read them without needing a JWTor any other IPC.
@objc(AppGroupBridge)
class AppGroupBridge: NSObject {
    private let suiteName = "group.com.ama.spendingtracker"

    @objc func setItem(_ key: String, value: String) {
        UserDefaults(suiteName: suiteName)?.set(value, forKey: key)
    }

    @objc func removeItem(_ key: String) {
        UserDefaults(suiteName: suiteName)?.removeObject(forKey: key)
    }

    @objc static func requiresMainQueueSetup() -> Bool { false }
}
