import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUpdateSiteCamMedia, getMediaUrl, type SiteCamMedia } from "@/hooks/useSiteCam";
import { supabase } from "@/integrations/supabase/client";
import { X, Pencil, Square, Circle, Type, ArrowRight, Undo, Redo, Save, Loader2, Eraser } from "lucide-react";

interface AnnotationEditorProps {
  media: SiteCamMedia;
  onClose: () => void;
}

type Tool = "draw" | "rect" | "circle" | "text" | "arrow" | "eraser";

const COLORS = [
  "#FF3B30", "#FF9500", "#FFCC00", "#34C759", "#007AFF",
  "#5856D6", "#AF52DE", "#FF2D55", "#FFFFFF", "#000000",
];

export function AnnotationEditor({ media, onClose }: AnnotationEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("draw");
  const [color, setColor] = useState("#FF3B30");
  const [lineWidth, setLineWidth] = useState(3);
  const [saving, setSaving] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const { toast } = useToast();
  const updateMedia = useUpdateSiteCamMedia();
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Load image using signed URL
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const url = await getMediaUrl(media.annotated_path || media.original_path);
      if (cancelled || !url) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (cancelled) return;
        imgRef.current = img;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const container = containerRef.current;
        const maxW = container?.clientWidth || 800;
        const maxH = (container?.clientHeight || 600) - 60;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setImageLoaded(true);

        const initialState = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory([initialState]);
        setHistoryIndex(0);
      };
      img.src = url;
    })();
    return () => { cancelled = true; };
  }, [media]);

  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev.slice(0, historyIndex + 1), state]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const newIndex = historyIndex - 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const newIndex = historyIndex + 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  };

  const getClientPoint = (e: React.MouseEvent | React.TouchEvent): { clientX: number; clientY: number } | null => {
    if ("touches" in e) {
      if (e.touches.length > 0) {
        return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
      }
      if (e.type === "touchend" || e.type === "touchcancel") {
        const ch = (e as React.TouchEvent).changedTouches;
        if (ch.length > 0) {
          return { clientX: ch[0].clientX, clientY: ch[0].clientY };
        }
      }
      return null;
    }
    return { clientX: e.clientX, clientY: e.clientY };
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const pt = getClientPoint(e);
    if (!pt) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: pt.clientX - rect.left, y: pt.clientY - rect.top };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);
    setStartPos(pos);
    setDrawing(true);

    if (tool === "draw" || tool === "eraser") {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.strokeStyle = tool === "eraser" ? "#FFFFFF" : color;
      ctx.lineWidth = tool === "eraser" ? lineWidth * 3 : lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    if ("touches" in e && e.touches.length > 0) {
      e.preventDefault();
    }
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    if (tool === "draw" || tool === "eraser") {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing || !startPos) return;
    setDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const endPos = getPos(e);

    if (tool === "rect") {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(startPos.x, startPos.y, endPos.x - startPos.x, endPos.y - startPos.y);
    } else if (tool === "circle") {
      const rx = Math.abs(endPos.x - startPos.x) / 2;
      const ry = Math.abs(endPos.y - startPos.y) / 2;
      const cx = startPos.x + (endPos.x - startPos.x) / 2;
      const cy = startPos.y + (endPos.y - startPos.y) / 2;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (tool === "arrow") {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(endPos.x, endPos.y);
      ctx.stroke();
      const angle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x);
      const headLen = 15;
      ctx.beginPath();
      ctx.moveTo(endPos.x, endPos.y);
      ctx.lineTo(endPos.x - headLen * Math.cos(angle - Math.PI / 6), endPos.y - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(endPos.x - headLen * Math.cos(angle + Math.PI / 6), endPos.y - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    } else if (tool === "text") {
      const text = prompt("Enter text:");
      if (text) {
        ctx.fillStyle = color;
        ctx.font = `bold ${Math.max(16, lineWidth * 5)}px Inter, sans-serif`;
        ctx.fillText(text, startPos.x, startPos.y);
      }
    }

    saveState();
    setStartPos(null);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);

    try {
      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, "image/jpeg", 0.92)
      );
      if (!blob) throw new Error("Failed to create image");

      const path = `${media.job_id}/annotated-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("sitecam")
        .upload(path, blob, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      await updateMedia.mutateAsync({
        id: media.id,
        annotated_path: path,
      });

      toast({ title: "Annotations saved" });
      onClose();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const tools: { id: Tool; icon: typeof Pencil; label: string }[] = [
    { id: "draw", icon: Pencil, label: "Draw" },
    { id: "rect", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "arrow", icon: ArrowRight, label: "Arrow" },
    { id: "text", icon: Type, label: "Text" },
    { id: "eraser", icon: Eraser, label: "Eraser" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex flex-col gap-2 border-b border-border bg-card p-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-2 sm:gap-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tools.map(t => (
            <Button key={t.id} variant={tool === t.id ? "default" : "ghost"} size="sm" onClick={() => setTool(t.id)} title={t.label} className="h-8 w-8 shrink-0 p-0">
              <t.icon className="h-4 w-4" />
            </Button>
          ))}
          <div className="mx-1 hidden h-6 w-px shrink-0 bg-border sm:block" />
          <Button variant="ghost" size="sm" onClick={undo} disabled={historyIndex <= 0} className="h-8 w-8 shrink-0 p-0"><Undo className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1} className="h-8 w-8 shrink-0 p-0"><Redo className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-6 w-6 shrink-0 rounded-full border-2 transition-transform ${color === c ? "border-foreground scale-125" : "border-transparent"}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))} className="h-8 shrink-0 rounded bg-muted px-2 text-xs">
            <option value={1}>Thin</option>
            <option value={3}>Medium</option>
            <option value={5}>Thick</option>
            <option value={8}>Heavy</option>
          </select>
          <Button variant="outline" size="sm" className="shrink-0" onClick={onClose}>
            <X className="mr-1 h-3.5 w-3.5" /> Cancel
          </Button>
          <Button size="sm" className="shrink-0" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 flex items-center justify-center bg-muted/50 overflow-auto p-4">
        {!imageLoaded && (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading image...</div>
        )}
        <canvas
          ref={canvasRef}
          className={`touch-none rounded shadow-lg cursor-crosshair ${!imageLoaded ? "hidden" : ""}`}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          onTouchCancel={handlePointerUp}
        />
      </div>
    </div>
  );
}
