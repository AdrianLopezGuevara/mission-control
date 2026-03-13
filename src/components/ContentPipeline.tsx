'use client';
import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

interface ContentItem {
  id: string;
  title: string;
  type: string;
  stage: string;
  assignee?: string;
  priority?: string;
  platform?: string;
  tags?: string[];
  attachments?: { name: string }[];
  createdAt?: string;
}

const STAGES = [
  { id: 'idea', label: 'Idea' },
  { id: 'research', label: 'Research' },
  { id: 'script', label: 'Script' },
  { id: 'assets', label: 'Assets' },
  { id: 'production', label: 'Production' },
  { id: 'editing', label: 'Editing' },
  { id: 'review', label: 'Review' },
  { id: 'published', label: 'Published' },
];

const STAGE_COLORS: Record<string, string> = {
  idea: 'bg-yellow-500', research: 'bg-cyan-500', script: 'bg-violet-500', assets: 'bg-pink-500',
  production: 'bg-orange-500', editing: 'bg-blue-500', review: 'bg-amber-500', published: 'bg-emerald-500',
};

const TYPE_FILTERS = ['all', 'video', 'short', 'post', 'reel', 'blog', 'podcast'];

export default function ContentPipeline({ content, onUpdate, onAdd }: {
  content: ContentItem[];
  onUpdate: (item: ContentItem) => void;
  onAdd: () => void;
}) {
  const [filter, setFilter] = useState('all');
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const dragRef = useRef<string | null>(null);
  const [activeCol, setActiveCol] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = filter === 'all' ? content : content.filter(c => c.type === filter);

  function handleDrop(stage: string) {
    if (dragRef.current) {
      const item = content.find(c => c.id === dragRef.current);
      if (item && item.stage !== stage) onUpdate({ ...item, stage });
    }
    setDragging(null);
    setDragOver(null);
    dragRef.current = null;
  }

  function handleScroll() {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth } = scrollRef.current;
    const colWidth = scrollWidth / STAGES.length;
    setActiveCol(Math.round(scrollLeft / colWidth));
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border flex-shrink-0">
        <h1 className="text-lg font-semibold tracking-tight">Content Pipeline</h1>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex bg-surface rounded-lg p-0.5 border border-border overflow-x-auto">
            {TYPE_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 md:px-2.5 py-1.5 text-xs font-medium rounded-md transition-all capitalize whitespace-nowrap ${
                  filter === f ? 'bg-accent/20 text-accent-hover' : 'text-text-muted hover:text-text-dim'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button onClick={onAdd} className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0">
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Content
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-3 p-3 md:p-4 flex-1 overflow-x-auto snap-x snap-mandatory md:snap-none"
      >
        {STAGES.map(stage => {
          const items = filtered.filter(c => c.stage === stage.id);
          const isOver = dragOver === stage.id;
          return (
            <div
              key={stage.id}
              className={`flex-shrink-0 w-[75vw] md:flex-1 md:w-auto md:min-w-[170px] snap-start bg-surface rounded-xl border transition-all flex flex-col ${
                isOver ? 'border-accent/50 shadow-lg shadow-accent/5' : 'border-border md:hover:shadow-md md:hover:shadow-black/20 md:hover:-translate-y-0.5'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(stage.id)}
            >
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                <div className={`w-1.5 h-1.5 rounded-full ${STAGE_COLORS[stage.id] || 'bg-zinc-500'}`} />
                <h2 className="text-[0.7rem] font-semibold text-text-dim uppercase tracking-wider">{stage.label}</h2>
                <span className={`ml-auto text-[0.6rem] px-1.5 py-0.5 rounded-full font-semibold ${
                  items.length > 0 ? 'bg-surface2 text-text-muted border border-border' : 'text-text-muted'
                }`}>
                  {items.length}
                </span>
              </div>

              <div className="flex-1 p-1.5 overflow-y-auto flex flex-col gap-1">
                {/* Ghost placeholder */}
                {isOver && dragging && <div className="drag-ghost" />}

                {/* Empty state */}
                {items.length === 0 && !isOver && (
                  <div className="flex flex-col items-center justify-center gap-1.5 py-5 border-2 border-dashed border-border rounded-lg m-1 opacity-50 hover:opacity-80 transition-opacity">
                    <p className="text-[0.65rem] text-text-muted">Empty</p>
                    <button
                      onClick={onAdd}
                      className="text-[0.6rem] px-2 py-0.5 rounded bg-accent/10 text-accent-hover flex items-center gap-0.5"
                    >
                      <Plus className="w-2.5 h-2.5" /> Add
                    </button>
                  </div>
                )}

                {items.map(item => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => { setDragging(item.id); dragRef.current = item.id; }}
                    onDragEnd={() => { setDragging(null); setDragOver(null); }}
                    className={`bg-surface2 border border-border rounded-lg p-2.5 cursor-grab active:cursor-grabbing transition-all hover:border-border-hover ${
                      dragging === item.id ? 'opacity-40 scale-95' : ''
                    }`}
                  >
                    <div className="text-[0.8rem] font-medium mb-1 leading-snug">{item.title}</div>
                    <div className="flex items-center gap-1.5 text-[0.62rem] text-text-muted">
                      <span className="capitalize">{item.type}</span>
                      {item.platform && <><span>·</span><span>{item.platform}</span></>}
                      {item.attachments?.length ? <span className="ml-auto">{item.attachments.length} files</span> : null}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      {item.assignee && (
                        <span className="text-[0.62rem] text-text-muted">{item.assignee}</span>
                      )}
                      {item.createdAt && (
                        <span className="text-[0.6rem] text-text-muted ml-auto">{timeAgo(item.createdAt)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile column indicator */}
      <div className="md:hidden flex items-center justify-center gap-1 py-2 border-t border-border flex-shrink-0">
        {STAGES.map((stage, i) => (
          <div
            key={stage.id}
            className={`rounded-full transition-all ${
              activeCol === i ? 'w-3 h-1.5 bg-accent-hover' : 'w-1.5 h-1.5 bg-border'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
