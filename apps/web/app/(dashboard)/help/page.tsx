'use client';

import { Breadcrumbs } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const MODULE_GROUPS = [
  {
    name: 'Overview',
    items: [
      { name: 'Dashboard', desc: 'KPIs, pending orders, low stock and late-order alerts at a glance' },
      { name: 'Exceptions', desc: 'Operational issues across the app that need attention' },
      { name: 'Document Centre', desc: 'Compliance documents and certificates (COA, SADC, SGS)' },
      { name: 'Import Schedule', desc: 'Inbound shipments from arrival through inspection, receiving and storage, with per-line landed cost tracking' },
    ],
  },
  {
    name: 'Orders & Fulfilment',
    items: [
      { name: 'Sales Orders', desc: 'Order lifecycle from draft to delivery, with an estimated gross margin on every order' },
      { name: 'Returns', desc: 'Customer RMAs' },
      { name: 'Fulfilment', desc: 'Pick waves and pick tasks' },
      { name: 'Packing Station', desc: 'Pack confirmed picks into shipments' },
      { name: 'Dispatch', desc: 'Plan and execute delivery trips' },
    ],
  },
  {
    name: 'Finance',
    items: [
      { name: 'Invoices', desc: 'Draft, send, record payment against, and void invoices' },
      { name: 'Credit Notes', desc: 'Issue credit against returns or invoice corrections' },
    ],
  },
  {
    name: 'Manufacturing',
    items: [
      { name: 'Production Dashboard', desc: 'Shop floor status at a glance' },
      { name: 'Shop Floor / Work Orders', desc: 'Track work orders through production' },
      { name: 'Schedule / MRP', desc: 'Production scheduling and material requirements planning' },
      { name: 'Quality', desc: 'Non-conformance reports and batch QC holds (Awaiting QC → On Hold / Rejected / Released) that gate allocation and dispatch' },
      { name: 'Batch QC Queue', desc: 'Every batch awaiting or moving through QC release, across all items and work orders, with Approve/Hold/Reject actions in one place' },
      { name: 'Traceability / Production Ledger', desc: 'Full genealogy of what was produced, from which batches' },
    ],
  },
  {
    name: 'Warehouse',
    items: [
      { name: 'Inventory', desc: 'Stock on hand by item, bin and batch' },
      { name: 'Receiving (GRN)', desc: 'Goods received notes against purchase orders' },
      { name: 'Putaway', desc: 'Move received stock from receiving bins into storage; tasks can be assigned, reassigned, and filtered by "My Tasks Only" or a specific worker' },
      { name: 'Transfers (IBT)', desc: 'Inter-branch/bin stock transfers, with a batch picker scoped to what the source bin actually holds' },
      { name: 'Adjustments', desc: 'Stock corrections with an audit trail and a live delta preview' },
      { name: 'Cycle Counts', desc: 'Scheduled physical stock counts with per-batch variance reporting' },
      { name: 'Expiry Alerts', desc: 'Batches approaching their expiry date' },
    ],
  },
  {
    name: 'Procurement',
    items: [
      { name: 'Purchase Orders', desc: 'PO lifecycle; import POs carry landed cost (freight, duty, clearing) from their linked shipment' },
      { name: 'Supplier NCRs', desc: 'Non-conformance reports tracked Open → In Progress → Resolved → Closed, with an assignee and due date' },
    ],
  },
  {
    name: 'Master Data',
    items: [
      { name: 'Items', desc: 'Product catalog, including HS code and country of origin for trade compliance' },
      { name: 'BOMs / BOM Costing', desc: 'Bills of materials and their rolled-up cost' },
      { name: 'Routings / Workstations', desc: 'Manufacturing routing steps and the workstations that execute them' },
      { name: 'Customers / Suppliers', desc: 'Master records with contacts, notes, contracts and activity history' },
      { name: 'Warehouses', desc: 'Sites, warehouses and their storage bins' },
    ],
  },
  {
    name: 'Reports',
    items: [
      { name: 'Sales / Inventory / Procurement / Manufacturing Reports', desc: 'Module-level analytics' },
      { name: 'Customer / Supplier Insights', desc: 'Performance analytics per customer or supplier' },
    ],
  },
];

const TIPS = [
  { title: 'Command palette', desc: 'Press Ctrl/Cmd + K anywhere to jump straight to any page or run a quick action — arrow keys to move, Enter to go, Esc to close.' },
  { title: 'Favorites', desc: 'Hover a sidebar item and click the star to pin it to a Favorites section at the top of the sidebar.' },
  { title: 'Quick actions', desc: 'The buttons under the sidebar search (+Order, +Receive, +Transfer) skip straight to a new record’s create form.' },
  { title: 'Sidebar badges', desc: 'Red counters on Receiving, Cycle Counts, Supplier NCRs and Expiry Alerts show what’s pending — they update live from your dashboard stats.' },
  { title: 'Customize any table', desc: 'Most list pages have a Columns dropdown to show/hide fields, plus Print and Export (CSV) buttons — your column choices are remembered per page.' },
  { title: 'View vs. Edit', desc: 'Master data records (Items, Suppliers, Customers, Warehouses) open in read-only view first — click Edit to change something, so a stray click can’t modify a record by accident.' },
  { title: 'Dark mode', desc: 'Toggle Light/Dark Mode from the sidebar footer — your preference is remembered on this device.' },
  { title: 'Tabs', desc: 'Pages you open stay as tabs along the top, so you can jump back to a previous screen without losing your place.' },
];

const WHATS_NEW = [
  {
    title: 'The system is now batch-driven end to end',
    desc: 'Every stock movement — Internal Transfers, Adjustments, Manufacturing output, Cycle Counts — now requires a real batch/lot number for batch-tracked items, with a live picker showing which batches actually have stock in the chosen bin instead of a free-text field. Closes gaps where a movement could silently create a phantom "no batch" stock record.',
  },
  {
    title: 'Batch QC Queue',
    desc: 'A new page under Manufacturing → Quality → Batch QC Queue lists every batch awaiting or moving through quality release across the whole plant — Awaiting QC, On Hold, Approved, Rejected, Released — with Approve/Hold/Reject actions right there, instead of having to open each work order individually.',
  },
  {
    title: 'Production runs get their own traceable batch',
    desc: 'A work order keeps the batch it was assigned at release for its first output, but every output after that (a separate production run, e.g. on a different day) now gets its own distinct batch number automatically — each run independently traceable and independently QC’d.',
  },
  {
    title: 'Cycle Counts track the specific batch being counted',
    desc: 'Count lines now record which batch they refer to, so a bin holding multiple batches of the same item counts each one correctly, and generating an adjustment from a completed count’s variances carries the right batch through instead of failing or misattributing stock.',
  },
  {
    title: 'Sales allocation → picking is now durable and reversible',
    desc: 'Allocating an order reserves an exact batch and bin per line; picking consumes exactly that reservation instead of re-deriving stock on the fly. If a customer cancels after something’s already been picked, a new "Reverse Pick" action puts the stock back and re-reserves it — and cancelling an order or pick wave with unreversed picked stock is now blocked with a clear message instead of silently leaving it stranded.',
  },
  {
    title: 'Search by batch number, almost everywhere',
    desc: 'Batch/lot numbers are now searchable on Non-Conformances, Work Orders, Adjustments, Sales Orders, Cycle Counts, and in the global Ctrl/Cmd+K search — useful for tracing exactly where a given batch ended up.',
  },
  {
    title: 'Putaway task assignment',
    desc: 'The Putaway page now has "My Tasks Only" and "Assigned To" filters so a worker (or their supervisor) can see just the tasks that matter to them, and an already-assigned task can now be reassigned (e.g. if the original picker is out) instead of only being cancellable. Assigning/reassigning is gated behind a new permission — grant it to supervisor/admin roles under Settings → Roles.',
  },
  {
    title: 'Smaller fixes & polish',
    desc: 'Dispatch’s trip board has a "Hide Activity" toggle so the board can use the full width when you need to see every column. Sales Orders’ stat cards (Total, Open, In Fulfilment, Shipped) are now clickable and match their own counts. Adjustments and Transfers show a live up/down delta as you type, and a draft Adjustment line can now be edited in place instead of remove-and-re-add.',
  },
  {
    title: 'Trade Compliance, Landed Cost & Margin Estimates',
    desc: 'Items now carry an HS code and country of origin. Import purchase orders can link to a shipment with per-line freight/duty/clearing cost, rolling up to a landed cost on the PO. Sales orders and the dashboard show an estimated gross margin, derived from recent purchase cost or preferred supplier pricing.',
  },
  {
    title: 'Batch QC Hold Lifecycle',
    desc: 'Newly produced batches start life Awaiting QC and can be put On Hold or Rejected before release — unreleased stock is blocked from allocation and dispatch until it’s cleared.',
  },
  {
    title: 'Items: view before you edit',
    desc: 'The Items page now shows a read-only detail view with an Edit button, matching Suppliers and Customers, instead of opening straight into an editable form.',
  },
  {
    title: 'Import Schedule — Post-Arrival Workflow',
    desc: 'On a shipment’s detail page, each line now walks through Unloading → Inspection → Receiving → Stored, with a failed inspection automatically opening a Supplier NCR.',
  },
  {
    title: 'Supplier NCRs',
    desc: 'Non-conformance reports now track Open → In Progress → Resolved → Closed, with an assignee and due date. See every open NCR across all suppliers on the Supplier NCRs worklist under Procurement.',
  },
];

export default function HelpPage() {
  return (
    <div>
      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Help & Support</h1>
        <p className="text-slate-500 mt-1">Resources to help you get the most out of Nerva.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
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
              <li>Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">/</kbd> to search navigation, or <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">Ctrl/Cmd K</kbd> for the full command palette</li>
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
                { key: 'Ctrl/Cmd K', desc: 'Open command palette' },
                { key: '/', desc: 'Focus sidebar search' },
                { key: '↑ ↓', desc: 'Move through search results' },
                { key: 'Enter', desc: 'Go to selected result' },
                { key: 'Esc', desc: 'Clear search / close dialogs' },
              ].map(({ key, desc }) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <span>{desc}</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono whitespace-nowrap">{key}</kbd>
                </div>
              ))}
            </div>
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ModulesIcon />
            Modules Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {MODULE_GROUPS.map((group) => (
              <div key={group.name}>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">{group.name}</h3>
                <ul className="text-sm text-slate-600 space-y-1.5">
                  {group.items.map((item) => (
                    <li key={item.name}>
                      <strong className="text-slate-800">{item.name}</strong>
                      <span className="text-slate-500"> &mdash; {item.desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TipsIcon />
            Tips & Tricks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            {TIPS.map((tip) => (
              <div key={tip.title} className="text-sm">
                <p className="font-medium text-slate-900">{tip.title}</p>
                <p className="text-slate-600">{tip.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WhatsNewIcon />
            What&apos;s New
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 space-y-4">
          {WHATS_NEW.map((entry) => (
            <div key={entry.title}>
              <p className="font-medium text-slate-900">{entry.title}</p>
              <p>{entry.desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>
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

function TipsIcon() {
  return (
    <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  );
}

function WhatsNewIcon() {
  return (
    <svg className="h-5 w-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
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
