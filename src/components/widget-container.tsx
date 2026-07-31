import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreVertical, X, RotateCw } from 'lucide-react';
import { needsRefresh, updateWidgetCache } from '@/lib/widget-utils';

interface WidgetContainerProps {
  id: string;
  title: string;
  widgetType: string;
  size: 'small' | 'medium' | 'large' | 'full_width';
  isEditing: boolean;
  onRemove: () => void;
  onRefresh?: () => Promise<void>;
  refreshInterval?: number;
  lastRefresh?: Date | null;
  children: React.ReactNode;
}

export function WidgetContainer({
  id,
  title,
  size,
  isEditing,
  onRemove,
  onRefresh,
  refreshInterval = 300,
  lastRefresh,
  children,
}: WidgetContainerProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-2',
    large: 'col-span-3',
    full_width: 'col-span-full',
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error('[v0] Widget refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card className={`${sizeClasses[size]} h-full shadow-sm hover:shadow-md transition-shadow`}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {isEditing && (
          <div className="flex gap-1">
            {onRefresh && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-6 w-6 p-0"
              >
                <RotateCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onRemove}
              className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="pb-4">{children}</CardContent>
    </Card>
  );
}
