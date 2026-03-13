'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [scrollProgress, setScrollProgress] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const contentRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Auto-select MEMORY.md on first load
  useEffect(() => {
    if (files.length > 0 && !active) {
      const memoryMd = files.find(f => f.name === 'MEMORY.md') || files[0];
      setActive(memoryMd);
    }
  }, [files, active]);

  // Search debounce
  useEffect(() => {
    if (!query.trim()) { setResults(null); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const r = await fetch(`/api/memory?q=${encodeURIComponent(query)}`);
      setResults(await r.json());
    }, 300);
  }, [query]);

  // Reading progress
  function handleContentScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const progress = el.scrollHeight <= el.clientHeight ? 0 : el.scrollTop / (el.scrollHeight - el.clientHeight);
    setScrollProgress(progress * 100);
  }

  // Keyboard navigation
  const selectFile = useCallback((f: MemoryFile) => {
    setActive(f);
    setResults(null);
    setQuery('');
    setScrollProgress(0);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!active || results !== null) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const allFiles = files;
      const idx = allFiles.findIndex(f => f.path === active.path);
      if (e.key === 'ArrowUp' && idx > 0) {
        e.preventDefault();
        selectFile(allFiles[idx - 1]);
        // Scroll sidebar into view
        setTimeout(() => {
          const btn = sidebarRef.current?.querySelector(`[data-path="${allFiles[idx - 1].path}"]`) as HTMLElement;
          btn?.scrollIntoView({ block: 'nearest' });
        }, 0);
      } else if (e.key === 'ArrowDown' && idx < allFiles.length - 1) {
        e.preventDefault();
        selectFile(allFiles[idx + 1]);
        setTimeout(() => {
          const btn = sidebarRef.current?.querySelector(`[data-path="${allFiles[idx + 1].path}"]`) as HTMLElement;
          btn?.scrollIntoView({ block: 'nearest' });
        }, 0);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, files, results, selectFile]);

  function highlightMatch(text: string) {
    if (!query) return escHtml(text);
    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escHtml(text).replace(re, '<mark class="bg-accent/20 text-accent-hover px-0.5 rounded">$1</mark>');
  }

  const coreFiles = files.filter(f => f.type === 'core');
  const dailyFiles = files.filter(f => f.type === 'daily');

  return (
    <div className="flex flex-col h-full">
      {/* Reading progress bar */}
      {active && (
        <div
          className="absolute top-0 left-0 h-0.5 bg-accent transition-all duration-100 z-20 pointer-events-none"
          style={{ width: `${scrollProgress}%` }}
        />
      )}

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

      {/* Mobile file picker */}
      <div className="md:hidden px-4 py-2 border-b border-border bg-surface flex-shrink-0">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {active?.type === 'core'
              ? <Database className="w-4 h-4 text-text-muted" strokeWidth={1.8} />
              : <FileText className="w-4 h-4 text-text-muted" strokeWidth={1.8} />
            }
          </div>
          <select
            value={active?.path || ''}
            onChange={e => {
              const f = files.find(f => f.path === e.target.value);
              if (f) selectFile(f);
            }}
            className="w-full appearance-none pl-9 pr-10 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:border-accent transition-colors text-text-dim"
          >
            <option value="">— Select a memory file —</option>
            {coreFiles.length > 0 && (
              <optgroup label={`Core (${coreFiles.length})`}>
                {coreFiles.map(f => (
                  <option key={f.path} value={f.path}>{f.name}</option>
                ))}
              </optgroup>
            )}
            {dailyFiles.length > 0 && (
              <optgroup label={`Daily (${dailyFiles.length})`}>
                {dailyFiles.map(f => (
                  <option key={f.path} value={f.path}>{f.name}</option>
                ))}
              </optgroup>
            )}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>
        {active && (
          <div className="flex items-center gap-2 mt-1 px-1">
            <span className={`text-[0.55rem] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${
              active.type === 'core' ? 'bg-accent/10 text-accent-hover' : 'bg-blue-500/10 text-blue-400'
            }`}>{active.type}</span>
            <span className="text-[0.6rem] text-text-muted">{(active.size / 1024).toFixed(1)} KB</span>
            <span className="text-[0.55rem] text-text-muted opacity-50">↑↓ arrow keys to navigate</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* File sidebar */}
        <div ref={sidebarRef} className="hidden md:block w-[280px] flex-shrink-0 border-r border-border overflow-y-auto bg-surface">
          {coreFiles.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-5 py-2 border-b border-border sticky top-0 bg-surface z-10">
                <Database className="w-3 h-3 text-accent-hover" strokeWidth={2} />
                <span className="text-[0.6rem] font-semibold text-accent-hover uppercase tracking-wider">Core</span>
                <span className="text-[0.55rem] text-text-muted ml-auto">{coreFiles.length}</span>
              </div>
              {coreFiles.map(f => (
                <button
                  key={f.path}
                  data-path={f.path}
                  onClick={() => selectFile(f)}
                  className={`w-full flex items-center gap-2.5 px-5 py-3 text-left border-l-2 transition-all ${
                    active?.path === f.path
                      ? 'bg-accent-glow border-accent'
                      : 'border-transparent hover:bg-surface2'
                  }`}
                >
                  <Database className="w-4 h-4 text-text-muted flex-shrink-0" strokeWidth={1.8} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.8rem] font-semibold truncate">{f.name}</div>
                    <div className="text-[0.62rem] text-text-muted mt-0.5">{(f.size / 1024).toFixed(1)} KB</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {dailyFiles.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-5 py-2 border-b border-t border-border sticky top-0 bg-surface z-10">
                <FileText className="w-3 h-3 text-blue-400" strokeWidth={2} />
                <span className="text-[0.6rem] font-semibold text-blue-400 uppercase tracking-wider">Daily</span>
                <span className="text-[0.55rem] text-text-muted ml-auto">{dailyFiles.length}</span>
              </div>
              {dailyFiles.map(f => (
                <button
                  key={f.path}
                  data-path={f.path}
                  onClick={() => selectFile(f)}
                  className={`w-full flex items-center gap-2.5 px-5 py-3 text-left border-l-2 transition-all ${
                    active?.path === f.path
                      ? 'bg-accent-glow border-accent'
                      : 'border-transparent hover:bg-surface2'
                  }`}
                >
                  <FileText className="w-4 h-4 text-text-muted flex-shrink-0" strokeWidth={1.8} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.8rem] font-semibold truncate">{f.name}</div>
                    <div className="text-[0.62rem] text-text-muted mt-0.5">
                      {new Date(f.modified).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {(f.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {files.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 gap-2 text-center">
              <Brain className="w-8 h-8 text-text-muted" strokeWidth={1.5} />
              <p className="text-xs text-text-muted">No memory files found</p>
            </div>
          )}
          {/* Keyboard hint */}
          {files.length > 0 && (
            <div className="px-5 py-3 border-t border-border">
              <p className="text-[0.58rem] text-text-muted opacity-50">↑↓ Arrow keys to navigate</p>
            </div>
          )}
        </div>

        {/* Document view */}
        <div ref={contentRef} className="flex-1 overflow-y-auto px-4 py-4 md:p-8" onScroll={handleContentScroll}>
          {active ? (
            <div className="max-w-[800px] mx-auto" dangerouslySetInnerHTML={{ __html: renderMarkdown(active.content) }} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface2 border border-border flex items-center justify-center">
                <Brain className="w-7 h-7 text-text-muted" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">Select a memory file</p>
                <p className="text-xs text-text-muted">Choose from the sidebar to view content</p>
              </div>
            </div>
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
                  if (file) selectFile(file);
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

// Inline Brain icon (avoid import issues)
function Brain({ className, strokeWidth }: { className?: string; strokeWidth?: number }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth || 2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.66zm5 0a2.5 2.5 0 0 0-2.5 2.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.66z"/>
    </svg>
  );
}
