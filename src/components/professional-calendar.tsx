'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  isSameDay,
  isSameMonth,
  isToday as isDateToday,
  parseISO,
  differenceInCalendarDays,
} from 'date-fns';
import { de as deLocale, enUS as enLocale } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  GripVertical,
  X,
  Clock,
  MapPin,
  Users,
  AlertCircle,
  Check,
  MoreVertical,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarManager, CalendarEvent, CalendarEventType } from '@/lib/calendar-manager';
import { useApi } from '@/lib/hooks/useApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProfessionalCalendarProps {
  initialEvents?: CalendarEvent[];
  onEventCreate?: (event: CalendarEvent) => Promise<void>;
  onEventUpdate?: (event: CalendarEvent) => Promise<void>;
  onEventDelete?: (eventId: string) => Promise<void>;
  variant?: 'month' | 'week' | 'day' | 'agenda';
  locale?: 'de' | 'en';
  className?: string;
}

export function ProfessionalCalendar({
  initialEvents = [],
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  variant = 'month',
  locale = 'de',
  className,
}: ProfessionalCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [view, setView] = useState<'month' | 'week' | 'day' | 'agenda'>(variant);
  const contextMenuRef = useRef<{ x: number; y: number } | null>(null);
  
  const dateLocale = locale === 'de' ? deLocale : enLocale;

  // Fetch events from backend
  const { data: backendEvents, isLoading } = useApi('/api/v1/calendar/events', {
    method: 'GET',
    params: {
      startDate: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(currentDate), 'yyyy-MM-dd'),
    },
    revalidateOnFocus: true,
  });

  useEffect(() => {
    if (backendEvents) {
      setEvents(backendEvents);
    }
  }, [backendEvents]);

  // Calculate calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = new Date(calendarStart);
  while (day <= calendarEnd) {
    days.push(new Date(day));
    day = addDays(day, 1);
  }

  // Get events for current month
  const monthEvents = useMemo(() => {
    return CalendarManager.getEventsInRange(events, monthStart, monthEnd, {
      showPast: true,
    });
  }, [events, monthStart, monthEnd]);

  // Get events for a specific date
  const getEventsForDate = useCallback((date: Date): CalendarEvent[] => {
    return CalendarManager.getEventsForDate(events, date);
  }, [events]);

  // Handle event creation
  const handleCreateEvent = useCallback(
    async (eventData: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
      try {
        const newEvent: CalendarEvent = {
          ...eventData,
          id: `event-${Date.now()}`,
          createdAt: new Date(),
        };

        setEvents((prev) => [...prev, newEvent]);
        if (onEventCreate) {
          await onEventCreate(newEvent);
        }
        toast.success('Event created successfully');
        setIsCreating(false);
      } catch (error) {
        toast.error('Failed to create event');
        console.error(error);
      }
    },
    [onEventCreate]
  );

  // Handle event update
  const handleUpdateEvent = useCallback(
    async (event: CalendarEvent) => {
      try {
        setEvents((prev) =>
          prev.map((e) => (e.id === event.id ? { ...event, updatedAt: new Date() } : e))
        );
        if (onEventUpdate) {
          await onEventUpdate(event);
        }
        toast.success('Event updated successfully');
      } catch (error) {
        toast.error('Failed to update event');
        console.error(error);
      }
    },
    [onEventUpdate]
  );

  // Handle event deletion
  const handleDeleteEvent = useCallback(
    async (eventId: string) => {
      try {
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
        if (onEventDelete) {
          await onEventDelete(eventId);
        }
        setSelectedEvent(null);
        toast.success('Event deleted successfully');
      } catch (error) {
        toast.error('Failed to delete event');
        console.error(error);
      }
    },
    [onEventDelete]
  );

  // Handle drag-and-drop
  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (!draggedEvent) return;

    const newEvent = {
      ...draggedEvent,
      date: targetDate,
      updatedAt: new Date(),
    };

    handleUpdateEvent(newEvent);
    setDraggedEvent(null);
    toast.success('Event moved successfully');
  };

  // Handle right-click context menu
  const handleContextMenu = (
    e: React.MouseEvent,
    event: CalendarEvent
  ) => {
    e.preventDefault();
    contextMenuRef.current = { x: e.clientX, y: e.clientY };
    setSelectedEvent(event);
  };

  // Render calendar cell
  const renderCalendarCell = (date: Date) => {
    const dateEvents = getEventsForDate(date);
    const isCurrentMonth = isSameMonth(date, currentDate);
    const isToday = isDateToday(date);

    return (
      <motion.div
        key={format(date, 'yyyy-MM-dd')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, date)}
        className={cn(
          'min-h-24 p-2 border rounded-lg transition-colors',
          isCurrentMonth ? 'bg-background' : 'bg-muted/30',
          isToday && 'ring-2 ring-primary border-primary',
          'hover:bg-accent/50 cursor-pointer'
        )}
      >
        {/* Date header */}
        <div className={cn(
          'text-xs font-semibold mb-1',
          isCurrentMonth ? 'text-foreground' : 'text-muted-foreground',
          isToday && 'text-primary'
        )}>
          {format(date, 'd')}
        </div>

        {/* Events */}
        <div className="space-y-1">
          {dateEvents.slice(0, 2).map((event) => (
            <motion.div
              key={event.id}
              draggable
              onDragStart={(e) => handleDragStart(e, event)}
              onContextMenu={(e) => handleContextMenu(e, event)}
              onClick={() => setSelectedEvent(event)}
              className={cn(
                'text-xs p-1 rounded cursor-grab active:cursor-grabbing',
                'truncate hover:opacity-80 transition-opacity',
                CalendarManager.getColorForType(event.type)
              )}
              whileHover={{ scale: 1.05 }}
              whileDrag={{ scale: 1.1, opacity: 0.7 }}
            >
              <div className="flex items-center gap-1">
                <span>{CalendarManager.getIconForType(event.type)}</span>
                <span className="truncate">{event.title}</span>
              </div>
            </motion.div>
          ))}
          {dateEvents.length > 2 && (
            <div className="text-xs text-muted-foreground pl-1">
              +{dateEvents.length - 2} more
            </div>
          )}
        </div>

        {/* Add event button */}
        <Button
          size="sm"
          variant="ghost"
          className="mt-1 h-6 w-full text-xs opacity-0 hover:opacity-100"
          onClick={() => {
            setIsCreating(true);
          }}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </motion.div>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(addMonths(currentDate, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-40">
            {format(currentDate, 'MMMM yyyy', { locale: dateLocale })}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
        </div>

        {/* View tabs */}
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          onClick={() => setIsCreating(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Event
        </Button>
      </div>

      {/* Calendar grid */}
      {view === 'month' && (
        <div className="border rounded-lg overflow-hidden bg-card">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 bg-muted">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-3 text-sm font-semibold text-center">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-px bg-border">
            {days.map((day) => (
              <div key={format(day, 'yyyy-MM-dd')} className="bg-background">
                {renderCalendarCell(day)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agenda view */}
      {view === 'agenda' && (
        <div className="space-y-2">
          {monthEvents.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => setSelectedEvent(event)}
              onContextMenu={(e) => handleContextMenu(e, event)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{CalendarManager.getIconForType(event.type)}</span>
                    <h3 className="font-semibold">{event.title}</h3>
                    <Badge variant="secondary">{event.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(event.date, 'PPP', { locale: dateLocale })} at {CalendarManager.formatTimeRange(event)}
                  </p>
                  {event.description && (
                    <p className="text-sm mt-2">{event.description}</p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setSelectedEvent(event)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleDeleteEvent(event.id)}>
                      <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Event detail dialog */}
      <AnimatePresence>
        {selectedEvent && (
          <EventDetailDialog
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onUpdate={handleUpdateEvent}
            onDelete={handleDeleteEvent}
          />
        )}
      </AnimatePresence>

      {/* Create/Edit event dialog */}
      {isCreating && (
        <EventCreatorDialog
          onClose={() => setIsCreating(false)}
          onCreate={handleCreateEvent}
        />
      )}
    </div>
  );
}

// Event Detail Dialog Component
function EventDetailDialog({
  event,
  onClose,
  onUpdate,
  onDelete,
}: {
  event: CalendarEvent;
  onClose: () => void;
  onUpdate: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{CalendarManager.getIconForType(event.type)}</span>
            {event.title}
          </DialogTitle>
          <Badge className="w-fit">{event.type}</Badge>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Date & Time</Label>
            <p className="text-sm">
              {format(event.date, 'PPP')} at {CalendarManager.formatTimeRange(event)}
            </p>
          </div>

          {event.location && (
            <div className="flex gap-2 items-start">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <Label className="text-xs text-muted-foreground">Location</Label>
                <p className="text-sm">{event.location}</p>
              </div>
            </div>
          )}

          {event.description && (
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <p className="text-sm">{event.description}</p>
            </div>
          )}

          {event.attendees && event.attendees.length > 0 && (
            <div className="flex gap-2 items-start">
              <Users className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <Label className="text-xs text-muted-foreground">Attendees</Label>
                <p className="text-sm">{event.attendees.join(', ')}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onDelete(event.id);
              onClose();
            }}
            className="text-red-500 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Event Creator Dialog Component
function EventCreatorDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'custom' as CalendarEventType,
    date: new Date(),
    startTime: '09:00',
    endTime: '10:00',
    description: '',
    location: '',
    allDay: false,
  });

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    await onCreate({
      ...formData,
      date: formData.date,
      allDay: formData.allDay,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Event title"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as CalendarEventType })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="exam">Exam</option>
                <option value="lesson">Lesson</option>
                <option value="assignment">Assignment</option>
                <option value="school_event">School Event</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={format(formData.date, 'yyyy-MM-dd')}
                onChange={(e) => setFormData({ ...formData, date: parseISO(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.allDay}
                onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
              />
              All day event
            </Label>
          </div>

          {!formData.allDay && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Event location"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Event description"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Event</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ProfessionalCalendar;
