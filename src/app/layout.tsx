// Admin-Dashboard/src/app/layout.tsx
// Part 55.13 — Root layout with ThemeProvider

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { ThemeProvider } from '../context/ThemeContext';
import { ThemeToggle } from '../components/admin/ThemeToggle';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'DeepDive AI — Admin',
  description: 'DeepDive AI Admin Dashboard',
  robots: 'noindex, nofollow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased`}
        style={{
          backgroundColor: 'var(--background)',
          color: 'var(--text-primary)',
        }}
        suppressHydrationWarning
      >
        <Providers>
          <ThemeProvider>
            {children}
            <ThemeToggle />
            <Toaster
              position="top-right"
              theme="dark"
              richColors
              toastOptions={{
                style: {
                  background: 'var(--background-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                },
              }}
            />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}