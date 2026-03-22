// Admin-Dashboard/src/app/layout.tsx
// Part 31 — Root layout for the admin dashboard.

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'DeepDive AI — Admin',
  description: 'DeepDive AI Admin Dashboard',
  robots: 'noindex, nofollow', // Never index admin panel
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning on <html> and <body> prevents false hydration
    // mismatch warnings caused by browser extensions (Grammarly, Honey, LastPass,
    // etc.) that inject custom attributes like bis_register or __processed_*
    // into the DOM before React hydrates. This is the official React/Next.js fix —
    // it only suppresses warnings on these two root elements, not their children.
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-[#080810] text-white`}
        suppressHydrationWarning
      >
        {children}
        <Toaster
          position="top-right"
          theme="dark"
          richColors
          toastOptions={{
            style: {
              background: '#13131F',
              border: '1px solid rgba(108, 99, 255, 0.2)',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  );
}