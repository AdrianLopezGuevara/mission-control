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
