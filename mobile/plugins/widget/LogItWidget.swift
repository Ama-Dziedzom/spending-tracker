import WidgetKit
import SwiftUI

// LogIt widgets (Figma section 1037:4555, handoff §9).
// The app writes a small snapshot into the App Group whenever it syncs
// (mobile/lib/widget-snapshot.ts); every widget reads only that. Colours come
// from Tokens.swift, generated from constants/tokens.json at prebuild.

// MARK: - Snapshot

struct Snapshot: Codable {
    var v: Int
    var signedIn: Bool
    var updatedAt: String
    var hideLockScreen: Bool
    var hideHomeScreen: Bool
    var autopilotOn: Bool
    var todaySpent: Double
    var todayPayments: Int
    var weekSpent: Double
    /// This week minus the same days last week; nil when there's nothing to compare.
    var weekChange: Double?
    var dateLabel: String
    var days: [Day]
    var latest: [Item]
    var wallets: [WalletRow]
    var walletsTotal: Double
    var toCheck: Int

    struct Day: Codable { var letter: String; var value: Double; var isToday: Bool; var future: Bool }
    struct Item: Codable { var name: String; var meta: String; var amount: Double; var incoming: Bool; var symbol: String; var tone: String; var time: String }
    struct WalletRow: Codable { var name: String; var type: String; var balance: Double; var age: String; var uncounted: Bool }

    var updated: Date { ISO8601DateFormatter.withFraction.date(from: updatedAt) ?? ISO8601DateFormatter().date(from: updatedAt) ?? .distantPast }
    /// Older than an hour: the widget says how old instead of pretending.
    var staleLabel: String? {
        let mins = Int(Date().timeIntervalSince(updated) / 60)
        if mins < 60 { return nil }
        if mins < 60 * 24 { return "Updated \(mins / 60)h ago" }
        return "Updated \(mins / (60 * 24))d ago"
    }
}

extension ISO8601DateFormatter {
    static let withFraction: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
}

enum Store {
    static func load() -> Snapshot? {
        guard let s = UserDefaults(suiteName: "group.com.ama.spendingtracker")?.string(forKey: "widget_snapshot"),
              let d = s.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(Snapshot.self, from: d)
    }
}

enum Sample {
    static let snap = Snapshot(
        v: 1, signedIn: true, updatedAt: ISO8601DateFormatter().string(from: Date()), hideLockScreen: false, hideHomeScreen: false,
        autopilotOn: true, todaySpent: 251, todayPayments: 3, weekSpent: 351, weekChange: -42, dateLabel: "Wed 26 Nov",
        days: ["M", "T", "W", "T", "F", "S", "S"].enumerated().map { i, l in .init(letter: l, value: [40, 60, 251, 0, 0, 0, 0][i], isToday: i == 2, future: i > 2) },
        latest: [
            .init(name: "Akosua Mensah", meta: "MTN MoMo · 13:02", amount: 120, incoming: false, symbol: "person.2", tone: "people", time: "13:02"),
            .init(name: "Shoprite, Accra Mall", meta: "Card · 17:45", amount: 81, incoming: false, symbol: "bag", tone: "shopping", time: "17:45"),
            .init(name: "Airtime", meta: "MTN MoMo · 9:14", amount: 50, incoming: false, symbol: "iphone", tone: "airtime", time: "9:14"),
        ],
        wallets: [
            .init(name: "MTN MoMo", type: "momo", balance: 26.83, age: "2 min ago", uncounted: false),
            .init(name: "Standard Chartered", type: "bank", balance: 1394.51, age: "24 Nov", uncounted: false),
            .init(name: "Cash", type: "cash", balance: 0, age: "", uncounted: true),
        ],
        walletsTotal: 1421.34, toCheck: 2)
}

// MARK: - Timeline

struct WEntry: TimelineEntry {
    let date: Date
    let snap: Snapshot?
    let placeholder: Bool
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> WEntry { WEntry(date: Date(), snap: Sample.snap, placeholder: true) }
    func getSnapshot(in context: Context, completion: @escaping (WEntry) -> Void) {
        completion(WEntry(date: Date(), snap: Store.load() ?? (context.isPreview ? Sample.snap : nil), placeholder: false))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<WEntry>) -> Void) {
        // The app asks for a reload whenever it syncs; this is the fallback refresh.
        let entry = WEntry(date: Date(), snap: Store.load(), placeholder: false)
        completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(30 * 60))))
    }
}

// MARK: - Helpers

enum Fmt {
    static let money: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.minimumFractionDigits = 2
        f.maximumFractionDigits = 2
        f.locale = Locale(identifier: "en_US")
        return f
    }()
    static let whole: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.maximumFractionDigits = 0
        f.locale = Locale(identifier: "en_US")
        return f
    }()
    static func m(_ v: Double) -> String { money.string(from: NSNumber(value: abs(v))) ?? "0.00" }
    static func w(_ v: Double) -> String { whole.string(from: NSNumber(value: abs(v).rounded())) ?? "0" }
}

func manrope(_ size: CGFloat, _ weight: String) -> Font { .custom("Manrope-\(weight)", size: size) }

/// Hidden amounts (handoff §7): lock screen hides by default, home screen doesn't.
func isHidden(_ s: Snapshot, _ family: WidgetFamily) -> Bool {
    switch family {
    case .accessoryCircular, .accessoryRectangular, .accessoryInline: return s.hideLockScreen
    default: return s.hideHomeScreen
    }
}

let links = (
    spending: URL(string: "logit:///spending")!,
    check: URL(string: "logit:///review")!,
    wallets: URL(string: "logit:///wallets")!,
    autopilot: URL(string: "logit:///sms-settings")!,
    ask: URL(string: "logit:///ask?voice=1")!,
    paste: URL(string: "logit:///paste")!,
    login: URL(string: "logit:///login")!
)

/// The blue band behind the Today and Overview widgets.
struct BlueBackground: View {
    var body: some View {
        ZStack {
            Tok.brandBand
            RadialGradient(colors: [Color(red: 0.56, green: 0.66, blue: 1).opacity(0.45), .clear], center: .init(x: 0.2, y: 0.9), startRadius: 0, endRadius: 140)
            RadialGradient(colors: [Color(red: 0.42, green: 0.36, blue: 1).opacity(0.4), .clear], center: .init(x: 0.95, y: 0.05), startRadius: 0, endRadius: 120)
        }
    }
}

struct Header: View {
    let text: String
    var onBlue = false
    var body: some View {
        HStack(spacing: 5) {
            ZStack {
                Circle().fill(onBlue ? Color.white.opacity(0.18) : Tok.brandAccentTint)
                Image(systemName: "bolt").font(.system(size: 8, weight: .semibold)).foregroundStyle(onBlue ? Color.white : Tok.brandAccentText)
            }.frame(width: 16, height: 16)
            Text(text).font(manrope(11, "SemiBold")).foregroundStyle(onBlue ? Color.white.opacity(0.85) : Tok.textSecondary).lineLimit(1)
        }
    }
}

struct Bars: View {
    let days: [Snapshot.Day]
    var onBlue = false
    var height: CGFloat = 18
    var letters = false
    var body: some View {
        let max = days.map(\.value).max() ?? 1
        HStack(alignment: .bottom, spacing: letters ? 7 : 4) {
            ForEach(Array(days.enumerated()), id: \.offset) { _, d in
                VStack(spacing: 3) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(color(d))
                        .frame(width: letters ? 9 : 7, height: d.future || d.value <= 0 ? 3 : Swift.max(4, CGFloat(d.value / Swift.max(max, 1)) * height))
                    if letters {
                        Text(d.letter).font(manrope(8, d.isToday ? "Bold" : "Medium")).foregroundStyle(d.isToday ? Tok.textPrimary : Tok.textTertiary)
                    }
                }
            }
        }
        .frame(height: height + (letters ? 14 : 0), alignment: .bottom)
    }
    func color(_ d: Snapshot.Day) -> Color {
        if onBlue { return d.isToday ? .white : Color.white.opacity(d.future || d.value <= 0 ? 0.25 : 0.45) }
        if d.isToday { return Tok.brandAccent }
        return d.future || d.value <= 0 ? Tok.lineDefault : Tok.brandAccent.opacity(0.3)
    }
}

struct Tile: View {
    let symbol: String
    let tone: String
    var size: CGFloat = 26
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.32).fill(Tok.tint(tone))
            Image(systemName: symbol).font(.system(size: size * 0.46, weight: .medium)).foregroundStyle(Tok.fg(tone))
        }.frame(width: size, height: size)
    }
}

// MARK: - Small · Today

struct TodayView: View {
    let s: Snapshot?
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let s, s.signedIn {
                Header(text: !s.autopilotOn ? "Paused" : s.staleLabel != nil ? "Today · offline" : "Today", onBlue: true)
                Spacer(minLength: 4)
                if isHidden(s, .systemSmall) {
                    Text("GHS").font(manrope(10, "SemiBold")).foregroundStyle(.white.opacity(0.75))
                    Text("• • • •").font(manrope(22, "ExtraBold")).foregroundStyle(.white)
                    Text("Tap to see").font(manrope(11, "Medium")).foregroundStyle(.white.opacity(0.75))
                } else {
                    Text("GHS").font(manrope(10, "SemiBold")).foregroundStyle(.white.opacity(0.75))
                    Text(Fmt.m(s.todaySpent)).font(manrope(26, "ExtraBold")).foregroundStyle(.white).minimumScaleFactor(0.6).lineLimit(1)
                    Text(subtitle(s)).font(manrope(11, "Medium")).foregroundStyle(.white.opacity(0.8)).lineLimit(1)
                }
                Spacer(minLength: 6)
                if !s.autopilotOn {
                    Text("Turn on").font(manrope(11, "Bold")).foregroundStyle(.white)
                        .padding(.horizontal, 10).padding(.vertical, 5).background(Capsule().fill(Color.white.opacity(0.2)))
                } else if !isHidden(s, .systemSmall) {
                    Bars(days: s.days, onBlue: true, height: 14)
                }
            } else {
                Header(text: "LogIt", onBlue: true)
                Spacer()
                Text("Log in").font(manrope(26, "ExtraBold")).foregroundStyle(.white)
                Text("to see your money").font(manrope(11, "Medium")).foregroundStyle(.white.opacity(0.8))
                Spacer()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetURL(s?.signedIn == true ? (s?.autopilotOn == false ? links.autopilot : links.spending) : links.login)
    }
    func subtitle(_ s: Snapshot) -> String {
        if !s.autopilotOn { return "Autopilot is off" }
        if let stale = s.staleLabel { return stale }
        if s.todayPayments == 0 { return "Nothing yet today" }
        return "\(s.todayPayments) payment\(s.todayPayments == 1 ? "" : "s")"
    }
}

// MARK: - Small · To check

struct ToCheckView: View {
    let s: Snapshot?
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Header(text: "To check")
            Spacer(minLength: 6)
            if let s, s.signedIn {
                if s.toCheck > 0 {
                    Tile(symbol: "tray", tone: "warn", size: 28)
                    Spacer(minLength: 6)
                    Text("\(s.toCheck) message\(s.toCheck == 1 ? "" : "s")").font(manrope(17, "Bold")).foregroundStyle(Tok.textPrimary).lineLimit(1).minimumScaleFactor(0.7)
                    Text("Tap to sort them").font(manrope(11, "Medium")).foregroundStyle(Tok.textSecondary)
                } else {
                    Tile(symbol: "checkmark", tone: "success", size: 28)
                    Spacer(minLength: 6)
                    Text("All caught up").font(manrope(17, "Bold")).foregroundStyle(Tok.textPrimary).lineLimit(1).minimumScaleFactor(0.7)
                    Text("Nothing to check").font(manrope(11, "Medium")).foregroundStyle(Tok.textSecondary)
                }
            } else {
                Text("Log in").font(manrope(17, "Bold")).foregroundStyle(Tok.textPrimary)
                Text("to see your money").font(manrope(11, "Medium")).foregroundStyle(Tok.textSecondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetURL(s?.signedIn == true ? links.check : links.login)
    }
}

// MARK: - Medium · This week

struct WeekChip: View {
    let change: Double?
    var onBlue = false
    var body: some View {
        if let c = change, c.rounded() != 0 {
            let less = c < 0
            Text("\(Fmt.w(c)) \(less ? "less" : "more") than last week")
                .font(manrope(9, "Bold"))
                .foregroundStyle(onBlue ? Color.white.opacity(0.85) : (less ? Tok.statusSuccess : Tok.textSecondary))
                .padding(.horizontal, onBlue ? 0 : 7).padding(.vertical, onBlue ? 0 : 3)
                .background(onBlue ? AnyView(Color.clear) : AnyView(Capsule().fill(less ? Tok.statusSuccessTint : Tok.bgMuted)))
                .lineLimit(1)
        }
    }
}

struct LatestPill: View {
    let item: Snapshot.Item?
    let hidden: Bool
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: item?.symbol ?? "person.2").font(.system(size: 10)).foregroundStyle(Tok.fg(item?.tone ?? "people"))
            Text(hidden ? "Latest entry" : (item?.name ?? "Nothing yet")).font(manrope(11, "SemiBold")).foregroundStyle(Tok.textPrimary).lineLimit(1)
            Spacer(minLength: 4)
            Text(hidden ? "• • •" : item.map { "\(Fmt.m($0.amount)) · \($0.time)" } ?? "").font(manrope(10, "Medium")).foregroundStyle(Tok.textSecondary)
        }
        .padding(.horizontal, 10).padding(.vertical, 7)
        .background(RoundedRectangle(cornerRadius: 10).fill(Tok.bgMuted))
    }
}

struct WeekView: View {
    let s: Snapshot?
    var body: some View {
        if let s, s.signedIn {
            let hidden = isHidden(s, .systemMedium)
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Header(text: "This week")
                    Spacer()
                    if hidden {
                        Text("Hidden").font(manrope(9, "Bold")).foregroundStyle(Tok.textSecondary).padding(.horizontal, 7).padding(.vertical, 3).background(Capsule().fill(Tok.bgMuted))
                    } else {
                        WeekChip(change: s.weekChange)
                    }
                }
                HStack(alignment: .bottom) {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("GHS").font(manrope(10, "SemiBold")).foregroundStyle(Tok.textSecondary)
                        Text(hidden ? "• • • •" : Fmt.m(s.weekSpent)).font(manrope(26, "ExtraBold")).foregroundStyle(Tok.textPrimary).lineLimit(1).minimumScaleFactor(0.6)
                    }
                    Spacer()
                    if !hidden { Bars(days: s.days, height: 22, letters: true) }
                }
                Spacer(minLength: 0)
                LatestPill(item: s.latest.first, hidden: hidden)
            }
            .widgetURL(links.spending)
        } else {
            SignedOut()
        }
    }
}

// MARK: - Medium · Wallets

struct WalletsView: View {
    let s: Snapshot?
    var body: some View {
        if let s, s.signedIn {
            let hidden = isHidden(s, .systemMedium)
            VStack(alignment: .leading, spacing: 7) {
                HStack {
                    Header(text: "You have")
                    Spacer()
                    Text(hidden ? "GHS • • •" : "GHS \(Fmt.m(s.walletsTotal))").font(manrope(14, "ExtraBold")).foregroundStyle(Tok.textPrimary)
                }
                ForEach(Array(s.wallets.prefix(3).enumerated()), id: \.offset) { _, w in
                    HStack(spacing: 8) {
                        Image(systemName: w.type == "bank" ? "building.columns" : w.type == "cash" ? "banknote" : "creditcard")
                            .font(.system(size: 11)).foregroundStyle(Tok.textSecondary).frame(width: 16)
                        Text(w.name).font(manrope(11, "SemiBold")).foregroundStyle(Tok.textPrimary).lineLimit(1)
                        Spacer(minLength: 4)
                        if w.uncounted {
                            Text("Count").font(manrope(11, "Bold")).foregroundStyle(Tok.brandAccentText)
                        } else {
                            Text(w.age).font(manrope(9, "Medium")).foregroundStyle(Tok.textTertiary)
                            Text(hidden ? "•••" : Fmt.m(w.balance)).font(manrope(11, "Bold")).foregroundStyle(Tok.textPrimary)
                        }
                    }
                }
                Spacer(minLength: 0)
            }
            .widgetURL(links.wallets)
        } else {
            SignedOut()
        }
    }
}

// MARK: - Large · Overview

struct OverviewView: View {
    let s: Snapshot?
    var body: some View {
        if let s, s.signedIn {
            let hidden = isHidden(s, .systemLarge)
            VStack(spacing: 0) {
                Link(destination: links.spending) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Header(text: "This week", onBlue: true)
                            Spacer()
                            Text(s.dateLabel).font(manrope(10, "SemiBold")).foregroundStyle(.white.opacity(0.75))
                        }
                        Text("GHS").font(manrope(10, "SemiBold")).foregroundStyle(.white.opacity(0.75))
                        HStack(alignment: .bottom) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(hidden ? "• • • •" : Fmt.m(s.weekSpent)).font(manrope(28, "ExtraBold")).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.6)
                                if !hidden { WeekChip(change: s.weekChange, onBlue: true) }
                            }
                            Spacer()
                            if !hidden { Bars(days: s.days, onBlue: true, height: 30) }
                        }
                    }
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(BlueBackground())
                }
                VStack(spacing: 0) {
                    ForEach(Array(s.latest.prefix(3).enumerated()), id: \.offset) { i, e in
                        HStack(spacing: 10) {
                            Tile(symbol: e.symbol, tone: e.tone, size: 26)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(hidden ? "Entry" : e.name).font(manrope(11, "SemiBold")).foregroundStyle(Tok.textPrimary).lineLimit(1)
                                Text(hidden ? "" : e.meta).font(manrope(9, "Medium")).foregroundStyle(Tok.textSecondary).lineLimit(1)
                            }
                            Spacer()
                            Text(hidden ? "•••" : "\(e.incoming ? "+" : "")\(Fmt.m(e.amount))").font(manrope(11, "Bold"))
                                .foregroundStyle(e.incoming ? Tok.statusSuccess : Tok.textPrimary)
                        }
                        .padding(.vertical, 7)
                        if i < min(2, s.latest.count - 1) { Divider().overlay(Tok.lineDefault) }
                    }
                    if s.latest.isEmpty {
                        Text("Nothing logged yet this week.").font(manrope(11, "Medium")).foregroundStyle(Tok.textSecondary).padding(.vertical, 12)
                    }
                    Spacer(minLength: 6)
                    HStack(spacing: 8) {
                        Link(destination: links.ask) {
                            HStack(spacing: 6) {
                                Image(systemName: "sparkles").font(.system(size: 11)).foregroundStyle(Tok.brandAccentText)
                                Text("Ask LogIt").font(manrope(11, "SemiBold")).foregroundStyle(Tok.textTertiary)
                                Spacer()
                                ZStack {
                                    Circle().fill(Tok.brandAccent)
                                    Image(systemName: "mic.fill").font(.system(size: 10)).foregroundStyle(.white)
                                }.frame(width: 24, height: 24)
                            }
                            .padding(.leading, 12).padding(.trailing, 4).padding(.vertical, 4)
                            .background(Capsule().fill(Tok.bgMuted))
                        }
                        Link(destination: links.paste) {
                            ZStack {
                                Circle().fill(Tok.bgMuted)
                                Image(systemName: "doc.on.clipboard").font(.system(size: 11)).foregroundStyle(Tok.textSecondary)
                            }.frame(width: 32, height: 32)
                        }
                    }
                }
                .padding(.horizontal, 14).padding(.top, 6).padding(.bottom, 12)
            }
        } else {
            SignedOut().padding(16)
        }
    }
}

struct SignedOut: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Header(text: "LogIt")
            Spacer()
            Text("Log in").font(manrope(22, "ExtraBold")).foregroundStyle(Tok.textPrimary)
            Text("to see your money").font(manrope(11, "Medium")).foregroundStyle(Tok.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetURL(links.login)
    }
}

// MARK: - Lock screen (iOS draws these in one colour: just the number and a word)

struct AccessoryView: View {
    let s: Snapshot?
    @Environment(\.widgetFamily) var family
    var body: some View {
        let signedIn = s?.signedIn == true
        let hidden = s.map { isHidden($0, family) } ?? true
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 0) {
                    Text(signedIn ? (hidden ? "•••" : Fmt.w(s!.todaySpent)) : "–").font(manrope(15, "ExtraBold")).minimumScaleFactor(0.5)
                    Text("today").font(manrope(8, "SemiBold"))
                }
            }
            .widgetURL(links.spending)
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Label("This week", systemImage: "bolt").font(manrope(11, "SemiBold"))
                HStack(alignment: .bottom) {
                    Text(signedIn ? (hidden ? "GHS •••" : "GHS \(Fmt.w(s!.weekSpent))") : "Log in").font(manrope(17, "ExtraBold"))
                    Spacer()
                    if signedIn && !hidden, let s { Bars(days: s.days, height: 12) }
                }
            }
            .widgetURL(links.spending)
        default:
            Text(signedIn ? (hidden ? "LogIt · \(s!.toCheck) to check" : "GHS \(Fmt.w(s!.todaySpent)) today · \(s!.toCheck) to check") : "LogIt")
                .widgetURL(links.spending)
        }
    }
}

struct CheckCircleView: View {
    let s: Snapshot?
    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 1) {
                Image(systemName: "tray").font(.system(size: 11, weight: .semibold))
                Text(s?.signedIn == true ? "\(s!.toCheck)" : "–").font(manrope(15, "ExtraBold"))
            }
        }
        .widgetURL(links.check)
    }
}

// MARK: - Widgets

extension View {
    @ViewBuilder func background(blue: Bool) -> some View {
        if blue { containerBackground(for: .widget) { BlueBackground() } }
        else { containerBackground(for: .widget) { Tok.bgSurface } }
    }
    @ViewBuilder func redactedIf(_ on: Bool) -> some View {
        if on { redacted(reason: .placeholder) } else { self }
    }
}

/// One widget, three sizes, so it can be resized on the home screen:
/// small = Today, medium = This week, large = Overview (Figma 1037:4555).
struct SpendingView: View {
    let e: WEntry
    @Environment(\.widgetFamily) var family
    var body: some View {
        switch family {
        case .systemSmall:
            TodayView(s: e.snap).padding(16).redactedIf(e.placeholder).background(blue: true)
        case .systemMedium:
            WeekView(s: e.snap).padding(16).redactedIf(e.placeholder).background(blue: false)
        default:
            OverviewView(s: e.snap).redactedIf(e.placeholder).background(blue: false)
        }
    }
}

struct SpendingWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LogItSpending", provider: Provider()) { e in
            SpendingView(e: e)
        }
        .configurationDisplayName("Spending")
        .description("Today, the week, or the week with your latest entries. Resize it to switch.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

struct ToCheckWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LogItToCheck", provider: Provider()) { e in
            ToCheckView(s: e.snap).redactedIf(e.placeholder).background(blue: false)
        }
        .configurationDisplayName("To check")
        .description("Only matters when something needs you.")
        .supportedFamilies([.systemSmall])
    }
}

struct WalletsWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LogItWallets", provider: Provider()) { e in
            WalletsView(s: e.snap).redactedIf(e.placeholder).background(blue: false)
        }
        .configurationDisplayName("Wallets")
        .description("Balances from each wallet’s latest alert, with their age.")
        .supportedFamilies([.systemMedium])
    }
}

struct LockWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LogItLock", provider: Provider()) { e in
            AccessoryView(s: e.snap).redactedIf(e.placeholder).containerBackground(for: .widget) { Color.clear }
        }
        .configurationDisplayName("LogIt")
        .description("Today and the week on your lock screen.")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

struct CheckLockWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LogItCheckLock", provider: Provider()) { e in
            CheckCircleView(s: e.snap).redactedIf(e.placeholder).containerBackground(for: .widget) { Color.clear }
        }
        .configurationDisplayName("To check")
        .description("Messages waiting for you.")
        .supportedFamilies([.accessoryCircular])
    }
}

@main
struct LogItWidgets: WidgetBundle {
    var body: some Widget {
        SpendingWidget()
        ToCheckWidget()
        WalletsWidget()
        LockWidget()
        CheckLockWidget()
    }
}
