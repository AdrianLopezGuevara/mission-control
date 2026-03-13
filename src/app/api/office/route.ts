import { NextRequest, NextResponse } from 'next/server';
import { getTeam } from '@/lib/data';
import { requireAuth } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

// In-memory agent states (updated via POST)
const agentStates = new Map<string, { state: string; label: string; ts: number }>();

const STATE_FILE = path.join(process.cwd(), 'data', 'office-states.json');
// Load persisted states on startup
try {
  const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  for (const [k, v] of Object.entries(saved)) agentStates.set(k, v as { state: string; label: string; ts: number });
} catch {}

function persistStates() {
  const obj: Record<string, unknown> = {};
  agentStates.forEach((v, k) => { obj[k] = v; });
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(obj, null, 2)); } catch {}
}

// Auto-idle after 60s
const IDLE_TIMEOUT = 60_000;

export async function GET() {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const team = getTeam();
  const now = Date.now();

  const agents = team.map((m: Record<string, unknown>) => {
    const stored = agentStates.get(m.id as string);
    let state = 'idle';
    let label = 'Standing by';

    if (m.isHuman) {
      state = 'idle';
      label = 'Human — always watching';
    } else if (stored) {
      if (now - stored.ts > IDLE_TIMEOUT && stored.state !== 'idle' && stored.state !== 'offline') {
        state = 'idle';
        label = 'Standing by';
      } else {
        state = stored.state;
        label = stored.label;
      }
    }

    return {
      id: m.id,
      name: m.name,
      avatar: m.avatar || (m.name as string).charAt(0),
      role: m.role || '',
      department: m.department || 'engineering',
      state,
      label,
      model: m.model || null,
      isHuman: m.isHuman || false,
    };
  });

  return NextResponse.json(agents);
}

// POST to update an agent's state: { agentId, state, label }
// Also supports legacy format: { name, state, label } for migi-state compatibility
export async function POST(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const { agentId, name, state, label } = body;

  if (!state) return NextResponse.json({ error: 'state required' }, { status: 400 });

  const team = getTeam();

  // Find agent by ID or name
  let member = null;
  if (agentId) member = team.find((m: Record<string, unknown>) => m.id === agentId);
  if (!member && name) member = team.find((m: Record<string, unknown>) => (m.name as string).toLowerCase() === name.toLowerCase() || (m.spawnLabel as string)?.toLowerCase() === name.toLowerCase());

  // Default to Migi if no match
  if (!member) member = team.find((m: Record<string, unknown>) => (m.name as string).toLowerCase() === 'migi');

  if (member) {
    agentStates.set(member.id as string, { state, label: label || state, ts: Date.now() });
    persistStates();
  }

  return NextResponse.json({ ok: true, agentId: member?.id, state, label });
}
