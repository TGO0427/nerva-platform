'use client';

import { Breadcrumbs } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HelpPage() {
  return (
    <div>
      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Help & Support</h1>
        <p className="text-slate-500 mt-1">Resources to help you get the most out of Nerva.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QuickStartIcon />
              Getting Started
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>New to Nerva? Here are the basics:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Use the sidebar to navigate between modules</li>
              <li>Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">/</kbd> to search navigation</li>
              <li>Star items in the sidebar to add them to Favorites</li>
              <li>Collapse sidebar sections by clicking their headers</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyboardIcon />
              Keyboard Shortcuts
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            <div className="space-y-2">
              {[
                { key: '/', desc: 'Focus sidebar search' },
                { key: 'Esc', desc: 'Clear search / close dialogs' },
              ].map(({ key, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <span>{desc}</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono">{key}</kbd>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ModulesIcon />
              Modules Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Orders</strong> &mdash; Sales orders and returns</li>
              <li><strong>Fulfilment</strong> &mdash; Picking, packing, dispatch</li>
              <li><strong>Warehouse</strong> &mdash; Inventory, receiving, transfers</li>
              <li><strong>Manufacturing</strong> &mdash; Work orders, scheduling, quality</li>
              <li><strong>Procurement</strong> &mdash; Purchase orders</li>
              <li><strong>Reports</strong> &mdash; Analytics and insights</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SupportIcon />
              Contact Support
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>Need help with something specific?</p>
            <p>
              Email:{' '}
              <a href="mailto:support@nerva.co.za" className="text-blue-600 hover:underline">
                support@nerva.co.za
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickStartIcon() {
  return (
    <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function KeyboardIcon() {
  return (
    <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function ModulesIcon() {
  return (
    <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
  );
}
