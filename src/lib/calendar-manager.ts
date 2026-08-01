/**
 * Unified Calendar Manager
 * Consolidates all calendar-related operations (events, exams, school events)
 * Eliminates duplication across 3 calendar implementations
 * Provides centralized API for calendar operations with drag-and-drop support
 */

import { format, parseISO, isBefore, isAfter, isSameDay } from 'date-fns';

export type CalendarEventType = 
  | 'exam' 
  | 'lesson' 
  | 'holiday' 
  | 'term' 
  | 'school_event' 
  | 'assignment' 
  | 'illness' 
  | 'custom';

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  description?: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  location?: string;
  attendees?: string[];
  recurring?: boolean;
  recurrencePattern?: string;
  color?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Links to other entities
  examId?: string;
  schoolEventId?: string;
  assignmentId?: string;
  classGroupId?: string;
}

export interface CalendarEventWithMeta extends CalendarEvent {
  isOverdue?: boolean;
  daysUntil?: number;
  category?: string;
}

export interface DragDropPayload {
  eventId: string;
  eventType: CalendarEventType;
  sourceDate: Date;
  targetDate: Date;
  startTime?: string;
}

export interface CalendarFilterOptions {
  types?: CalendarEventType[];
  startDate?: Date;
  endDate?: Date;
  classGroupId?: string;
  search?: string;
  showPast?: boolean;
}

/**
 * Centralized calendar utility functions
 * Used by all calendar implementations to ensure consistency
 */
export class CalendarManager {
  /**
   * Get all events for a date range
   * Consolidates events from exams, school events, and general calendar
   */
  static getEventsInRange(
    events: CalendarEvent[],
    startDate: Date,
    endDate: Date,
    filter?: CalendarFilterOptions
  ): CalendarEventWithMeta[] {
    return events
      .filter((event) => {
        const eventDate = event.date instanceof Date ? event.date : parseISO(event.date.toString());
        
        // Date range check
        if (isBefore(eventDate, startDate) || isAfter(eventDate, endDate)) {
          return false;
        }
        
        // Type filter
        if (filter?.types && !filter.types.includes(event.type)) {
          return false;
        }
        
        // Class group filter
        if (filter?.classGroupId && event.classGroupId !== filter.classGroupId) {
          return false;
        }
        
        // Search filter
        if (filter?.search) {
          const searchLower = filter.search.toLowerCase();
          return (
            event.title.toLowerCase().includes(searchLower) ||
            event.description?.toLowerCase().includes(searchLower)
          );
        }
        
        // Past events filter
        if (!filter?.showPast && isBefore(eventDate, new Date())) {
          return false;
        }
        
        return true;
      })
      .map((event) => {
        const eventDate = event.date instanceof Date ? event.date : parseISO(event.date.toString());
        const now = new Date();
        const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          ...event,
          isOverdue: isBefore(eventDate, now) && !isSameDay(eventDate, now),
          daysUntil,
          category: this.getCategoryForType(event.type),
        };
      })
      .sort((a, b) => {
        const aDate = a.date instanceof Date ? a.date : parseISO(a.date.toString());
        const bDate = b.date instanceof Date ? b.date : parseISO(b.date.toString());
        return aDate.getTime() - bDate.getTime();
      });
  }

  /**
   * Get events for a specific date
   */
  static getEventsForDate(events: CalendarEvent[], date: Date): CalendarEventWithMeta[] {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return this.getEventsInRange(events, startOfDay, endOfDay);
  }

  /**
   * Handle drag-and-drop of calendar events
   * Updates event date and notifies backend
   */
  static handleEventDrop(
    event: CalendarEvent,
    payload: DragDropPayload,
    onUpdate: (event: CalendarEvent) => Promise<void>
  ): Promise<CalendarEvent> {
    const updatedEvent: CalendarEvent = {
      ...event,
      date: payload.targetDate,
      startTime: payload.startTime || event.startTime,
      updatedAt: new Date(),
    };
    
    return onUpdate(updatedEvent).then(() => updatedEvent);
  }

  /**
   * Get color for event type
   * Ensures consistent coloring across all calendar views
   */
  static getColorForType(type: CalendarEventType): string {
    const colors: Record<CalendarEventType, string> = {
      exam: 'bg-red-100 text-red-800 border-red-300',
      lesson: 'bg-blue-100 text-blue-800 border-blue-300',
      holiday: 'bg-green-100 text-green-800 border-green-300',
      term: 'bg-purple-100 text-purple-800 border-purple-300',
      school_event: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      assignment: 'bg-orange-100 text-orange-800 border-orange-300',
      illness: 'bg-pink-100 text-pink-800 border-pink-300',
      custom: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return colors[type] || colors.custom;
  }

  /**
   * Get icon for event type
   */
  static getIconForType(type: CalendarEventType): string {
    const icons: Record<CalendarEventType, string> = {
      exam: '📝',
      lesson: '📚',
      holiday: '🎉',
      term: '📅',
      school_event: '🏫',
      assignment: '✏️',
      illness: '🤒',
      custom: '📌',
    };
    return icons[type] || '📌';
  }

  /**
   * Get category name for event type
   */
  static getCategoryForType(type: CalendarEventType): string {
    const categories: Record<CalendarEventType, string> = {
      exam: 'Exams',
      lesson: 'Lessons',
      holiday: 'Holidays',
      term: 'Terms',
      school_event: 'Events',
      assignment: 'Assignments',
      illness: 'Illness',
      custom: 'Other',
    };
    return categories[type] || 'Other';
  }

  /**
   * Check if event is all day or timed
   */
  static isAllDay(event: CalendarEvent): boolean {
    return event.allDay || !event.startTime || !event.endTime;
  }

  /**
   * Format event time range
   */
  static formatTimeRange(event: CalendarEvent, locale?: string): string {
    if (this.isAllDay(event)) {
      return 'All Day';
    }
    
    if (event.startTime && event.endTime) {
      return `${event.startTime} - ${event.endTime}`;
    }
    
    return event.startTime || 'TBD';
  }

  /**
   * Check for conflicts with other events
   */
  static hasConflict(
    event: CalendarEvent,
    otherEvents: CalendarEvent[]
  ): CalendarEvent | null {
    if (event.allDay) return null;
    
    return otherEvents.find((other) => {
      const eventDate = event.date instanceof Date ? event.date : parseISO(event.date.toString());
      const otherDate = other.date instanceof Date ? other.date : parseISO(other.date.toString());
      
      if (!isSameDay(eventDate, otherDate)) return false;
      if (other.allDay) return false;
      
      const eventStart = event.startTime || '';
      const eventEnd = event.endTime || '';
      const otherStart = other.startTime || '';
      const otherEnd = other.endTime || '';
      
      return (
        (eventStart < otherEnd && eventEnd > otherStart) ||
        (otherStart < eventEnd && otherEnd > eventStart)
      );
    }) || null;
  }

  /**
   * Get events that span multiple days (recurring or long events)
   */
  static getRecurringEvents(
    event: CalendarEvent,
    startDate: Date,
    endDate: Date
  ): CalendarEvent[] {
    if (!event.recurring || !event.recurrencePattern) {
      return [event];
    }
    
    // Implement recurrence logic based on pattern
    // This is a simplified version - expand as needed
    const events: CalendarEvent[] = [];
    let currentDate = new Date(event.date instanceof Date ? event.date : parseISO(event.date.toString()));
    
    while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
      if (isAfter(currentDate, startDate) || isSameDay(currentDate, startDate)) {
        events.push({
          ...event,
          date: new Date(currentDate),
          id: `${event.id}-${format(currentDate, 'yyyy-MM-dd')}`,
        });
      }
      
      // Move to next occurrence based on pattern
      currentDate.setDate(currentDate.getDate() + 7); // Default: weekly
    }
    
    return events;
  }

  /**
   * Merge events from multiple sources and deduplicate
   */
  static mergeEvents(
    examEvents: CalendarEvent[] = [],
    schoolEvents: CalendarEvent[] = [],
    generalEvents: CalendarEvent[] = []
  ): CalendarEvent[] {
    const allEvents = [...examEvents, ...schoolEvents, ...generalEvents];
    
    // Remove duplicates based on id
    const seen = new Set<string>();
    return allEvents.filter((event) => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    });
  }
}

export default CalendarManager;
