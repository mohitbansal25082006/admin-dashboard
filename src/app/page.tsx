// Admin-Dashboard/src/app/page.tsx
// Part 31 — Root page: redirect to /dashboard (middleware handles auth).

import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/dashboard');
}