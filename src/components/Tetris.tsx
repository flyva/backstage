"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ChevronsDown, Pause, Play, RotateCw } from "lucide-react";
import { saveDetenteScore } from "@/lib/detente-actions";

const COLS = 10;
const ROWS = 20;
const CELL = 24;
const PREVIEW_CELL = 18;

type Cell = string | null;
type Board = Cell[][];

// Formes classiques (une rotation de référence), couleur par pièce.
const SHAPES: Record<string, { cells: [number, number][]; color: string }> = {
  I: { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], color: "#22d3ee" },
  O: { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], color: "#facc15" },
  T: { cells: [[0, 0], [1, 0], [2, 0], [1, 1]], color: "#a855f7" },
  S: { cells: [[1, 0], [2, 0], [0, 1], [1, 1]], color: "#22c55e" },
  Z: { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], color: "#ef4444" },
  J: { cells: [[0, 0], [0, 1], [1, 1], [2, 1]], color: "#3b82f6" },
  L: { cells: [[2, 0], [0, 1], [1, 1], [2, 1]], color: "#f97316" },
};
const KEYS = Object.keys(SHAPES);

type Piece = { kind: string; cells: [number, number][]; x: number; y: number; color: string };

const emptyBoard = (): Board => Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));

/** Sac de 7 pièces mélangées (Fisher-Yates), comme le Tetris moderne : jamais plus de 2 fois la même pièce de suite au hasard pur. */
function shuffledBag(): string[] {
  const bag = [...KEYS];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function spawn(kind: string): Piece {
  const s = SHAPES[kind];
  return { kind, cells: s.cells, x: 3, y: 0, color: s.color };
}

/** Rotation 90° horaire autour d'un centre approximatif (2,2 suffit pour ces formes sur une grille 4×4). */
function rotated(piece: Piece): Piece {
  if (piece.kind === "O") return piece;
  const cells = piece.cells.map(([x, y]): [number, number] => [3 - y, x]);
  return { ...piece, cells };
}

function collides(board: Board, piece: Piece, dx = 0, dy = 0, cells = piece.cells): boolean {
  for (const [cx, cy] of cells) {
    const x = piece.x + cx + dx;
    const y = piece.y + cy + dy;
    if (x < 0 || x >= COLS || y >= ROWS) return true;
    if (y >= 0 && board[y][x]) return true;
  }
  return false;
}

const LINE_SCORE = [0, 100, 300, 500, 800];

/** Petit aperçu de la prochaine pièce, dans son coin. */
function NextPiece({ kind }: { kind: string | null }) {
  if (!kind) return null;
  const s = SHAPES[kind];
  const maxX = Math.max(...s.cells.map((c) => c[0]));
  const maxY = Math.max(...s.cells.map((c) => c[1]));
  return (
    <div className="space-y-1 text-center">
      <p className="text-xs text-muted">Suivante</p>
      <div className="relative mx-auto rounded-lg border border-line bg-bg" style={{ width: (maxX + 1) * PREVIEW_CELL, height: (maxY + 1) * PREVIEW_CELL }}>
        {s.cells.map(([x, y], i) => (
          <div key={i} className="absolute rounded-sm" style={{ left: x * PREVIEW_CELL + 1, top: y * PREVIEW_CELL + 1, width: PREVIEW_CELL - 2, height: PREVIEW_CELL - 2, background: s.color }} />
        ))}
      </div>
    </div>
  );
}

export function Tetris() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<Board>(emptyBoard());
  const bagRef = useRef<string[]>(shuffledBag().slice(1));
  const pieceRef = useRef<Piece>(spawn(KEYS[0]));
  const dropTimer = useRef(0);
  const lastFrame = useRef(0);
  const rafId = useRef<number | null>(null);
  const savedRef = useRef(false);

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [nextKind, setNextKind] = useState<string | null>(null);

  const nextFromBag = useCallback(() => {
    if (bagRef.current.length === 0) bagRef.current = shuffledBag();
    const kind = bagRef.current.shift()!;
    setNextKind(bagRef.current[0] ?? null);
    return kind;
  }, []);

  const reset = useCallback(() => {
    boardRef.current = emptyBoard();
    bagRef.current = shuffledBag();
    pieceRef.current = spawn(bagRef.current.shift()!);
    setNextKind(bagRef.current[0] ?? null);
    dropTimer.current = 0;
    savedRef.current = false;
    setScore(0);
    setLines(0);
    setOver(false);
    setPaused(false);
  }, []);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#14161a";
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
    const board = boardRef.current;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = board[y][x];
        if (c) { ctx.fillStyle = c; ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2); }
      }
    }
    const p = pieceRef.current;
    ctx.fillStyle = p.color;
    for (const [cx, cy] of p.cells) {
      const x = p.x + cx, y = p.y + cy;
      if (y >= 0) ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, ROWS * CELL); ctx.stroke(); }
    for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(COLS * CELL, y * CELL); ctx.stroke(); }
  }, []);

  const endGame = useCallback(() => {
    setRunning(false);
    setOver(true);
    if (!savedRef.current) { savedRef.current = true; void saveDetenteScore("tetris", score); }
  }, [score]);

  const lockPiece = useCallback(() => {
    const board = boardRef.current;
    const p = pieceRef.current;
    for (const [cx, cy] of p.cells) {
      const x = p.x + cx, y = p.y + cy;
      if (y < 0) { endGame(); return; }
      board[y][x] = p.color;
    }
    let cleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (board[y].every((c) => c)) { board.splice(y, 1); board.unshift(Array<Cell>(COLS).fill(null)); cleared++; y++; }
    }
    if (cleared > 0) { setScore((s) => s + LINE_SCORE[cleared]); setLines((n) => n + cleared); }
    const next = spawn(nextFromBag());
    if (collides(board, next)) { pieceRef.current = next; endGame(); return; }
    pieceRef.current = next;
  }, [endGame, nextFromBag]);

  const move = useCallback((dx: number, dy: number): boolean => {
    const board = boardRef.current;
    const p = pieceRef.current;
    if (collides(board, p, dx, dy)) return false;
    pieceRef.current = { ...p, x: p.x + dx, y: p.y + dy };
    return true;
  }, []);

  const rotate = useCallback(() => {
    const board = boardRef.current;
    const p = pieceRef.current;
    const r = rotated(p);
    // Petit « kick » horizontal si la rotation déborde juste d'un côté (sans ça, tourner contre un mur est souvent impossible).
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!collides(board, p, kick, 0, r.cells)) { pieceRef.current = { ...r, x: p.x + kick }; return; }
    }
  }, []);

  const hardDrop = useCallback(() => {
    let n = 0;
    while (move(0, 1)) n++;
    setScore((s) => s + n * 2);
    lockPiece();
  }, [move, lockPiece]);

  // Boucle de jeu : requestAnimationFrame, la vitesse de chute accélère avec les lignes effacées.
  useEffect(() => {
    if (!running) return;
    const speed = () => Math.max(120, 800 - Math.floor(lines / 10) * 60);
    const loop = (t: number) => {
      if (lastFrame.current === 0) lastFrame.current = t;
      const dt = t - lastFrame.current;
      lastFrame.current = t;
      dropTimer.current += dt;
      if (dropTimer.current > speed()) {
        dropTimer.current = 0;
        if (!move(0, 1)) lockPiece();
      }
      draw();
      rafId.current = requestAnimationFrame(loop);
    };
    rafId.current = requestAnimationFrame(loop);
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current); lastFrame.current = 0; };
  }, [running, lines, move, lockPiece, draw]);

  useEffect(() => { draw(); }, [draw]);

  const act = useCallback((fn: () => void) => { if (!running) return; fn(); draw(); }, [running, draw]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!running) return;
      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ", "Spacebar"].includes(e.key)) e.preventDefault();
      if (e.key === "ArrowLeft") act(() => move(-1, 0));
      else if (e.key === "ArrowRight") act(() => move(1, 0));
      else if (e.key === "ArrowDown") act(() => { if (move(0, 1)) setScore((s) => s + 1); });
      else if (e.key === "ArrowUp") act(rotate);
      else if (e.key === " " || e.key === "Spacebar") act(hardDrop);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, move, rotate, hardDrop, draw, act]);

  const start = () => { reset(); setRunning(true); };
  const resume = () => { setPaused(false); setRunning(true); };
  const pause = () => { setPaused(true); setRunning(false); };

  const showOverlay = !running;
  const overlayMode = over ? "over" : paused ? "paused" : "start";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-start gap-3">
        <div className="relative">
          <canvas ref={canvasRef} width={COLS * CELL} height={ROWS * CELL} className="touch-none rounded-lg border border-line" />
          {showOverlay && (
            <div className="absolute inset-0 grid place-items-center rounded-lg bg-black/80 text-center text-white">
              <div className="space-y-3 p-4">
                {overlayMode === "over" && <p className="text-lg font-semibold">Game Over</p>}
                {overlayMode === "paused" && <p className="text-lg font-semibold">Pause</p>}
                <p className="text-2xl font-bold tabular-nums">{score}</p>
                {overlayMode === "paused" ? (
                  <button type="button" onClick={resume} className="btn"><Play size={15} /> Reprendre</button>
                ) : (
                  <button type="button" onClick={start} className="btn"><Play size={15} /> {overlayMode === "over" ? "Rejouer" : "Jouer"}</button>
                )}
                {overlayMode === "start" && <p className="text-xs text-white/70">Flèches pour bouger/tourner, Espace pour tout lâcher</p>}
              </div>
            </div>
          )}
        </div>
        <NextPiece kind={running ? nextKind : null} />
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-line bg-bg px-3 py-2 text-sm">
        <span className="text-muted">Score</span> <strong className="text-base tabular-nums">{score}</strong>
        <span className="mx-1 text-line">·</span>
        <span className="text-muted">Lignes</span> <strong className="tabular-nums">{lines}</strong>
        {running && <button type="button" onClick={pause} className="btn-ghost ml-2 text-xs"><Pause size={13} /> Pause</button>}
      </div>

      {/* Commandes tactiles : visibles sur mobile comme sur PC (ne gênent pas, pratiques aussi à la souris). */}
      {running && (
        <div className="grid grid-cols-4 gap-2 sm:hidden">
          <button type="button" onClick={() => act(() => move(-1, 0))} className="btn-ghost p-3" aria-label="Gauche"><ArrowLeft size={18} /></button>
          <button type="button" onClick={() => act(rotate)} className="btn-ghost p-3" aria-label="Tourner"><RotateCw size={18} /></button>
          <button type="button" onClick={() => act(() => move(0, 1))} className="btn-ghost p-3" aria-label="Descendre doucement"><ArrowDown size={18} /></button>
          <button type="button" onClick={() => act(() => move(1, 0))} className="btn-ghost p-3" aria-label="Droite"><ArrowRight size={18} /></button>
          <button type="button" onClick={() => act(hardDrop)} className="btn-ghost col-span-4 p-2 text-xs"><ChevronsDown size={15} /> Tout lâcher</button>
        </div>
      )}
    </div>
  );
}
