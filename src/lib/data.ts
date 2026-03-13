import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const MEMORY_DIR = process.env.MEMORY_DIR || path.join(process.cwd(), '..', 'memory');
const MEMORY_MD = process.env.MEMORY_MD || path.join(process.cwd(), '..', 'MEMORY.md');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(file: string) {
  ensureDir();
  const fp = path.join(DATA_DIR, file);
  if (!fs.existsSync(fp)) return [];
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function writeJSON(file: string, data: unknown) {
  ensureDir();
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

export function getTasks() { return readJSON('tasks.json'); }
export function saveTasks(data: unknown) { writeJSON('tasks.json', data); }
export function getContent() { return readJSON('content.json'); }
export function saveContent(data: unknown) { writeJSON('content.json', data); }
export function getCalendar() { return readJSON('calendar.json'); }
export function saveCalendar(data: unknown) { writeJSON('calendar.json', data); }
export function getTeam() {
  const raw = readJSON('team.json');
  // Support both array and { members: [] } format
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.members)) return raw.members;
  return [];
}
export function saveTeam(data: unknown) { writeJSON('team.json', data); }

// Notes
export function getNotes() { return readJSON('notes.json'); }
export function saveNotes(data: unknown) { writeJSON('notes.json', data); }

// Activity
export interface ActivityEntry {
  id: string;
  type: 'task' | 'content' | 'calendar' | 'team' | 'note' | 'system';
  action: 'created' | 'updated' | 'deleted' | 'moved' | 'completed';
  title: string;
  description?: string;
  agent?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export function getActivity(): ActivityEntry[] { return readJSON('activity.json'); }
export function saveActivity(data: unknown) { writeJSON('activity.json', data); }

export function logActivity(entry: Omit<ActivityEntry, 'id' | 'timestamp'>) {
  const activity = getActivity();
  const newEntry: ActivityEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  activity.unshift(newEntry); // newest first
  // Keep max 500 entries
  if (activity.length > 500) activity.splice(500);
  saveActivity(activity);
  broadcastSSE('activity', newEntry);

  // Auto-create notifications for important events
  if (entry.type === 'task' && entry.action === 'completed') {
    createNotification({
      type: 'task',
      title: 'Task completed',
      message: entry.title,
      actionUrl: 'tasks',
    });
  }
  if (entry.type === 'note' && entry.action === 'created') {
    createNotification({
      type: 'system',
      title: 'New note created',
      message: entry.title,
      actionUrl: 'notes',
    });
  }
}

// Notifications
export interface AppNotification {
  id: string;
  type: 'task' | 'calendar' | 'system' | 'mention';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

export function getNotifications(): AppNotification[] { return readJSON('notifications.json'); }
export function saveNotifications(data: unknown) { writeJSON('notifications.json', data); }

export function createNotification(n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) {
  const notifications = getNotifications();
  const notif: AppNotification = {
    id: crypto.randomUUID(),
    read: false,
    createdAt: new Date().toISOString(),
    ...n,
  };
  notifications.unshift(notif);
  if (notifications.length > 100) notifications.splice(100);
  saveNotifications(notifications);
  broadcastSSE('notifications', notifications);
  return notif;
}

// Check for upcoming calendar events and create notifications
export function checkCalendarNotifications() {
  const calendar = getCalendar();
  const now = Date.now();
  const twoHours = 2 * 60 * 60 * 1000;
  const notifications = getNotifications();

  for (const ev of calendar) {
    if (!ev.date) continue;
    const evTime = new Date(ev.time ? `${ev.date}T${ev.time}` : ev.date).getTime();
    const diff = evTime - now;
    if (diff > 0 && diff <= twoHours) {
      // Check if we already created a notification for this event
      const alreadyNotified = notifications.some(
        (n: AppNotification) => n.actionUrl === `calendar:${ev.id}`
      );
      if (!alreadyNotified) {
        createNotification({
          type: 'calendar',
          title: 'Upcoming event',
          message: `${ev.title} in less than 2 hours`,
          actionUrl: `calendar:${ev.id}`,
        });
      }
    }
  }
}

// Auth
export function getAuth() {
  ensureDir();
  const fp = path.join(DATA_DIR, 'auth.json');
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}
export function saveAuth(data: unknown) { writeJSON('auth.json', data); }

// Sessions store
const sessions = new Map<string, { expires: number }>();

export function createSession(): string {
  const id = crypto.randomUUID();
  sessions.set(id, { expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  return id;
}

export function validSession(id: string): boolean {
  const s = sessions.get(id);
  if (!s) return false;
  if (Date.now() > s.expires) { sessions.delete(id); return false; }
  return true;
}

export function deleteSession(id: string) { sessions.delete(id); }

export function hashPassword(pw: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(pw, s, 64).toString('hex');
  return { hash: h, salt: s };
}

// Memory
export interface MemoryFile {
  name: string;
  path: string;
  content: string;
  size: number;
  modified: string;
  type: 'core' | 'daily';
}

export function getMemoryFiles(): MemoryFile[] {
  const files: MemoryFile[] = [];
  try {
    const stat = fs.statSync(MEMORY_MD);
    files.push({
      name: 'MEMORY.md', path: 'MEMORY.md',
      content: fs.readFileSync(MEMORY_MD, 'utf8'),
      size: stat.size, modified: stat.mtime.toISOString(), type: 'core'
    });
  } catch {}
  try {
    const entries = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.md')).sort().reverse();
    for (const f of entries) {
      const fp = path.join(MEMORY_DIR, f);
      const stat = fs.statSync(fp);
      files.push({
        name: f, path: `memory/${f}`,
        content: fs.readFileSync(fp, 'utf8'),
        size: stat.size, modified: stat.mtime.toISOString(), type: 'daily'
      });
    }
  } catch {}
  return files;
}

export function searchMemory(query: string) {
  const q = query.toLowerCase();
  const results: { file: string; line: number; text: string; context: string }[] = [];

  function searchFile(filePath: string, fileName: string) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.toLowerCase().includes(q)) {
          results.push({
            file: fileName, line: i + 1, text: line.trim(),
            context: lines.slice(Math.max(0, i - 1), i + 2).join('\n')
          });
        }
      });
    } catch {}
  }

  searchFile(MEMORY_MD, 'MEMORY.md');
  try {
    const entries = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.md')).sort().reverse();
    for (const f of entries) searchFile(path.join(MEMORY_DIR, f), `memory/${f}`);
  } catch {}

  return results.slice(0, 100);
}

// SSE subscribers
type SSEClient = { id: string; controller: ReadableStreamDefaultController };
const sseClients: SSEClient[] = [];

export function addSSEClient(client: SSEClient) { sseClients.push(client); }
export function removeSSEClient(id: string) {
  const idx = sseClients.findIndex(c => c.id === id);
  if (idx !== -1) sseClients.splice(idx, 1);
}
export function broadcastSSE(type: string, data: unknown) {
  const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  sseClients.forEach(c => {
    try { c.controller.enqueue(encoder.encode(msg)); } catch {}
  });
}

// API key
export function getApiKey(): string | null {
  try { return fs.readFileSync(path.join(DATA_DIR, '.api-key'), 'utf8').trim(); } catch { return null; }
}
