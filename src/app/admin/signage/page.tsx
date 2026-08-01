'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/data-table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useApiGet, useApiMutation } from '@/lib/hooks/useApi';
import { getPriorityColor, getMessageTypeIcon, formatDisplayTime } from '@/lib/signage-utils';
import { AlertCircle, Tv, Plus } from 'lucide-react';

export default function SignageAdminPage() {
  // Get schoolId from URL params or context
  const [schoolId, setSchoolId] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    // Get schoolId from session or localStorage
    const storedSchoolId = typeof window !== 'undefined' ? localStorage.getItem('schoolId') : null;
    setSchoolId(storedSchoolId);
  }, []);

  const [showNewMessage, setShowNewMessage] = useState(false);
  const [selectedSignage, setSelectedSignage] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Fetch all signages
  const { data: signages, mutate: refetchSignages } = useApiGet(
    schoolId ? `/api/v1/signage?schoolId=${schoolId}` : null
  );

  // Fetch messages for selected signage
  const { data: messages, mutate: refetchMessages } = useApiGet(
    selectedSignage && schoolId
      ? `/api/v1/signage/${selectedSignage}/messages`
      : null
  );

  const { mutate: createMessage, isLoading: isCreating } = useApiMutation(
    `/api/v1/signage/${selectedSignage}/messages`,
    {
      method: 'POST',
      onSuccess: () => {
        setShowNewMessage(false);
        refetchMessages();
      },
    }
  );

  const { mutate: deleteMessage, isLoading: isDeleting } = useApiMutation(
    `/api/v1/signage/messages/delete`,
    {
      method: 'DELETE',
      onSuccess: () => {
        setShowConfirm(false);
        refetchMessages();
      },
    }
  );

  const handleCreateMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const message = {
      title: formData.get('title'),
      content: formData.get('content'),
      messageType: formData.get('messageType'),
      priority: formData.get('priority'),
      displayDuration: parseInt(formData.get('displayDuration') as string) || 10,
      soundAlert: formData.get('soundAlert') === 'on',
    };

    await createMessage(message);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Emergency Signage</h1>
          <p className="text-gray-600 mt-1">Manage displays, messages, and emergency alerts</p>
        </div>
        <Button onClick={() => setShowNewMessage(true)} size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          New Message
        </Button>
      </div>

      <Tabs defaultValue="displays" className="w-full">
        <TabsList>
          <TabsTrigger value="displays">Displays</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        {/* Displays Tab */}
        <TabsContent value="displays" className="space-y-4">
          {signages && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {signages.map((signage: any) => (
                <Card
                  key={signage.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedSignage(signage.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{signage.displayName}</CardTitle>
                        <CardDescription>{signage.location}</CardDescription>
                      </div>
                      <Tv className="h-5 w-5 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">Status</p>
                        <p className={signage.isActive ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {signage.isActive ? 'Online' : 'Offline'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Type</p>
                        <p className="text-gray-900 font-medium">{signage.signageType}</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => setSelectedSignage(signage.id)}
                      >
                        Manage
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          {selectedSignage ? (
            <>
              {messages && (
                <DataTable
                  columns={[
                    {
                      key: 'title' as any,
                      label: 'Title',
                      render: (_, row) => (
                        <div className="flex items-center gap-2">
                          <span>{getMessageTypeIcon(row.messageType)}</span>
                          <span>{row.title}</span>
                        </div>
                      ),
                    },
                    {
                      key: 'priority' as any,
                      label: 'Priority',
                      render: (_, row) => (
                        <span
                          className="px-3 py-1 rounded-full text-sm font-medium text-white"
                          style={{ backgroundColor: getPriorityColor(row.priority) }}
                        >
                          {row.priority.toUpperCase()}
                        </span>
                      ),
                    },
                    {
                      key: 'displayDuration' as any,
                      label: 'Duration',
                      render: (_, row) => formatDisplayTime(row.displayDuration || 10),
                    },
                    {
                      key: 'soundAlert' as any,
                      label: 'Sound',
                      render: (_, row) => (
                        <span className={row.soundAlert ? 'text-amber-600' : 'text-gray-400'}>
                          {row.soundAlert ? '🔊' : '🔇'}
                        </span>
                      ),
                    },
                  ]}
                  data={messages}
                  actions={[
                    {
                      label: 'Send Now',
                      onClick: (row) => console.log('Send', row.id),
                    },
                    {
                      label: 'Edit',
                      onClick: (row) => console.log('Edit', row.id),
                    },
                    {
                      label: 'Delete',
                      onClick: (row) => {
                        setShowConfirm(true);
                      },
                      variant: 'destructive',
                    },
                  ]}
                />
              )}
            </>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a display to manage messages</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Recent signage events and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                Activity log feature coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Message Dialog */}
      {showNewMessage && selectedSignage && (
        <Card className="fixed inset-4 z-50 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md max-h-[90vh] overflow-y-auto">
          <CardHeader>
            <CardTitle>New Message</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateMessage} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Message title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="content">Content</Label>
                <textarea
                  id="content"
                  name="content"
                  placeholder="Message content"
                  className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <Label htmlFor="messageType">Type</Label>
                <select
                  id="messageType"
                  name="messageType"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="announcement">Announcement</option>
                  <option value="alert">Alert</option>
                  <option value="emergency">Emergency</option>
                  <option value="notification">Notification</option>
                </select>
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  name="priority"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <Label htmlFor="displayDuration">Display Duration (seconds)</Label>
                <Input
                  id="displayDuration"
                  name="displayDuration"
                  type="number"
                  defaultValue="10"
                  min="1"
                  max="300"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="soundAlert"
                  name="soundAlert"
                  type="checkbox"
                  className="rounded"
                />
                <Label htmlFor="soundAlert" className="mb-0">Play sound alert</Label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewMessage(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating} className="flex-1">
                  {isCreating ? 'Creating...' : 'Create Message'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={showConfirm}
        title="Delete Message"
        description="This action cannot be undone."
        onConfirm={async () => {
          // Delete logic
          setShowConfirm(false);
        }}
        onCancel={() => setShowConfirm(false)}
        variant="destructive"
      />
    </div>
  );
}
