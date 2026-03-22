'use client';
// Admin-Dashboard/src/app/dashboard/payments/page.tsx
// Part 31C — Revenue & Payments page: Razorpay orders + revenue analytics.

import { Header }        from '@/components/admin/Header';
import { PaymentTable }  from '@/components/admin/PaymentTable';

export default function PaymentsPage() {
  return (
    <div>
      <Header
        title="Payments & Revenue"
        subtitle="All Razorpay orders, revenue trends, and credit revocation"
      />
      <PaymentTable />
    </div>
  );
}