'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';

interface AgentStatus {
  id: string;
  name: string;
  avatar: string;
  role: string;
  department: string;
  state: 'idle' | 'working' | 'thinking' | 'writing' | 'searching' | 'reading' | 'executing' | 'done' | 'offline';
  label: string;
  model?: string;
  isHuman?: boolean;
}

const DESK_POSITIONS = [
  { x: 14, y: 14 }, { x: 50, y: 14 }, { x: 86, y: 14 }, { x: 122, y: 14 }, { x: 158, y: 14 },
  { x: 14, y: 56 }, { x: 50, y: 56 }, { x: 86, y: 56 }, { x: 122, y: 56 }, { x: 158, y: 56 },
];

const DW = 26, DH = 10;
const CW = 200, CH = 100;

const COLORS = {
  FL1: '#1e1e35', FL2: '#222240', FL_LINE: '#2a2a4a',
  WALL_TOP: '#0e0e20', WALL_TRIM: '#2a2a50', WALL_BASE: '#1a1a38',
  WIN_FRAME: '#5a3a1a', WIN_GL1: '#4a8ac0', WIN_GL3: '#88c8f8', WIN_SILL: '#6b4f2a',
  DSK1: '#8b6535', DSK2: '#a07845', DSK3: '#5a3a18', DSK_SIDE: '#7a5528',
  CHR1: '#3a3060', CHR2: '#4a4080', CHR3: '#5a50a0',
  MON_BZL: '#444458',
  KBD: '#888898', KBD2: '#aaaacc',
  PLT1: '#2d6a2d', PLT2: '#3a8a3a', PLT3: '#1a4a1a',
  POT: '#8b5e3c', POT2: '#6b4520',
  RUG1: '#3a2860', RUG2: '#2a1850', RUG_BDR: '#5a4080',
  PAPER1: '#e0e8f0', PAPER2: '#d0d8e0',
  LAMP_POST: '#c8a84a',
  CF_TABLE: '#6b4f2a', CF_MACHINE: '#445566', CF_STEAM: '#aaccdd', CF_CUP: '#cc8833',
  WB: '#e8e8d8', WB_FRAME: '#8b6b3a', WB_LINE: '#c8d8e8', WB_TXT: '#6688aa',
  DOOR: '#2a1a10',
};

const STATE_GLOW: Record<string, string> = {
  idle: '#4466ff', working: '#44ff88', writing: '#44ff88', searching: '#4488ff',
  reading: '#ffaa44', executing: '#ff6644', thinking: '#aa44ff', done: '#44ffcc', offline: '#333344',
};

const STATE_DOT: Record<string, string> = {
  idle: '#6688ff', working: '#4ade80', writing: '#4ade80', searching: '#60a5fa',
  reading: '#fb923c', executing: '#f87171', thinking: '#a78bfa', done: '#2dd4bf', offline: '#52525b',
};

export default function OfficeView({ agents }: { agents: AgentStatus[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<AgentStatus | null>(null);
  const [selected, setSelected] = useState<AgentStatus | null>(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });
  const animFrame = useRef(0);
  const [scale, setScale] = useState(3);

  // Responsive scale based on container width
  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      const scaleW = Math.floor((w - 32) / CW);
      const scaleH = Math.floor((h - 80) / CH);
      const s = Math.max(1, Math.min(scaleW, scaleH, 5));
      setScale(s);
    }
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;
    const S = scale;
    const tick = Math.floor(Date.now() / 500);
    const slowTick = Math.floor(Date.now() / 2000);

    function rect(x: number, y: number, w: number, h: number, col: string) { ctx.fillStyle = col; ctx.fillRect(x * S, y * S, w * S, h * S); }
    function hline(x: number, y: number, w: number, col: string) { rect(x, y, w, 1, col); }
    function vline(x: number, y: number, h: number, col: string) { rect(x, y, 1, h, col); }
    function px(x: number, y: number, col: string) { rect(x, y, 1, 1, col); }

    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Floor tiles
    for (let ty = 5; ty < CH - 5; ty += 8) {
      for (let tx = 5; tx < CW - 5; tx += 8) {
        const c = (Math.floor(ty / 8) + Math.floor(tx / 8)) % 2 === 0 ? COLORS.FL1 : COLORS.FL2;
        rect(tx, ty, 8, 8, c);
      }
    }
    ctx.fillStyle = COLORS.FL_LINE;
    for (let ty = 5; ty < CH - 5; ty += 8) ctx.fillRect(5 * S, ty * S, (CW - 10) * S, 1);
    for (let tx = 5; tx < CW - 5; tx += 8) ctx.fillRect(tx * S, 5 * S, 1, (CH - 10) * S);

    // Rug
    rect(70, 36, 60, 22, COLORS.RUG2);
    rect(71, 37, 58, 20, COLORS.RUG1);
    for (let i = 0; i < 58; i += 4) { px(71 + i, 37, COLORS.RUG_BDR); px(71 + i, 56, COLORS.RUG_BDR); }
    for (let i = 0; i < 20; i += 4) { px(71, 37 + i, COLORS.RUG_BDR); px(128, 37 + i, COLORS.RUG_BDR); }

    // Walls
    rect(0, 0, CW, 5, COLORS.WALL_TOP);
    hline(0, 5, CW, COLORS.WALL_TRIM);
    rect(0, CH - 5, CW, 5, COLORS.WALL_TOP);
    hline(0, CH - 5, CW, COLORS.WALL_TRIM);
    rect(0, 0, 5, CH, COLORS.WALL_TOP);
    vline(5, 0, CH, COLORS.WALL_TRIM);
    rect(CW - 5, 0, 5, CH, COLORS.WALL_TOP);
    vline(CW - 5, 0, CH, COLORS.WALL_TRIM);
    hline(5, CH - 6, CW - 10, COLORS.WALL_BASE);
    hline(5, 5, CW - 10, COLORS.WALL_BASE);

    // Windows
    for (const wx of [20, 60, 100, 140]) {
      rect(wx, 1, 16, 4, COLORS.WIN_FRAME);
      rect(wx + 1, 1, 6, 4, COLORS.WIN_GL1);
      rect(wx + 9, 1, 6, 4, COLORS.WIN_GL1);
      hline(wx + 1, 1, 6, COLORS.WIN_GL3);
      hline(wx + 9, 1, 6, COLORS.WIN_GL3);
      vline(wx + 7, 1, 4, COLORS.WIN_FRAME);
      rect(wx - 1, 4, 18, 2, COLORS.WIN_SILL);
    }

    // Whiteboard
    rect(1, 25, 4, 24, COLORS.WB_FRAME);
    rect(2, 26, 3, 22, COLORS.WB);
    for (let i = 0; i < 5; i++) hline(2, 29 + i * 4, 3, COLORS.WB_LINE);
    px(2, 29, COLORS.WB_TXT); px(3, 29, COLORS.WB_TXT);
    px(2, 33, COLORS.WB_TXT); px(3, 33, COLORS.WB_TXT);

    // Coffee station
    rect(8, 80, 20, 12, COLORS.CF_TABLE);
    hline(8, 80, 20, COLORS.DSK2);
    rect(10, 81, 6, 6, COLORS.CF_MACHINE);
    hline(10, 81, 6, '#5566aa');
    rect(19, 84, 4, 4, COLORS.CF_CUP);
    px(20, 82, COLORS.CF_STEAM);
    px(21, 81, COLORS.CF_STEAM);

    // Plants
    drawPlant(ctx, S, CW - 12, 82);
    drawPlant(ctx, S, CW - 12, 10);
    drawPlant(ctx, S, 8, 10);

    // Door
    rect(90, CH - 5, 20, 5, COLORS.DOOR);
    hline(90, CH - 5, 20, COLORS.DSK2);
    px(106, CH - 3, COLORS.LAMP_POST);

    // Desks, chairs, agents
    for (let i = 0; i < agents.length && i < DESK_POSITIONS.length; i++) {
      const agent = agents[i];
      const pos = DESK_POSITIONS[i];
      const glow = STATE_GLOW[agent.state] || STATE_GLOW.idle;

      // Chair — subtle sway for idle agents
      const cx = pos.x + DW / 2 - 5;
      const cy = pos.y + DH + 2;
      // Ambient chair sway for idle
      const chairOffset = agent.state === 'idle' ? Math.sin((slowTick + i) * 0.5) > 0 ? 0 : 0 : 0;
      rect(cx, cy + chairOffset, 10, 7, COLORS.CHR2);
      hline(cx, cy + chairOffset, 10, COLORS.CHR3);
      hline(cx, cy + chairOffset + 6, 10, COLORS.CHR1);
      rect(cx + 1, cy + chairOffset + 1, 8, 5, COLORS.CHR3);
      px(cx, cy + chairOffset + 7, COLORS.MON_BZL);
      px(cx + 9, cy + chairOffset + 7, COLORS.MON_BZL);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect((pos.x + 1) * S, (pos.y + 1) * S, (DW + 1) * S, (DH + 1) * S);

      // Desk
      rect(pos.x, pos.y, DW, DH, COLORS.DSK1);
      hline(pos.x, pos.y, DW, COLORS.DSK2);
      hline(pos.x, pos.y + DH - 1, DW, COLORS.DSK3);
      vline(pos.x, pos.y, DH, COLORS.DSK_SIDE);
      vline(pos.x + DW - 1, pos.y, DH, COLORS.DSK3);

      // Monitor
      rect(pos.x + 6, pos.y + 1, 14, 5, COLORS.MON_BZL);
      rect(pos.x + 7, pos.y + 2, 12, 4, agent.state === 'offline' ? '#222233' : glow);

      // Screen content — flicker for active, subtle idle flicker for idle
      if (agent.state !== 'offline') {
        if (agent.state !== 'idle') {
          // Active: fast screen animation
          const flicker = tick % 2 === 0;
          if (flicker) {
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect((pos.x + 8) * S, (pos.y + 3) * S, 4 * S, S);
            ctx.fillRect((pos.x + 14) * S, (pos.y + 4) * S, 3 * S, S);
          }
        } else {
          // Idle: very subtle screen shimmer (ambient)
          const idleFlicker = Math.sin((Date.now() / 3000) + i * 1.3);
          if (idleFlicker > 0.8) {
            ctx.fillStyle = 'rgba(255,255,255,0.04)';
            ctx.fillRect((pos.x + 8) * S, (pos.y + 2) * S, 10 * S, 3 * S);
          }
        }
      }
      px(pos.x + 7, pos.y + 2, 'rgba(255,255,255,0.25)');

      // Keyboard
      rect(pos.x + 5, pos.y + 7, 13, 2, COLORS.KBD);
      hline(pos.x + 5, pos.y + 7, 13, COLORS.KBD2);
      rect(pos.x + 20, pos.y + 7, 3, 2, COLORS.KBD);

      // Papers — subtle shuffle for idle agents
      const paperShift = agent.state === 'idle' && Math.floor(Date.now() / 5000 + i) % 20 === 0 ? 1 : 0;
      rect(pos.x + 1, pos.y + 2, 4, 3, COLORS.PAPER1);
      rect(pos.x + 2 + paperShift, pos.y + 3, 4, 3, COLORS.PAPER2);

      // Monitor ambient glow
      if (agent.state !== 'offline') {
        ctx.fillStyle = glow;
        ctx.globalAlpha = agent.state === 'idle' ? 0.04 : 0.06;
        ctx.fillRect((pos.x + 4) * S, (pos.y - 1) * S, 18 * S, 9 * S);
        ctx.globalAlpha = 1;
      }

      // Agent character
      if (agent.state !== 'offline') {
        const charX = pos.x + DW / 2 - 2;
        const charY = pos.y + DH + 3;
        drawAgent(ctx, S, charX, charY, agent, tick);
      }

      // Dark bg for nameplate (better readability)
      const nameWidth = agent.name.length * 3.5 + 10;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      const npX = (pos.x + DW / 2 - nameWidth / 2) * S;
      const npY = (pos.y + DH + 11) * S;
      const npW = nameWidth * S;
      const npH = 5 * S;
      const r = S;
      ctx.beginPath();
      ctx.moveTo(npX + r, npY);
      ctx.lineTo(npX + npW - r, npY);
      ctx.quadraticCurveTo(npX + npW, npY, npX + npW, npY + r);
      ctx.lineTo(npX + npW, npY + npH - r);
      ctx.quadraticCurveTo(npX + npW, npY + npH, npX + npW - r, npY + npH);
      ctx.lineTo(npX + r, npY + npH);
      ctx.quadraticCurveTo(npX, npY + npH, npX, npY + npH - r);
      ctx.lineTo(npX, npY + r);
      ctx.quadraticCurveTo(npX, npY, npX + r, npY);
      ctx.closePath();
      ctx.fill();

      ctx.font = `bold ${S * 3}px "Courier New", monospace`;
      ctx.fillStyle = '#c8c8e8';
      ctx.textAlign = 'center';
      ctx.fillText(agent.name, (pos.x + DW / 2) * S, (pos.y + DH + 14.5) * S);

      // Status dot
      const dotColor = STATE_DOT[agent.state] || STATE_DOT.idle;
      ctx.fillStyle = dotColor;
      const dotX = (pos.x + DW / 2 + nameWidth / 2 - 1) * S;
      const dotY = (pos.y + DH + 12.5) * S;
      ctx.beginPath();
      ctx.arc(dotX, dotY, S * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Highlight selected agent
      if (selected && selected.id === agent.id) {
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 2]);
        ctx.strokeRect((pos.x - 1) * S, (pos.y - 1) * S, (DW + 2) * S, (DH + 20) * S);
        ctx.setLineDash([]);
      }
    }

    animFrame.current = requestAnimationFrame(draw);
  }, [agents, scale, selected]);

  useEffect(() => {
    animFrame.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrame.current);
  }, [draw]);

  function getAgentAtPos(mx: number, my: number): AgentStatus | null {
    for (let i = 0; i < agents.length && i < DESK_POSITIONS.length; i++) {
      const pos = DESK_POSITIONS[i];
      if (mx >= pos.x - 2 && mx <= pos.x + DW + 2 && my >= pos.y - 2 && my <= pos.y + DH + 18) {
        return agents[i];
      }
    }
    return null;
  }

  function handleMouseMove(e: React.MouseEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const mx = (e.clientX - r.left) / (r.width / CW);
    const my = (e.clientY - r.top) / (r.height / CH);
    setHovered(getAgentAtPos(mx, my));
    setTooltip({ x: e.clientX, y: e.clientY });
  }

  function handleClick(e: React.MouseEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const mx = (e.clientX - r.left) / (r.width / CW);
    const my = (e.clientY - r.top) / (r.height / CH);
    const agent = getAgentAtPos(mx, my);
    setSelected(prev => prev?.id === agent?.id ? null : agent);
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border flex-shrink-0">
        <h1 className="text-lg font-semibold tracking-tight">Digital Office</h1>
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs text-text-muted">
            {Object.entries({ idle: 'Idle', working: 'Working', thinking: 'Thinking', offline: 'Offline' }).map(([state, label]) => (
              <span key={state} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATE_DOT[state] }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div ref={containerRef} className="flex-1 flex items-center justify-center bg-[#0d0d1a] relative overflow-auto">
          <div className="relative" style={{ border: '2px solid #3a3a5c', boxShadow: '0 0 30px rgba(100,80,200,0.3)' }}>
            <canvas
              ref={canvasRef}
              width={CW * scale}
              height={CH * scale}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHovered(null)}
              onClick={handleClick}
              className="block cursor-pointer"
              style={{ imageRendering: 'pixelated', width: CW * scale, height: CH * scale }}
            />
          </div>

          {/* Hover tooltip (only when not selected) */}
          {hovered && (!selected || selected.id !== hovered.id) && (
            <div
              className="fixed z-50 pointer-events-none bg-surface border border-border rounded-lg px-3 py-2 shadow-xl shadow-black/50"
              style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATE_DOT[hovered.state] }} />
                <span className="text-xs font-semibold">{hovered.name}</span>
                {hovered.isHuman && <span className="text-[0.55rem] px-1 py-0.5 bg-blue-500/10 text-blue-400 rounded uppercase">human</span>}
              </div>
              <div className="text-[0.65rem] text-text-muted">{hovered.role}</div>
              <div className="text-[0.65rem] text-text-dim mt-1 capitalize flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATE_GLOW[hovered.state] }} />
                {hovered.state}: {hovered.label}
              </div>
              {hovered.model && <div className="text-[0.58rem] text-text-muted mt-0.5 font-mono">{hovered.model}</div>}
              <div className="text-[0.55rem] text-text-muted mt-1 opacity-60">Click for details</div>
            </div>
          )}
        </div>

        {/* Selected agent details panel */}
        {selected && (
          <div className="w-[220px] flex-shrink-0 border-l border-border bg-surface p-4 flex flex-col gap-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-dim uppercase tracking-wider">Agent Details</span>
              <button onClick={() => setSelected(null)} className="p-0.5 text-text-muted hover:text-text transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-bg border border-border flex items-center justify-center text-sm font-bold flex-shrink-0">
                {selected.avatar || selected.name.charAt(0)}
              </div>
              <div>
                <div className="text-sm font-semibold">{selected.name}</div>
                <div className="text-[0.65rem] text-text-muted">{selected.role}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-surface2 border border-border rounded-lg px-3 py-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: STATE_DOT[selected.state] }} />
              <div>
                <div className="text-xs font-medium capitalize">{selected.state}</div>
                {selected.label && <div className="text-[0.65rem] text-text-muted mt-0.5 line-clamp-2">{selected.label}</div>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Department</span>
                <span className="text-text-dim capitalize">{selected.department}</span>
              </div>
              {selected.model && (
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Model</span>
                  <span className="text-text-dim font-mono">{selected.model}</span>
                </div>
              )}
              {selected.isHuman && (
                <div className="mt-1">
                  <span className="text-[0.6rem] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded font-medium uppercase">human</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Agent status bar */}
      <div className="flex items-center gap-1 px-3 md:px-4 py-2 border-t border-border bg-surface overflow-x-auto flex-shrink-0 flex-wrap">
        {agents.map(a => (
          <button
            key={a.id}
            onClick={() => setSelected(prev => prev?.id === a.id ? null : a)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[0.65rem] flex-shrink-0 transition-colors ${
              selected?.id === a.id ? 'bg-accent-glow border-accent/40' : 'bg-surface2 border-border hover:border-border-hover'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATE_DOT[a.state] }} />
            <span className="font-medium text-text-dim">{a.name}</span>
            <span className="text-text-muted capitalize">{a.state}</span>
          </button>
        ))}
        {agents.length === 0 && (
          <span className="text-xs text-text-muted py-1">No agents online</span>
        )}
      </div>
    </div>
  );
}

function drawAgent(ctx: CanvasRenderingContext2D, S: number, x: number, y: number, agent: AgentStatus, tick: number) {
  const skinTones = ['#f4c7a3', '#d4a574', '#c49565', '#8d5524', '#e8b888'];
  const skin = skinTones[Math.abs(hashStr(agent.name)) % skinTones.length];
  const hairColors = ['#2c1810', '#4a3728', '#8b4513', '#654321', '#1a1a2e', '#c0392b', '#e67e22'];
  const hair = hairColors[Math.abs(hashStr(agent.name + 'h')) % hairColors.length];
  const shirtColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];
  const shirt = shirtColors[Math.abs(hashStr(agent.name + 's')) % shirtColors.length];

  const r = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x * S, y * S, w * S, h * S); };

  r(x + 1, y - 3, 3, 3, skin);
  r(x + 1, y - 3, 3, 1, hair);
  ctx.fillStyle = hair;
  ctx.fillRect(x * S, (y - 3) * S, S, 2 * S);
  r(x, y, 5, 3, shirt);

  if (agent.state === 'writing' || agent.state === 'executing' || agent.state === 'working') {
    const armShift = tick % 2;
    r(x - 1, y + 1 + armShift, 1, 1, skin);
    r(x + 5, y + 1 + (1 - armShift), 1, 1, skin);
  } else if (agent.state === 'idle') {
    // Subtle resting arm pose
    r(x - 1, y + 2, 1, 1, skin);
    r(x + 5, y + 2, 1, 1, skin);
  } else {
    r(x - 1, y + 1, 1, 2, skin);
    r(x + 5, y + 1, 1, 2, skin);
  }

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect((x + 1.5) * S, (y - 2) * S, S * 0.8, S * 0.8);
  ctx.fillRect((x + 3) * S, (y - 2) * S, S * 0.8, S * 0.8);
}

function drawPlant(ctx: CanvasRenderingContext2D, S: number, x: number, y: number) {
  const r = (px: number, py: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(px * S, py * S, w * S, h * S); };
  r(x + 1, y + 4, 4, 3, COLORS.POT); r(x + 1, y + 4, 4, 1, COLORS.POT2);
  r(x + 2, y + 2, 2, 2, COLORS.PLT1); r(x + 1, y + 1, 4, 2, COLORS.PLT2);
  r(x, y, 2, 2, COLORS.PLT3); r(x + 4, y, 2, 2, COLORS.PLT1);
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}
