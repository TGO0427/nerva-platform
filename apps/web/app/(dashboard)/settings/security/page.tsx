'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Breadcrumbs } from '@/components/layout';
import api from '@/lib/api';

type SetupStep = 'idle' | 'scanning' | 'confirming';

export default function SecurityPage() {
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Setup state
  const [setupStep, setSetupStep] = useState<SetupStep>('idle');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [manualSecret, setManualSecret] = useState('');
  const [enableCode, setEnableCode] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);

  // Disable state
  const [showDisable, setShowDisable] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);

  const enableInputRef = useRef<HTMLInputElement>(null);
  const disableInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/auth/mfa/status');
      setMfaEnabled(res.data.mfaEnabled);
    } catch {
      setError('Failed to load MFA status');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    setError(null);
    setSuccess(null);
    setSetupLoading(true);
    try {
      const res = await api.post('/auth/mfa/setup');
      setQrCodeUrl(res.data.qrCodeUrl);
      setManualSecret(res.data.secret);
      setSetupStep('scanning');
      setTimeout(() => enableInputRef.current?.focus(), 100);
    } catch {
      setError('Failed to start MFA setup');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSetupLoading(true);
    try {
      await api.post('/auth/mfa/enable', { code: enableCode });
      setMfaEnabled(true);
      setSetupStep('idle');
      setEnableCode('');
      setQrCodeUrl('');
      setManualSecret('');
      setSuccess('Two-factor authentication has been enabled.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid verification code');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDisableLoading(true);
    try {
      await api.post('/auth/mfa/disable', { code: disableCode });
      setMfaEnabled(false);
      setShowDisable(false);
      setDisableCode('');
      setSuccess('Two-factor authentication has been disabled.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid verification code');
    } finally {
      setDisableLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Security</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage two-factor authentication and other security settings
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4 mb-6">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* MFA Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Two-Factor Authentication</CardTitle>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  mfaEnabled
                    ? 'bg-green-100 text-green-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {mfaEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-4">
              Add an extra layer of security to your account by requiring a
              time-based one-time password (TOTP) from an authenticator app like
              Google Authenticator, Authy, or 1Password.
            </p>

            {!mfaEnabled && setupStep === 'idle' && (
              <Button onClick={handleSetup} isLoading={setupLoading}>
                Enable Two-Factor Authentication
              </Button>
            )}

            {mfaEnabled && !showDisable && (
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDisable(true);
                  setError(null);
                  setTimeout(() => disableInputRef.current?.focus(), 100);
                }}
              >
                Disable Two-Factor Authentication
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Setup Flow - QR Code */}
        {setupStep === 'scanning' && (
          <Card>
            <CardHeader>
              <CardTitle>Scan QR Code</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-slate-500">
                  Scan this QR code with your authenticator app, then enter the
                  6-digit code below to verify.
                </p>

                <div className="flex justify-center py-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeUrl}
                    alt="QR Code for MFA setup"
                    className="w-48 h-48 rounded-lg border border-slate-200"
                  />
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 mb-1">
                    Can't scan? Enter this key manually:
                  </p>
                  <code className="text-sm font-mono font-medium text-slate-900 break-all select-all">
                    {manualSecret}
                  </code>
                </div>

                <form onSubmit={handleEnable} className="space-y-3">
                  <Input
                    ref={enableInputRef}
                    label="Verification Code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={enableCode}
                    onChange={(e) =>
                      setEnableCode(e.target.value.replace(/\D/g, ''))
                    }
                    placeholder="000000"
                    autoComplete="one-time-code"
                  />
                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      isLoading={setupLoading}
                      disabled={setupLoading || enableCode.length !== 6}
                    >
                      Verify and Enable
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setSetupStep('idle');
                        setEnableCode('');
                        setQrCodeUrl('');
                        setManualSecret('');
                        setError(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Disable MFA */}
        {showDisable && (
          <Card>
            <CardHeader>
              <CardTitle>Disable Two-Factor Authentication</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 mb-4">
                Enter a code from your authenticator app to confirm disabling
                two-factor authentication.
              </p>
              <form onSubmit={handleDisable} className="space-y-3">
                <Input
                  ref={disableInputRef}
                  label="Verification Code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) =>
                    setDisableCode(e.target.value.replace(/\D/g, ''))
                  }
                  placeholder="000000"
                  autoComplete="one-time-code"
                />
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    variant="danger"
                    isLoading={disableLoading}
                    disabled={disableLoading || disableCode.length !== 6}
                  >
                    Disable 2FA
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowDisable(false);
                      setDisableCode('');
                      setError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
