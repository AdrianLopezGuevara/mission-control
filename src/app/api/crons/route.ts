import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import crypto from 'crypto';
import { logActivity } from '@/lib/data';
import { requireAuth } from '@/lib/auth';

export interface CronJob {
  id: string;
  name: string;
  description?: string;
  source: 'openclaw' | 'system';
  enabled: boolean;
  schedule: string;
  timezone?: string;
  target?: string;
  model?: string;
  lastRun?: string;
  lastStatus?: 'ok' | 'error';
  lastDuration?: number;
  lastError?: string;
  nextRun?: string;
  consecutiveErrors?: number;
  command?: string;
}

function parseOpenClawCrons(): CronJob[] {
  try {
    const raw = execSync('openclaw cron list --json 2>/dev/null', { timeout: 8000 }).toString().trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const jobs = parsed.jobs || parsed || [];
    if (!Array.isArray(jobs)) return [];

    return jobs.map((j: {
      id: string;
      name?: string;
      description?: string;
      enabled?: boolean;
      schedule?: { kind?: string; expr?: string; tz?: string };
      sessionTarget?: string;
      payload?: { kind?: string; text?: string; message?: string; model?: string };
      state?: {
        nextRunAtMs?: number;
        lastRunAtMs?: number;
        lastRunStatus?: string;
        lastDurationMs?: number;
        lastError?: string;
        consecutiveErrors?: number;
      };
    }) => {
      const state = j.state || {};
      const status = state.lastRunStatus === 'ok' ? 'ok'
        : state.lastRunStatus === 'error' ? 'error'
        : undefined;
      return {
        id: j.id,
        name: j.name || j.id,
        description: j.description,
        source: 'openclaw' as const,
        enabled: j.enabled !== false,
        schedule: j.schedule?.expr || '',
        timezone: j.schedule?.tz,
        target: j.sessionTarget,
        model: j.payload?.model,
        lastRun: state.lastRunAtMs ? new Date(state.lastRunAtMs).toISOString() : undefined,
        lastStatus: status as 'ok' | 'error' | undefined,
        lastDuration: state.lastDurationMs,
        lastError: state.lastError,
        nextRun: state.nextRunAtMs ? new Date(state.nextRunAtMs).toISOString() : undefined,
        consecutiveErrors: state.consecutiveErrors,
      };
    });
  } catch {
    return [];
  }
}

function parseSystemCrons(): CronJob[] {
  try {
    const raw = execSync('crontab -l 2>/dev/null', { timeout: 5000 }).toString();
    const lines = raw.split('\n').filter(l => {
      const trimmed = l.trim();
      return trimmed && !trimmed.startsWith('#');
    });

    return lines.map(line => {
      const parts = line.trim().split(/\s+/);
      const scheduleParts = parts.slice(0, 5);
      const commandParts = parts.slice(5);
      const schedule = scheduleParts.join(' ');
      const command = commandParts.join(' ');

      // Stable ID from command hash
      const id = 'sys-' + crypto.createHash('md5').update(command).digest('hex').slice(0, 8);

      // Extract name from script filename
      const scriptMatch = command.match(/([^/\s]+\.(?:sh|py|js|rb|pl|ts))/) ||
                          command.match(/([^/\s]+)(?:\s|$)/);
      const name = scriptMatch ? scriptMatch[1] : command.slice(0, 40);

      return {
        id,
        name,
        source: 'system' as const,
        enabled: true,
        schedule,
        command,
      };
    });
  } catch {
    return [];
  }
}

export async function GET() {
  const authed = await requireAuth();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const openclawJobs = parseOpenClawCrons();
  const systemJobs = parseSystemCrons();

  return NextResponse.json({
    openclaw: openclawJobs,
    system: systemJobs,
    total: openclawJobs.length + systemJobs.length,
    fetchedAt: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  const authed = await requireAuth();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, action } = body;

  if (!id || !['enable', 'disable', 'run'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    const cmd = `openclaw cron ${action} ${id}`;
    execSync(cmd, { timeout: 10000 });

    logActivity({
      type: 'system',
      action: 'updated',
      title: `Cron ${action}: ${id}`,
      description: `openclaw cron ${action} ${id}`,
    });

    return NextResponse.json({ ok: true, action, id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
