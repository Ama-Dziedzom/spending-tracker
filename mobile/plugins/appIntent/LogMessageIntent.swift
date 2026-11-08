//
//  LogMessageIntent.swift
//  LogIt
//
//  The "Log Message" action LogIt adds to the Shortcuts app.
//
//  Users set up one automation and nothing else:
//    When I receive a message where Message contains GHS
//    → LogIt: Log Message (Messages: Shortcut Input)
//
//  It runs in the background with the user's own LogIt session (read from the
//  App Group the app writes in lib/shareSync.ts), so there is no Shortcut to
//  install, no URL and no shared secret. It also accepts several messages at
//  once (multi-select share from Messages).
//

import AppIntents
import Foundation
import UserNotifications

// MARK: - Intent

@available(iOS 16.0, *)
struct LogMessageIntent: AppIntent {
    static let title: LocalizedStringResource = "Log Message"
    static let description = IntentDescription(
        "Logs bank and mobile money messages in LogIt. Chat messages and codes are ignored.",
        categoryName: "Transactions"
    )
    static let openAppWhenRun: Bool = false

    @Parameter(
        title: "Messages",
        description: "The SMS text. In a Message automation or a Share Sheet shortcut, use Shortcut Input.",
        requestValueDialog: "Paste the MoMo or bank message to log."
    )
    var messages: [String]

    static var parameterSummary: some ParameterSummary {
        Summary("Log \(\.$messages) in LogIt")
    }

    func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
        let client = LogItClient()
        guard client.isSignedIn else { throw LogItIntentError.notSignedIn }

        var tally = Tally()

        // Messages saved while offline go first (oldest first).
        tally.sentFromQueue = await client.flushPending()

        for raw in messages {
            let text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !text.isEmpty else { continue }
            let outcome = await client.log(text)
            if case .notSignedIn = outcome { throw LogItIntentError.notSignedIn }
            tally.add(outcome)
        }

        let summary = tally.summary
        // LogIt's own notification (with the app's name and icon). Turn off
        // "Show When Run" on the action to see only this one.
        if tally.worthNotifying { await LogItNotifier.post(summary) }
        return .result(value: summary, dialog: "\(summary)")
    }
}

@available(iOS 16.0, *)
enum LogItIntentError: Error, CustomLocalizedStringResourceConvertible {
    case notSignedIn

    var localizedStringResource: LocalizedStringResource {
        switch self {
        case .notSignedIn: return "Open LogIt and sign in, then try again."
        }
    }
}

// MARK: - App Shortcuts
//
// Registers "Log Message" with the system, so it sits at the top of LogIt's
// section in the Shortcuts action list, shows up in Spotlight, and works with
// Siri ("Log a message in LogIt") with no setup. Automations still have to be
// created by the user; Apple doesn't let apps create them.

@available(iOS 16.0, *)
struct LogItAppShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: LogMessageIntent(),
            phrases: [
                "Log a message in \(.applicationName)",
                "Log a transaction in \(.applicationName)",
                "Add an SMS to \(.applicationName)",
            ]
        )
    }
}

// MARK: - Offline queue
//
// "pending_sms" in the App Group: a JSON array of message texts. The Android
// receiver uses the same key and format, and the app sends them when it opens
// (lib/pending-sms.ts). Retrying is safe: the API ignores duplicates.

enum PendingQueue {
    static let key = "pending_sms"
    static let max = 100

    static func all(defaults: UserDefaults?) -> [String] {
        guard let raw = defaults?.string(forKey: key), let data = raw.data(using: .utf8),
              let list = try? JSONSerialization.jsonObject(with: data) as? [String] else { return [] }
        return list
    }

    static func save(_ list: [String], defaults: UserDefaults?) {
        if list.isEmpty { defaults?.removeObject(forKey: key); return }
        if let data = try? JSONSerialization.data(withJSONObject: Array(list.suffix(max))),
           let raw = String(data: data, encoding: .utf8) {
            defaults?.set(raw, forKey: key)
        }
    }

    static func add(_ sms: String, defaults: UserDefaults?) {
        var list = all(defaults: defaults)
        if !list.contains(sms) { list.append(sms) }
        save(list, defaults: defaults)
    }
}

// MARK: - Notifications

enum LogItNotifier {
    /// Shows the result as a LogIt notification, if the user allowed them.
    static func post(_ text: String) async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }

        let lines = text.split(separator: "\n", maxSplits: 1).map(String.init)
        let content = UNMutableNotificationContent()
        content.title = lines.first ?? "LogIt"
        if lines.count > 1 { content.body = lines[1] }
        content.sound = nil
        content.threadIdentifier = "logit.logged"
        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
        try? await center.add(request)
    }
}

// MARK: - Outcomes

enum LogOutcome {
    case logged(String)       // one-line description of what was saved
    case duplicate
    case needsReview
    case ignored
    case failed(String)
    case queued               // no connection: saved, sent later
    case notSignedIn
}

struct Tally {
    var logged: [String] = []
    var duplicates = 0
    var review = 0
    var ignored = 0
    var failures: [String] = []
    var queued = 0
    var sentFromQueue = 0

    /** Chat messages and duplicates on their own aren't worth a notification. */
    var worthNotifying: Bool { !logged.isEmpty || review > 0 || queued > 0 || !failures.isEmpty || sentFromQueue > 0 }

    mutating func add(_ outcome: LogOutcome) {
        switch outcome {
        case .logged(let line): logged.append(line)
        case .duplicate: duplicates += 1
        case .needsReview: review += 1
        case .ignored: ignored += 1
        case .failed(let why): failures.append(why)
        case .queued: queued += 1
        case .notSignedIn: break
        }
    }

    var summary: String {
        // One message: say exactly what happened to it.
        let earlier = sentFromQueue > 0 ? "\n+ \(sentFromQueue) saved offline earlier, now logged" : ""
        let total = logged.count + duplicates + review + ignored + failures.count + queued
        if total == 1 {
            if queued == 1 { return "📥 No connection. Saved, and LogIt will log it when you're back online." }
            return single + earlier
        }
        var parts: [String] = []
        if !logged.isEmpty { parts.append("✅ Logged \(logged.count)") }
        if duplicates > 0 { parts.append("\(duplicates) already in LogIt") }
        if review > 0 { parts.append("\(review) in Needs review") }
        if ignored > 0 { parts.append("\(ignored) not transactions") }
        if queued > 0 { parts.append("📥 \(queued) saved until you're online") }
        if !failures.isEmpty { parts.append("⛔ \(failures.count) failed") }
        if parts.isEmpty { return sentFromQueue > 0 ? "✅ \(sentFromQueue) saved offline earlier, now logged" : "Nothing to log" }
        return parts.joined(separator: " · ") + earlier
    }

    private var single: String {
        if let line = logged.first { return "✅ \(line)" }
        if duplicates == 1 { return "ℹ️ Already in LogIt" }
        if review == 1 { return "⚠️ Couldn't read this one. It's in Needs review in LogIt." }
        if ignored == 1 { return "Not a bank or MoMo alert, so LogIt left it." }
        return "⛔ Couldn't reach LogIt. \(failures.first ?? "")"
    }
}

// MARK: - API client

struct LogItClient {
    private let appGroupId = "group.com.ama.spendingtracker"
    private let defaults: UserDefaults?

    private var apiUrl: String
    private var supabaseUrl: String
    private var anonKey: String
    private var authToken: String
    private var refreshToken: String

    init() {
        defaults = UserDefaults(suiteName: appGroupId)
        apiUrl = defaults?.string(forKey: "api_url") ?? "https://spending-tracker-api-production-cea1.up.railway.app"
        supabaseUrl = defaults?.string(forKey: "supabase_url") ?? ""
        anonKey = defaults?.string(forKey: "supabase_anon_key") ?? ""
        authToken = defaults?.string(forKey: "auth_token") ?? ""
        refreshToken = defaults?.string(forKey: "refresh_token") ?? ""
    }

    var isSignedIn: Bool { !authToken.isEmpty && !supabaseUrl.isEmpty }

    /// Sends one message to /process-sms with the user's session.
    /// No accountId: the API routes each message to the wallet of the
    /// provider that sent it (MTN → MTN MoMo, StanChart → Standard Chartered…).
    func log(_ sms: String) async -> LogOutcome {
        var client = self
        do {
            var (data, status) = try await client.post(sms)
            if status == 401 {
                guard await client.refreshSession() else { return .notSignedIn }
                (data, status) = try await client.post(sms)
                if status == 401 { return .notSignedIn }
            }
            return LogItClient.outcome(data: data, status: status)
        } catch let error as URLError where LogItClient.isOffline(error) {
            PendingQueue.add(sms, defaults: defaults)
            return .queued
        } catch {
            return .failed(error.localizedDescription)
        }
    }

    /// Sends messages saved while offline. Returns how many were logged (or
    /// already in LogIt); stops at the first sign the network is still down.
    func flushPending() async -> Int {
        let pending = PendingQueue.all(defaults: defaults)
        guard !pending.isEmpty else { return 0 }
        var client = self
        var sent = 0
        var remaining = pending
        for sms in pending {
            do {
                var (_, status) = try await client.post(sms)
                if status == 401 {
                    guard await client.refreshSession() else { break }
                    (_, status) = try await client.post(sms)
                }
                if (200..<300).contains(status) || status == 400 {
                    remaining.removeAll { $0 == sms }
                    if (200..<300).contains(status) { sent += 1 }
                } else {
                    break
                }
            } catch {
                break
            }
        }
        PendingQueue.save(remaining, defaults: defaults)
        return sent
    }

    static func isOffline(_ error: URLError) -> Bool {
        [.notConnectedToInternet, .networkConnectionLost, .timedOut, .cannotFindHost,
         .cannotConnectToHost, .dnsLookupFailed, .internationalRoamingOff, .dataNotAllowed]
            .contains(error.code)
    }

    private func post(_ sms: String) async throws -> (Data, Int) {
        guard let url = URL(string: "\(apiUrl)/process-sms") else { throw URLError(.badURL) }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.timeoutInterval = 25
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["rawSms": sms])
        let (data, response) = try await URLSession.shared.data(for: req)
        return (data, (response as? HTTPURLResponse)?.statusCode ?? 0)
    }

    /// Same refresh as the Share Extension: new tokens go back to the App Group
    /// with `tokens_updated_by`, so the app adopts them instead of reusing its
    /// old (now revoked) refresh token.
    private mutating func refreshSession() async -> Bool {
        guard !refreshToken.isEmpty, !anonKey.isEmpty,
              let url = URL(string: "\(supabaseUrl)/auth/v1/token?grant_type=refresh_token") else { return false }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.httpBody = try? JSONSerialization.data(withJSONObject: ["refresh_token": refreshToken])

        guard let result = try? await URLSession.shared.data(for: req),
              (result.1 as? HTTPURLResponse)?.statusCode == 200,
              let json = try? JSONSerialization.jsonObject(with: result.0) as? [String: Any],
              let newAccess = json["access_token"] as? String,
              let newRefresh = json["refresh_token"] as? String else { return false }

        authToken = newAccess
        refreshToken = newRefresh
        defaults?.set(newAccess, forKey: "auth_token")
        defaults?.set(newRefresh, forKey: "refresh_token")
        defaults?.set("intent", forKey: "tokens_updated_by")
        return true
    }

    private static func outcome(data: Data, status: Int) -> LogOutcome {
        let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]

        if status == 400, (json["error"] as? String)?.contains("parse") == true { return .needsReview }
        guard (200..<300).contains(status) else {
            return .failed((json["error"] as? String) ?? "Error \(status)")
        }
        if json["ignored"] as? Bool == true { return .ignored }
        if json["duplicate"] as? Bool == true {
            return json["linkedNow"] as? Bool == true ? .logged("Linked to \(json["walletName"] as? String ?? "a wallet")") : .duplicate
        }

        let tx = json["data"] as? [String: Any] ?? [:]
        let amount = (tx["amount"] as? NSNumber)?.doubleValue ?? 0
        let isCredit = (tx["type"] as? String) == "credit"
        let category = categoryName(tx["category"] as? String)
        let desc = (tx["description"] as? String) ?? ""
        let wallet = (json["walletName"] as? String).map { " · \($0)" } ?? ""
        let fee = (json["fee"] as? NSNumber)?.doubleValue ?? 0
        let feeText = fee > 0 ? String(format: " (+ GHS %.2f fee)", fee) : ""
        let estimated = (json["dateSource"] as? String) == "estimated" ? " · date estimated" : ""

        let isLoan = (tx["category"] as? String) == "loans"
        let verb = isLoan ? (isCredit ? "Borrowed" : "Repaid") : (isCredit ? "Received" : "Spent")
        let what = String(format: "%@ GHS %.2f%@", verb, amount, feeText)
        let line = "\(what) · \(category)\n\(desc)\(wallet)\(estimated)"
        return .logged(line)
    }

    private static func categoryName(_ id: String?) -> String {
        let names: [String: String] = [
            "food": "Food & Dining", "transport": "Transport", "shopping": "Shopping",
            "bills": "Bills & Utilities", "entertainment": "Entertainment", "healthcare": "Healthcare",
            "education": "Education", "housing": "Housing", "travel": "Travel", "fitness": "Fitness",
            "gifts": "Gifts & Donations", "transfer": "Transfer", "income": "Income",
            "subscription": "Subscription", "cash": "Cash", "loans": "Loans",
            "fees": "Fees & Charges", "other": "Other",
        ]
        return names[id ?? ""] ?? "Other"
    }
}
