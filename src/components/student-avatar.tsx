'use client';

import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ─── Name-based color hash ─────────────────────────────────────────
const avatarGradients = [
  'from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 text-emerald-700 dark:text-emerald-300 ring-emerald-200/50 dark:ring-emerald-900/30',
  'from-teal-100 to-emerald-100 dark:from-teal-900/40 dark:to-emerald-900/40 text-teal-700 dark:text-teal-300 ring-teal-200/50 dark:ring-teal-900/30',
  'from-amber-100 to-rose-100 dark:from-amber-900/40 dark:to-rose-900/40 text-amber-700 dark:text-amber-300 ring-amber-200/50 dark:ring-amber-900/30',
  'from-violet-100 to-rose-100 dark:from-violet-900/40 dark:to-rose-900/40 text-violet-700 dark:text-violet-300 ring-violet-200/50 dark:ring-violet-900/30',
  'from-rose-100 to-amber-100 dark:from-rose-900/40 dark:to-amber-900/40 text-rose-700 dark:text-rose-300 ring-rose-200/50 dark:ring-rose-900/30',
  'from-cyan-100 to-teal-100 dark:from-cyan-900/40 dark:to-teal-900/40 text-cyan-700 dark:text-cyan-300 ring-cyan-200/50 dark:ring-cyan-900/30',
  'from-pink-100 to-rose-100 dark:from-pink-900/40 dark:to-rose-900/40 text-pink-700 dark:text-pink-300 ring-pink-200/50 dark:ring-pink-900/30',
  'from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40 text-orange-700 dark:text-orange-300 ring-orange-200/50 dark:ring-orange-900/30',
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getAvatarGradient(firstName: string, lastName: string): string {
  const hash = hashString(`${firstName} ${lastName}`);
  return avatarGradients[hash % avatarGradients.length];
}

function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return first + last;
}

interface StudentAvatarProps {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showTooltip?: boolean;
  onClick?: () => void;
  className?: string;
}

const sizeClasses: Record<string, string> = {
  xs: 'w-6 h-6 text-[8px]',
  sm: 'w-8 h-8 text-[10px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-14 h-14 text-sm',
  xl: 'w-20 h-20 text-base',
};

export default function StudentAvatar({
  firstName,
  lastName,
  avatarUrl,
  size = 'md',
  showTooltip = false,
  onClick,
  className = '',
}: StudentAvatarProps) {
  const gradient = getAvatarGradient(firstName, lastName);
  const initials = getInitials(firstName, lastName);
  const sizeClass = sizeClasses[size];

  const avatarContent = avatarUrl ? (
    <div
      className={`avatar-photo ${sizeClass} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <img src={avatarUrl} alt={`${firstName} ${lastName}`} className="rounded-full" />
    </div>
  ) : (
    <div
      className={`avatar-circle bg-gradient-to-br ${gradient} ring-2 ${sizeClass} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      aria-label={`${firstName} ${lastName}`}
    >
      {initials}
    </div>
  );

  if (showTooltip) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            {avatarContent}
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {firstName} {lastName}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return avatarContent;
}

// Export helper for getting initials without the component
export { getInitials, getAvatarGradient, hashString };
