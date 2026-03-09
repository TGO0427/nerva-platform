'use client';

import dynamic from 'next/dynamic';
import { Spinner } from '@/components/ui/spinner';

const SalesReportContent = dynamic(() => import('./sales-report-content'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  ),
});

export default function SalesReportPage() {
  return <SalesReportContent />;
}
