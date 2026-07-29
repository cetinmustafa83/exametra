'use client';

import React, { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { fetchCurrentUser } from '@/lib/api';
import AuthView from '@/components/auth-view';
import AppLayout from '@/components/app-layout';
import CookieConsent from '@/components/cookie-consent';

export default function Home() {
  const currentUser = useAppStore((s) => s.currentUser);
  const isLoadingAuth = useAppStore((s) => s.isLoadingAuth);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate auth checks: only run once per component lifecycle
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    async function checkAuth() {
      try {
        const user = await fetchCurrentUser();
        if (user && !user.error) {
          setCurrentUser(user);
          // Sync locale from user preference
          if (user.locale) {
            useAppStore.getState().setLocale(user.locale);
          }
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      }
    }
    checkAuth();
  }, []);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-gray-500 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <AuthView />
        <CookieConsent />
      </>
    );
  }

  return (
    <>
      <AppLayout />
      <CookieConsent />
    </>
  );
}
