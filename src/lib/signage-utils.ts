/**
 * Signage utilities for emergency alerting system
 */

export type MessageType = 'emergency' | 'notification' | 'schedule' | 'announcement' | 'alert';
export type Priority = 'low' | 'normal' | 'high' | 'critical';

export interface SignageMessageData {
  title: string;
  content: string;
  messageType: MessageType;
  priority: Priority;
  displayDuration?: number;
  soundAlert?: boolean;
  backgroundColor?: string;
  textColor?: string;
  soundFile?: string;
}

/**
 * Get priority color for UI
 */
export const getPriorityColor = (priority: Priority): string => {
  const colors: Record<Priority, string> = {
    low: '#10b981', // green
    normal: '#3b82f6', // blue
    high: '#f59e0b', // amber
    critical: '#ef4444', // red
  };
  return colors[priority] || colors.normal;
};

/**
 * Get message type icon
 */
export const getMessageTypeIcon = (type: MessageType): string => {
  const icons: Record<MessageType, string> = {
    emergency: '🚨',
    notification: '📢',
    schedule: '📅',
    announcement: '📣',
    alert: '⚠️',
  };
  return icons[type] || '📢';
};

/**
 * Format time display
 */
export const formatDisplayTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
};

/**
 * Check if message is active
 */
export const isMessageActive = (message: {
  startTime?: Date;
  endTime?: Date;
}): boolean => {
  const now = new Date();
  if (message.startTime && now < message.startTime) return false;
  if (message.endTime && now > message.endTime) return false;
  return true;
};

/**
 * Get contrast color for text (black or white based on background)
 */
export const getContrastColor = (hexColor?: string): string => {
  if (!hexColor) return '#000000';

  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

/**
 * Validate signage message
 */
export const validateSignageMessage = (message: Partial<SignageMessageData>): string[] => {
  const errors: string[] = [];

  if (!message.title || message.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (!message.content || message.content.trim().length === 0) {
    errors.push('Content is required');
  }

  if (!message.messageType) {
    errors.push('Message type is required');
  }

  if (!message.priority) {
    errors.push('Priority is required');
  }

  if (message.displayDuration && message.displayDuration < 1) {
    errors.push('Display duration must be at least 1 second');
  }

  return errors;
};

/**
 * Generate emergency notification for school
 */
export const createEmergencyMessage = (
  incident: string,
  location: string,
  additionalInfo?: string
): SignageMessageData => {
  return {
    title: 'NOTFALL MELDUNG',
    content: `${incident}\nOrt: ${location}${additionalInfo ? '\n' + additionalInfo : ''}`,
    messageType: 'emergency',
    priority: 'critical',
    displayDuration: 30,
    soundAlert: true,
    backgroundColor: '#ef4444', // red
    textColor: '#ffffff', // white
  };
};

/**
 * Get next active message based on schedule
 */
export const getNextScheduledMessage = (
  messages: Array<{
    id: string;
    displayOrder: number;
    startTime?: Date;
    endTime?: Date;
  }>
): string | null => {
  const activeMessages = messages
    .filter((m) => isMessageActive(m))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return activeMessages.length > 0 ? activeMessages[0].id : null;
};
