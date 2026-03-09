'use client';

import dynamic from 'next/dynamic';
import { Spinner } from '@/components/ui/spinner';

const ManufacturingReportContent = dynamic(() => import('./manufacturing-report-content'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  ),
});

export default function ManufacturingReportPage() {
  return <ManufacturingReportContent />;
}
