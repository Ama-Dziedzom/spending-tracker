import SwiftUI
import UniformTypeIdentifiers

// MARK: - Principal class (referenced in Info.plist)

class ShareViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        let shareView = ShareRootView(extensionContext: extensionContext!)
        let host = UIHostingController(rootView: shareView)
        addChild(host)
        host.view.frame = view.bounds
        host.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(host.view)
        host.didMove(toParent: self)
    }
}

// MARK: - Data models

struct ParsedTransaction: Decodable {
    let amount: Double
    let type: String          // "credit" | "debit"
    let source: String
    let description: String
    let balance: Double?
    let category: String
    let is_transfer: Bool
    let transfer_type: String?
}

struct ParseResult: Decodable {
    let parsed: Bool
    let transaction: ParsedTransaction?
    let reason: String?
}

struct ProcessResult: Decodable {
    let success: Bool?
    let error: String?
}

// MARK: - ViewModel

@MainActor
class ShareViewModel: ObservableObject {
    enum State {
        case loading
        case noAuth
        case parsed(ParsedTransaction)
        case unparseable
        case saving
        case saved
        case queued      // no connection: saved, LogIt sends it later
        case error(String)
    }

    @Published var state: State = .loading

    private let appGroupId = "group.com.ama.spendingtracker"
    private var rawSms = ""
    private var supabaseUrl = ""
    private var anonKey = ""
    private var authToken = ""
    private var refreshToken = ""
    private var accountId = ""
    private var apiUrl = ""

    // Read credentials the main app saved into the shared App Group
    private func loadCredentials() {
        let d = UserDefaults(suiteName: appGroupId)
        supabaseUrl = d?.string(forKey: "supabase_url") ?? ""
        anonKey     = d?.string(forKey: "supabase_anon_key") ?? ""
        authToken   = d?.string(forKey: "auth_token") ?? ""
        refreshToken = d?.string(forKey: "refresh_token") ?? ""
        accountId   = d?.string(forKey: "default_account_id") ?? ""
        apiUrl      = d?.string(forKey: "api_url") ?? "https://spending-tracker-api-production-cea1.up.railway.app"
    }

    func start(extensionContext: NSExtensionContext) async {
        loadCredentials()

        guard !authToken.isEmpty, !supabaseUrl.isEmpty else {
            state = .noAuth
            return
        }

        // Extract SMS text from the share sheet
        guard let text = await extractText(from: extensionContext) else {
            state = .unparseable
            return
        }
        rawSms = text

        // Preview parse (no write)
        do {
            let (data, status) = try await send(path: "parse-sms", body: ["rawSms": text])
            if status == 401 {
                state = .noAuth
                return
            }
            let result = try JSONDecoder().decode(ParseResult.self, from: data)

            if result.parsed, let tx = result.transaction {
                state = .parsed(tx)
            } else {
                state = .unparseable
            }
        } catch let error as URLError where Self.isOffline(error) {
            queueForLater(text)
        } catch {
            state = .error(error.localizedDescription)
        }
    }

    func save(extensionContext: NSExtensionContext) async {
        guard case .parsed = state else { return }
        state = .saving

        do {
            var body: [String: Any] = ["rawSms": rawSms]
            if !accountId.isEmpty { body["accountId"] = accountId }

            let (data, statusCode) = try await send(path: "process-sms", body: body)
            if statusCode == 401 {
                state = .noAuth
                return
            }

            if (200..<300).contains(statusCode) {
                state = .saved
                // Auto-dismiss after 1.5 s
                try? await Task.sleep(nanoseconds: 1_500_000_000)
                extensionContext.completeRequest(returningItems: nil)
            } else {
                let result = try? JSONDecoder().decode(ProcessResult.self, from: data)
                state = .error(result?.error ?? "Save failed (\(statusCode))")
            }
        } catch let error as URLError where Self.isOffline(error) {
            queueForLater(rawSms)
        } catch {
            state = .error(error.localizedDescription)
        }
    }

    // MARK: Offline queue
    // Same store as the "Log Message" action and the Android receiver:
    // "pending_sms" (JSON array of texts) in the App Group. The app sends them
    // when it opens (lib/pending-sms.ts); the API ignores duplicates.

    private func queueForLater(_ sms: String) {
        let d = UserDefaults(suiteName: appGroupId)
        var list: [String] = []
        if let raw = d?.string(forKey: "pending_sms"), let data = raw.data(using: .utf8),
           let saved = try? JSONSerialization.jsonObject(with: data) as? [String] {
            list = saved
        }
        if !list.contains(sms) { list.append(sms) }
        if let data = try? JSONSerialization.data(withJSONObject: Array(list.suffix(100))),
           let raw = String(data: data, encoding: .utf8) {
            d?.set(raw, forKey: "pending_sms")
        }
        state = .queued
    }

    static func isOffline(_ error: URLError) -> Bool {
        [.notConnectedToInternet, .networkConnectionLost, .timedOut, .cannotFindHost,
         .cannotConnectToHost, .dnsLookupFailed, .internationalRoamingOff, .dataNotAllowed]
            .contains(error.code)
    }

    // MARK: Networking with automatic session refresh

    /// POSTs to the LogIt API. If the access token has expired (401), refreshes
    /// the Supabase session once using the refresh token and retries.
    private func send(path: String, body: [String: Any]) async throws -> (Data, Int) {
        var (data, status) = try await perform(path: path, body: body)
        if status == 401, await refreshSession() {
            (data, status) = try await perform(path: path, body: body)
        }
        return (data, status)
    }

    private func perform(path: String, body: [String: Any]) async throws -> (Data, Int) {
        var req = URLRequest(url: URL(string: "\(apiUrl)/\(path)")!)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: req)
        return (data, (response as? HTTPURLResponse)?.statusCode ?? 0)
    }

    /// Exchanges the stored refresh token for a new session and saves it back to
    /// the App Group. `tokens_updated_by` tells the main app to adopt these tokens
    /// on its next launch (Supabase rotates refresh tokens, so the app must not
    /// keep using its old one).
    private func refreshSession() async -> Bool {
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
        let d = UserDefaults(suiteName: appGroupId)
        d?.set(newAccess, forKey: "auth_token")
        d?.set(newRefresh, forKey: "refresh_token")
        d?.set("extension", forKey: "tokens_updated_by")
        return true
    }

    private func extractText(from ctx: NSExtensionContext) async -> String? {
        guard let item = ctx.inputItems.first as? NSExtensionItem,
              let attachments = item.attachments else { return nil }

        for provider in attachments {
            if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                if let text = try? await provider.loadItem(forTypeIdentifier: UTType.plainText.identifier) as? String {
                    return text
                }
            }
        }
        return nil
    }
}

// MARK: - Category display names (IDs match mobile/lib/categories.ts)

private let categoryNames: [String: String] = [
    "food": "Food & Dining", "transport": "Transport", "shopping": "Shopping",
    "bills": "Bills & Utilities", "airtime": "Airtime & Data", "entertainment": "Entertainment", "healthcare": "Healthcare",
    "education": "Education", "housing": "Housing", "travel": "Travel", "fitness": "Fitness",
    "gifts": "Gifts & Donations", "transfer": "Transfer", "income": "Income",
    "subscription": "Subscription", "cash": "Cash", "loans": "Loans",
    "fees": "Fees & Charges", "other": "Other",
]

func categoryName(_ id: String) -> String {
    categoryNames[id.lowercased()] ?? id
}

// MARK: - Root view (wraps async init)

struct ShareRootView: View {
    let extensionContext: NSExtensionContext
    @StateObject private var vm = ShareViewModel()

    var body: some View {
        ShareView(vm: vm, extensionContext: extensionContext)
            .task { await vm.start(extensionContext: extensionContext) }
    }
}

// MARK: - Main share sheet UI

struct ShareView: View {
    @ObservedObject var vm: ShareViewModel
    let extensionContext: NSExtensionContext

    private let brandBlue = Color(red: 0.059, green: 0.298, blue: 1.0)  // #0F4CFF
    private let successGreen = Color(red: 0.063, green: 0.725, blue: 0.506) // #10B981

    var body: some View {
        NavigationView {
            ZStack {
                Color(.systemGroupedBackground).ignoresSafeArea()

                Group {
                    switch vm.state {
                    case .loading:
                        loadingView
                    case .noAuth:
                        noAuthView
                    case .parsed(let tx):
                        parsedView(tx)
                    case .unparseable:
                        unparseableView
                    case .saving:
                        savingView
                    case .saved:
                        savedView
                    case .queued:
                        queuedView
                    case .error(let msg):
                        errorView(msg)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("LogIt")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(brandBlue)
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        extensionContext.cancelRequest(
                            withError: NSError(domain: "com.ama.spendingtracker", code: 0)
                        )
                    }
                    .foregroundColor(.secondary)
                }
            }
        }
    }

    // MARK: State views

    private var loadingView: some View {
        VStack(spacing: 12) {
            ProgressView()
            Text("Reading SMS…")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
    }

    private var noAuthView: some View {
        VStack(spacing: 20) {
            Image(systemName: "lock.circle.fill")
                .font(.system(size: 48))
                .foregroundColor(.secondary)
            Text("Open LogIt first")
                .font(.headline)
            Text("You need to be logged in before sharing an SMS.")
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
                .padding(.horizontal)
            Button("Open LogIt") {
                extensionContext.open(URL(string: "logit://")!)
            }
            .buttonStyle(PrimaryButtonStyle(color: brandBlue))
        }
    }

    private func parsedView(_ tx: ParsedTransaction) -> some View {
        VStack(spacing: 0) {
            // Transaction card
            VStack(alignment: .leading, spacing: 16) {
                // Amount + type badge
                HStack(alignment: .firstTextBaseline) {
                    Text("GH₵ \(tx.amount, specifier: "%.2f")")
                        .font(.system(size: 32, weight: .bold))
                    Spacer()
                    Text(tx.type == "credit" ? "CREDIT" : "DEBIT")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(tx.type == "credit" ? successGreen.opacity(0.15) : Color.red.opacity(0.12))
                        .foregroundColor(tx.type == "credit" ? successGreen : .red)
                        .clipShape(Capsule())
                }

                Divider()

                row(label: "Merchant", value: tx.description)
                row(label: "Category", value: categoryName(tx.category))
                row(label: "Source", value: tx.source)
                if let balance = tx.balance {
                    row(label: "Balance after", value: "GH₵ \(String(format: "%.2f", balance))")
                }
            }
            .padding()
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .padding()

            Spacer()

            Button("Save Transaction") {
                Task { await vm.save(extensionContext: extensionContext) }
            }
            .buttonStyle(PrimaryButtonStyle(color: brandBlue))
            .padding(.horizontal)
            .padding(.bottom, 8)
        }
    }

    private var unparseableView: some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundColor(.orange)
            Text("Couldn't read this SMS")
                .font(.headline)
            Text("This doesn't look like a bank or MoMo transaction. You can still add it manually in LogIt.")
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
                .padding(.horizontal)
            Button("Open LogIt") {
                extensionContext.open(URL(string: "logit://")!)
            }
            .buttonStyle(PrimaryButtonStyle(color: brandBlue))
        }
    }

    private var savingView: some View {
        VStack(spacing: 12) {
            ProgressView()
            Text("Saving…")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
    }

    private var savedView: some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 56))
                .foregroundColor(successGreen)
            Text("Logged!")
                .font(.title2.weight(.semibold))
        }
    }

    private var queuedView: some View {
        VStack(spacing: 16) {
            Image(systemName: "tray.and.arrow.down.fill")
                .font(.system(size: 48))
                .foregroundColor(brandBlue)
            Text("Saved for later")
                .font(.headline)
            Text("You're offline. LogIt will log this as soon as you're back online and open the app.")
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
                .padding(.horizontal)
            Button("Done") {
                extensionContext.completeRequest(returningItems: nil)
            }
            .buttonStyle(PrimaryButtonStyle(color: brandBlue))
        }
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "xmark.circle.fill")
                .font(.system(size: 48))
                .foregroundColor(.red)
            Text("Something went wrong")
                .font(.headline)
            Text(message)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            Button("Try Again") {
                Task { await vm.start(extensionContext: extensionContext) }
            }
            .buttonStyle(PrimaryButtonStyle(color: brandBlue))
        }
    }

    private func row(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .font(.subheadline.weight(.medium))
                .multilineTextAlignment(.trailing)
        }
    }
}

// MARK: - Button style

struct PrimaryButtonStyle: ButtonStyle {
    let color: Color
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.weight(.semibold))
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(color.opacity(configuration.isPressed ? 0.8 : 1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
