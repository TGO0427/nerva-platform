'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';

export interface RecordPanelItem {
  label: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  badge?: string;
}

interface RecordPanelProps {
  title: string;
  emptyText: string;
  items: RecordPanelItem[];
}

function RecordPanel({ title, emptyText, items }: RecordPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={`${item.label}-${item.href || item.description || ''}`}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">{item.label}</p>
                    {item.badge && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-0.5 truncate text-xs text-slate-500">{item.description}</p>
                  )}
                </div>
                {item.href ? (
                  <Link href={item.href}>
                    <Button variant="secondary" size="sm">Open</Button>
                  </Link>
                ) : (
                  <Button variant="secondary" size="sm" onClick={item.onClick}>
                    Open
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">{emptyText}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function RecordDocumentsPanel({ items }: { items: RecordPanelItem[] }) {
  return (
    <RecordPanel
      title="Documents"
      emptyText="No documents are available for this record yet."
      items={items}
    />
  );
}

export function RelatedRecordsPanel({ items }: { items: RecordPanelItem[] }) {
  return (
    <RecordPanel
      title="Related Records"
      emptyText="No related records are linked to this record yet."
      items={items}
    />
  );
}
