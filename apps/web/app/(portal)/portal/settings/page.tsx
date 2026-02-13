'use client';

import { useAuth } from '@/lib/auth';
import { ChangePasswordForm } from '@/components/change-password-form';

export default function PortalSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Profile</h2>
        <p className="text-sm text-gray-500 mb-4">{user?.email}</p>
        <p className="text-sm text-gray-700">{user?.displayName}</p>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
