'use client';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function Modal({ open, onClose, title, children, wide }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={`modal-slide-up bg-surface border border-border shadow-2xl shadow-black/40 flex flex-col w-full max-h-[92dvh] rounded-t-2xl md:rounded-2xl md:max-h-[85vh] ${wide ? 'md:w-[640px]' : 'md:w-[480px]'}`}>
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface2 transition-colors text-text-muted hover:text-text">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 md:px-6 py-4 md:py-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

// Reusable form field components
export function FormField({ label, children, small }: { label: string; children: React.ReactNode; small?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium text-text-dim">
      <span>{label}{small && <span className="text-text-muted font-normal ml-1">({small})</span>}</span>
      {children}
    </label>
  );
}

export function TextInput({ value, onChange, placeholder, required, type = 'text', className = '' }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className={`w-full px-3 py-2.5 min-h-[44px] bg-bg border border-border rounded-lg text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all placeholder:text-text-muted ${className}`}
    />
  );
}

export function SelectInput({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none pl-3 pr-8 py-2.5 min-h-[44px] bg-bg border border-border rounded-lg text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all cursor-pointer"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

export function TextArea({ value, onChange, placeholder, rows = 3 }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all placeholder:text-text-muted resize-none"
    />
  );
}

export function FormActions({ onCancel, onDelete, saveLabel = 'Save' }: {
  onCancel: () => void;
  onDelete?: () => void;
  saveLabel?: string;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border">
      <button type="button" onClick={onCancel} className="px-4 py-2 min-h-[36px] text-xs font-medium border border-border rounded-lg hover:bg-surface2 transition-colors text-text-dim">
        Cancel
      </button>
      {onDelete && (
        confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Sure?
            </span>
            <button
              type="button"
              onClick={onDelete}
              className="px-3 py-1.5 text-xs font-semibold bg-red-500/15 border border-red-500/30 rounded-lg hover:bg-red-500/25 transition-colors text-red-400 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-surface2 transition-colors text-text-muted"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 min-h-[36px] text-xs font-medium border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors text-red-400 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        )
      )}
      <button type="submit" className="ml-auto px-5 py-2 min-h-[36px] bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-lg transition-colors">
        {saveLabel}
      </button>
    </div>
  );
}
