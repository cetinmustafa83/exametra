'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Plus,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  Paperclip,
  Mic,
  MicOff,
  StickyNote,
  FileText,
  User,
  Shield,
  Eye,
  X,
  MessageCircle,
  ChevronRight,
  AlertTriangle,
  Volume2,
  Notebook,
  Upload,
  Play,
  Pause,
  Trash2,
  Save,
  File,
  Image,
  FileIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { toast } from 'sonner';

interface CommunicationRoom {
  id: string;
  schoolId: string;
  studentId: string;
  teacherId: string;
  roomType: string;
  status: string;
  requestedBy: string;
  acceptedAt: string | null;
  closedAt: string | null;
  closeReason: string | null;
  createdAt: string;
  updatedAt: string;
  student?: { id: string; firstName: string; lastName: string };
  teacher?: { id: string; firstName: string; lastName: string };
  messages?: Array<{
    id: string;
    content: string;
    messageType: string;
    createdAt: string;
    senderId: string;
  }>;
}

interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  messageType: string;
  fileUrl: string | null;
  metadata: string | null;
  isRead: boolean;
  createdAt: string;
  sender?: { id: string; firstName: string; lastName: string; role: string };
}

interface NotebookItem {
  id: string;
  title: string;
  color: string;
  notebookType: string;
  pages?: Array<{ id: string; title: string | null; pageNumber: number }>;
}

interface TeacherNoteItem {
  id: string;
  content: string;
  createdAt: string;
}

export default function CommunicationView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [rooms, setRooms] = useState<CommunicationRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      const data = await apiGet<CommunicationRoom[]>('/api/communication-rooms');
      setRooms(data);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  const role = currentUser?.role;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const requestedRooms = rooms.filter((r) => r.status === 'requested');
  const activeRooms = rooms.filter((r) => r.status === 'active');
  const closedRooms = rooms.filter((r) => r.status === 'closed');

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-4rem)] flex flex-col max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-emerald-500" />
            {t('communication.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {role === 'STUDENT' && t('communication.active_conversations')}
            {role === 'TEACHER' && t('communication.incoming_requests')}
            {(role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL') && t('communication.all_rooms')}
          </p>
        </div>
        {role === 'STUDENT' && (
          <Button
            onClick={() => setShowRequestDialog(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('communication.request_conversation')}
          </Button>
        )}
      </motion.div>

      {/* Main Layout: Room List + Chat */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Room List */}
        <div className="w-full md:w-80 shrink-0 flex flex-col gap-4">
          {/* Pending Requests (Teacher) */}
          {role === 'TEACHER' && requestedRooms.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  {t('communication.pending_requests')} ({requestedRooms.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <div className="space-y-1">
                  {requestedRooms.map((room) => (
                    <RoomListItem
                      key={room.id}
                      room={room}
                      isSelected={selectedRoomId === room.id}
                      onClick={() => setSelectedRoomId(room.id)}
                      currentUserId={currentUser?.id || ''}
                      role={role}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Rooms */}
          <Card className="flex-1 min-h-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-emerald-500" />
                {t('communication.active_conversations')} ({activeRooms.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0 overflow-y-auto max-h-96">
              {activeRooms.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t('communication.no_conversations')}</p>
              ) : (
                <div className="space-y-1">
                  {activeRooms.map((room) => (
                    <RoomListItem
                      key={room.id}
                      room={room}
                      isSelected={selectedRoomId === room.id}
                      onClick={() => setSelectedRoomId(room.id)}
                      currentUserId={currentUser?.id || ''}
                      role={role}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Closed Rooms */}
          {closedRooms.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                  {t('communication.closed')} ({closedRooms.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0 overflow-y-auto max-h-32">
                <div className="space-y-1">
                  {closedRooms.map((room) => (
                    <RoomListItem
                      key={room.id}
                      room={room}
                      isSelected={selectedRoomId === room.id}
                      onClick={() => setSelectedRoomId(room.id)}
                      currentUserId={currentUser?.id || ''}
                      role={role}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Chat Area */}
        <div className="hidden md:flex flex-1 min-h-0">
          {selectedRoomId ? (
            <ChatArea
              roomId={selectedRoomId}
              currentUserId={currentUser?.id || ''}
              role={role}
              onRefresh={fetchRooms}
            />
          ) : (
            <Card className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">{t('communication.select_conversation')}</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Mobile: Show chat as full-screen overlay */}
      <AnimatePresence>
        {selectedRoomId && (
          <div className="md:hidden fixed inset-0 z-50 bg-background">
            <ChatArea
              roomId={selectedRoomId}
              currentUserId={currentUser?.id || ''}
              role={role}
              onRefresh={fetchRooms}
              isMobile
              onClose={() => setSelectedRoomId(null)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Request Dialog */}
      <RequestConversationDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        onCreated={fetchRooms}
      />
    </div>
  );
}

function RoomListItem({
  room,
  isSelected,
  onClick,
  currentUserId,
  role,
}: {
  room: CommunicationRoom;
  isSelected: boolean;
  onClick: () => void;
  currentUserId: string;
  role: string | undefined;
}) {
  const isStudent = room.studentId === currentUserId;
  const otherPerson = isStudent ? room.teacher : room.student;
  const lastMessage = room.messages?.[0];

  const getStatusColor = () => {
    switch (room.status) {
      case 'requested': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300';
      case 'active': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300';
      case 'closed': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      default: return '';
    }
  };

  const getStatusLabel = () => {
    switch (room.status) {
      case 'requested': return t('communication.requested');
      case 'active': return t('communication.active');
      case 'closed': return t('communication.closed');
      default: return room.status;
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-colors ${
        isSelected
          ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
          : 'hover:bg-muted/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative shrink-0">
            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
              <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900 ${
              room.status === 'active' ? 'bg-emerald-500' : room.status === 'requested' ? 'bg-amber-500' : 'bg-gray-400'
            }`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {otherPerson ? `${otherPerson.firstName} ${otherPerson.lastName}` : 'Unknown'}
            </p>
            {lastMessage && (
              <p className="text-xs text-muted-foreground truncate">{lastMessage.content}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {room.messages && room.messages.length > 0 && room.status === 'active' && (
            <span className="flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
              {room.messages.length}
            </span>
          )}
          <Badge variant="secondary" className={`text-xs shrink-0 ${getStatusColor()}`}>
            {getStatusLabel()}
          </Badge>
        </div>
      </div>
    </motion.button>
  );
}

function ChatArea({
  roomId,
  currentUserId,
  role,
  onRefresh,
  isMobile,
  onClose,
}: {
  roomId: string;
  currentUserId: string;
  role: string | undefined;
  onRefresh: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [room, setRoom] = useState<CommunicationRoom | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showTeacherNotes, setShowTeacherNotes] = useState(false);
  const [teacherNotes, setTeacherNotes] = useState<TeacherNoteItem[]>([]);
  const [newTeacherNote, setNewTeacherNote] = useState('');
  const [showShareNotesDialog, setShowShareNotesDialog] = useState(false);
  const [notebooks, setNotebooks] = useState<NotebookItem[]>([]);
  const [isSharingNote, setIsSharingNote] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await apiGet<{ messages: Message[]; total: number }>(`/api/communication-rooms/${roomId}/messages`);
      setMessages(data.messages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [roomId]);

  const fetchRoom = useCallback(async () => {
    try {
      const data = await apiGet<CommunicationRoom>(`/api/communication-rooms/${roomId}`);
      setRoom(data);
    } catch (error) {
      console.error('Failed to fetch room:', error);
    }
  }, [roomId]);

  const fetchTeacherNotes = useCallback(async () => {
    if (role !== 'TEACHER') return;
    try {
      const data = await apiGet<{ sharedNotes: Array<{ id: string; content: string; createdAt: string; metadata: string | null }> }>(`/api/communication-rooms/${roomId}/share-notes`);
      // Convert shared notes to teacher note items for display
      const notes = data.sharedNotes.map((n) => {
        let meta: Record<string, unknown> = {};
        try { meta = n.metadata ? JSON.parse(n.metadata) : {}; } catch { /* ignore */ }
        return {
          id: n.id,
          content: `[${t('communication.note_shared')}: ${meta.notebookTitle || n.content}]`,
          createdAt: n.createdAt,
        };
      });
      setTeacherNotes(notes);
    } catch {
      // ignore
    }
  }, [roomId, role]);

  const fetchNotebooks = useCallback(async () => {
    try {
      const data = await apiGet<Array<{ id: string; title: string; color: string; notebookType: string; pages?: Array<{ id: string; title: string | null; pageNumber: number }> }>>('/api/notebooks');
      setNotebooks(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    fetchRoom();
    fetchTeacherNotes();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages, fetchRoom, fetchTeacherNotes]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string, messageType: string = 'text', metadata?: string) => {
    if (!content && messageType === 'text') return;
    setIsSending(true);
    try {
      await apiPost(`/api/communication-rooms/${roomId}/messages`, {
        content,
        messageType,
        metadata: metadata || null,
      });
      setNewMessage('');
      fetchMessages();
      onRefresh();
    } catch (error) {
      toast.error(t('communication.error_send'));
    } finally {
      setIsSending(false);
    }
  };

  const handleAccept = async () => {
    try {
      await apiPut(`/api/communication-rooms/${roomId}`, { status: 'active' });
      toast.success(t('communication.conversation_accepted'));
      fetchRoom();
      onRefresh();
    } catch (error) {
      toast.error('Error accepting conversation');
    }
  };

  const handleReject = async () => {
    try {
      await apiPut(`/api/communication-rooms/${roomId}`, { status: 'rejected' });
      toast.success(t('communication.conversation_rejected'));
      onRefresh();
    } catch (error) {
      toast.error('Error rejecting conversation');
    }
  };

  const handleClose = async () => {
    try {
      await apiPut(`/api/communication-rooms/${roomId}`, { status: 'closed', closeReason: 'Closed by teacher' });
      toast.success(t('communication.conversation_closed'));
      fetchRoom();
      onRefresh();
    } catch (error) {
      toast.error('Error closing conversation');
    }
  };

  // Voice recording with Web Audio API
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          const metadata = JSON.stringify({
            audioData: base64Audio,
            duration: recordingDuration,
            mimeType: 'audio/webm',
          });
          await sendMessage(
            t('communication.voice_message'),
            'voice',
            metadata,
          );
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      toast.error(t('communication.voice_recording_error'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  // Voice playback
  const playVoiceMessage = (msg: Message) => {
    if (playingVoiceId === msg.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingVoiceId(null);
      return;
    }

    try {
      let meta: Record<string, unknown> = {};
      try { meta = msg.metadata ? JSON.parse(msg.metadata) : {}; } catch { /* ignore */ }

      const audioData = meta.audioData as string;
      if (audioData) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audio = new Audio(audioData);
        audio.onended = () => setPlayingVoiceId(null);
        audio.play();
        audioRef.current = audio;
        setPlayingVoiceId(msg.id);
      }
    } catch {
      // If audio playback fails, just show the message
    }
  };

  // File sharing
  const handleFileUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('communication.file_size_limit'));
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const metadata = JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          fileData: base64Data,
        });
        await sendMessage(file.name, 'file', metadata);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Error uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // Note sharing
  const handleShareNote = async (notebookId: string) => {
    setIsSharingNote(true);
    try {
      await apiPost(`/api/communication-rooms/${roomId}/share-notes`, { notebookId });
      toast.success(t('communication.note_shared'));
      setShowShareNotesDialog(false);
      fetchMessages();
      onRefresh();
    } catch {
      toast.error('Error sharing notebook');
    } finally {
      setIsSharingNote(false);
    }
  };

  // Save teacher note
  const handleSaveTeacherNote = async () => {
    if (!newTeacherNote.trim()) return;
    try {
      await apiPost('/api/teacher-notes', {
        studentId: room?.studentId,
        category: 'GENERAL',
        content: newTeacherNote.trim(),
        isPrivate: true,
      });
      toast.success(t('communication.notes_saved'));
      setTeacherNotes((prev) => [
        { id: Date.now().toString(), content: newTeacherNote.trim(), createdAt: new Date().toISOString() },
        ...prev,
      ]);
      setNewTeacherNote('');
    } catch {
      toast.error('Error saving note');
    }
  };

  const isStudent = room?.studentId === currentUserId;
  const otherPerson = isStudent ? room?.teacher : room?.student;
  const isAdmin = role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL' || role === 'SUPER_ADMIN';

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `${t('communication.today')} ${time}`;
    if (isYesterday) return `${t('communication.yesterday')} ${time}`;
    return `${date.toLocaleDateString()} ${time}`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" alt="" />;
    if (fileType === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <FileIcon className="h-4 w-4" />;
  };

  return (
    <Card className={`flex-1 flex flex-col min-h-0 ${isMobile ? 'rounded-none border-0' : ''}`}>
      {/* Chat Header */}
      <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20">
        <div className="flex items-center gap-3">
          {isMobile && onClose && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
              <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900 ${
              room?.status === 'active' ? 'bg-emerald-500' : room?.status === 'requested' ? 'bg-amber-500' : 'bg-gray-400'
            }`} />
          </div>
          <div>
            <p className="font-medium">
              {otherPerson ? `${otherPerson.firstName} ${otherPerson.lastName}` : 'Unknown'}
            </p>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={`text-xs ${
                  room?.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' :
                  room?.status === 'requested' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                {room?.status === 'requested' ? t('communication.requested') :
                 room?.status === 'active' ? t('communication.active') :
                 t('communication.closed')}
              </Badge>
              {isAdmin && (
                <Badge variant="outline" className="text-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  {t('communication.read_only')}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {role === 'TEACHER' && room?.status === 'requested' && (
            <>
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white h-8" onClick={handleAccept}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                {t('communication.accept')}
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-rose-600" onClick={handleReject}>
                <XCircle className="h-3.5 w-3.5 mr-1" />
                {t('communication.reject')}
              </Button>
            </>
          )}
          {role === 'TEACHER' && room?.status === 'active' && (
            <>
              <Button variant="outline" size="sm" className="h-8" onClick={() => setShowTeacherNotes(!showTeacherNotes)}>
                <StickyNote className="h-3.5 w-3.5 mr-1" />
                {t('communication.teacher_notes')}
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-rose-600" onClick={handleClose}>
                <XCircle className="h-3.5 w-3.5 mr-1" />
                {t('communication.close')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Teacher Notes Panel */}
      <AnimatePresence>
        {showTeacherNotes && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b bg-amber-50 dark:bg-amber-950/20 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-amber-500" />
                {t('communication.teacher_notes_panel')}
              </Label>
            </div>
            <div className="flex gap-2 mb-2">
              <Textarea
                value={newTeacherNote}
                onChange={(e) => setNewTeacherNote(e.target.value)}
                placeholder={t('communication.teacher_notes_placeholder')}
                rows={2}
                className="flex-1"
              />
              <Button
                onClick={handleSaveTeacherNote}
                disabled={!newTeacherNote.trim()}
                className="bg-emerald-500 hover:bg-emerald-600 text-white self-end"
                size="sm"
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
            {teacherNotes.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {teacherNotes.map((note) => (
                  <div key={note.id} className="flex items-start gap-2 p-2 rounded bg-white/50 dark:bg-gray-800/50 text-xs">
                    <FileText className="h-3 w-3 mt-0.5 text-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-muted-foreground">{note.content}</p>
                      <p className="text-muted-foreground mt-0.5">{formatTime(note.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag and drop overlay */}
      <AnimatePresence>
        {dragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 bg-emerald-50/80 dark:bg-emerald-950/50 flex items-center justify-center"
          >
            <div className="text-center">
              <Upload className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
              <p className="text-lg font-medium text-emerald-700 dark:text-emerald-300">{t('communication.drop_zone')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Typing indicator */}
      <AnimatePresence>
        {isSending && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 border-b"
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <motion.div className="h-2 w-2 rounded-full bg-emerald-500" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
                <motion.div className="h-2 w-2 rounded-full bg-emerald-500" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }} />
                <motion.div className="h-2 w-2 rounded-full bg-emerald-500" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }} />
              </div>
              <span className="text-xs text-muted-foreground">{t('communication.type_message')}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>{t('communication.no_messages')}</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isOwn = msg.senderId === currentUserId;
            const isVoice = msg.messageType === 'voice';
            const isFile = msg.messageType === 'file';
            const isNoteShare = msg.messageType === 'note_share';

            let msgMeta: Record<string, unknown> = {};
            try { msgMeta = msg.metadata ? JSON.parse(msg.metadata) : {}; } catch { /* ignore */ }

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
                  {!isOwn && msg.sender && (
                    <p className="text-xs text-muted-foreground mb-1 ml-1">
                      {msg.sender.firstName} {msg.sender.lastName}
                    </p>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                      isOwn
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-md'
                        : 'bg-white dark:bg-gray-800 rounded-bl-md border border-gray-100 dark:border-gray-700'
                    }`}
                  >
                    {isVoice && (
                      <div className="flex items-center gap-2 min-w-[160px]">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 shrink-0 ${isOwn ? 'text-white hover:bg-white/20' : 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30'}`}
                          onClick={() => playVoiceMessage(msg)}
                        >
                          {playingVoiceId === msg.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 20 }).map((_, i) => (
                              <div
                                key={i}
                                className={`w-1 rounded-full ${isOwn ? 'bg-white/60' : 'bg-emerald-300 dark:bg-emerald-700'}`}
                                style={{ height: `${Math.max(4, Math.random() * 16)}px` }}
                              />
                            ))}
                          </div>
                          <p className={`text-xs mt-0.5 ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
                            {msgMeta.duration ? formatDuration(msgMeta.duration as number) : '0:00'}
                          </p>
                        </div>
                        <Volume2 className={`h-4 w-4 ${isOwn ? 'text-white/60' : 'text-emerald-500'}`} />
                      </div>
                    )}
                    {isFile && (
                      <div className="flex items-center gap-2 min-w-[200px]">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${isOwn ? 'bg-white/20' : 'bg-emerald-50 dark:bg-emerald-900/30'}`}>
                          {getFileIcon(msgMeta.fileType as string || 'application/octet-stream')}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{msgMeta.fileName as string || msg.content}</p>
                          <p className={`text-xs ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
                            {msgMeta.fileSize ? `${(Number(msgMeta.fileSize) / 1024).toFixed(1)} KB` : ''}
                          </p>
                        </div>
                      </div>
                    )}
                    {isNoteShare && (
                      <div className="flex items-center gap-2 min-w-[180px]">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${isOwn ? 'bg-white/20' : 'bg-emerald-50 dark:bg-emerald-900/30'}`}>
                          <Notebook className={`h-5 w-5 ${isOwn ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{t('communication.note_shared')}</p>
                          <p className={`text-xs ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
                            {msgMeta.notebookTitle as string || msg.content}
                          </p>
                          {msgMeta.pageCount && (
                            <p className={`text-xs ${isOwn ? 'text-white/60' : 'text-muted-foreground'}`}>
                              {msgMeta.pageCount as number} {t('communication.notebook_pages')}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {!isVoice && !isFile && !isNoteShare && <p className="text-sm">{msg.content}</p>}
                  </div>
                  <p className={`text-xs text-muted-foreground mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      {!isAdmin && room?.status === 'active' && (
        <div className="p-4 border-t">
          {isRecording ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="h-3 w-3 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-sm text-rose-500 font-medium">{t('communication.recording')}</span>
                <span className="text-sm text-muted-foreground">{formatDuration(recordingDuration)}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                onClick={stopRecording}
              >
                <MicOff className="h-4 w-4 mr-1" />
                {t('communication.stop_recording')}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Share Notes Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => {
                  fetchNotebooks();
                  setShowShareNotesDialog(true);
                }}
                title={t('communication.share_notes')}
              >
                <Notebook className="h-4 w-4" />
              </Button>
              {/* File Upload Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => fileInputRef.current?.click()}
                title={t('communication.attach_file')}
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.txt,.xls,.xlsx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                  e.target.value = '';
                }}
              />
              {/* Voice Record Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={startRecording}
                title={t('communication.record_voice')}
              >
                <Mic className="h-4 w-4" />
              </Button>
              {/* Text Input */}
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t('communication.type_message')}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(newMessage);
                  }
                }}
              />
              <Button
                onClick={() => sendMessage(newMessage)}
                disabled={isSending || !newMessage.trim()}
                className="bg-emerald-500 hover:bg-emerald-600 text-white h-9 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Paperclip className="h-3 w-3" />
            <span>{t('communication.supported_types')}</span>
          </div>
        </div>
      )}

      {/* Admin read-only notice */}
      {isAdmin && (
        <div className="p-4 border-t bg-muted/30 text-center">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Shield className="h-4 w-4" />
            {t('communication.read_only')}
          </p>
        </div>
      )}

      {/* Room not active notice */}
      {room?.status !== 'active' && !isAdmin && (
        <div className="p-4 border-t bg-muted/30 text-center">
          <p className="text-sm text-muted-foreground">
            {room?.status === 'requested' && t('communication.requested')}
            {room?.status === 'closed' && t('communication.closed')}
          </p>
        </div>
      )}

      {/* Share Notes Dialog */}
      <Dialog open={showShareNotesDialog} onOpenChange={setShowShareNotesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Notebook className="h-5 w-5 text-emerald-500" />
              {t('communication.share_notes')}
            </DialogTitle>
            <DialogDescription>
              {t('communication.select_notebook')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {notebooks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('communication.no_notebooks')}</p>
            ) : (
              notebooks.map((nb) => (
                <motion.button
                  key={nb.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full text-left p-3 rounded-lg border hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                  onClick={() => handleShareNote(nb.id)}
                  disabled={isSharingNote}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
                      style={{ backgroundColor: nb.color || '#10b981' }}
                    >
                      <Notebook className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{nb.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {nb.pages?.length || 0} {t('communication.notebook_pages')}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareNotesDialog(false)}>
              {t('action.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function RequestConversationDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await apiPost('/api/communication-rooms', { reason });
      toast.success(t('communication.request_sent'));
      onOpenChange(false);
      setReason('');
      onCreated();
    } catch (error) {
      toast.error(t('communication.error_create'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-emerald-500" />
            {t('communication.request_conversation')}
          </DialogTitle>
          <DialogDescription>
            {t('communication.with_teacher')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>{t('communication.request_reason')}</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('communication.optional_reason')}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('action.cancel')}</Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {isSubmitting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : t('action.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
