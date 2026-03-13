'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, Plus, Search, Pin, Trash2, Eye, Edit3, X, Save, Tag } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

const CATEGORIES = ['general', 'project', 'runbook', 'meeting'];

const CATEGORY_COLORS: Record<string, string> = {
  general: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  project: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  runbook: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  meeting: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMarkdown(md: string): string {
  return md
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_: string, _lang: string, code: string) =>
      `<pre class="bg-surface border border-border rounded-lg p-4 overflow-x-auto my-3"><code class="text-[0.78rem] text-text-dim">${escHtml(code.trim())}</code></pre>`)
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

function timeAgo(str: string) {
  const diff = Date.now() - new Date(str).getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

const BLANK_NOTE = (): Omit<Note, 'id' | 'createdAt' | 'updatedAt'> => ({
  title: '',
  content: '',
  category: 'general',
  tags: [],
  pinned: false,
  createdBy: 'user',
});

export default function NotesView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [active, setActive] = useState<Note | null>(null);
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [draft, setDraft] = useState<Partial<Note>>({});
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const loadNotes = useCallback(async (q?: string) => {
    const url = q ? `/api/notes?q=${encodeURIComponent(q)}` : '/api/notes';
    const r = await fetch(url);
    if (r.ok) setNotes(await r.json());
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  useEffect(() => {
    if (!search.trim()) { loadNotes(); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadNotes(search), 300);
  }, [search, loadNotes]);

  function startCreate() {
    setCreating(true);
    setActive(null);
    setDraft(BLANK_NOTE());
    setEditing(true);
    setPreview(false);
  }

  function startEdit(note: Note) {
    setActive(note);
    setDraft({ ...note });
    setEditing(true);
    setPreview(false);
    setCreating(false);
  }

  async function saveNote() {
    if (!draft.title?.trim()) return;
    setSaving(true);
    try {
      if (creating) {
        const r = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        });
        if (r.ok) {
          const note = await r.json();
          await loadNotes();
          setActive(note);
          setCreating(false);
          setEditing(false);
        }
      } else if (active) {
        const r = await fetch('/api/notes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: active.id, ...draft }),
        });
        if (r.ok) {
          const updated = await r.json();
          await loadNotes();
          setActive(updated);
          setEditing(false);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(id: string) {
    await fetch('/api/notes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await loadNotes();
    if (active?.id === id) { setActive(null); setEditing(false); }
  }

  async function togglePin(note: Note) {
    await fetch('/api/notes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: note.id, pinned: !note.pinned }),
    });
    await loadNotes();
    if (active?.id === note.id) setActive({ ...note, pinned: !note.pinned });
  }

  const filteredNotes = notes.filter(n => {
    if (catFilter !== 'all' && n.category !== catFilter) return false;
    return true;
  });

  const pinnedNotes = filteredNotes.filter(n => n.pinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.pinned);

  // Group unpinned by category
  const byCategory: Record<string, Note[]> = {};
  for (const n of unpinnedNotes) {
    if (!byCategory[n.category]) byCategory[n.category] = [];
    byCategory[n.category].push(n);
  }

  function cancelEdit() {
    setEditing(false);
    setCreating(false);
    if (!active && !creating) return;
    if (creating) setDraft({});
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar */}
      <aside className="w-64 flex-shrink-0 bg-surface border-r border-border flex flex-col h-full hidden md:flex">
        {/* Search + create */}
        <div className="p-3 border-b border-border flex flex-col gap-2">
          <div className="flex items-center gap-1.5 bg-surface2 rounded-lg px-3 py-2 border border-border">
            <Search className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="flex-1 bg-transparent text-xs outline-none text-text placeholder:text-text-muted"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-text-muted hover:text-text">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            onClick={startCreate}
            className="flex items-center gap-1.5 px-3 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-lg transition-colors w-full justify-center"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> New Note
          </button>
        </div>

        {/* Category filter */}
        <div className="flex gap-0.5 p-2 border-b border-border overflow-x-auto">
          {['all', ...CATEGORIES].map(c => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`px-2 py-1 text-[0.65rem] font-medium rounded capitalize transition-all whitespace-nowrap ${
                catFilter === c ? 'bg-accent/20 text-accent-hover' : 'text-text-muted hover:text-text-dim'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto py-1">
          {filteredNotes.length === 0 && (
            <div className="text-center py-8 text-text-muted text-xs">No notes found</div>
          )}

          {pinnedNotes.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[0.6rem] text-text-muted uppercase tracking-wider font-semibold flex items-center gap-1">
                <Pin className="w-2.5 h-2.5" /> Pinned
              </div>
              {pinnedNotes.map(n => (
                <NoteListItem key={n.id} note={n} active={active?.id === n.id} onClick={() => { setActive(n); setEditing(false); setCreating(false); }} onPin={togglePin} onDelete={deleteNote} />
              ))}
            </div>
          )}

          {Object.entries(byCategory).map(([cat, catNotes]) => (
            <div key={cat}>
              <div className="px-3 py-1.5 text-[0.6rem] text-text-muted uppercase tracking-wider font-semibold capitalize">{cat}</div>
              {catNotes.map(n => (
                <NoteListItem key={n.id} note={n} active={active?.id === n.id} onClick={() => { setActive(n); setEditing(false); setCreating(false); }} onPin={togglePin} onDelete={deleteNote} />
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile: show list or note */}
        {!active && !creating ? (
          <div className="md:hidden flex flex-col h-full">
            <div className="p-3 border-b border-border flex gap-2">
              <div className="flex items-center gap-1.5 bg-surface2 rounded-lg px-3 py-2 border border-border flex-1">
                <Search className="w-3.5 h-3.5 text-text-muted" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="flex-1 bg-transparent text-xs outline-none text-text placeholder:text-text-muted" />
              </div>
              <button onClick={startCreate} className="flex items-center gap-1 px-3 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {filteredNotes.map(n => (
                <NoteListItem key={n.id} note={n} active={false} onClick={() => { setActive(n); setEditing(false); }} onPin={togglePin} onDelete={deleteNote} />
              ))}
            </div>
          </div>
        ) : null}

        {/* Note view/edit */}
        {(active || creating) && (
          <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0">
              <button className="md:hidden text-text-muted hover:text-text" onClick={() => { setActive(null); setCreating(false); setEditing(false); }}>
                <X className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                {editing ? (
                  <input
                    type="text"
                    value={draft.title || ''}
                    onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                    placeholder="Note title..."
                    className="bg-transparent text-base font-semibold outline-none w-full"
                    autoFocus
                  />
                ) : (
                  <h2 className="text-base font-semibold truncate">{active?.title || 'Untitled'}</h2>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {editing && (
                  <>
                    <button
                      onClick={() => setPreview(p => !p)}
                      className={`p-1.5 rounded transition-colors ${preview ? 'text-accent-hover bg-accent/10' : 'text-text-muted hover:text-text'}`}
                      title="Toggle preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={saveNote}
                      disabled={saving}
                      className="flex items-center gap-1 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={cancelEdit} className="p-1.5 text-text-muted hover:text-text rounded transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
                {!editing && active && (
                  <>
                    <button onClick={() => startEdit(active)} className="p-1.5 text-text-muted hover:text-text rounded transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => togglePin(active)} className={`p-1.5 rounded transition-colors ${active.pinned ? 'text-amber-400' : 'text-text-muted hover:text-text'}`}>
                      <Pin className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteNote(active.id)} className="p-1.5 text-text-muted hover:text-red-400 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Edit mode meta */}
            {editing && (
              <div className="flex items-center gap-3 px-4 py-2 border-b border-border flex-shrink-0 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">Category:</span>
                  <select
                    value={draft.category || 'general'}
                    onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}
                    className="bg-surface2 border border-border text-xs rounded px-2 py-1 text-text outline-none"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Tag className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                  <input
                    type="text"
                    value={(draft.tags || []).join(', ')}
                    onChange={e => setDraft(d => ({ ...d, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                    placeholder="tags, comma-separated"
                    className="bg-transparent text-xs outline-none flex-1 text-text placeholder:text-text-muted"
                  />
                </div>
              </div>
            )}

            {/* Content area */}
            <div className="flex-1 overflow-hidden">
              {editing && !preview ? (
                <textarea
                  value={draft.content || ''}
                  onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
                  placeholder="Write in markdown..."
                  className="w-full h-full p-4 bg-transparent text-sm font-mono text-text resize-none outline-none leading-relaxed"
                />
              ) : (
                <div className="h-full overflow-y-auto p-6">
                  {/* Meta when viewing */}
                  {!editing && active && (
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <span className={`text-[0.65rem] px-2 py-0.5 rounded border capitalize ${CATEGORY_COLORS[active.category] || CATEGORY_COLORS.general}`}>
                        {active.category}
                      </span>
                      {active.tags?.map(t => (
                        <span key={t} className="text-[0.65rem] px-2 py-0.5 rounded bg-surface2 border border-border text-text-muted">{t}</span>
                      ))}
                      <span className="text-[0.65rem] text-text-muted ml-auto">Updated {timeAgo(active.updatedAt)}</span>
                    </div>
                  )}
                  {(draft.content || active?.content) ? (
                    <div
                      className="prose-custom"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(preview ? (draft.content || '') : (active?.content || '')) }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-text-muted">
                      <FileText className="w-12 h-12" strokeWidth={1} />
                      <p className="text-sm">Empty note</p>
                      {!editing && <button onClick={() => active && startEdit(active)} className="text-xs text-accent-hover hover:underline">Start writing</button>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state when nothing selected */}
        {!active && !creating && (
          <div className="hidden md:flex flex-col items-center justify-center h-full gap-4 text-text-muted">
            <FileText className="w-16 h-16" strokeWidth={0.8} />
            <div className="text-center">
              <p className="text-sm font-medium">Select a note</p>
              <p className="text-xs mt-1">or create a new one</p>
            </div>
            <button onClick={startCreate} className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-lg transition-colors">
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> New Note
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function NoteListItem({ note, active, onClick, onPin, onDelete }: {
  note: Note;
  active: boolean;
  onClick: () => void;
  onPin: (n: Note) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`group flex items-start gap-2 px-3 py-2.5 cursor-pointer transition-all border-l-2 ${
        active ? 'bg-accent-glow border-accent text-text' : 'border-transparent hover:bg-surface2 text-text-dim'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{note.title || 'Untitled'}</div>
        <div className="text-[0.65rem] text-text-muted mt-0.5 truncate">{note.content.slice(0, 60) || '—'}</div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`text-[0.6rem] px-1.5 py-0.5 rounded border capitalize ${CATEGORY_COLORS[note.category] || ''}`}>{note.category}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {note.pinned && <Pin className="w-3 h-3 text-amber-400" />}
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); onPin(note); }}
            className="p-1 text-text-muted hover:text-amber-400 rounded transition-colors"
          >
            <Pin className="w-3 h-3" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(note.id); }}
            className="p-1 text-text-muted hover:text-red-400 rounded transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
