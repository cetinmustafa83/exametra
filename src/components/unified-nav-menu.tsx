// @ts-nocheck
'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getNavItemsForRole, NavGroup, NavItem } from '@/lib/navigation-config';
import { cn } from '@/lib/utils';

interface UnifiedNavMenuProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  itemClassName?: string;
  activeItemClassName?: string;
}

/**
 * Unified Navigation Menu Component
 * Single component replacing all navigation implementations
 * Automatically filters items based on user role and compliance status
 */
export function UnifiedNavMenu({
  orientation = 'vertical',
  className,
  itemClassName,
  activeItemClassName,
}: UnifiedNavMenuProps) {
  const currentUser = useAppStore((s) => s.currentUser);
  const pathname = usePathname();
  const complianceStatus = useAppStore((s) => s.complianceStatus);
  
  const navGroups = useMemo(() => {
    const groups = getNavItemsForRole(currentUser?.role);
    
    // Filter items based on role and compliance approval
    return groups.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        // Check role authorization
        if (!item.roles.includes(currentUser?.role || '')) {
          return false;
        }
        
        // Check compliance approval (Module L)
        if (item.requiresApproval && !complianceStatus?.onboardingCompleted) {
          return false;
        }
        
        // Check module gates (Module L)
        if (item.id === 'wellness' && !complianceStatus?.moduleGates?.['WELLNESS_CHECKS']?.isApprovedForUse) {
          return false;
        }
        if (item.id === 'exam-proctoring' && !complianceStatus?.moduleGates?.['EXAM_MODE']?.isApprovedForUse) {
          return false;
        }
        if (item.id === 'signage' && !complianceStatus?.moduleGates?.['SIGNAGE']?.isApprovedForUse) {
          return false;
        }
        
        return true;
      }),
    })).filter((group) => group.items.length > 0);
  }, [currentUser?.role, complianceStatus]);
  
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  
  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    
    return (
      <motion.div
        key={item.id}
        whileHover={{ x: orientation === 'horizontal' ? 0 : 4 }}
        transition={{ duration: 0.2 }}
      >
        <Link
          href={item.href}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
            'hover:bg-accent/50',
            active && 'bg-accent text-accent-foreground font-medium',
            !active && 'text-muted-foreground',
            itemClassName
          )}
          title={item.description}
        >
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 text-sm">{item.label}</span>
          {item.badge && (
            <span className="ml-auto inline-flex items-center justify-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
              {item.badge}
            </span>
          )}
        </Link>
      </motion.div>
    );
  };
  
  return (
    <nav
      className={cn(
        'flex flex-col gap-1',
        orientation === 'horizontal' && 'flex-row gap-0',
        className
      )}
    >
      {navGroups.map((group) => (
        <div key={group.id} className={cn(orientation === 'horizontal' && 'flex gap-1')}>
          {orientation === 'vertical' && (
            <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {group.title}
            </h3>
          )}
          <div className={cn(orientation === 'horizontal' && 'flex gap-1')}>
            {group.items.map((item) => renderItem(item))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default UnifiedNavMenu;
