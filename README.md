# Spending Tracker

A personal spending tracker mobile app built with **React Native** and **Expo**.

## 📱 Active Project

The main codebase is in the `mobile/` directory.

```bash
cd mobile
npm install
npx expo start
```

## 📂 Project Structure

```
spending-tracker/
├── mobile/           # 📱 Active React Native app (Expo)
├── database.sql      # 🗄️ Supabase database schema
└── archive/          # 🗄️ Archived Next.js PWA (for reference)
```

## 🗄️ Database

The app uses Supabase for backend services. See `database.sql` for the schema.

## 📜 Archive

The original Next.js PWA implementation has been archived in `archive/nextjs-pwa/`. 
This was migrated to React Native for a native mobile experience.
