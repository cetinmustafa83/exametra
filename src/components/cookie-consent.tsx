'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Shield, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { t } from '@/lib/i18n';

const CONSENT_KEY = 'ct_cookie_consent';

interface CookieConsentData {
  essential: boolean;
  analytics: boolean;
  acceptedAt: string;
}

function getStoredConsent(): CookieConsentData | null {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return null;
}

function storeConsent(data: CookieConsentData): void {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function hasAnalyticsConsent(): boolean {
  const consent = getStoredConsent();
  return consent?.analytics === true;
}

export function hasCookieConsent(): boolean {
  return getStoredConsent() !== null;
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    // Check if consent already given
    const consent = getStoredConsent();
    if (!consent) {
      setVisible(true);
    } else {
      setAnalyticsEnabled(consent.analytics);
    }
  }, []);

  const handleAcceptAll = () => {
    storeConsent({
      essential: true,
      analytics: true,
      acceptedAt: new Date().toISOString(),
    });
    setAnalyticsEnabled(true);
    setVisible(false);
  };

  const handleRejectOptional = () => {
    storeConsent({
      essential: true,
      analytics: false,
      acceptedAt: new Date().toISOString(),
    });
    setAnalyticsEnabled(false);
    setVisible(false);
  };

  const handleSavePreferences = () => {
    storeConsent({
      essential: true,
      analytics: analyticsEnabled,
      acceptedAt: new Date().toISOString(),
    });
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
        >
          <div className="mx-auto max-w-3xl rounded-2xl bg-white dark:bg-gray-900 border border-emerald-200/50 dark:border-emerald-900/30 shadow-2xl shadow-emerald-200/20 dark:shadow-emerald-900/20 overflow-hidden">
            <div className="p-5 md:p-6">
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Cookie className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {t('dsgvo.cookie_settings')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t('dsgvo.cookie_consent')}
                  </p>
                </div>
              </div>

              {/* Cookie categories */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 mb-4">
                      {/* Essential cookies */}
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/30 dark:border-gray-700/20">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                          <Shield className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {t('dsgvo.cookie_essential')}
                            </Label>
                            <Checkbox
                              checked={true}
                              disabled
                              className="border-emerald-300 dark:border-emerald-700 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                            />
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('dsgvo.cookie_essential_desc')}
                          </p>
                        </div>
                      </div>

                      {/* Analytics cookies */}
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/30 dark:border-gray-700/20">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                          <BarChart3 className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {t('dsgvo.cookie_analytics')}
                            </Label>
                            <Checkbox
                              checked={analyticsEnabled}
                              onCheckedChange={(v) => setAnalyticsEnabled(v === true)}
                              className="border-amber-300 dark:border-amber-700 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                            />
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('dsgvo.cookie_analytics_desc')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Toggle details */}
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium mb-4 transition-colors min-h-[44px]"
              >
                {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showDetails ? t('action.close') : t('dsgvo.cookie_settings')}
              </button>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleAcceptAll}
                  className="flex-1 min-h-[44px] bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-md font-semibold"
                >
                  {t('dsgvo.cookie_accept')}
                </Button>
                <Button
                  onClick={handleRejectOptional}
                  variant="outline"
                  className="flex-1 min-h-[44px] rounded-xl border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-semibold"
                >
                  {t('dsgvo.cookie_reject')}
                </Button>
                {showDetails && (
                  <Button
                    onClick={handleSavePreferences}
                    variant="outline"
                    className="flex-1 min-h-[44px] rounded-xl border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-semibold"
                  >
                    {t('action.save')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
