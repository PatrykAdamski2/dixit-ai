import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser, Paintbrush, Trash2 } from 'lucide-react';
import { Button } from './Button';

const COLORS = [
  '#000000',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#a855f7',
];

const CANVAS_W = 400;
const CANVAS_H = 600;

type Tool = 'brush' | 'eraser';

interface CardCanvasEditorProps {
  onExport: (dataUrl: string) => void;
}

export function CardCanvasEditor({ onExport }: CardCanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [color, setColor] = useState(COLORS[0]);
  const [tool, setTool] = useState<Tool>('brush');

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    return { canvas, ctx };
  }, []);

  useEffect(() => {
    const pack = getCtx();
    if (!pack) return;
    const { ctx } = pack;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 8;
  }, [getCtx]);

  const pointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pack = getCtx();
    if (!pack) return;
    drawing.current = true;
    const { ctx } = pack;
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const pack = getCtx();
    if (!pack) return;
    const { ctx } = pack;
    const { x, y } = pointerPos(e);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? 24 : 8;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = false;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const clearCanvas = () => {
    const pack = getCtx();
    if (!pack) return;
    const { ctx } = pack;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onExport(canvas.toDataURL('image/png'));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Button
          type="button"
          size="sm"
          variant={tool === 'brush' ? 'primary' : 'outline'}
          onClick={() => setTool('brush')}
        >
          <Paintbrush size={16} className="mr-1" /> Pędzel
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tool === 'eraser' ? 'primary' : 'outline'}
          onClick={() => setTool('eraser')}
        >
          <Eraser size={16} className="mr-1" /> Gumka
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={clearCanvas}>
          <Trash2 size={16} className="mr-1" /> Wyczyść
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Kolor ${c}`}
            className={`w-8 h-8 rounded-full border-2 ${
              color === c && tool === 'brush' ? 'border-orange-500 scale-110' : 'border-gray-200'
            }`}
            style={{ backgroundColor: c }}
            onClick={() => {
              setColor(c);
              setTool('brush');
            }}
          />
        ))}
      </div>

      <div className="rounded-2xl border-2 border-gray-200 overflow-hidden bg-gray-100 shadow-inner max-w-full">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full max-w-md mx-auto block touch-none cursor-crosshair bg-white"
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
        />
      </div>

      <Button type="button" className="w-full" onClick={handleExport}>
        Użyj tego rysunku do zapisu
      </Button>
    </div>
  );
}
