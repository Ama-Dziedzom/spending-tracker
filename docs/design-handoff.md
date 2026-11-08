# LogIt v1 · Design handoff

For whoever builds the v1 redesign (Antigravity or a person). Read this before touching a screen.

- **Figma file:** https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt
- **Page to build from:** `LogIt · v1` (node `993:2`)
- **Signed off:** 8 Nov 2026, with the open items listed at the end

## 1. What to build from, and what to ignore

- **Build from the light sections only.** Each flow has a light section (left column) and a dark copy (right column). The dark copies are the same screens with the colour mode switched. In code, dark mode must come from the theme tokens switching, not from separate screens or components.
- **Ignore** the `Explorations` section at the bottom of the v1 page, and every older page (Iteration 6, 7, 8 and earlier). Those are rejected or parked directions.
- **Captions under each screen are the spec.** Each phone frame has a bold title and a sentence underneath explaining the intent or the rule. Treat that sentence as an acceptance criterion.
- When Figma and this doc disagree, ask. Do not guess.

## 2. Build order

1. **Theme tokens** (section 3) into one theme module with `light` and `dark`, plus a `useTheme()` hook that follows the system setting and the in-app Theme switch (Light / Dark / Auto).
2. **Type and icons** (section 4).
3. **Shared components** (section 5).
4. **Navigation shell:** 3 tabs (Spending, Wallets, Insights) plus a floating Add button. Settings moves out of the tab bar (section 6).
5. Screens, in this order: Spending → Transactions → Wallets & Check → Settings → Onboarding → System states → Insights & Ask LogIt → Limits.
6. **Widgets last.** They need native targets (section 9).

## 3. Colour tokens

Source of truth is the Figma variable collection **`LogIt / v1`** (modes Light and Dark). The values below were exported on 8 Nov 2026. If Figma changes, re-export; do not hand-edit.

These replace `COLORS` in `mobile/constants/theme.ts` and the colours in `tailwind.config.js`. Keep the token names (for example `text/secondary` becomes `text.secondary`), so code and Figma stay searchable against each other.

| Token | Light | Dark |
|---|---|---|
| `bg/canvas` | `#F2F3F7` | `#0B1020` |
| `bg/inverse` | `#0B1340` | `#2A3354` |
| `bg/muted` | `#EBEEF5` | `#262F4E` |
| `bg/raised` | `#FFFFFF` | `#212A48` |
| `bg/scrim` | `#08175061` | `#00000099` |
| `bg/surface` | `#FFFFFF` | `#1B233D` |
| `brand/accent` | `#1642E5` | `#506DE4` |
| `brand/accent-text` | `#1642E5` | `#7D97FF` |
| `brand/accent-tint` | `#E8ECFC` | `#1C2650` |
| `brand/band` | `#1642E5` | `#1B2C99` |
| `brand/ink-button` | `#081750` | `#F2F4FF` |
| `brand/on-accent` | `#FFFFFF` | `#FFFFFF` |
| `brand/on-ink-button` | `#FFFFFF` | `#081750` |
| `cat/airtime` | `#B58208` | `#E1B038` |
| `cat/airtime-tint` | `#FAF2DE` | `#3C3118` |
| `cat/bills` | `#0891B2` | `#3EA9C3` |
| `cat/bills-tint` | `#DFF1F5` | `#0A2F43` |
| `cat/cash` | `#169E49` | `#49B772` |
| `cat/cash-tint` | `#E1F3E7` | `#0E332A` |
| `cat/fees` | `#64748B` | `#8693A5` |
| `cat/fees-tint` | `#EBEDF0` | `#20283A` |
| `cat/food` | `#E0631F` | `#F38B50` |
| `cat/food-tint` | `#FDECE2` | `#422620` |
| `cat/loans` | `#7C3AED` | `#9965F1` |
| `cat/loans-tint` | `#EEE5FD` | `#261A51` |
| `cat/people` | `#2563EB` | `#5585EF` |
| `cat/people-tint` | `#E3EBFC` | `#112451` |
| `cat/shopping` | `#EC4899` | `#F070AF` |
| `cat/shopping-tint` | `#FDE7F2` | `#411D3D` |
| `cat/subscription` | `#C026D3` | `#CE56DD` |
| `cat/subscription-tint` | `#F7E3F9` | `#36154B` |
| `cat/transport` | `#129B92` | `#48C8BA` |
| `cat/transport-tint` | `#E0F6F3` | `#0D3840` |
| `highlight/amount` | `#E4F7A8` | `#4A5A1A` |
| `highlight/merchant` | `#D9E2FF` | `#24326B` |
| `line/default` | `#E3E6EE` | `#323C60` |
| `status/danger` | `#C42424` | `#FF7A7A` |
| `status/danger-tint` | `#FDE7E7` | `#3B1A1E` |
| `status/success` | `#167F53` | `#4ED39A` |
| `status/success-tint` | `#E3F5EC` | `#12352A` |
| `status/warn` | `#A65D10` | `#F2B25C` |
| `status/warn-tint` | `#FFF3DC` | `#3A2A12` |
| `text/on-inverse` | `#FFFFFF` | `#FFFFFF` |
| `text/primary` | `#081750` | `#F2F4FF` |
| `text/secondary` | `#5C6482` | `#A9B0CC` |
| `text/tertiary` | `#656B84` | `#9197AE` |
**Rules for using colours**

- **Text on the blue band** (the gradient at the top of most screens) is plain white, at 100%, 85% or 75%. These are the only colours not tokenised.
- **Blue text and blue icons** use `brand/accent-text`. **Blue fills** (buttons, toggles, the current bar in a chart) use `brand/accent`. In dark mode these are different values on purpose: the fill is deeper so white button labels pass contrast, and the text is lighter so links pass on dark cards.
- **Category colours** (`cat/*`) are for icons, chart bars and progress bars only. Category labels and tag text use `text/primary`.
- **Charts:** the current period is the solid colour, and past periods are the same colour at 30% opacity. Do not use the `-tint` tokens for bars.
- **Going over a limit** uses `status/warn` (amber), never `status/danger`. Danger is only for destructive actions and errors.
- **Contrast:** all 60 text-and-icon pairs pass in both modes (text 4.5:1, icons 3:1). Do not introduce new colours without re-checking.

**The blue band** is `brand/band` with three soft, blurred ellipses (`#8FA8FF`, `#6B5BFF`, `#0B2493` at 40–45% opacity), and it fades into `bg/canvas` from about 45% of its height. It is a gradient bleed, never a hard edge. Chat screens use a shorter band (300px). The listening and lock screens are fully blue.

## 4. Type, icons, spacing

**Font:** Manrope (Medium, SemiBold, Bold, ExtraBold).

| Role | Size / weight | Notes |
|---|---|---|
| Hero number | 34–38 ExtraBold | letter-spacing −3% |
| Screen title | 24 Bold | −2% |
| Card title | 17 Bold | |
| Row title | 14 SemiBold | |
| Body | 14–15 Medium | answers in Ask LogIt use 15 at 145% line height |
| Meta | 12 Medium | `text/secondary` or `text/tertiary` |
| Section label | 11 Bold, uppercase | +6% letter-spacing, `text/tertiary` |
| Tab label | 11 SemiBold | |

**Icons:** Hugeicons free set, stroke rounded, 1.5 stroke (`@hugeicons/core-free-icons` and `@hugeicons/react-native` are already installed). The Figma icon library (node `997:2`) uses short keys such as `food`, `airtime`, `moved`, `wifiOff`. Match each one to the closest Hugeicons export the app already uses, for example `Restaurant01Icon`, `SmartPhone01Icon`, `ArrowDataTransferHorizontalIcon`. Sizes: 16, 18, 20 or 24.

**Category tiles:** rounded square (radius ≈ 32% of size), `cat/x-tint` fill, `cat/x` icon. Sizes 22–40.

**Avatars:** three choices: Illustration 1, Illustration 2, Initials (the default). Store the choice as `user_metadata.avatar = 'illustration_1' | 'illustration_2' | 'initials'`. Never store or ask for gender.

**Spacing and shape**
- Screen gutter 16. Card padding 16. Gap between cards 12.
- Card radius 24. Chips and pills 999. Sheets: 32 on the top corners. Phone screens are drawn at 390×844.
- **Shadow on light cards:** 0 10 30, spread −6, `#081750` at 8%. In dark mode, rely on the surface colour step and drop the shadow.
- **Touch targets: 44×44 minimum.** Round header buttons stay 38px visually; add `hitSlop` of 3 on every side.

## 5. Shared components to build first

Status bar handling; screen with blue band; top bar (back or close, title, optional right action); tab bar with floating Add; card; grouped list with dividers; list row (tile, title, meta, value, chevron or toggle); segmented control (Today / This week / This month, and Light / Dark / Auto); category tile; avatar; primary, secondary and ink buttons; chips; sheet with grabber; dialog; toast (always `bg/inverse` with `text/on-inverse`); banner (info, warn, success, danger); offline pill; skeleton blocks; spinner; progress meter (limits); bar chart (current solid, past at 30%); Ask bar (sparkle, input, keyboard, mic); chat bubble (user bubbles are `bg/surface` with a soft shadow, never blue on blue).

## 6. Navigation changes from the current app

The current app has 4 tabs: `index`, `wallets`, `insights`, `settings`. The design has:

- **Tabs:** Spending (`index`), Wallets, Insights, plus a floating **Add** button that opens the Add sheet. Settings is no longer a tab.
- **Settings** opens from the avatar on Spending.
- **Check** (the review queue, currently `review.tsx`) is not a tab. It opens from the "2 messages to check" banner on Spending, from a notification, or from the To-check widget.
- **Transactions** opens from Spending ("See all transactions"). The Spending tab stays highlighted while you are in it.
- **Ask LogIt** opens from the Ask bar on Insights, from any "Ask about…" button, and from the large widget.
- **Limits** opens from an insight ("Set a weekly limit") and from Settings › Money › Limits.

## 7. New data the backend needs

| Feature | Data | Notes |
|---|---|---|
| Weekly limits | New table `limits`: `id`, `user_id` (default `auth.uid()`), `category`, `amount`, `period` (`'week'`), `reset_day` (default Monday), `warn_at` (default 0.8), `created_at`. Add owner-only RLS like `20261108010000_owner_only_access.sql`. | Spent so far is computed from transactions. Send one notification when spend first crosses `warn_at` in a period; never repeat it. |
| Hide amounts on widgets | `user_metadata.hide_widget_amounts`: `{ lock_screen: true, home_screen: false }` | Defaults as shown. Hide recipient names too, and hide the bars. |
| Theme | Stored on the device only: `'light' | 'dark' | 'auto'`, default `auto`. | |
| Avatar | `user_metadata.avatar` (see section 4) | |
| Ask LogIt history | Recent questions per user, so History can re-run them against today's numbers. | Store the question text only, not the answers. |
| Insights | "Up 20% this week" style findings: compare this week to the last 4–6 weeks by category, plus subscriptions renewing and top person sent to. | Show "not enough data" until there are 7 days of transactions. |

## 8. Ask LogIt rules

- **Every suggested question must map to one of four answer shapes**, and only those: **Total** (big number, one sentence, small trend), **Verdict** (Yes / Tight / Not yet tag, one sentence, then the working rows), **Ranking** (top answer in a sentence, then a ranked list with bars), **Can't answer** (what LogIt can see, why not, how to fix it). If a question doesn't fit a shape, don't suggest it.
- Every answer shows its source ("From 14 transactions", "Based on your last 3 months"), and the source opens the matching transactions.
- **Numbers in the sentence must equal the numbers in the working.** The afford example: 1,421 − 780 − 500 = 141.
- Offline: keep the question in its bubble with Try again. Never use a modal.
- Voice: the full-screen listening state shows the words as they arrive. Done sends, and the × button cancels. Ask for the microphone only on the first tap of the mic, with LogIt's own explanation shown before the system prompt.

## 9. Widgets

- **iOS:** WidgetKit extension. The repo already has `plugins/appGroupBridge`. Write a small snapshot (today's total, the week's day totals, the latest 3 entries, wallet balances with their age, the to-check count, a hide-amounts flag) into the App Group when the app syncs, and have the widget read it. Lock-screen accessories are drawn in one colour by iOS.
- **Android:** App Widget (Glance or RemoteViews), resizable from 2×2 to 4×2, with 28px corners.
- **Sizes:** small 158, medium 338×158, large 338×354. 16px padding on all sides. Content is spaced top-to-bottom and must never overflow.
- **Every widget opens the screen it summarises:** Today and This week open Spending; To check opens Check; Wallets opens Wallets. Large has two extra links: the Ask LogIt mic and Paste an alert.
- **States to handle:** hidden amounts, autopilot paused, nothing yet, stale ("Updated 3h ago"), placeholder, all caught up, signed out. When signed out, no numbers from the last account may remain.

## 10. Copy rules

- **Plain and calm.** Zero is good news ("Quiet week"). Going over a limit is not a failure ("It happens. Resets Monday…").
- **Lists show amounts without a currency or minus sign** ("85.00"). Received money is green with a plus sign ("+200.00"). Hero numbers include the currency ("GHS 1,840").
- **Dates** look like "Wednesday, 26 Nov" or "26 Nov". Times use 24-hour format ("13:02").
- **Greeting:** "Hi Ama" with the date underneath.
- **Toasts** are past tense and short: "Logged · GHS 85 on Food". When something was removed, the toast offers Undo.
- **Field errors** say how to fix the problem, not just "invalid".

## 11. Screen inventory

Each link opens that frame in Figma.

### 00 · Foundations  ·  [section](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=993-47)

- [Icons · Hugeicons stroke rounded](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=997-2)
- [Tokens](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=999-92)
- [Type](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=999-216)

### 01 · Onboarding & sign in  ·  [section](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=993-48)

- [Launch · loading](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1000-29)
- [Welcome](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1000-58)
- [Sign up](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1000-102)
- [Log in](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1000-149)
- [Code](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1000-191)
- [Code · wrong](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1000-237)
- [Avatar picker](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1001-97)
- [You’re in](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1001-158)
- [Autopilot · iPhone](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1001-217)
- [Autopilot · test](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1001-281)
- [Autopilot · it works](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1001-327)
- [Autopilot · Android](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1001-369)

### 02 · Spending  ·  [section](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=993-49)

- [Spending · This week](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1002-203)
- [Spending · Today](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1002-351)
- [Spending · This month](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1002-475)
- [Spending · salary prompt](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1002-627)
- [Spending · first run](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1002-743)
- [Spending · loading](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1002-848)
- [Spending · quiet week](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1003-455)
- [Spending · offline](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1003-561)
- [Add · sheet](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1003-674)
- [Day · detail](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1003-768)
- [Notifications](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1003-862)
- [Notifications · empty](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1003-927)

### 03 · Transactions  ·  [section](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=993-50)

- [Transactions · all](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1004-617)
- [Transactions · moved](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1004-755)
- [Transactions · search](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1004-853)
- [Transactions · no results](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1004-928)
- [Transactions · empty](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1004-968)
- [Transactions · loading](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1004-1045)
- [Transaction · detail](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1005-804)
- [Change category](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1005-911)
- [Add manually](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1005-1055)
- [Log cash](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1005-1161)
- [Paste a message](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1005-1279)
- [Paste · read](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1005-1319)

### 04 · Wallets & Check  ·  [section](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=993-51)

- [Wallets](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1006-983)
- [Wallet · MTN MoMo](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1006-1096)
- [Add wallet](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1006-1209)
- [Count cash](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1006-1283)
- [Wallets · empty](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1006-1341)
- [Wallets · loading](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1006-1426)
- [Check · queue](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1007-1175)
- [Check · which account](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1007-1235)
- [Check · is it a loan](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1007-1310)
- [Check · learned](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1007-1375)
- [Check · all caught up](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1007-1421)
- [Check · not money](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1007-1456)

### 05 · Insights & Ask LogIt  ·  [section](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=993-52)

- [Insights](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1022-4574)
- [Insights · not enough data](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1008-1411)
- [Insight · food](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1022-4640)
- [Ask LogIt · start](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1008-1590)
- [Ask LogIt · listening](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1008-1680)
- [Ask LogIt · thinking](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1008-1756)
- [Ask LogIt · answer (total)](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1009-1514)
- [Ask LogIt · typing](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1009-1601)
- [Ask LogIt · can’t answer](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1009-1654)
- [Ask LogIt · offline](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1009-1726)
- [Ask LogIt · mic permission](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1009-1800)
- [Ask LogIt · history](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1009-1848)

### 05+ · Limits & Ask answers  ·  [section](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1044-5101)

- [Food · with limit](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1044-5105)
- [Set a limit](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1044-5193)
- [Near limit · notification](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1044-5289)
- [Food · over limit](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1044-5317)
- [Limits](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1044-5410)
- [Limits · empty](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1044-5488)
- [Ask · afford answer (verdict)](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1045-5274)
- [Ask · ranked answer](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1045-5425)
- [Answer shapes](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1045-5607)

### 06 · Settings  ·  [section](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=993-53)

- [Settings](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1010-1661)
- [Profile](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1010-1802)
- [Autopilot settings](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1010-1870)
- [Expected income](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1010-1946)
- [Notification settings](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1010-2062)
- [Avatar picker](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1013-1793)
- [Help & privacy](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1013-1911)
- [Log out dialog](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1013-2008)
- [Delete account](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1013-2101)
- [Locked](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1013-2165)
- [Change phone](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1013-2200)

### 07 · System states  ·  [section](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=993-54)

- [Spending · loading](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1014-1948)
- [Spending · offline](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1014-2044)
- [Spending · refreshing](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1014-2143)
- [Something went wrong](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1014-2246)
- [Update required](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1014-2283)
- [Session expired](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1014-2313)
- [Toasts](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1016-2109)
- [Banners & inline](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1016-2171)
- [Dialogs](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1016-2221)
- [Loaders](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1016-2253)
- [Allow notifications](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1016-2297)
- [Spending · toast](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1016-2336)

### 08 · Widgets  ·  [section](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1037-4555)

- [Widget kit (components)](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1037-4559)
- [Home · light](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1038-4602)
- [Home · large](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1038-4725)
- [Home · dark](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1038-4846)
- [Home · tinted](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1038-4963)
- [Lock screen](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1038-5089)
- [Android · home](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1038-5136)
- [Widget states](https://www.figma.com/design/cCIvz6r9jqCFgL8H1XSufV/LogIt?node-id=1039-5045)

**Dark sections** (for checking only; don't build these separately): Onboarding `1016:2420`, Spending `1016:2839`, Transactions `1016:3660`, Wallets & Check `1016:4403`, Insights & Ask `1016:4960`, Limits & Ask answers `1045:5699`, Settings `1016:5524`, System states `1016:6164`.

## 12. Open items (not blocking the build)

1. **Session expiry:** the copy says 60 days. This is not confirmed yet; keep it configurable.
2. **Larger text sizes:** not designed. Allow wrapping on every row and test at the largest iOS text size before release.
3. **Screen-reader labels:** not specified. Every icon-only button needs a label, for example "Back", "More", "Start voice question", "Add".
4. **Three colours are not tokenised:** the band ellipses, the "Undo" link colour in toasts (`#9DB4FF`), and the MTN network dot. Keep them as named constants.
5. **Widget setup** (choosing a wallet, or week versus month) is not designed. Ship fixed defaults.
6. **Usability check:** test the Check queue and Ask LogIt answers with 3–4 people before release.

## 13. Done means

- Every screen in section 11 is built, in light and dark, from tokens only. No hex values in components except those listed in 12.4.
- The empty, loading, offline and error state shown for each screen is implemented, not left as a TODO.
- All tap targets are at least 44×44, and nothing is truncated at the default text size.
- The numbers on every screen come from the same source of truth, so Spending, Insights and the widgets agree.
