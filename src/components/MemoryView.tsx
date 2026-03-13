'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, Database, FileText, ChevronDown } from 'lucide-react';

interface MemoryFile {
  name: string;
  path: string;
  content: string;
  size: number;
  modified: string;
  type: 'core' | 'daily';
}

interface SearchResult {
  file: string;
  line: number;
  text: string;
  context: string;
}

function renderMarkdown(md: string): string {
  return md
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, _lang, code) => `<pre class="bg-surface border border-border rounded-lg p-4 overflow-x-auto my-3"><code class="text-[0.78rem] text-text-dim">${escHtml(code.trim())}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code class="text-[0.8rem] bg-surface2 px-1.5 py-0.5 rounded text-accent-hover">$1</code>')
    .replace(/^#### (.+)$/gm, '<h4 class="text-[0.85rem] font-semibold mt-5 mb-1.5 text-text-dim">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-[0.95rem] font-semibold mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-[1.1rem] font-bold mt-8 mb-3 text-accent-hover tracking-tight">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-[1.5rem] font-extrabold mb-5 pb-3 border-b border-border tracking-tight">$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="text-text"><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-text font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-accent-hover hover:underline">$1</a>')
    .replace(/^---$/gm, '<hr class="border-border my-6">')
    .replace(/^- (.+)$/gm, '<li class="text-[0.85rem] text-text-dim ml-5 mb-1 list-disc leading-relaxed">$1</li>')
    .replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="my-2">$1</ul>')
    .replace(/\n\n/g, '</p><p class="text-[0.88rem] text-text-dim mb-3 leading-relaxed">')
    .replace(/^/, '<p class="text-[0.88rem] text-text-dim mb-3 leading-relaxed">')
    + '</p>';
}

function escHtml(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

export default function MemoryView({ files }: { files: MemoryFile[] }) {
  const [active, setActive] = useState<MemoryFile | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!query.trim()) { setResults(null); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const r = await fetch(`/api/memory?q=${encodeURIComponent(query)}`);
      setResults(await r.json());
    }, 300);
  }, [query]);

  function highlightMatch(text: string) {
    if (!query) return escHtml(text);
    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escHtml(text).replace(re, '<mark class="bg-accent/20 text-accent-hover px-0.5 rounded">$1</mark>');
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border flex-shrink-0">
        <h1 className="text-lg font-semibold tracking-tight">Memory</h1>
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search memories..."
            className="pl-9 pr-4 py-2 bg-surface border border-border rounded-lg text-sm w-full md:w-[320px] md:focus:w-[400px] transition-all outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 placeholder:text-text-muted"
          />
        </div>
      </header>

      {/* Mobile file picker — select dropdown */}
      <div className="md:hidden px-4 py-2 border-b border-border bg-surface flex-shrink-0">
        <div className="relative">
          <select
            value={active?.path || ''}
            onChange={e => {
              const f = files.find(f => f.path === e.target.value);
              if (f) { setActive(f); setResults(null); setQuery(''); }
            }}
            className="w-full appearance-none pl-3 pr-8 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:border-accent transition-colors text-text-dim"
          >
            <option value="">— Select a memory file —</option>
            {files.map(f => (
              <option key={f.path} value={f.path}>
                [{f.type}] {f.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* File sidebar — hidden on mobile */}
        <div className="hidden md:block w-[280px] flex-shrink-0 border-r border-border overflow-y-auto bg-surface">
          {files.map(f => (
            <button
              key={f.path}
              onClick={() => { setActive(f); setResults(null); setQuery(''); }}
              className={`w-full flex items-center gap-2.5 px-5 py-3 text-left border-l-2 transition-all ${
                active?.path === f.path
                  ? 'bg-accent-glow border-accent'
                  : 'border-transparent hover:bg-surface2'
              }`}
            >
              {f.type === 'core'
                ? <Database className="w-4 h-4 text-text-muted flex-shrink-0" strokeWidth={1.8} />
                : <FileText className="w-4 h-4 text-text-muted flex-shrink-0" strokeWidth={1.8} />
              }
              <div className="flex-1 min-w-0">
                <div className="text-[0.8rem] font-semibold truncate">{f.name}</div>
                <div className="text-[0.62rem] text-text-muted mt-0.5">
                  {f.type !== 'core' && new Date(f.modified).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · '}
                  {(f.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <span className={`text-[0.55rem] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${
                f.type === 'core' ? 'bg-accent/10 text-accent-hover' : 'bg-blue-500/10 text-blue-400'
              }`}>{f.type}</span>
            </button>
          ))}
        </div>
        {/* Document view */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:p-8">
          {active ? (
            <div className="max-w-[800px] mx-auto" dangerouslySetInnerHTML={{ __html: renderMarkdown(active.content) }} />
          ) : (
            <div className="flex items-center justify-center h-full text-text-muted text-sm">Select a memory file to view</div>
          )}
        </div>
        {/* Search results overlay */}
        {results !== null && (
          <div className="absolute inset-0 top-0 bg-bg overflow-y-auto p-4 md:p-6 z-10">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-sm font-semibold">{results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;</h2>
              <button onClick={() => { setResults(null); setQuery(''); }} className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-surface2 transition-colors text-text-dim">
                Close
              </button>
            </div>
            {results.length === 0 && <div className="text-center text-text-muted py-12 text-sm">No matches found.</div>}
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  const file = files.find(f => f.path === r.file);
                  if (file) { setActive(file); setResults(null); setQuery(''); }
                }}
                className="w-full text-left bg-surface border border-border rounded-lg p-4 mb-2 hover:border-border-hover transition-colors"
              >
                <div className="text-[0.7rem] text-accent-hover font-semibold font-mono mb-1">{r.file}</div>
                <div className="text-[0.82rem] text-text-dim" dangerouslySetInnerHTML={{ __html: highlightMatch(r.text) }} />
                <div className="text-[0.6rem] text-text-muted mt-1">Line {r.line}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
