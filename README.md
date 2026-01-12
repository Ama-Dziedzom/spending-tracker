# SpendWise - Personal Spending Tracker PWA

A beautiful, mobile-first Progressive Web App for tracking personal finances, built with Next.js 14+, React, TypeScript, and Supabase.

![SpendWise Dashboard](public/icons/icon-512x512.png)

## ✨ Features

### 📊 Dashboard
- Current balance overview with beautiful gradient cards
- Total income vs expenses summary
- Spending by category (interactive donut chart)
- Top spending categories with progress bars
- Recent transactions list
- Date range filters (Today, This Week, This Month, Custom)

### 💳 Transactions
- Paginated list of all transactions
- Search by description
- Filter by type (Income/Expenses)
- Filter by source (MTN MoMo, Vodafone Cash, Bank)
- Filter by category
- Sort by date or amount
- Transaction details modal with category editing

### 📈 Analytics
- Monthly spending trends (area chart)
- Category breakdown (donut chart)
- Spending by source (bar chart)
- Daily/Weekly/Monthly averages
- Net savings overview
- Top spending categories ranking

### 📱 PWA Features
- Installable on mobile devices
- Offline support with service worker caching
- App-like experience
- Works great on iPhone and Android

## 🎨 Categories

- 💜 Church & Charity
- 🍊 Food & Dining
- 💙 Transportation
- 💗 Shopping
- 💛 Utilities & Bills
- 💚 Entertainment
- ❤️ Health
- 🩵 Education
- 💚 Income
- ⬜ Transfers
- 💜 Cash Withdrawal
- 🌹 Fees & Charges
- ⬛ Other

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (optional - app works with mock data)

### Installation

1. Clone or navigate to the project:
```bash
cd spending-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env.local
```

4. Edit `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
spending-tracker/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx        # Dashboard page
│   │   └── loading.tsx     # Loading skeleton
│   ├── transactions/
│   │   ├── page.tsx        # Transactions list page
│   │   └── loading.tsx     # Loading skeleton
│   ├── analytics/
│   │   ├── page.tsx        # Analytics page
│   │   └── loading.tsx     # Loading skeleton
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Root redirect
├── components/
│   ├── layout/
│   │   ├── Navigation.tsx  # Sidebar/bottom nav
│   │   └── Header.tsx      # Page header
│   ├── transactions/
│   │   ├── TransactionItem.tsx
│   │   ├── TransactionList.tsx
│   │   └── TransactionModal.tsx
│   ├── charts/
│   │   ├── CategoryChart.tsx   # Donut chart
│   │   └── SpendingChart.tsx   # Area chart
│   └── ServiceWorkerRegistration.tsx
├── lib/
│   ├── supabase.ts         # Supabase client
│   └── utils.ts            # Utility functions
├── types/
│   └── transactions.ts     # TypeScript types
├── public/
│   ├── icons/              # PWA icons
│   ├── manifest.json       # PWA manifest
│   └── sw.js               # Service worker
└── package.json
```

## 🗄️ Database Schema

The app expects a Supabase table with this schema:

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_date TIMESTAMPTZ NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('debit', 'credit')),
    source TEXT NOT NULL,
    description TEXT,
    balance DECIMAL(10, 2) NOT NULL,
    category TEXT,
    raw_sms TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Database**: Supabase
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **PWA**: Custom service worker

## 📱 Screenshots

### Dashboard
- Balance card with gradient
- Income/Expenses stats
- Category chart
- Recent transactions

### Transactions
- Search and filter
- Transaction list
- Category badges
- Balance tracking

### Analytics
- Monthly trends
- Category breakdown
- Source comparison
- Top categories

## 🔧 Configuration

### Supabase Setup
1. Create a new Supabase project
2. Create the transactions table using the schema above
3. Copy your project URL and anon key to `.env.local`

### PWA Installation
1. Open the app in Chrome or Safari
2. Click the share button
3. Select "Add to Home Screen"
4. The app will now work offline!

## 📄 License

MIT License - feel free to use this for your personal projects!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
