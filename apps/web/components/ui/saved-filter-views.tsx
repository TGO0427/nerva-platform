'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from './button';
import { Select } from './select';

type FilterValue = string | number | boolean | null | undefined;
export type SavedFilterValues = Record<string, FilterValue>;

interface SavedFilterView {
  id: string;
  name: string;
  values: SavedFilterValues;
}

interface SavedFilterViewsProps {
  storageKey: string;
  currentValues: SavedFilterValues;
  onApply: (values: SavedFilterValues) => void;
  onAfterApply?: () => void;
  className?: string;
}

export function SavedFilterViews({
  storageKey,
  currentValues,
  onApply,
  onAfterApply,
  className = '',
}: SavedFilterViewsProps) {
  const [views, setViews] = useState<SavedFilterView[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const fullStorageKey = `nerva:saved-filter-views:${storageKey}`;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(fullStorageKey);
      setViews(stored ? JSON.parse(stored) : []);
    } catch {
      setViews([]);
    }
  }, [fullStorageKey]);

  const options = useMemo(
    () => [
      { value: '', label: 'Saved views' },
      ...views.map((view) => ({ value: view.id, label: view.name })),
    ],
    [views]
  );

  const persistViews = (nextViews: SavedFilterView[]) => {
    setViews(nextViews);
    window.localStorage.setItem(fullStorageKey, JSON.stringify(nextViews));
  };

  const handleSave = () => {
    const name = window.prompt('Name this saved view');
    const trimmedName = name?.trim();
    if (!trimmedName) return;

    const nextView: SavedFilterView = {
      id: `${Date.now()}`,
      name: trimmedName,
      values: currentValues,
    };

    persistViews([...views.filter((view) => view.name !== trimmedName), nextView]);
    setSelectedId(nextView.id);
  };

  const handleApply = (viewId: string) => {
    setSelectedId(viewId);
    const view = views.find((item) => item.id === viewId);
    if (!view) return;

    onApply(view.values);
    onAfterApply?.();
  };

  const handleDelete = () => {
    if (!selectedId) return;
    const nextViews = views.filter((view) => view.id !== selectedId);
    persistViews(nextViews);
    setSelectedId('');
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select
        aria-label="Saved filter views"
        value={selectedId}
        onChange={(event) => handleApply(event.target.value)}
        options={options}
        className="h-9 min-w-[150px] bg-white py-1.5"
      />
      <Button type="button" variant="secondary" size="sm" onClick={handleSave}>
        Save View
      </Button>
      {selectedId && (
        <Button type="button" variant="ghost" size="sm" onClick={handleDelete}>
          Delete
        </Button>
      )}
    </div>
  );
}
