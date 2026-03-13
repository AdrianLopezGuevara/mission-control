'use client';
import { useState, useRef } from 'react';
import { Plus, Clock } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  assignee?: string;
  priority?: string;
  tags?: string[];
  createdAt?: string;
  timeSpent?: number;   // minutes
  timeEstimate?: number; // minutes
}

function formatTaskTime(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

interface Column {
  id: string;
  label: string;
  color: string;
}

const TASK_COLUMNS: Column[] = [
  { id: 'backlog', label: 'Backlog', color: 'bg-zinc-500' },
  { id: 'in-progress', label: 'In Progress', color: 'bg-blue-500' },
  { id: 'review', label: 'Review', color: 'bg-amber-500' },
  { id: 'done', label: 'Done', color: 'bg-emerald-500' },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500/10 text-red-400 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  normal: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  low: 'bg-zinc-700/10 text-zinc-500 border-zinc-700/20',
};

const PRIORITY_BORDER: Record<string, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-orange-400',
  normal: '',
  low: 'border-l-zinc-700',
};

export default function KanbanBoard({ tasks, onUpdate, onAdd, onEdit }: {
  tasks: Task[];
  onUpdate: (task: Task) => void;
  onAdd: () => void;
  onEdit?: (task: Task) => void;
}) {
  const [filter, setFilter] = useState('all');
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const dragRef = useRef<string | null>(null);
  const [activeCol, setActiveCol] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.assignee === filter);

  function handleDragStart(id: string) {
    setDragging(id);
    dragRef.current = id;
  }

  function handleDrop(status: string) {
    if (dragRef.current) {
      const task = tasks.find(t => t.id === dragRef.current);
      if (task && task.status !== status) {
        onUpdate({ ...task, status });
      }
    }
    setDragging(null);
    setDragOver(null);
    dragRef.current = null;
  }

  function handleScroll() {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const colWidth = scrollWidth / TASK_COLUMNS.length;
    setActiveCol(Math.round(scrollLeft / colWidth));
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border flex-shrink-0">
        <h1 className="text-lg font-semibold tracking-tight">Tasks</h1>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex bg-surface rounded-lg p-0.5 border border-border overflow-x-auto flex-shrink-0">
            {['all', 'migi', 'adrian'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize whitespace-nowrap ${
                  filter === f ? 'bg-accent/20 text-accent-hover' : 'text-text-muted hover:text-text-dim'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button onClick={onAdd} className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0">
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Task
          </button>
        </div>
      </header>

      {/* Snap-scroll on mobile, flex on desktop */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 p-3 md:p-5 flex-1 overflow-x-auto snap-x snap-mandatory md:snap-none"
      >
        {TASK_COLUMNS.map(col => {
          const colTasks = filtered.filter(t => t.status === col.id);
          const isOver = dragOver === col.id;
          return (
            <div
              key={col.id}
              className={`flex-shrink-0 w-[80vw] md:flex-1 md:w-auto md:min-w-[220px] snap-start bg-surface rounded-xl border transition-all flex flex-col ${
                isOver ? 'border-accent/50 shadow-lg shadow-accent/5' : 'border-border md:hover:shadow-md md:hover:shadow-black/20 md:hover:-translate-y-0.5'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(col.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(col.id)}
            >
              {/* Column header */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
                <div className={`w-2 h-2 rounded-full ${col.color}`} />
                <h2 className="text-xs font-semibold text-text-dim uppercase tracking-wider">{col.label}</h2>
                <span className={`ml-auto text-[0.6rem] px-2 py-0.5 rounded-full font-semibold ${
                  colTasks.length > 0 ? 'bg-surface2 text-text-muted border border-border' : 'text-text-muted'
                }`}>
                  {colTasks.length}
                </span>
              </div>

              <div className="flex-1 p-2 overflow-y-auto flex flex-col gap-1.5">
                {/* Ghost placeholder when dragging over */}
                {isOver && dragging && (
                  <div className="drag-ghost" />
                )}

                {/* Empty column state */}
                {colTasks.length === 0 && !isOver && (
                  <div className="flex flex-col items-center justify-center gap-2 py-6 px-3 border-2 border-dashed border-border rounded-lg m-1 opacity-60 hover:opacity-100 transition-opacity">
                    <p className="text-[0.7rem] text-text-muted">No tasks</p>
                    <button
                      onClick={onAdd}
                      className="text-[0.65rem] px-2.5 py-1 rounded-md bg-accent/10 text-accent-hover border border-accent/20 hover:bg-accent/20 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                )}

                {colTasks.map(task => {
                  const pBorder = task.priority ? PRIORITY_BORDER[task.priority] : '';
                  const hasPriorityBorder = !!pBorder;
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      onDragEnd={() => { setDragging(null); setDragOver(null); }}
                      onClick={() => onEdit?.(task)}
                      className={`bg-surface2 border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all hover:border-border-hover hover:shadow-sm ${
                        dragging === task.id ? 'opacity-40 scale-95' : ''
                      } ${hasPriorityBorder ? `border-l-2 ${pBorder}` : ''}`}
                    >
                      <div className="text-sm font-medium mb-1.5 leading-snug">{task.title}</div>
                      {task.description && (
                        <div className="text-xs text-text-muted mb-2 line-clamp-2">{task.description}</div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {task.priority && task.priority !== 'normal' && (
                          <span className={`text-[0.65rem] px-2 py-0.5 rounded border font-medium ${PRIORITY_COLORS[task.priority] || ''}`}>
                            {task.priority}
                          </span>
                        )}
                        {task.tags?.map(tag => (
                          <span key={tag} className="text-[0.65rem] px-2 py-0.5 rounded bg-accent/10 text-accent-hover border border-accent/20">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {task.createdAt && (
                          <span className="text-[0.6rem] text-text-muted flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {timeAgo(task.createdAt)}
                          </span>
                        )}
                        {task.timeSpent && task.timeSpent > 0 ? (
                          <span className="text-[0.6rem] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center gap-0.5">
                            <Clock className="w-2 h-2" />
                            {formatTaskTime(task.timeSpent)}
                          </span>
                        ) : null}
                        {task.assignee && (
                          <span className="ml-auto text-[0.65rem] text-text-muted">{task.assignee}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile column indicator dots */}
      <div className="md:hidden flex items-center justify-center gap-1.5 py-2 border-t border-border flex-shrink-0">
        {TASK_COLUMNS.map((col, i) => (
          <div
            key={col.id}
            className={`rounded-full transition-all ${
              activeCol === i ? 'w-4 h-1.5 bg-accent-hover' : 'w-1.5 h-1.5 bg-border'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
