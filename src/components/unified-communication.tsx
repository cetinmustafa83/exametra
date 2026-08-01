'use client';

import React, { ReactNode } from 'react';
import { useAppStore } from '@/lib/store';
import CommunicationView from './communication-view';
import ParentCommunicationView from './parent-communication-view';

interface UnifiedCommunicationProps {
  variant?: 'auto' | 'teacher' | 'parent' | 'student';
  className?: string;
}

/**
 * Unified Communication Component
 * Consolidates teacher, parent, and student communication views.
 * Automatically selects the correct view based on user role.
 */
export function UnifiedCommunication({ 
  variant = 'auto',
  className 
}: UnifiedCommunicationProps) {
  const currentUser = useAppStore((s) => s.currentUser);
  
  // Determine which view to show
  const getView = (): ReactNode => {
    // Override variant takes precedence
    if (variant === 'teacher') {
      return <CommunicationView />;
    }
    if (variant === 'parent') {
      return <ParentCommunicationView />;
    }
    if (variant === 'student') {
      return <CommunicationView />;
    }
    
    // Auto-detect based on role
    switch (currentUser?.role) {
      case 'TEACHER':
      case 'SCHOOL_ADMIN':
        return <CommunicationView />;
      case 'PARENT':
        return <ParentCommunicationView />;
      case 'STUDENT':
        return <CommunicationView />;
      default:
        return <CommunicationView />;
    }
  };
  
  return (
    <div className={className}>
      {getView()}
    </div>
  );
}

export default UnifiedCommunication;
