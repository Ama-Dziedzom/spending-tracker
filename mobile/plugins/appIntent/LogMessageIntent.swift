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
        description: "The SMS text. In a Message automation or a Share Sheet shortcut, use Shortcut Input."
    )
    var messages: [String]

    static var parameterSummary: some ParameterSummary {
        Summary("Log \(\.$messages) in LogIt")
    }

    func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
        let client = LogItClient()
        guard client.isSignedIn else { throw LogItIntentError.notSignedIn }

        var tally = Tally()
        for raw in messages {
            let text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !text.isEmpty else { continue }
            let outcome = await client.log(text)
            if case .notSignedIn = outcome { throw LogItIntentError.notSignedIn }
            tally.add(outcome)
        }

        let summary = tally.summary
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

// MARK: - Outcomes

enum LogOutcome {
    case logged(String)       // one-line description of what was saved
    case duplicate
    case needsReview
    case ignored
    case failed(String)
    case notSignedIn
}

struct Tally {
    var logged: [String] = []
    var duplicates = 0
    var review = 0
    var ignored = 0
    var failures: [String] = []

    mutating func add(_ outcome: LogOutcome) {
        switch outcome {
        case .logged(let line): logged.append(line)
        case .duplicate: duplicates += 1
        case .needsReview: review += 1
        case .ignored: ignored += 1
        case .failed(let why): failures.append(why)
        case .notSignedIn: break
        }
    }

    var summary: String {
        // One message: say exactly what happened to it.
        let total = logged.count + duplicates + review + ignored + failures.count
        if total == 1 {
            if let line = logged.first { return "✅ \(line)" }
            if duplicates == 1 { return "ℹ️ Already in LogIt" }
            if review == 1 { return "⚠️ Couldn't read this one. It's in Needs review in LogIt." }
            if ignored == 1 { return "Not a bank or MoMo alert, so LogIt left it." }
            return "⛔ Couldn't reach LogIt. \(failures.first ?? "")"
        }

        var parts: [String] = []
        if !logged.isEmpty { parts.append("✅ Logged \(logged.count)") }
        if duplicates > 0 { parts.append("\(duplicates) already in LogIt") }
        if review > 0 { parts.append("\(review) in Needs review") }
        if ignored > 0 { parts.append("\(ignored) not transactions") }
        if !failures.isEmpty { parts.append("⛔ \(failures.count) failed") }
        return parts.isEmpty ? "Nothing to log" : parts.joined(separator: " · ")
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
        } catch {
            return .failed(error.localizedDescription)
        }
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
