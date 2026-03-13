import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { requireAuth } from '@/lib/auth';
import { logActivity } from '@/lib/data';

export interface ServiceInfo {
  id: string;
  name: string;
  description: string;
  type: 'systemd' | 'docker';
  status: 'running' | 'stopped' | 'error';
  uptime?: string;
  memory?: string;
  cpu?: string;
  pid?: number;
  startedAt?: string;
}

const SERVICES: Array<{ id: string; name: string; description: string; type: 'systemd' | 'docker' }> = [
  { id: 'dashboard', name: 'Dashboard', description: 'Mission Control Dashboard', type: 'systemd' },
  { id: 'forgejo-webhook', name: 'Forgejo Webhook', description: 'Forgejo Push Webhook Server', type: 'systemd' },
  { id: 'pixel-office', name: 'Pixel Office', description: 'Pixel Office State Server', type: 'systemd' },
  { id: 'forgejo', name: 'Forgejo', description: 'Forgejo Git Service', type: 'docker' },
  { id: 'caddy', name: 'Caddy', description: 'Caddy Web Server', type: 'docker' },
];

function formatUptime(startedAt: string): string {
  const start = new Date(startedAt).getTime();
  if (isNaN(start)) return '';
  const diffMs = Date.now() - start;
  if (diffMs < 0) return '';
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays >= 2) return `${diffDays} days`;
  if (diffDays === 1) return '1 day';
  if (diffHours >= 1) return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  if (diffMins >= 1) return `${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
  return `${diffSecs} second${diffSecs !== 1 ? 's' : ''}`;
}

function formatMemory(bytes: number): string {
  if (bytes <= 0) return '';
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}G`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}M`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${bytes}B`;
}

function getSystemdStatus(id: string): Partial<ServiceInfo> {
  try {
    const output = execSync(
      `systemctl show ${id}.service --property=ActiveState,SubState,MainPID,MemoryCurrent,CPUUsageNSec,ExecMainStartTimestamp --no-pager`,
      { encoding: 'utf8', timeout: 5000 }
    );

    const props: Record<string, string> = {};
    for (const line of output.trim().split('\n')) {
      const eqIdx = line.indexOf('=');
      if (eqIdx > -1) {
        props[line.slice(0, eqIdx)] = line.slice(eqIdx + 1);
      }
    }

    const activeState = props['ActiveState'] || '';
    const subState = props['SubState'] || '';
    let status: 'running' | 'stopped' | 'error' = 'stopped';
    if (activeState === 'active' && subState === 'running') {
      status = 'running';
    } else if (activeState === 'failed') {
      status = 'error';
    }

    const pid = parseInt(props['MainPID'] || '0', 10);
    const memBytes = parseInt(props['MemoryCurrent'] || '0', 10);
    const memory = formatMemory(memBytes);

    // Parse timestamp like "Mon 2025-01-06 12:34:56 UTC"
    const rawTs = props['ExecMainStartTimestamp'] || '';
    let startedAt = '';
    let uptime = '';
    if (rawTs && rawTs !== 'n/a') {
      // Try to parse the systemd timestamp
      const match = rawTs.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
      if (match) {
        startedAt = new Date(match[1] + ' UTC').toISOString();
        uptime = formatUptime(startedAt);
      }
    }

    return {
      status,
      pid: pid > 0 ? pid : undefined,
      memory: memory || undefined,
      startedAt: startedAt || undefined,
      uptime: uptime || undefined,
    };
  } catch {
    return { status: 'error' };
  }
}

function getDockerStatus(id: string): Partial<ServiceInfo> {
  try {
    const output = execSync(
      `docker inspect --format '{{.State.Status}} {{.State.StartedAt}} {{.Name}}' ${id} 2>/dev/null`,
      { encoding: 'utf8', timeout: 5000 }
    ).trim();

    if (!output) return { status: 'stopped' };

    const parts = output.split(' ');
    const dockerStatus = parts[0];
    const startedAt = parts[1] || '';

    let status: 'running' | 'stopped' | 'error' = 'stopped';
    if (dockerStatus === 'running') {
      status = 'running';
    } else if (dockerStatus === 'exited' || dockerStatus === 'dead') {
      status = 'stopped';
    } else if (dockerStatus === 'restarting' || dockerStatus === 'paused') {
      status = 'error';
    }

    let uptime = '';
    let normalizedStart = '';
    if (startedAt && startedAt !== '0001-01-01T00:00:00Z') {
      try {
        normalizedStart = new Date(startedAt).toISOString();
        uptime = formatUptime(normalizedStart);
      } catch {
        // ignore parse errors
      }
    }

    return {
      status,
      startedAt: normalizedStart || undefined,
      uptime: uptime || undefined,
    };
  } catch {
    return { status: 'error' };
  }
}

export async function GET() {
  const authed = await requireAuth();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const results: ServiceInfo[] = SERVICES.map(svc => {
    const details = svc.type === 'systemd'
      ? getSystemdStatus(svc.id)
      : getDockerStatus(svc.id);

    return {
      id: svc.id,
      name: svc.name,
      description: svc.description,
      type: svc.type,
      status: details.status ?? 'error',
      uptime: details.uptime,
      memory: details.memory,
      cpu: details.cpu,
      pid: details.pid,
      startedAt: details.startedAt,
    };
  });

  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const authed = await requireAuth();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, action } = await req.json() as { id: string; action: 'restart' | 'stop' | 'start' };

  if (!id || !action) {
    return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
  }

  const svc = SERVICES.find(s => s.id === id);
  if (!svc) return NextResponse.json({ error: 'Unknown service' }, { status: 404 });

  try {
    if (svc.type === 'systemd') {
      execSync(`systemctl ${action} ${id}.service`, { timeout: 30000 });
    } else {
      if (action === 'restart') {
        execSync(`docker restart ${id}`, { timeout: 30000 });
      } else if (action === 'stop') {
        execSync(`docker stop ${id}`, { timeout: 30000 });
      } else if (action === 'start') {
        execSync(`docker start ${id}`, { timeout: 30000 });
      }
    }

    // Wait a moment for the service to settle
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Get fresh status
    const details = svc.type === 'systemd'
      ? getSystemdStatus(id)
      : getDockerStatus(id);

    const result: ServiceInfo = {
      id: svc.id,
      name: svc.name,
      description: svc.description,
      type: svc.type,
      status: details.status ?? 'error',
      uptime: details.uptime,
      memory: details.memory,
      cpu: details.cpu,
      pid: details.pid,
      startedAt: details.startedAt,
    };

    logActivity({
      type: 'system',
      action: action === 'restart' ? 'updated' : action === 'stop' ? 'deleted' : 'created',
      title: `${svc.name} ${action}ed`,
      description: `Service ${action} triggered via dashboard`,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to ${action} service: ${message}` }, { status: 500 });
  }
}
