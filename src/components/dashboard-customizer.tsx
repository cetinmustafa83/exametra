import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WidgetContainer } from './widget-container';
import { WIDGET_TYPES, WIDGET_SIZES, getDefaultConfig } from '@/lib/widget-utils';
import { Plus, Edit2, Save } from 'lucide-react';

interface DashboardCustomizerProps {
  schoolId: string;
  userId: string;
  widgets: any[];
  onWidgetAdd: (widgetType: string) => void;
  onWidgetRemove: (widgetId: string) => void;
  onLayoutSave: () => void;
}

export function DashboardCustomizer({
  schoolId,
  userId,
  widgets,
  onWidgetAdd,
  onWidgetRemove,
  onLayoutSave,
}: DashboardCustomizerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showWidgetGallery, setShowWidgetGallery] = useState(false);

  const availableWidgets = Object.values(WIDGET_TYPES).filter(
    (type) => !widgets.some((w) => w.widgetType === type)
  );

  return (
    <>
      <div className="flex gap-2 mb-4">
        <Button
          onClick={() => setIsEditing(!isEditing)}
          variant={isEditing ? 'default' : 'outline'}
          size="sm"
          className="flex items-center gap-2"
        >
          <Edit2 className="h-4 w-4" />
          {isEditing ? 'Done Editing' : 'Customize'}
        </Button>

        {isEditing && (
          <>
            <Button
              onClick={() => setShowWidgetGallery(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Widget
            </Button>
            <Button onClick={onLayoutSave} size="sm" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Layout
            </Button>
          </>
        )}
      </div>

      {/* Widget Gallery Dialog */}
      <Dialog open={showWidgetGallery} onOpenChange={setShowWidgetGallery}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Widget</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {availableWidgets.map((type) => (
              <button
                key={type}
                onClick={() => {
                  onWidgetAdd(type);
                  setShowWidgetGallery(false);
                }}
                className="p-4 border rounded-lg hover:bg-gray-50 text-left"
              >
                <div className="font-semibold text-sm capitalize">
                  {type.replace(/_/g, ' ')}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Add this widget to your dashboard
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-4 gap-4 auto-rows-max">
        {widgets.map((widget) => (
          <WidgetContainer
            key={widget.id}
            id={widget.id}
            title={widget.title || widget.widgetType.replace(/_/g, ' ')}
            widgetType={widget.widgetType}
            size={widget.size as any}
            isEditing={isEditing}
            onRemove={() => onWidgetRemove(widget.id)}
          >
            <div className="text-sm text-gray-500 text-center py-8">
              {widget.widgetType} widget content
            </div>
          </WidgetContainer>
        ))}
      </div>
    </>
  );
}
