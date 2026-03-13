'use client';
import { useState } from 'react';
import { Shield, Eye, EyeOff } from 'lucide-react';

export default function LoginScreen({ needsSetup, onAuth }: {
  needsSetup: boolean;
  onAuth: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: needsSetup ? 'setup' : 'login', password }),
      });
      if (!r.ok) {
        const data = await r.json();
        setError(data.error || 'Failed');
        return;
      }
      onAuth();
    } catch {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 60% 40%, rgba(124,58,237,0.12) 0%, #09090b 60%)',
      }}>
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="relative w-[340px] bg-surface border border-border rounded-2xl p-8 text-center shadow-2xl shadow-black/50">
        {/* Glow ring behind card */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ boxShadow: '0 0 60px rgba(124,58,237,0.08)' }}
        />
        <div className="relative mb-2">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Shield className="w-8 h-8 text-accent-hover" strokeWidth={1.5} />
          </div>
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-text-muted uppercase mb-1">Mission Control</p>
          <h2 className="text-lg font-semibold">{needsSetup ? 'Set Password' : 'Welcome back'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="mt-6">
          <div className="relative mb-3">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              autoFocus
              className="w-full px-4 py-3 pr-10 bg-bg border border-border rounded-lg text-sm outline-none transition-all placeholder:text-text-muted
                focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-dim transition-colors"
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? '...' : needsSetup ? 'Set Password' : 'Enter'}
          </button>
          {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
        </form>
      </div>
    </div>
  );
}
