'use client';

import { useToast } from '@/components/ui/toast';

export function useCopy() {
  const { addToast } = useToast();

  const copy = async (text: string, label = 'Copied to clipboard') => {
    try {
      await navigator.clipboard.writeText(text);
      addToast(label, 'success', 2000);
    } catch {
      addToast('Failed to copy', 'error', 2000);
    }
  };

  return { copy };
}
