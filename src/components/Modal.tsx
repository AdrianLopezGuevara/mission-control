'use client';
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

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
      <div className={`bg-surface border border-border shadow-2xl shadow-black/40 flex flex-col w-full max-h-[92dvh] rounded-t-2xl md:rounded-2xl md:max-h-[85vh] ${wide ? 'md:w-[640px]' : 'md:w-[480px]'}`}>
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface2 transition-colors text-text-muted hover:text-text">
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
      className={`w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:border-accent transition-colors placeholder:text-text-muted ${className}`}
    />
  );
}

export function SelectInput({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:border-accent transition-colors"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
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
      className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:border-accent transition-colors placeholder:text-text-muted resize-none"
    />
  );
}

export function FormActions({ onCancel, onDelete, saveLabel = 'Save' }: {
  onCancel: () => void;
  onDelete?: () => void;
  saveLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border">
      <button type="button" onClick={onCancel} className="px-4 py-2 text-xs font-medium border border-border rounded-lg hover:bg-surface2 transition-colors text-text-dim">
        Cancel
      </button>
      {onDelete && (
        <button type="button" onClick={onDelete} className="px-4 py-2 text-xs font-medium border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors text-red-400">
          Delete
        </button>
      )}
      <button type="submit" className="ml-auto px-5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-lg transition-colors">
        {saveLabel}
      </button>
    </div>
  );
}
