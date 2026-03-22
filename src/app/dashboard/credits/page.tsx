'use client';
// Admin-Dashboard/src/app/dashboard/credits/page.tsx
// Part 31C — Credit Ledger page: platform-wide transaction history.

import { Header }       from '@/components/admin/Header';
import { CreditLedger } from '@/components/admin/CreditLedger';

export default function CreditsPage() {
  return (
    <div>
      <Header
        title="Credit Ledger"
        subtitle="Every credit transaction across all users — full platform view"
      />
      <CreditLedger />
    </div>
  );
}