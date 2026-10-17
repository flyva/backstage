"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { saveDetenteScore } from "@/lib/detente-actions";

const COLS = 10;
const ROWS = 20;
const CELL = 24;

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
  const [over, setOver] = useState(false);

  const nextFromBag = useCallback(() => {
    if (bagRef.current.length === 0) bagRef.current = shuffledBag();
    return bagRef.current.shift()!;
  }, []);

  const reset = useCallback(() => {
    boardRef.current = emptyBoard();
    bagRef.current = shuffledBag();
    pieceRef.current = spawn(bagRef.current.shift()!);
    dropTimer.current = 0;
    savedRef.current = false;
    setScore(0);
    setLines(0);
    setOver(false);
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!running) return;
      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ", "Spacebar"].includes(e.key)) e.preventDefault();
      if (e.key === "ArrowLeft") move(-1, 0);
      else if (e.key === "ArrowRight") move(1, 0);
      else if (e.key === "ArrowDown") { if (move(0, 1)) setScore((s) => s + 1); }
      else if (e.key === "ArrowUp") rotate();
      else if (e.key === " " || e.key === "Spacebar") hardDrop();
      else return;
      draw();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, move, rotate, hardDrop, draw]);

  const start = () => { reset(); setRunning(true); };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <canvas ref={canvasRef} width={COLS * CELL} height={ROWS * CELL} className="rounded-lg border border-line" />
        {!running && (
          <div className="absolute inset-0 grid place-items-center rounded-lg bg-black/70 text-center text-white">
            <div className="space-y-3 p-4">
              {over && <p className="text-lg font-semibold">Perdu ! Score : {score}</p>}
              <button type="button" onClick={start} className="btn"><Play size={15} /> {over ? "Rejouer" : "Jouer"}</button>
              {!over && <p className="text-xs text-white/70">Flèches pour bouger/tourner, Espace pour tout lâcher</p>}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span>Score : <strong className="tabular-nums">{score}</strong></span>
        <span>Lignes : <strong className="tabular-nums">{lines}</strong></span>
        {running && <button type="button" onClick={() => setRunning(false)} className="btn-ghost text-xs"><Pause size={13} /> Pause</button>}
      </div>
    </div>
  );
}
