'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDeliverStop } from '@/lib/queries';
import { useUpload } from '@/lib/hooks/use-upload';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { Button } from '@/components/ui/button';

export default function DriverDeliverPage() {
  const { id: stopId } = useParams<{ id: string }>();
  const router = useRouter();
  const deliverStop = useDeliverStop();
  const { upload, isUploading } = useUpload();
  const { position, getCurrentPosition } = useGeolocation();

  const [recipientName, setRecipientName] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  // Signature canvas handlers
  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) setSignatureBlob(blob);
    });
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureBlob(null);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos((prev) => [...prev, ...files].slice(0, 5));
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    getCurrentPosition();

    try {
      let signatureRef: string | undefined;
      const photoRefs: string[] = [];

      // Upload signature if drawn
      if (signatureBlob) {
        const result = await upload(signatureBlob, 'signature', `signature-${stopId}.png`);
        signatureRef = result.s3Key;
      }

      // Upload photos
      for (const photo of photos) {
        const result = await upload(photo, 'photo');
        photoRefs.push(result.s3Key);
      }

      await deliverStop.mutateAsync({
        stopId,
        recipientName: recipientName || undefined,
        signatureRef,
        photoRefs: photoRefs.length > 0 ? photoRefs : undefined,
        gpsLat: position?.lat,
        gpsLng: position?.lng,
        notes: notes || undefined,
      });

      router.back();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit delivery');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Proof of Delivery</h1>

      {/* Recipient */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name</label>
        <input
          type="text"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          placeholder="Name of person receiving"
          className="w-full rounded-md border-gray-300 text-sm"
        />
      </div>

      {/* Signature */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Signature</label>
          <button onClick={clearSignature} className="text-xs text-primary-600">Clear</button>
        </div>
        <canvas
          ref={canvasRef}
          width={320}
          height={150}
          className="w-full border border-gray-300 rounded-md bg-white touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>

      {/* Photos */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <label className="text-sm font-medium text-gray-700 mb-2 block">Photos ({photos.length}/5)</label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          className="text-sm"
          disabled={photos.length >= 5}
        />
        {photos.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {photos.map((p, i) => (
              <div key={i} className="relative">
                <img src={URL.createObjectURL(p)} alt="" className="w-16 h-16 rounded object-cover" />
                <button
                  onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Optional delivery notes"
          className="w-full rounded-md border-gray-300 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600 px-1">{error}</p>}

      <Button
        onClick={handleSubmit}
        disabled={submitting || isUploading}
        className="w-full py-4 text-base"
      >
        {submitting ? 'Submitting...' : 'Confirm Delivery'}
      </Button>
    </div>
  );
}
