// CompetenceTrack — Offline Cache for Notebook Data
// Stores notebook data in localStorage for offline access

const NOTEBOOK_CACHE_KEY = 'ct_notebook_cache';
const NOTEBOOK_CACHE_TIMESTAMP = 'ct_notebook_cache_ts';
const NOTEBOOK_EDITS_QUEUE = 'ct_notebook_edits_queue';

interface CachedNotebook {
  id: string;
  title: string;
  notebookType: string;
  coverColor: string;
  schoolId: string;
  ownerId: string;
  isArchived: boolean;
  pages: CachedPage[];
  cachedAt: number;
}

interface CachedPage {
  id: string;
  title: string;
  textContent: string;
  drawingData: string | null;
  background: string;
  pageNumber: number;
}

interface QueuedEdit {
  id: string;
  notebookId: string;
  pageId: string;
  field: string;
  value: string;
  timestamp: number;
  retries: number;
}

// ─── Save notebook data to localStorage ───────────────────────────────

export function cacheNotebook(notebook: {
  id: string;
  title: string;
  notebookType: string;
  coverColor: string;
  schoolId: string;
  ownerId: string;
  isArchived: boolean;
  pages: Array<{
    id: string;
    title: string;
    textContent: string;
    drawingData: string | null;
    background: string;
    pageNumber: number;
  }>;
}): void {
  try {
    const cache: Record<string, CachedNotebook> = JSON.parse(
      localStorage.getItem(NOTEBOOK_CACHE_KEY) || '{}'
    );

    cache[notebook.id] = {
      ...notebook,
      cachedAt: Date.now(),
    };

    localStorage.setItem(NOTEBOOK_CACHE_KEY, JSON.stringify(cache));
    localStorage.setItem(NOTEBOOK_CACHE_TIMESTAMP, String(Date.now()));
  } catch (error) {
    console.warn('[OfflineCache] Failed to cache notebook:', error);
  }
}

// ─── Retrieve cached notebook ──────────────────────────────────────────

export function getCachedNotebook(id: string): CachedNotebook | null {
  try {
    const cache: Record<string, CachedNotebook> = JSON.parse(
      localStorage.getItem(NOTEBOOK_CACHE_KEY) || '{}'
    );
    return cache[id] || null;
  } catch {
    return null;
  }
}

// ─── Get all cached notebooks ──────────────────────────────────────────

export function getAllCachedNotebooks(): CachedNotebook[] {
  try {
    const cache: Record<string, CachedNotebook> = JSON.parse(
      localStorage.getItem(NOTEBOOK_CACHE_KEY) || '{}'
    );
    return Object.values(cache).sort((a, b) => b.cachedAt - a.cachedAt);
  } catch {
    return [];
  }
}

// ─── Remove a cached notebook ──────────────────────────────────────────

export function removeCachedNotebook(id: string): void {
  try {
    const cache: Record<string, CachedNotebook> = JSON.parse(
      localStorage.getItem(NOTEBOOK_CACHE_KEY) || '{}'
    );
    delete cache[id];
    localStorage.setItem(NOTEBOOK_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

// ─── Check if a notebook is cached ──────────────────────────────────────

export function isNotebookCached(id: string): boolean {
  try {
    const cache: Record<string, CachedNotebook> = JSON.parse(
      localStorage.getItem(NOTEBOOK_CACHE_KEY) || '{}'
    );
    return !!cache[id];
  } catch {
    return false;
  }
}

// ─── Get cache timestamp ──────────────────────────────────────────────

export function getCacheTimestamp(): number {
  try {
    return Number(localStorage.getItem(NOTEBOOK_CACHE_TIMESTAMP) || '0');
  } catch {
    return 0;
  }
}

// ─── Queue an edit for sync when back online ────────────────────────────

export function queueNotebookEdit(
  notebookId: string,
  pageId: string,
  field: string,
  value: string
): void {
  try {
    const queue: QueuedEdit[] = JSON.parse(
      localStorage.getItem(NOTEBOOK_EDITS_QUEUE) || '[]'
    );

    queue.push({
      id: `edit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      notebookId,
      pageId,
      field,
      value,
      timestamp: Date.now(),
      retries: 0,
    });

    localStorage.setItem(NOTEBOOK_EDITS_QUEUE, JSON.stringify(queue));

    // Also update the cached notebook locally
    const cache: Record<string, CachedNotebook> = JSON.parse(
      localStorage.getItem(NOTEBOOK_CACHE_KEY) || '{}'
    );
    const cached = cache[notebookId];
    if (cached) {
      const page = cached.pages.find((p) => p.id === pageId);
      if (page) {
        (page as Record<string, unknown>)[field] = value;
        localStorage.setItem(NOTEBOOK_CACHE_KEY, JSON.stringify(cache));
      }
    }
  } catch (error) {
    console.warn('[OfflineCache] Failed to queue edit:', error);
  }
}

// ─── Get queued edits ──────────────────────────────────────────────────

export function getQueuedEdits(): QueuedEdit[] {
  try {
    return JSON.parse(localStorage.getItem(NOTEBOOK_EDITS_QUEUE) || '[]');
  } catch {
    return [];
  }
}

// ─── Replay queued edits when back online ───────────────────────────────

export async function replayQueuedEdits(): Promise<{ success: number; failed: number }> {
  const queue = getQueuedEdits();
  let success = 0;
  let failed = 0;

  for (const edit of queue) {
    try {
      const res = await fetch(`/api/notebooks/${edit.notebookId}/pages/${edit.pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [edit.field]: edit.value }),
      });
      if (res.ok) {
        removeQueuedEdit(edit.id);
        success++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { success, failed };
}

// ─── Remove a queued edit ──────────────────────────────────────────────

export function removeQueuedEdit(id: string): void {
  try {
    const queue: QueuedEdit[] = JSON.parse(
      localStorage.getItem(NOTEBOOK_EDITS_QUEUE) || '[]'
    );
    const filtered = queue.filter((e) => e.id !== id);
    localStorage.setItem(NOTEBOOK_EDITS_QUEUE, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

// ─── Clear all queued edits ────────────────────────────────────────────

export function clearQueuedEdits(): void {
  try {
    localStorage.removeItem(NOTEBOOK_EDITS_QUEUE);
  } catch {
    // ignore
  }
}

// ─── Clear all notebook cache ──────────────────────────────────────────

export function clearNotebookCache(): void {
  try {
    localStorage.removeItem(NOTEBOOK_CACHE_KEY);
    localStorage.removeItem(NOTEBOOK_CACHE_TIMESTAMP);
  } catch {
    // ignore
  }
}

// ─── Get offline status ──────────────────────────────────────────────

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}
