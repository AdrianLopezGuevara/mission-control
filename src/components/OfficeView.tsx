'use client';
import { useEffect, useRef, useState } from 'react';
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

interface AgentPos {
  x: number; y: number;
  targetX: number; targetY: number;
  direction: 'up' | 'down' | 'left' | 'right';
  walkTimer: number;
  screenGlow: string;
  glowTarget: string;
  bubbleText: string;
  bubbleTimer: number;
}

const DW = 26, DH = 10;
const CW = 200, CH = 100;
const FLOOR_XMIN = 7, FLOOR_XMAX = 192, FLOOR_YMIN = 7, FLOOR_YMAX = 88;
const WORKING_STATES = new Set(['working','writing','searching','reading','executing','thinking','done']);

const DESK_POSITIONS = [
  { x: 14, y: 14 }, { x: 50, y: 14 }, { x: 86, y: 14 }, { x: 122, y: 14 }, { x: 158, y: 14 },
  { x: 14, y: 56 }, { x: 50, y: 56 }, { x: 86, y: 56 }, { x: 122, y: 56 }, { x: 158, y: 56 },
];

const C = {
  FL1:'#1e1e35', FL2:'#222240', FL_LINE:'#2a2a4a',
  WALL_TOP:'#0e0e20', WALL_TRIM:'#2a2a50', WALL_BASE:'#1a1a38',
  WIN_FRAME:'#5a3a1a', WIN_GL1:'#4a8ac0', WIN_GL3:'#88c8f8', WIN_SILL:'#6b4f2a',
  DSK1:'#8b6535', DSK2:'#a07845', DSK3:'#5a3a18', DSK_SIDE:'#7a5528',
  CHR1:'#3a3060', CHR2:'#4a4080', CHR3:'#5a50a0',
  MON_BZL:'#444458',
  KBD:'#888898', KBD2:'#aaaacc',
  PLT1:'#2d6a2d', PLT2:'#3a8a3a', PLT4:'#4aaa4a',
  POT:'#8b5e3c', POT2:'#6b4520',
  RUG1:'#3a2860', RUG2:'#2a1850', RUG_BDR:'#5a4080',
  PAPER1:'#e0e8f0', PAPER2:'#d0d8e0',
  LAMP_POST:'#c8a84a', LAMP_HEAD:'#e8c860',
  CF_TABLE:'#6b4f2a', CF_MACHINE:'#445566', CF_STEAM:'#aaccdd', CF_CUP:'#cc8833',
  WB:'#e8e8d8', WB_FRAME:'#8b6b3a', WB_LINE:'#c8d8e8', WB_TXT:'#6688aa',
  DOOR:'#2a1a10',
};

const GL_IDLE = '#4466ff';
const GLOW_MAP: Record<string,string> = {
  idle:GL_IDLE, working:'#44ff88', writing:'#44ff88', searching:'#4488ff',
  reading:'#ffaa44', executing:'#ff6644', thinking:'#aa44ff', done:'#44ffcc', offline:'#333344',
};
const STATE_DOT: Record<string,string> = {
  idle:'#6688ff', working:'#4ade80', writing:'#4ade80', searching:'#60a5fa',
  reading:'#fb923c', executing:'#f87171', thinking:'#a78bfa', done:'#2dd4bf', offline:'#52525b',
};

// Pixel art sprites — down/up/right (left = mirrored right)
const SPR_DOWN: string[][] = [
  ['.','H','H','H','H','.'],
  ['H','S','S','S','S','H'],
  ['.','S','E','S','E','.'],
  ['.','S','S','S','S','.'],
  ['C','C','C','C','C','C'],
  ['C','.','C','C','.','C'],
  ['.','P','.','.','P','.'],
  ['.','O','.','.','O','.'],
];
const SPR_UP: string[][] = [
  ['.','H','H','H','H','.'],
  ['H','H','h','h','H','H'],
  ['.','H','H','H','H','.'],
  ['C','C','C','C','C','C'],
  ['C','.','C','C','.','C'],
  ['.','P','.','.','P','.'],
  ['.','O','.','.','O','.'],
];
const SPR_RIGHT: string[][] = [
  ['.','H','H','H','.'],
  ['H','S','S','S','H'],
  ['H','S','E','S','.'],
  ['.','S','S','S','.'],
  ['.','C','C','C','C'],
  ['.','C','.','C','.'],
  ['.','P','.','P','.'],
  ['.','O','.','O','.'],
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}
function hexToRgb(h: string): [number,number,number] {
  if (!h.startsWith('#')||h.length<7) return [0,0,0];
  return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
}
function lerpColor(a: string, b: string, t: number): string {
  if (!a.startsWith('#')||!b.startsWith('#')) return b;
  const [r1,g1,b1]=hexToRgb(a),[r2,g2,b2]=hexToRgb(b);
  const r=Math.round(r1+(r2-r1)*t),g=Math.round(g1+(g2-g1)*t),bl=Math.round(b1+(b2-b1)*t);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${bl.toString(16).padStart(2,'0')}`;
}
function lightenHex(hex: string, amount: number): string {
  const [r,g,b]=hexToRgb(hex);
  return `#${Math.min(255,Math.round(r+(255-r)*amount)).toString(16).padStart(2,'0')}${Math.min(255,Math.round(g+(255-g)*amount)).toString(16).padStart(2,'0')}${Math.min(255,Math.round(b+(255-b)*amount)).toString(16).padStart(2,'0')}`;
}
function getAgentColors(name: string) {
  const skins=['#f4c7a3','#d4a574','#c49565','#8d5524','#e8b888'];
  const hairs=['#2c1810','#4a3728','#8b4513','#654321','#1a1a2e','#c0392b','#e67e22'];
  const shirts=['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#6366f1'];
  const skin=skins[Math.abs(hashStr(name))%skins.length];
  const hair=hairs[Math.abs(hashStr(name+'h'))%hairs.length];
  const shirt=shirts[Math.abs(hashStr(name+'s'))%shirts.length];
  return {skin,hair,shirt,hairLight:lightenHex(hair,0.35)};
}
function isInDeskZone(x: number, y: number): boolean {
  for (const d of DESK_POSITIONS) {
    if (x>=d.x-2&&x<=d.x+DW+2&&y>=d.y-2&&y<=d.y+DH+14) return true;
  }
  return false;
}

function drawSprite(ctx: CanvasRenderingContext2D, S: number, x: number, y: number,
  dir: 'up'|'down'|'left'|'right',
  colors: {skin:string;hair:string;shirt:string;hairLight:string}) {
  const pal: Record<string,string|null> = {
    H:colors.hair, h:colors.hairLight, S:colors.skin,
    E:'#1a1a1a', C:colors.shirt, P:'#2a2a4a', O:'#1a1210', '.':null,
  };
  let data: string[][];
  let flipX = false;
  if (dir==='up') data=SPR_UP;
  else if (dir==='right') data=SPR_RIGHT;
  else if (dir==='left') { data=SPR_RIGHT; flipX=true; }
  else data=SPR_DOWN;
  const rw = data[0]?.length??6;
  for (let r=0;r<data.length;r++) {
    const row=data[r]; if (!row||row.length===0) continue;
    for (let c=0;c<row.length;c++) {
      const col=pal[row[c]]; if (!col) continue;
      ctx.fillStyle=col;
      const cx=flipX?(x+rw-1-c):(x+c);
      ctx.fillRect(cx*S,(y+r)*S,S,S);
    }
  }
}

function drawBubble(ctx: CanvasRenderingContext2D, S: number,
  charX: number, charY: number, text: string, isThought: boolean) {
  const t=text.substring(0,12);
  const bw=Math.max(20,t.length*4+8);
  const bx=charX-Math.floor(bw/2), by=charY-22, bh=9;
  ctx.fillStyle='#ffffff'; ctx.fillRect(bx*S,by*S,bw*S,bh*S);
  ctx.strokeStyle='#cccccc'; ctx.lineWidth=1; ctx.strokeRect(bx*S,by*S,bw*S,bh*S);
  if (isThought) {
    ctx.fillStyle='#cccccc';
    ctx.fillRect(charX*S,(by+bh)*S,S,S);
    ctx.fillRect((charX-1)*S,(by+bh+1)*S,S,S);
    ctx.fillRect((charX-2)*S,(by+bh+2)*S,S,S);
  } else {
    ctx.fillStyle='#fff';
    ctx.fillRect(charX*S,(by+bh)*S,2*S,3*S);
    ctx.fillRect((charX+1)*S,(by+bh+2)*S,S,S);
  }
  ctx.fillStyle='#1a1a2e';
  ctx.font=`${Math.max(7,S*3)}px "Courier New",monospace`;
  ctx.textAlign='left';
  ctx.fillText(t,(bx+2)*S,(by+6)*S);
}

function drawPlant(ctx: CanvasRenderingContext2D, S: number, cx: number, cy: number) {
  ctx.fillStyle=C.POT; ctx.fillRect((cx-3)*S,(cy+3)*S,7*S,4*S);
  ctx.fillStyle=C.DSK2; ctx.fillRect((cx-3)*S,(cy+3)*S,7*S,S);
  ctx.fillStyle=C.POT2; ctx.fillRect((cx-2)*S,(cy+4)*S,5*S,3*S);
  const leaves: [number,number][]= [[0,-3],[1,-4],[-1,-3],[2,-2],[-2,-2],[0,-5],[1,-2],[-1,-4],[2,-4],[-2,-4]];
  for (const [dx,dy] of leaves) {
    ctx.fillStyle=dy<-3?C.PLT2:dy===-2?C.PLT4:C.PLT1;
    ctx.fillRect((cx+dx)*S,(cy+dy)*S,S,S);
  }
  ctx.fillStyle=C.PLT2; ctx.fillRect(cx*S,(cy-3)*S,S,S);
}

function drawLamp(ctx: CanvasRenderingContext2D, S: number, x: number, y: number) {
  ctx.fillStyle='rgba(255,232,100,0.12)';
  ctx.beginPath(); ctx.arc((x+1)*S,(y+2)*S,12*S,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=C.LAMP_HEAD; ctx.fillRect(x*S,y*S,3*S,3*S);
  ctx.fillStyle='#fff0a0'; ctx.fillRect(x*S,y*S,3*S,S);
  ctx.fillStyle=C.LAMP_POST; ctx.fillRect((x+1)*S,(y+2)*S,S,8*S);
  ctx.fillStyle=C.POT; ctx.fillRect(x*S,(y+9)*S,3*S,2*S);
}

export default function OfficeView({ agents }: { agents: AgentStatus[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<AgentStatus|null>(null);
  const [selected, setSelected] = useState<AgentStatus|null>(null);
  const [tooltip, setTooltip] = useState({x:0,y:0});
  const [scale, setScale] = useState(3);

  const agentsRef = useRef<AgentStatus[]>(agents);
  const agentPosRef = useRef<AgentPos[]>([]);
  const selectedRef = useRef<AgentStatus|null>(null);
  const prevAgentsRef = useRef<AgentStatus[]>([]);
  const frameRef = useRef(0);

  useEffect(() => { agentsRef.current = agents; }, [agents]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  // Initialize positions and handle state changes
  useEffect(() => {
    const prev = prevAgentsRef.current;
    agents.forEach((agent, i) => {
      const glow = GLOW_MAP[agent.state] || GL_IDLE;
      let pos = agentPosRef.current[i];
      if (!pos) {
        let x = FLOOR_XMIN, y = FLOOR_YMIN;
        for (let t=0; t<15; t++) {
          x = FLOOR_XMIN + Math.floor(Math.random()*(FLOOR_XMAX-FLOOR_XMIN));
          y = FLOOR_YMIN + Math.floor(Math.random()*(FLOOR_YMAX-FLOOR_YMIN));
          if (!isInDeskZone(x,y)) break;
        }
        agentPosRef.current[i] = {
          x, y, targetX:x, targetY:y, direction:'down',
          walkTimer: Math.floor(Math.random()*20),
          screenGlow:glow, glowTarget:glow, bubbleText:'', bubbleTimer:0,
        };
        pos = agentPosRef.current[i];
      }
      pos.glowTarget = glow;
      const prevAgent = prev[i];
      if (prevAgent && prevAgent.state !== agent.state) {
        if (agent.state==='done') { pos.bubbleText='Your turn!'; pos.bubbleTimer=999; }
        else if (agent.state==='thinking') { pos.bubbleText='...'; pos.bubbleTimer=999; }
        else if (WORKING_STATES.has(agent.state)&&agent.label) {
          pos.bubbleText=agent.label.substring(0,12); pos.bubbleTimer=24;
        } else { pos.bubbleText=''; pos.bubbleTimer=0; }
        if (!WORKING_STATES.has(prevAgent.state)&&WORKING_STATES.has(agent.state)) {
          const d=DESK_POSITIONS[i%DESK_POSITIONS.length];
          pos.targetX=d.x+Math.floor(DW/2)-3; pos.targetY=d.y+DH+5;
        }
        if (WORKING_STATES.has(prevAgent.state)&&!WORKING_STATES.has(agent.state)) {
          pos.walkTimer=25;
        }
      }
    });
    prevAgentsRef.current=[...agents];
  }, [agents]);

  // Responsive scale
  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return;
      const w=containerRef.current.clientWidth, h=containerRef.current.clientHeight;
      setScale(Math.max(1,Math.min(Math.floor((w-32)/CW),Math.floor((h-80)/CH),5)));
    }
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Animation loop — runs once, reads everything from refs
  useEffect(() => {
    let raf: number;
    let lastTime = 0;
    function loop(ts: number) {
      raf = requestAnimationFrame(loop);
      if (ts-lastTime<125) return;
      lastTime=ts; frameRef.current++;
      const canvas=canvasRef.current; if (!canvas) return;
      const ctx=canvas.getContext('2d') as CanvasRenderingContext2D; if (!ctx) return;
      const agts=agentsRef.current;
      const positions=agentPosRef.current;
      const S=Math.max(1,Math.round(canvas.width/CW));
      const frame=frameRef.current;

      // Tick agents
      for (let i=0;i<agts.length&&i<positions.length;i++) {
        const agent=agts[i]; const pos=positions[i]; if (!pos) continue;
        const isWorking=WORKING_STATES.has(agent.state);
        if (pos.screenGlow!==pos.glowTarget) pos.screenGlow=lerpColor(pos.screenGlow,pos.glowTarget,0.2);
        if (!isWorking) {
          pos.walkTimer++;
          const atTarget=Math.abs(pos.x-pos.targetX)<2&&Math.abs(pos.y-pos.targetY)<2;
          if (pos.walkTimer>20||atTarget) {
            let nx=0,ny=0,tries=0;
            do {
              nx=FLOOR_XMIN+Math.floor(Math.random()*(FLOOR_XMAX-FLOOR_XMIN));
              ny=FLOOR_YMIN+Math.floor(Math.random()*(FLOOR_YMAX-FLOOR_YMIN));
              tries++;
            } while (tries<10&&isInDeskZone(nx,ny));
            pos.targetX=nx; pos.targetY=ny; pos.walkTimer=0;
          }
        }
        const dx=pos.targetX-pos.x, dy=pos.targetY-pos.y;
        if (Math.abs(dx)>1) { pos.x+=dx>0?1:-1; if(Math.abs(dx)>=Math.abs(dy)) pos.direction=dx>0?'right':'left'; }
        if (Math.abs(dy)>1) { pos.y+=dy>0?1:-1; if(Math.abs(dy)>Math.abs(dx)) pos.direction=dy>0?'down':'up'; }
        pos.x=Math.max(FLOOR_XMIN,Math.min(FLOOR_XMAX,pos.x));
        pos.y=Math.max(FLOOR_YMIN,Math.min(FLOOR_YMAX,pos.y));
        if (pos.bubbleTimer>0) {
          if (agent.state!=='done'&&agent.state!=='thinking') pos.bubbleTimer--;
          if (pos.bubbleTimer===0) pos.bubbleText='';
        }
      }

      // ── Draw ────────────────────────────────────────────────────────────────
      function rect(x:number,y:number,w:number,h:number,col:string){ctx.fillStyle=col;ctx.fillRect(x*S,y*S,w*S,h*S);}
      function hline(x:number,y:number,w:number,col:string){rect(x,y,w,1,col);}
      function vline(x:number,y:number,h:number,col:string){rect(x,y,1,h,col);}
      function px(x:number,y:number,col:string){rect(x,y,1,1,col);}

      ctx.fillStyle='#0d0d1a'; ctx.fillRect(0,0,canvas.width,canvas.height);

      // Floor tiles
      for (let ty=5;ty<CH-5;ty+=8) for (let tx=5;tx<CW-5;tx+=8)
        rect(tx,ty,8,8,(Math.floor(ty/8)+Math.floor(tx/8))%2===0?C.FL1:C.FL2);
      ctx.fillStyle=C.FL_LINE;
      for (let ty=5;ty<CH-5;ty+=8) ctx.fillRect(5*S,ty*S,(CW-10)*S,1);
      for (let tx=5;tx<CW-5;tx+=8) ctx.fillRect(tx*S,5*S,1,(CH-10)*S);

      // Rug
      rect(68,36,64,22,C.RUG2); rect(69,37,62,20,C.RUG1);
      for (let i=0;i<62;i+=4){px(69+i,37,C.RUG_BDR);px(69+i,56,C.RUG_BDR);}
      for (let i=0;i<20;i+=4){px(69,37+i,C.RUG_BDR);px(130,37+i,C.RUG_BDR);}

      // Walls
      rect(0,0,CW,5,C.WALL_TOP); hline(0,5,CW,C.WALL_TRIM);
      rect(0,CH-5,CW,5,C.WALL_TOP); hline(0,CH-5,CW,C.WALL_TRIM);
      rect(0,0,5,CH,C.WALL_TOP); vline(5,0,CH,C.WALL_TRIM);
      rect(CW-5,0,5,CH,C.WALL_TOP); vline(CW-5,0,CH,C.WALL_TRIM);
      hline(5,CH-6,CW-10,C.WALL_BASE); hline(5,5,CW-10,C.WALL_BASE);
      vline(5,5,CH-10,C.WALL_BASE); vline(CW-6,5,CH-10,C.WALL_BASE);

      // Windows (top wall)
      for (const wx of [20,60,100,140]) {
        rect(wx,1,16,4,C.WIN_FRAME);
        rect(wx+1,1,6,4,C.WIN_GL1); rect(wx+9,1,6,4,C.WIN_GL1);
        hline(wx+1,1,6,C.WIN_GL3); hline(wx+9,1,6,C.WIN_GL3);
        vline(wx+1,1,2,C.WIN_GL3); vline(wx+9,1,2,C.WIN_GL3);
        vline(wx+7,1,4,C.WIN_FRAME);
        rect(wx-1,4,18,2,C.WIN_SILL); hline(wx-1,4,18,C.DSK2);
      }

      // Whiteboard (left wall)
      rect(1,28,4,24,C.WB_FRAME); rect(2,29,3,22,C.WB);
      for (let i=0;i<5;i++) hline(2,32+i*4,3,C.WB_LINE);
      px(2,32,C.WB_TXT);px(3,32,C.WB_TXT); px(2,36,C.WB_TXT);
      px(2,40,C.WB_TXT);px(3,40,C.WB_TXT);px(4,40,C.WB_TXT); px(2,44,C.WB_TXT);
      px(2,29,C.LAMP_POST);px(4,29,C.LAMP_POST); px(2,50,C.LAMP_POST);px(4,50,C.LAMP_POST);

      // Plants (4 corners-ish)
      drawPlant(ctx,S,10,84); drawPlant(ctx,S,186,84); drawPlant(ctx,S,10,12);

      // Lamp (top-right corner)
      drawLamp(ctx,S,185,7);

      // Coffee station (bottom-right)
      rect(168,78,22,14,C.CF_TABLE); hline(168,78,22,C.DSK2);
      rect(170,79,8,8,C.CF_MACHINE); hline(170,79,8,'#5566aa');
      px(171,80,'#7788cc'); px(172,80,'#7788cc');
      rect(181,82,4,4,C.CF_CUP); hline(181,82,4,'#dd9944');
      // Animated steam
      const steamOff=frame%2;
      px(182,80+steamOff,C.CF_STEAM); px(183,79+(1-steamOff),C.CF_STEAM);
      rect(185,83,4,3,'#cc5533'); hline(185,83,4,'#ee7755');

      // Door (bottom wall)
      rect(90,CH-5,20,5,C.DOOR); hline(90,CH-5,20,C.DSK2);
      rect(91,CH-4,18,4,'#3a2818');
      px(100,CH-3,C.LAMP_POST); px(101,CH-3,C.LAMP_POST);

      // Chairs (draw before desks)
      for (let i=0;i<DESK_POSITIONS.length;i++) {
        const d=DESK_POSITIONS[i];
        const cx=d.x+Math.floor(DW/2)-5, cy=d.y+DH+2;
        rect(cx,cy,10,7,C.CHR2); hline(cx,cy,10,C.CHR3); hline(cx,cy+6,10,C.CHR1);
        rect(cx+1,cy+1,8,5,C.CHR3);
        px(cx,cy+7,C.MON_BZL); px(cx+4,cy+7,C.MON_BZL); px(cx+9,cy+7,C.MON_BZL);
      }

      // Desks + monitors
      for (let i=0;i<DESK_POSITIONS.length;i++) {
        const d=DESK_POSITIONS[i];
        const agent=agts[i];
        const pos=positions[i];
        const glow=pos?pos.screenGlow:GL_IDLE;
        const isOffline=agent?.state==='offline';
        // Shadow
        ctx.fillStyle='rgba(0,0,0,0.25)';
        ctx.fillRect((d.x+1)*S,(d.y+1)*S,(DW+1)*S,(DH+1)*S);
        // Surface
        rect(d.x,d.y,DW,DH,C.DSK1);
        hline(d.x,d.y,DW,C.DSK2); hline(d.x,d.y+DH-1,DW,C.DSK3);
        vline(d.x,d.y,DH,C.DSK_SIDE); vline(d.x+DW-1,d.y,DH,C.DSK3);
        // Monitor
        rect(d.x+6,d.y+1,14,5,C.MON_BZL);
        rect(d.x+7,d.y+2,12,4,isOffline?'#222233':glow);
        px(d.x+7,d.y+2,'rgba(255,255,255,0.25)');
        px(d.x+8,d.y+2,'rgba(255,255,255,0.15)');
        // Screen flicker for active agents
        if (!isOffline&&agent&&WORKING_STATES.has(agent.state)&&frame%2===0) {
          ctx.fillStyle='rgba(255,255,255,0.15)';
          ctx.fillRect((d.x+8)*S,(d.y+3)*S,4*S,S);
          ctx.fillRect((d.x+14)*S,(d.y+4)*S,3*S,S);
        }
        // Monitor ambient glow
        if (!isOffline) {
          ctx.fillStyle=glow; ctx.globalAlpha=0.07;
          ctx.fillRect((d.x+4)*S,(d.y-1)*S,18*S,9*S);
          ctx.globalAlpha=1;
        }
        // Keyboard
        rect(d.x+5,d.y+7,13,2,C.KBD); hline(d.x+5,d.y+7,13,C.KBD2);
        for (let k=0;k<6;k++) px(d.x+6+k*2,d.y+7,C.KBD2);
        rect(d.x+20,d.y+7,3,2,C.KBD); px(d.x+21,d.y+7,C.KBD2);
        // Papers
        rect(d.x+1,d.y+2,4,3,C.PAPER1); rect(d.x+2,d.y+3,4,3,C.PAPER2);
      }

      // Draw agents (on top of desks/chairs)
      for (let i=0;i<agts.length&&i<DESK_POSITIONS.length;i++) {
        const agent=agts[i]; const pos=positions[i];
        if (!pos||agent?.state==='offline') continue;
        const colors=getAgentColors(agent.name);
        const dir=pos.direction;
        const offX=(dir==='right'||dir==='left')?pos.x-2:pos.x-3;
        const charY=pos.y-7;
        // Shadow
        ctx.fillStyle='rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse((pos.x+2)*S,(pos.y+1)*S,5*S,2*S,0,0,Math.PI*2); ctx.fill();
        // Sprite
        drawSprite(ctx,S,offX,charY,dir,colors);
        // Nameplate (at desk, not following agent)
        const d=DESK_POSITIONS[i];
        const nameW=agent.name.length*3.5+10;
        ctx.fillStyle='rgba(0,0,0,0.65)';
        const npX=(d.x+DW/2-nameW/2)*S, npY=(d.y+DH+11)*S, npW=nameW*S, npH=5*S, rr=S;
        ctx.beginPath();
        ctx.moveTo(npX+rr,npY); ctx.lineTo(npX+npW-rr,npY);
        ctx.quadraticCurveTo(npX+npW,npY,npX+npW,npY+rr);
        ctx.lineTo(npX+npW,npY+npH-rr); ctx.quadraticCurveTo(npX+npW,npY+npH,npX+npW-rr,npY+npH);
        ctx.lineTo(npX+rr,npY+npH); ctx.quadraticCurveTo(npX,npY+npH,npX,npY+npH-rr);
        ctx.lineTo(npX,npY+rr); ctx.quadraticCurveTo(npX,npY,npX+rr,npY); ctx.closePath(); ctx.fill();
        ctx.font=`bold ${S*3}px "Courier New",monospace`;
        ctx.fillStyle='#c8c8e8'; ctx.textAlign='center';
        ctx.fillText(agent.name,(d.x+DW/2)*S,(d.y+DH+14.5)*S);
        // Status dot
        ctx.fillStyle=STATE_DOT[agent.state]||STATE_DOT.idle;
        ctx.beginPath(); ctx.arc((d.x+DW/2+nameW/2-1)*S,(d.y+DH+12.5)*S,S*1.2,0,Math.PI*2); ctx.fill();
        // Speech bubble
        if (pos.bubbleTimer>0&&pos.bubbleText) {
          drawBubble(ctx,S,pos.x,pos.y,pos.bubbleText,agent.state==='thinking');
        }
        // Selected highlight
        if (selectedRef.current?.id===agent.id) {
          ctx.strokeStyle='#8b5cf6'; ctx.lineWidth=1.5; ctx.setLineDash([3,2]);
          ctx.strokeRect((d.x-1)*S,(d.y-1)*S,(DW+2)*S,(DH+20)*S);
          ctx.setLineDash([]);
        }
      }
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []); // runs once, reads from refs

  function getAgentAtPos(mx: number, my: number): AgentStatus|null {
    for (let i=0;i<agents.length&&i<DESK_POSITIONS.length;i++) {
      const d=DESK_POSITIONS[i];
      if (mx>=d.x-2&&mx<=d.x+DW+2&&my>=d.y-2&&my<=d.y+DH+18) return agents[i];
    }
    return null;
  }
  function handleMouseMove(e: React.MouseEvent) {
    const canvas=canvasRef.current; if (!canvas) return;
    const r=canvas.getBoundingClientRect();
    const mx=(e.clientX-r.left)/(r.width/CW), my=(e.clientY-r.top)/(r.height/CH);
    setHovered(getAgentAtPos(mx,my)); setTooltip({x:e.clientX,y:e.clientY});
  }
  function handleClick(e: React.MouseEvent) {
    const canvas=canvasRef.current; if (!canvas) return;
    const r=canvas.getBoundingClientRect();
    const mx=(e.clientX-r.left)/(r.width/CW), my=(e.clientY-r.top)/(r.height/CH);
    const agent=getAgentAtPos(mx,my);
    setSelected(prev=>prev?.id===agent?.id?null:agent);
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border flex-shrink-0">
        <h1 className="text-lg font-semibold tracking-tight">Digital Office</h1>
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs text-text-muted">
            {Object.entries({idle:'Idle',working:'Working',thinking:'Thinking',done:'Done',offline:'Offline'}).map(([state,label])=>(
              <span key={state} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{backgroundColor:STATE_DOT[state]}}/>
                {label}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div ref={containerRef} className="flex-1 flex items-center justify-center bg-[#0d0d1a] relative overflow-auto">
          <div className="relative" style={{border:'2px solid #3a3a5c',boxShadow:'0 0 30px rgba(100,80,200,0.3),0 0 60px rgba(100,80,200,0.1)'}}>
            <canvas
              ref={canvasRef}
              width={CW*scale} height={CH*scale}
              onMouseMove={handleMouseMove}
              onMouseLeave={()=>setHovered(null)}
              onClick={handleClick}
              className="block cursor-pointer"
              style={{imageRendering:'pixelated',width:CW*scale,height:CH*scale}}
            />
          </div>
          {hovered&&(!selected||selected.id!==hovered.id)&&(
            <div className="fixed z-50 pointer-events-none bg-surface border border-border rounded-lg px-3 py-2 shadow-xl shadow-black/50"
              style={{left:tooltip.x+12,top:tooltip.y-10}}>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full" style={{backgroundColor:STATE_DOT[hovered.state]}}/>
                <span className="text-xs font-semibold">{hovered.name}</span>
                {hovered.isHuman&&<span className="text-[0.55rem] px-1 py-0.5 bg-blue-500/10 text-blue-400 rounded uppercase">human</span>}
              </div>
              <div className="text-[0.65rem] text-text-muted">{hovered.role}</div>
              <div className="text-[0.65rem] text-text-dim mt-1 capitalize flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:GLOW_MAP[hovered.state]}}/>
                {hovered.state}: {hovered.label}
              </div>
              {hovered.model&&<div className="text-[0.58rem] text-text-muted mt-0.5 font-mono">{hovered.model}</div>}
              <div className="text-[0.55rem] text-text-muted mt-1 opacity-60">Click for details</div>
            </div>
          )}
        </div>

        {selected&&(
          <div className="w-[220px] flex-shrink-0 border-l border-border bg-surface p-4 flex flex-col gap-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-dim uppercase tracking-wider">Agent Details</span>
              <button onClick={()=>setSelected(null)} className="p-0.5 text-text-muted hover:text-text transition-colors">
                <X className="w-3.5 h-3.5"/>
              </button>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-bg border border-border flex items-center justify-center text-sm font-bold flex-shrink-0">
                {selected.avatar||selected.name.charAt(0)}
              </div>
              <div>
                <div className="text-sm font-semibold">{selected.name}</div>
                <div className="text-[0.65rem] text-text-muted">{selected.role}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-surface2 border border-border rounded-lg px-3 py-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:STATE_DOT[selected.state]}}/>
              <div>
                <div className="text-xs font-medium capitalize">{selected.state}</div>
                {selected.label&&<div className="text-[0.65rem] text-text-muted mt-0.5 line-clamp-2">{selected.label}</div>}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Department</span>
                <span className="text-text-dim capitalize">{selected.department}</span>
              </div>
              {selected.model&&(
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Model</span>
                  <span className="text-text-dim font-mono">{selected.model}</span>
                </div>
              )}
              {selected.isHuman&&(
                <div className="mt-1">
                  <span className="text-[0.6rem] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded font-medium uppercase">human</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 px-3 md:px-4 py-2 border-t border-border bg-surface overflow-x-auto flex-shrink-0 flex-wrap">
        {agents.map(a=>(
          <button key={a.id}
            onClick={()=>setSelected(prev=>prev?.id===a.id?null:a)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[0.65rem] flex-shrink-0 transition-colors ${
              selected?.id===a.id?'bg-accent-glow border-accent/40':'bg-surface2 border-border hover:border-border-hover'
            }`}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{backgroundColor:STATE_DOT[a.state]}}/>
            <span className="font-medium text-text-dim">{a.name}</span>
            <span className="text-text-muted capitalize">{a.state}</span>
          </button>
        ))}
        {agents.length===0&&<span className="text-xs text-text-muted py-1">No agents online</span>}
      </div>
    </div>
  );
}
