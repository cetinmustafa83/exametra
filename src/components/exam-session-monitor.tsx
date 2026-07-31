'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ExamSession, ExamEvent } from '@prisma/client';
import {
  getExamTimeRemaining,
  formatTimeRemaining,
  shouldShowTimeWarning,
  calculateSecurityMetrics,
  DEFAULT_EXAM_CONFIG,
} from '@/lib/exam-utils';
import { AlertCircle, Clock, Eye, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ExamSessionMonitorProps {
  examSession: ExamSession & { events: ExamEvent[] };
  durationMinutes: number;
  onTimeWarning?: (minutesRemaining: number) => void;
  onSuspiciousActivity?: (event: ExamEvent) => void;
}

export function ExamSessionMonitor({
  examSession,
  durationMinutes,
  onTimeWarning,
  onSuspiciousActivity,
}: ExamSessionMonitorProps) {
  const [timeRemaining, setTimeRemaining] = useState(
    getExamTimeRemaining(examSession.startTime, durationMinutes)
  );
  const [securityMetrics, setSecurityMetrics] = useState(
    calculateSecurityMetrics(examSession.events)
  );
  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Update time remaining every second
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const remaining = getExamTimeRemaining(examSession.startTime, durationMinutes);
      setTimeRemaining(remaining);

      // Check for time warnings
      if (shouldShowTimeWarning(remaining, DEFAULT_EXAM_CONFIG.timeWarnings)) {
        setIsWarningVisible(true);
        onTimeWarning?.(remaining);
        setTimeout(() => setIsWarningVisible(false), 3000);
      }

      // Auto-submit if time's up
      if (remaining === 0) {
        handleTimeExpired();
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examSession.startTime, durationMinutes, onTimeWarning]);

  // Update security metrics when events change
  useEffect(() => {
    const metrics = calculateSecurityMetrics(examSession.events);
    setSecurityMetrics(metrics);
  }, [examSession.events]);

  const handleTimeExpired = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    // Trigger form submission via event
    window.dispatchEvent(new CustomEvent('exam-time-expired'));
  }, []);

  const getRiskColor = (score: number): string => {
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const getTimeColor = (minutes: number): string => {
    if (minutes <= 1) return 'text-red-600 font-bold';
    if (minutes <= 5) return 'text-orange-600 font-semibold';
    return 'text-gray-700';
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Time Remaining */}
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            <span className={`text-lg font-mono ${getTimeColor(timeRemaining)}`}>
              {formatTimeRemaining(timeRemaining)}
            </span>
          </div>

          {/* Security Status */}
          {examSession.lockdownEnabled && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Eye className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Exam Mode Active</span>
              </div>

              {securityMetrics.riskScore > 0 && (
                <div className={`flex items-center gap-1 text-sm ${getRiskColor(securityMetrics.riskScore)}`}>
                  <AlertTriangle className="w-4 h-4" />
                  <span>Risk: {securityMetrics.riskScore}%</span>
                </div>
              )}
            </div>
          )}

          {/* Event Count */}
          <div className="text-sm text-gray-600">
            Events: {examSession.events.length}
          </div>
        </div>

        {/* Time Warning Alert */}
        {isWarningVisible && timeRemaining <= 5 && (
          <Alert className="mt-2 border-orange-300 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              {timeRemaining === 0
                ? 'Time has expired. Your exam will be submitted automatically.'
                : `${timeRemaining} minute${timeRemaining !== 1 ? 's' : ''} remaining. Make sure to submit your answers.`}
            </AlertDescription>
          </Alert>
        )}

        {/* Suspicious Activity Alert */}
        {securityMetrics.suspiciousEvents > 0 && (
          <Alert className="mt-2 border-red-300 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Unusual activity detected ({securityMetrics.suspiciousEvents} event
              {securityMetrics.suspiciousEvents !== 1 ? 's' : ''}). This will be reviewed by your instructor.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
