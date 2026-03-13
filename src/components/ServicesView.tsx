'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Server, RefreshCw, Play, Square, AlertCircle, Clock, Cpu, HardDrive,
} from 'lucide-react';
import type { ServiceInfo } from '@/app/api/services/route';

function StatusDot({ status }: { status: ServiceInfo['status'] }) {
  const cls =
    status === 'running' ? 'bg-emerald-400' :
    status === 'stopped' ? 'bg-red-500' :
    'bg-yellow-400';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${cls}`} />;
}

function TypeBadge({ type }: { type: ServiceInfo['type'] }) {
  return (
    <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full font-semibold border border-border bg-surface2 text-text-muted uppercase tracking-wide">
      {type}
    </span>
  );
}

function ServiceCard({
  service,
  onAction,
}: {
  service: ServiceInfo;
  onAction: (id: string, action: 'restart' | 'stop' | 'start') => Promise<void>;
}) {
  const [confirm, setConfirm] = useState<'restart' | 'stop' | null>(null);
  const [loading, setLoading] = useState(false);

  const borderColor =
    service.status === 'running' ? 'border-l-emerald-500/60' :
    service.status === 'stopped' ? 'border-l-red-500/60' :
    'border-l-yellow-400/60';

  async function handleAction(action: 'restart' | 'stop' | 'start') {
    setConfirm(null);
    setLoading(true);
    try {
      await onAction(service.id, action);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`rounded-xl border border-border bg-surface p-4 flex flex-col gap-3 border-l-4 ${borderColor} transition-all hover:bg-surface2`}
    >
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <StatusDot status={service.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-text text-sm leading-tight">{service.name}</span>
            <TypeBadge type={service.type} />
          </div>
          <p className="text-xs text-text-muted mt-0.5 truncate">{service.description}</p>
        </div>
        {loading && (
          <RefreshCw className="w-4 h-4 text-accent-hover animate-spin flex-shrink-0" strokeWidth={2} />
        )}
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-3 text-xs text-text-dim">
        {/* Uptime */}
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" strokeWidth={1.8} />
          {service.status === 'running' && service.uptime
            ? `Up ${service.uptime}`
            : service.status === 'running'
            ? 'Running'
            : 'Stopped'}
        </span>

        {/* Memory */}
        {service.memory && (
          <span className="flex items-center gap-1">
            <HardDrive className="w-3.5 h-3.5" strokeWidth={1.8} />
            {service.memory}
          </span>
        )}

        {/* CPU */}
        {service.cpu && (
          <span className="flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5" strokeWidth={1.8} />
            {service.cpu}
          </span>
        )}

        {/* PID */}
        {service.pid && (
          <span className="flex items-center gap-1 text-text-muted">
            PID {service.pid}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {service.status === 'running' ? (
          <>
            {/* Restart */}
            {confirm === 'restart' ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-dim">Sure?</span>
                <button
                  onClick={() => handleAction('restart')}
                  className="text-xs px-2 py-1 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30 transition-colors"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirm(null)}
                  className="text-xs px-2 py-1 rounded-lg bg-surface2 text-text-muted border border-border hover:bg-surface hover:text-text transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirm('restart')}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
                Restart
              </button>
            )}

            {/* Stop */}
            {confirm === 'stop' ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-dim">Sure?</span>
                <button
                  onClick={() => handleAction('stop')}
                  className="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirm(null)}
                  className="text-xs px-2 py-1 rounded-lg bg-surface2 text-text-muted border border-border hover:bg-surface hover:text-text transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              confirm !== 'restart' && (
                <button
                  onClick={() => setConfirm('stop')}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  <Square className="w-3.5 h-3.5" strokeWidth={2} />
                  Stop
                </button>
              )
            )}
          </>
        ) : (
          /* Start button for stopped/error services */
          <button
            onClick={() => handleAction('start')}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" strokeWidth={2} />
            Start
          </button>
        )}

        {service.status === 'error' && (
          <span className="flex items-center gap-1 text-xs text-yellow-400 ml-auto">
            <AlertCircle className="w-3.5 h-3.5" strokeWidth={2} />
            Error
          </span>
        )}
      </div>
    </div>
  );
}

export default function ServicesView() {
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const r = await fetch('/api/services');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setServices(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load services');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
    const interval = setInterval(() => fetchServices(), 10000);
    return () => clearInterval(interval);
  }, [fetchServices]);

  async function handleAction(id: string, action: 'restart' | 'stop' | 'start') {
    const r = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    if (r.ok) {
      const updated: ServiceInfo = await r.json();
      setServices(prev => prev.map(s => s.id === updated.id ? updated : s));
    }
    // Refresh all after a moment to catch any cascade effects
    setTimeout(() => fetchServices(), 2000);
  }

  const running = services.filter(s => s.status === 'running').length;
  const total = services.length;

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Server className="w-5 h-5 text-accent-hover" strokeWidth={1.8} />
          <div>
            <h1 className="text-lg font-semibold text-text">Services</h1>
            {!loading && (
              <p className="text-xs text-text-muted mt-0.5">
                {running}/{total} running
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => fetchServices(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-border bg-surface2 text-text-dim hover:text-text hover:bg-surface transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
            strokeWidth={2}
          />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-4 h-32 animate-pulse" />
          ))}
        </div>
      )}

      {/* Service cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map(svc => (
            <ServiceCard key={svc.id} service={svc} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  );
}
