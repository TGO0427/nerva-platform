'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDriverFailStop } from '@/lib/queries';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { Button } from '@/components/ui/button';

const FAILURE_REASONS = [
  'Customer not available',
  'Address not found',
  'Access denied',
  'Refused delivery',
  'Damaged goods',
  'Other',
];

export default function DriverFailStopPage() {
  const { id: stopId } = useParams<{ id: string }>();
  const router = useRouter();
  const failStop = useDriverFailStop();
  const { position, getCurrentPosition } = useGeolocation();

  const [reason, setReason] = useState(FAILURE_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    getCurrentPosition();

    try {
      await failStop.mutateAsync({
        stopId,
        failureReason: reason,
        notes: notes || undefined,
        gpsLat: position?.lat,
        gpsLng: position?.lng,
      });
      router.back();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update stop');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Report Failed Delivery</h1>

      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
        <div className="space-y-2">
          {FAILURE_REASONS.map((r) => (
            <label key={r} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="reason"
                value={r}
                checked={reason === r}
                onChange={(e) => setReason(e.target.value)}
                className="text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-900">{r}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Additional details..."
          className="w-full rounded-md border-gray-300 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600 px-1">{error}</p>}

      <div className="space-y-2">
        <Button
          onClick={handleSubmit}
          disabled={failStop.isPending}
          className="w-full py-4 text-base bg-red-600 hover:bg-red-700"
        >
          {failStop.isPending ? 'Submitting...' : 'Confirm Failed Delivery'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => router.back()}
          className="w-full py-3 text-base"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
