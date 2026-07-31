'use client';

import React, { useState, useEffect } from 'react';
import { useApi } from '@/lib/hooks/useApi';
import { Bell, X, Check, Archive, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  category: string;
  priority: string;
  isRead: boolean;
  isDismissed: boolean;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
}

export function NotificationHub() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { data: hubData, mutate } = useApi('/api/v1/notifications/hub');

  useEffect(() => {
    if (hubData) {
      setNotifications(hubData.filter((n: any) => !n.isDismissed));
    }
  }, [hubData]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const criticalCount = notifications.filter((n) => n.priority === 'critical' && !n.isRead).length;

  const handleMarkAsRead = async (notificationId: string) => {
    await fetch(`/api/v1/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
    mutate();
  };

  const handleDismiss = async (notificationId: string) => {
    await fetch(`/api/v1/notifications/${notificationId}/dismiss`, {
      method: 'PATCH',
    });
    mutate();
  };

  const handleArchive = async (notificationId: string) => {
    await fetch(`/api/v1/notifications/${notificationId}/archive`, {
      method: 'PATCH',
    });
    mutate();
  };

  const getIcon = (category: string) => {
    switch (category) {
      case 'assessment':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'behavior':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'communication':
        return <Bell className="w-4 h-4 text-purple-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-l-4 border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-4 border-l-orange-500 bg-orange-50';
      case 'normal':
        return 'border-l-4 border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-4 border-l-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className={`absolute top-0 right-0 flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white ${
            criticalCount > 0 ? 'bg-red-600' : 'bg-blue-600'
          }`}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No new notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition ${getPriorityColor(notification.priority)}`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      {getIcon(notification.category)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${notification.isRead ? 'text-gray-600' : 'text-gray-900 font-bold'}`}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>

                      <p className="text-xs text-gray-500 mt-2">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>

                      {notification.actionUrl && (
                        <a
                          href={notification.actionUrl}
                          className="inline-block text-xs text-blue-600 hover:text-blue-800 font-medium mt-2"
                        >
                          {notification.actionLabel || 'View'}
                        </a>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleArchive(notification.id)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Archive"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDismiss(notification.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* View All Link */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <a
                href="/notifications"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
