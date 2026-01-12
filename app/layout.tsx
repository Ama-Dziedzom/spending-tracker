import type { Metadata, Viewport } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/layout/Navigation";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SpendWise - Personal Spending Tracker",
  description: "Track your spending, manage your finances, and gain insights into your financial habits",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SpendWise",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "SpendWise",
    title: "SpendWise - Personal Spending Tracker",
    description: "Track your spending, manage your finances, and gain insights into your financial habits",
  },
  twitter: {
    card: "summary",
    title: "SpendWise - Personal Spending Tracker",
    description: "Track your spending, manage your finances, and gain insights into your financial habits",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={publicSans.variable}>
      <body className="font-sans antialiased bg-[#F8F9FA] dark:bg-gray-950 text-gray-900 dark:text-white">
        <ServiceWorkerRegistration />
        <div className="flex flex-col md:flex-row min-h-screen">
          <Navigation />
          <main className="flex-1 pb-20 md:pb-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
