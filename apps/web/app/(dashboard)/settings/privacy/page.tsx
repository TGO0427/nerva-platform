'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Breadcrumbs } from '@/components/layout';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { useQuery, useMutation } from '@tanstack/react-query';

function useExportStatus() {
  return useQuery({
    queryKey: ['gdpr-export-status'],
    queryFn: async () => {
      const response = await api.get<{ lastExportDate: string | null }>('/auth/my-data/status');
      return response.data;
    },
  });
}

export default function PrivacyPage() {
  const { logout } = useAuth();
  const { data: exportStatus, isLoading: statusLoading, refetch: refetchStatus } = useExportStatus();
  const [exporting, setExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const handleExportData = useCallback(async () => {
    setExporting(true);
    try {
      const response = await api.get('/auth/my-data');
      const data = response.data;

      // Trigger JSON file download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      refetchStatus();
    } catch (error: any) {
      alert(error?.message || 'Failed to export data. You may be rate limited - try again in an hour.');
    } finally {
      setExporting(false);
    }
  }, [refetchStatus]);

  const deleteMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await api.delete('/auth/my-account', {
        data: { password },
      });
      return response.data;
    },
    onSuccess: () => {
      logout();
      window.location.href = '/login';
    },
    onError: (error: any) => {
      setDeleteError(error?.message || 'Failed to delete account. Please check your password.');
    },
  });

  const handleDeleteAccount = () => {
    setDeleteError('');
    if (!deletePassword) {
      setDeleteError('Please enter your password to confirm.');
      return;
    }
    deleteMutation.mutate(deletePassword);
  };

  return (
    <div>
      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Privacy & Data</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal data and account. In accordance with GDPR, you can export or delete your data at any time.
        </p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Data Export Section */}
        <Card>
          <CardHeader>
            <CardTitle>Download My Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Download a copy of all personal data we store about you, including your profile information,
              activity history, and session data. The export is provided as a JSON file.
            </p>

            {statusLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                <Spinner size="sm" /> Loading...
              </div>
            ) : exportStatus?.lastExportDate ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                Last exported: {new Date(exportStatus.lastExportDate).toLocaleString()}
              </p>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                You have not exported your data before.
              </p>
            )}

            <Button onClick={handleExportData} disabled={exporting}>
              {exporting ? (
                <>
                  <Spinner size="sm" /> Exporting...
                </>
              ) : (
                'Download My Data'
              )}
            </Button>

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              Data export is limited to once per hour.
            </p>
          </CardContent>
        </Card>

        {/* Danger Zone - Account Deletion */}
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                Delete My Account
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400 mb-4">
                This action is permanent and cannot be undone. Your account will be anonymized,
                all active sessions will be revoked, and you will be logged out immediately.
                Historical records (orders, transactions) will be preserved but will no longer
                be linked to your identity.
              </p>

              {!showDeleteConfirm ? (
                <Button
                  variant="danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete My Account
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-md border border-red-300 dark:border-red-700">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-3">
                      Are you sure? Enter your password to confirm account deletion.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="delete-password" className="text-red-800 dark:text-red-300">
                          Password
                        </Label>
                        <Input
                          id="delete-password"
                          type="password"
                          value={deletePassword}
                          onChange={(e) => {
                            setDeletePassword(e.target.value);
                            setDeleteError('');
                          }}
                          placeholder="Enter your current password"
                          className="mt-1"
                        />
                      </div>

                      {deleteError && (
                        <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                          {deleteError}
                        </p>
                      )}

                      <div className="flex items-center gap-3">
                        <Button
                          variant="danger"
                          onClick={handleDeleteAccount}
                          disabled={deleteMutation.isPending || !deletePassword}
                        >
                          {deleteMutation.isPending ? (
                            <>
                              <Spinner size="sm" /> Deleting...
                            </>
                          ) : (
                            'Confirm Deletion'
                          )}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeletePassword('');
                            setDeleteError('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
