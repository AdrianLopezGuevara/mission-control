'use client';
import { useState } from 'react';
import { Shield } from 'lucide-react';

export default function LoginScreen({ needsSetup, onAuth }: {
  needsSetup: boolean;
  onAuth: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-[340px] bg-surface border border-border rounded-2xl p-8 text-center">
        <Shield className="w-10 h-10 text-accent-hover mx-auto mb-4" strokeWidth={1.5} />
        <h2 className="text-lg font-semibold mb-6">{needsSetup ? 'Set Password' : 'Login'}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoFocus
            className="w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-sm outline-none focus:border-accent transition-colors mb-3 placeholder:text-text-muted"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? '...' : needsSetup ? 'Set Password' : 'Enter'}
          </button>
          {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
        </form>
      </div>
    </div>
  );
}
