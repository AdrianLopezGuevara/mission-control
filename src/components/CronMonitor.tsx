'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Timer, Play, Pause, RefreshCw, AlertTriangle, Clock,
  CheckCircle, XCircle, ChevronDown, ChevronUp, Terminal
} from 'lucide-react';

interface CronJob {
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

interface CronData {
  openclaw: CronJob[];
  system: CronJob[];
  fetchedAt?: string;
}

// ---- Human-readable cron schedule ----
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function formatHour(h: number): string {
  if (h === 0) return '12:00 AM';
  if (h === 12) return '12:00 PM';
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
}

export function cronToHuman(expr: string, tz?: string): string {
  if (!expr) return expr;
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;
  const [min, hour, dom, month, dow] = parts;

  const tzSuffix = tz ? ` (${tz})` : '';

  // Every minute
  if (expr === '* * * * *') return 'Every minute';

  // Every N minutes
  if (min.startsWith('*/') && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    const n = parseInt(min.slice(2));
    if (!isNaN(n)) return `Every ${n} minute${n !== 1 ? 's' : ''}`;
  }

  // Every N hours
  if (min === '0' && hour.startsWith('*/') && dom === '*' && month === '*' && dow === '*') {
    const n = parseInt(hour.slice(2));
    if (!isNaN(n)) return `Every ${n} hour${n !== 1 ? 's' : ''}`;
  }

  // Daily at specific time
  if (!min.includes('*') && !min.includes('/') && !hour.includes('*') && !hour.includes('/')
    && dom === '*' && month === '*' && dow === '*') {
    const h = parseInt(hour);
    const m = parseInt(min);
    if (!isNaN(h) && !isNaN(m)) {
      const timeStr = `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
      return `Daily at ${timeStr}${tzSuffix}`;
    }
  }

  // Weekly on specific day
  if (!min.includes('*') && !hour.includes('*') && dom === '*' && month === '*' && !dow.includes('*') && !dow.includes('/')) {
    const h = parseInt(hour);
    const m = parseInt(min);
    const d = parseInt(dow);
    if (!isNaN(h) && !isNaN(m) && !isNaN(d) && d >= 0 && d <= 6) {
      const timeStr = h === 0 && m === 0
        ? 'midnight'
        : `${formatHour(h)}`;
      return `Weekly on ${DAYS[d]} at ${timeStr}${tzSuffix}`;
    }
  }

  // Monthly on specific day
  if (!min.includes('*') && !hour.includes('*') && !dom.includes('*') && !dom.includes('/')
    && month === '*' && dow === '*') {
    const h = parseInt(hour);
    const m = parseInt(min);
    const d = parseInt(dom);
    if (!isNaN(h) && !isNaN(m) && !isNaN(d)) {
      return `Monthly on day ${d} at ${formatHour(h)}${tzSuffix}`;
    }
  }

  // Yearly
  if (!min.includes('*') && !hour.includes('*') && !dom.includes('*')
    && !month.includes('*') && !month.includes('/') && dow === '*') {
    const mo = parseInt(month);
    if (!isNaN(mo) && mo >= 1 && mo <= 12) {
      return `Yearly in ${MONTHS[mo - 1]}${tzSuffix}`;
    }
  }

  // Weekdays
  if (dow === '1-5') {
    if (!min.includes('*') && !hour.includes('*')) {
      return `Weekdays at ${formatHour(parseInt(hour))}${tzSuffix}`;
    }
    return `Every weekday${tzSuffix}`;
  }

  return expr + (tzSuffix ? ` ${tzSuffix}` : '');
}

// ---- Relative time ----
function relativeTime(iso?: string): string | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const future = diff < 0;
  const prefix = future ? 'in ' : '';
  const suffix = future ? '' : ' ago';

  if (abs < 60_000) return `${prefix}${Math.round(abs / 1000)}s${suffix}`;
  if (abs < 3_600_000) return `${prefix}${Math.round(abs / 60_000)}m${suffix}`;
  if (abs < 86_400_000) return `${prefix}${Math.round(abs / 3_600_000)}h${suffix}`;
  return `${prefix}${Math.round(abs / 86_400_000)}d${suffix}`;
}

function formatDuration(ms?: number): string | null {
  if (ms == null) return null;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ---- Status dot ----
function StatusDot({ job }: { job: CronJob }) {
  if (!job.enabled) return <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 flex-shrink-0" title="Disabled" />;
  if (job.lastStatus === 'error' || (job.consecutiveErrors && job.consecutiveErrors > 0))
    return <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse" title="Error" />;
  return <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0" title="OK" />;
}

// ---- Left border class ----
function borderClass(job: CronJob): string {
  if (!job.enabled) return 'border-l-zinc-600';
  if (job.lastStatus === 'error' || (job.consecutiveErrors && job.consecutiveErrors > 0))
    return 'border-l-red-500';
  return 'border-l-emerald-500';
}

// ---- Cron Card ----
function CronCard({
  job,
  onAction,
}: {
  job: CronJob;
  onAction?: (id: string, action: 'enable' | 'disable' | 'run') => Promise<void>;
}) {
  const [errorExpanded, setErrorExpanded] = useState(false);
  const [cmdExpanded, setCmdExpanded] = useState(false);
  const [confirming, setConfirming] = useState<'enable' | 'disable' | 'run' | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAction(action: 'enable' | 'disable' | 'run') {
    if (confirming !== action) {
      setConfirming(action);
      setTimeout(() => setConfirming(null), 3000);
      return;
    }
    setConfirming(null);
    setLoading(true);
    try {
      await onAction?.(job.id, action);
    } finally {
      setLoading(false);
    }
  }

  const human = cronToHuman(job.schedule, job.timezone);

  return (
    <div className={`bg-surface rounded-lg border border-border border-l-4 ${borderClass(job)} p-4 space-y-3`}>
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <StatusDot job={job} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-text text-sm">{job.name}</span>
            {job.source === 'openclaw' ? (
              <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-semibold uppercase tracking-wide">
                OpenClaw
              </span>
            ) : (
              <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-zinc-700 text-zinc-300 border border-zinc-600 font-semibold uppercase tracking-wide">
                System
              </span>
            )}
            {job.consecutiveErrors != null && job.consecutiveErrors > 0 && (
              <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                {job.consecutiveErrors} err{job.consecutiveErrors !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {job.description && (
            <p className="text-text-muted text-xs mt-0.5 truncate">{job.description}</p>
          )}
        </div>

        {/* Action buttons — OpenClaw only */}
        {job.source === 'openclaw' && onAction && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Run Now */}
            <button
              onClick={() => handleAction('run')}
              disabled={loading}
              title={confirming === 'run' ? 'Click again to confirm' : 'Run now'}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
                confirming === 'run'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-surface2 text-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 border border-border'
              }`}
            >
              <Play className="w-3 h-3" />
              {confirming === 'run' ? 'Sure?' : ''}
            </button>

            {/* Enable/Disable toggle */}
            <button
              onClick={() => handleAction(job.enabled ? 'disable' : 'enable')}
              disabled={loading}
              title={job.enabled
                ? (confirming === 'disable' ? 'Click again to disable' : 'Disable')
                : (confirming === 'enable' ? 'Click again to enable' : 'Enable')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
                confirming === 'disable' || confirming === 'enable'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : job.enabled
                  ? 'bg-surface2 text-text-muted hover:text-amber-400 hover:bg-amber-500/10 border border-border'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {job.enabled ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {confirming === 'disable' || confirming === 'enable' ? 'Sure?' : ''}
            </button>
          </div>
        )}
      </div>

      {/* Schedule */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Timer className="w-3.5 h-3.5 flex-shrink-0" />
        <code className="text-[0.7rem] bg-surface2 px-1.5 py-0.5 rounded font-mono text-text-dim">
          {job.schedule}
        </code>
        {human !== job.schedule && (
          <span className="text-text-muted">{human}</span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        {/* Last run */}
        <div className="flex items-center gap-1.5 text-text-muted">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span>{relativeTime(job.lastRun) ?? '—'}</span>
          {job.lastStatus === 'ok' && (
            <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
          )}
          {job.lastStatus === 'error' && (
            <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
          )}
        </div>

        {/* Next run */}
        <div className="flex items-center gap-1.5 text-text-muted">
          <RefreshCw className="w-3 h-3 flex-shrink-0" />
          <span>{job.nextRun ? relativeTime(job.nextRun) : '—'}</span>
        </div>

        {/* Duration */}
        {job.lastDuration != null && (
          <div className="flex items-center gap-1.5 text-text-muted">
            <span className="text-zinc-600">⏱</span>
            <span>{formatDuration(job.lastDuration)}</span>
          </div>
        )}
      </div>

      {/* System cron command */}
      {job.source === 'system' && job.command && (
        <div className="text-xs">
          <div className="flex items-center gap-1.5 text-text-muted">
            <Terminal className="w-3 h-3 flex-shrink-0" />
            <code className={`font-mono text-[0.65rem] text-text-dim bg-surface2 px-2 py-1 rounded block flex-1 ${cmdExpanded ? '' : 'truncate'}`}>
              {job.command}
            </code>
            {job.command.length > 60 && (
              <button
                onClick={() => setCmdExpanded(x => !x)}
                className="text-text-muted hover:text-text flex-shrink-0"
              >
                {cmdExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error details */}
      {job.lastError && (
        <div>
          <button
            onClick={() => setErrorExpanded(x => !x)}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Error details</span>
            {errorExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {errorExpanded && (
            <div className="mt-1.5 bg-red-500/10 border border-red-500/20 rounded p-2">
              <pre className="text-[0.65rem] text-red-300 font-mono whitespace-pre-wrap break-all">
                {job.lastError}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Auto-refresh countdown ----
function AutoRefreshBadge({ lastFetch, interval }: { lastFetch: number; interval: number }) {
  const [remaining, setRemaining] = useState(interval);

  useEffect(() => {
    const tick = setInterval(() => {
      const elapsed = Date.now() - lastFetch;
      setRemaining(Math.max(0, Math.ceil((interval - elapsed) / 1000)));
    }, 500);
    return () => clearInterval(tick);
  }, [lastFetch, interval]);

  return (
    <span className="text-xs text-text-muted flex items-center gap-1">
      <RefreshCw className="w-3 h-3" />
      <span>Auto-refresh in {remaining}s</span>
    </span>
  );
}

// ---- Main Component ----
const REFRESH_INTERVAL = 15_000;

export default function CronMonitor() {
  const [data, setData] = useState<CronData>({ openclaw: [], system: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch('/api/crons');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
      setLastFetch(Date.now());
    }
  }, []);

  useEffect(() => {
    fetchData();
    timerRef.current = setInterval(fetchData, REFRESH_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchData]);

  async function handleAction(id: string, action: 'enable' | 'disable' | 'run') {
    await fetch('/api/crons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    // Refresh immediately after action
    await fetchData();
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Timer className="w-5 h-5 text-accent-hover" />
          <h1 className="text-lg font-semibold">Cron Monitor</h1>
          {!loading && (
            <span className="text-xs text-text-muted bg-surface2 border border-border px-2 py-0.5 rounded-full">
              {data.openclaw.length + data.system.length} jobs
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!loading && <AutoRefreshBadge lastFetch={lastFetch} interval={REFRESH_INTERVAL} />}
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-surface2 border border-border text-text-muted hover:text-text hover:bg-surface transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface border border-border rounded-lg p-4 h-24 animate-pulse" />
          ))}
        </div>
      )}

      {/* OpenClaw Crons */}
      {!loading && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
              OpenClaw Crons
            </h2>
            <span className="text-xs text-text-muted bg-surface2 border border-border px-1.5 py-0.5 rounded-full">
              {data.openclaw.length}
            </span>
          </div>
          {data.openclaw.length === 0 ? (
            <div className="text-sm text-text-muted bg-surface border border-border rounded-lg p-4 text-center">
              No OpenClaw cron jobs found
            </div>
          ) : (
            <div className="space-y-2">
              {data.openclaw.map(job => (
                <CronCard key={job.id} job={job} onAction={handleAction} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* System Crontab */}
      {!loading && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
              System Crontab
            </h2>
            <span className="text-xs text-text-muted bg-surface2 border border-border px-1.5 py-0.5 rounded-full">
              {data.system.length}
            </span>
          </div>
          {data.system.length === 0 ? (
            <div className="text-sm text-text-muted bg-surface border border-border rounded-lg p-4 text-center">
              No system crontab entries
            </div>
          ) : (
            <div className="space-y-2">
              {data.system.map(job => (
                <CronCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
