'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWarehouses } from '@/lib/queries/warehouses';

const ONBOARDING_KEY = 'nerva-onboarding-complete';
const BANNER_DISMISSED_KEY = 'nerva-onboarding-banner-dismissed';

export function useOnboarding() {
  const [flagChecked, setFlagChecked] = useState(false);
  const [isComplete, setIsComplete] = useState(true); // default true to avoid flash
  const [bannerDismissed, setBannerDismissed] = useState(true);
  const { data: warehouses, isLoading: warehousesLoading } = useWarehouses();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const flag = localStorage.getItem(ONBOARDING_KEY);
      const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
      setIsComplete(flag === 'true');
      setBannerDismissed(dismissed === 'true');
      setFlagChecked(true);
    }
  }, []);

  const needsOnboarding =
    flagChecked &&
    !isComplete &&
    !warehousesLoading &&
    (!warehouses || warehouses.length === 0);

  const showBanner = needsOnboarding && !bannerDismissed;

  const markComplete = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsComplete(true);
  }, []);

  const dismissBanner = useCallback(() => {
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    setBannerDismissed(true);
  }, []);

  return {
    needsOnboarding,
    showBanner,
    isLoading: !flagChecked || warehousesLoading,
    markComplete,
    dismissBanner,
  };
}
