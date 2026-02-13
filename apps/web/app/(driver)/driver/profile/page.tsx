'use client';

import { useAuth } from '@/lib/auth';
import { useDriverTrips } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { ChangePasswordForm } from '@/components/change-password-form';

export default function DriverProfilePage() {
  const { user, logout } = useAuth();
  const { data: trips } = useDriverTrips();

  const completedToday = trips?.filter((t: any) => t.status === 'COMPLETE').length || 0;
  const activeTrips = trips?.filter((t: any) => t.status === 'IN_PROGRESS').length || 0;
  const totalStops = trips?.reduce((sum: number, t: any) => sum + (t.totalStops || 0), 0) || 0;

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 text-center">
        <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center mb-3">
          <svg className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{user?.displayName}</h1>
        <p className="text-sm text-gray-500">{user?.email}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-center">
          <p className="text-2xl font-bold text-gray-900">{activeTrips}</p>
          <p className="text-xs text-gray-500">Active</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-center">
          <p className="text-2xl font-bold text-gray-900">{completedToday}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-center">
          <p className="text-2xl font-bold text-gray-900">{totalStops}</p>
          <p className="text-xs text-gray-500">Total Stops</p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
        <ChangePasswordForm />
      </div>

      <Button
        onClick={logout}
        variant="secondary"
        className="w-full py-3 text-base"
      >
        Sign Out
      </Button>
    </div>
  );
}
