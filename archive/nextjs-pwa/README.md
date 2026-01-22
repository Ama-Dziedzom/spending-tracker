# Next.js PWA (Archived)

> **Status**: 🗄️ Archived on January 22, 2026

This folder contains the original Next.js PWA implementation of the Spending Tracker app.

## Why Archived?

The project was migrated to **React Native** (Expo) for a native mobile experience. This archive is kept for reference purposes.

## What's Here?

| Folder/File | Description |
|-------------|-------------|
| `app/` | Next.js App Router pages (dashboard, insights, settings, transactions, wallets) |
| `components/` | React components including shadcn/ui library |
| `lib/` | Supabase client and utilities |
| `public/` | Static assets |
| `.env.local` | Environment variables (Supabase keys) |

## Useful References

- **Supabase schema**: See `../database.sql` for the database structure
- **UI patterns**: `components/dashboard-content.tsx` has chart implementations
- **Onboarding flow**: `components/onboarding.tsx` has the original wallet selection logic

## Active Project

The active codebase is now at `../mobile/` using React Native + Expo.
