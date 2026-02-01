import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Pencil, 
  Eraser, 
  Square, 
  Circle as CircleIcon, 
  Minus, 
  Type, 
  Download, 
  RotateCcw, 
  RotateCw,
  Trash2,
  Settings2,
  Spline,
  Hexagon,
  Check,
  Sun,
  Moon,
  Mail
} from 'lucide-react';
import { Tool, Point, DrawingAction, FillType } from './types';

const COLORS = [
  '#000000', '#ef4444', '#f97316', '#f59e0b', '#10b981', 
  '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ffffff'
];

const BRUSH_SIZES = [2, 5, 10, 15, 20];

export default function App() {
  const [activeTool, setActiveTool] = useState<Tool>(Tool.PENCIL);
  const [color, setColor] = useState('#3b82f6');
  const [fillColor, setFillColor] = useState('#3b82f6');
  const [fillColor2, setFillColor2] = useState('#ffffff');
  const [fillType, setFillType] = useState<FillType>(FillType.SOLID);
  const [isFilled, setIsFilled] = useState(false);
  const [lineWidth, setLineWidth] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<DrawingAction[]>([]);
  const [redoStack, setRedoStack] = useState<DrawingAction[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const [currentShapePoints, setCurrentShapePoints] = useState<Point[]>([]);
  const [cursorPos, setCursorPos] = useState<Point | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const startPos = useRef<Point | null>(null);
  const tempPath = useRef<Point[]>([]);

  // Theme Sync
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const toolbarHeight = 80;
    const headerHeight = 56;
    const footerHeight = 40;
    const dpr = window.devicePixelRatio || 1;
    
    const availableHeight = window.innerHeight - toolbarHeight - headerHeight - footerHeight;
    canvas.width = window.innerWidth * dpr;
    canvas.height = availableHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${availableHeight}px`;

    const context = canvas.getContext('2d', { alpha: false });
    if (context) {
      context.scale(dpr, dpr);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      contextRef.current = context;
      
      context.fillStyle = isDarkMode ? '#09090b' : 'white';
      context.fillRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }, [isDarkMode]);

  const getCoordinates = (e: any): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else if (typeof e.clientX !== 'undefined') {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const getFillStyle = (ctx: CanvasRenderingContext2D, action: DrawingAction): string | CanvasGradient => {
    if (!action.isFilled || !action.fillColor) return 'transparent';
    if (action.fillType === FillType.SOLID || !action.fillColor2) return action.fillColor;

    if (action.tool === Tool.RECTANGLE && action.startPoint && action.endPoint) {
      const x = action.startPoint.x;
      const y = action.startPoint.y;
      const w = action.endPoint.x - action.startPoint.x;
      const h = action.endPoint.y - action.startPoint.y;
      
      if (action.fillType === FillType.LINEAR) {
        const grad = ctx.createLinearGradient(x, y, x + w, y + h);
        grad.addColorStop(0, action.fillColor);
        grad.addColorStop(1, action.fillColor2);
        return grad;
      } else {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const radius = Math.max(Math.abs(w), Math.abs(h)) / 2;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, action.fillColor);
        grad.addColorStop(1, action.fillColor2);
        return grad;
      }
    }

    if (action.tool === Tool.CIRCLE && action.startPoint && action.endPoint) {
      const radius = Math.sqrt(
        Math.pow(action.endPoint.x - action.startPoint.x, 2) + 
        Math.pow(action.endPoint.y - action.startPoint.y, 2)
      );
      if (action.fillType === FillType.LINEAR) {
        const grad = ctx.createLinearGradient(
          action.startPoint.x - radius, action.startPoint.y - radius,
          action.startPoint.x + radius, action.startPoint.y + radius
        );
        grad.addColorStop(0, action.fillColor);
        grad.addColorStop(1, action.fillColor2);
        return grad;
      } else {
        const grad = ctx.createRadialGradient(
          action.startPoint.x, action.startPoint.y, 0,
          action.startPoint.x, action.startPoint.y, radius
        );
        grad.addColorStop(0, action.fillColor);
        grad.addColorStop(1, action.fillColor2);
        return grad;
      }
    }

    if (action.tool === Tool.POLYGON && action.path && action.path.length > 0) {
      const xs = action.path.map(p => p.x);
      const ys = action.path.map(p => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);

      if (action.fillType === FillType.LINEAR) {
        const grad = ctx.createLinearGradient(minX, minY, maxX, maxY);
        grad.addColorStop(0, action.fillColor);
        grad.addColorStop(1, action.fillColor2);
        return grad;
      } else {
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const radius = Math.max(maxX - minX, maxY - minY) / 2;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, action.fillColor);
        grad.addColorStop(1, action.fillColor2);
        return grad;
      }
    }

    return action.fillColor;
  };

  const drawHistory = useCallback(() => {
    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = isDarkMode ? '#09090b' : 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    history.forEach(action => {
      ctx.beginPath();
      ctx.strokeStyle = action.color;
      ctx.lineWidth = action.lineWidth;
      ctx.fillStyle = getFillStyle(ctx, action);

      if (action.tool === Tool.PENCIL || action.tool === Tool.ERASER) {
        if (action.path && action.path.length > 0) {
          ctx.moveTo(action.path[0].x, action.path[0].y);
          action.path.forEach(p => ctx.lineTo(p.x, p.y));
          ctx.stroke();
        }
      } else if (action.tool === Tool.RECTANGLE && action.startPoint && action.endPoint) {
        const x = action.startPoint.x;
        const y = action.startPoint.y;
        const w = action.endPoint.x - action.startPoint.x;
        const h = action.endPoint.y - action.startPoint.y;
        if (action.isFilled) ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      } else if (action.tool === Tool.CIRCLE && action.startPoint && action.endPoint) {
        const radius = Math.sqrt(
          Math.pow(action.endPoint.x - action.startPoint.x, 2) + 
          Math.pow(action.endPoint.y - action.startPoint.y, 2)
        );
        ctx.arc(action.startPoint.x, action.startPoint.y, radius, 0, 2 * Math.PI);
        if (action.isFilled) ctx.fill();
        ctx.stroke();
      } else if (action.tool === Tool.LINE && action.startPoint && action.endPoint) {
        ctx.moveTo(action.startPoint.x, action.startPoint.y);
        ctx.lineTo(action.endPoint.x, action.endPoint.y);
        ctx.stroke();
      } else if (action.tool === Tool.TEXT && action.startPoint && action.text) {
        ctx.font = `${action.lineWidth * 4}px Inter`;
        ctx.fillStyle = action.color;
        ctx.fillText(action.text, action.startPoint.x, action.startPoint.y);
      } else if ((action.tool === Tool.POLYLINE || action.tool === Tool.POLYGON) && action.path && action.path.length > 0) {
        ctx.moveTo(action.path[0].x, action.path[0].y);
        action.path.forEach(p => ctx.lineTo(p.x, p.y));
        if (action.tool === Tool.POLYGON) {
          ctx.closePath();
          if (action.isFilled) ctx.fill();
        }
        ctx.stroke();
      }
    });

    if (currentShapePoints.length > 0) {
      const previewAction: DrawingAction = {
        tool: activeTool,
        color: color,
        fillColor: fillColor,
        fillColor2: fillColor2,
        fillType: fillType,
        isFilled: isFilled && (activeTool === Tool.POLYGON || activeTool === Tool.RECTANGLE || activeTool === Tool.CIRCLE),
        lineWidth: lineWidth,
        path: currentShapePoints,
        startPoint: currentShapePoints[0],
        endPoint: cursorPos || currentShapePoints[0]
      };

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.fillStyle = getFillStyle(ctx, previewAction);

      if (activeTool === Tool.POLYLINE || activeTool === Tool.POLYGON) {
        ctx.moveTo(currentShapePoints[0].x, currentShapePoints[0].y);
        currentShapePoints.forEach(p => ctx.lineTo(p.x, p.y));
        if (cursorPos) {
          ctx.lineTo(cursorPos.x, cursorPos.y);
        }
        if (activeTool === Tool.POLYGON) {
          if (cursorPos) ctx.lineTo(currentShapePoints[0].x, currentShapePoints[0].y);
          if (isFilled) ctx.fill();
        }
      }
      ctx.stroke();
    }
  }, [history, currentShapePoints, cursorPos, color, lineWidth, activeTool, isFilled, fillColor, fillColor2, fillType, isDarkMode]);

  useEffect(() => {
    drawHistory();
  }, [history, drawHistory, currentShapePoints, cursorPos]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getCoordinates(e);
    
    if (activeTool === Tool.POLYLINE || activeTool === Tool.POLYGON) {
      setCurrentShapePoints([...currentShapePoints, pos]);
      return;
    }

    startPos.current = pos;
    setIsDrawing(true);

    const ctx = contextRef.current;
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = activeTool === Tool.ERASER ? (isDarkMode ? '#09090b' : 'white') : color;
    ctx.lineWidth = lineWidth;
    
    if (activeTool === Tool.PENCIL || activeTool === Tool.ERASER) {
      tempPath.current = [pos];
    } else if (activeTool === Tool.TEXT) {
      const text = prompt('הכנס טקסט:');
      if (text) {
        const newAction: DrawingAction = {
          tool: Tool.TEXT,
          color,
          lineWidth,
          startPoint: pos,
          text
        };
        setHistory([...history, newAction]);
        setRedoStack([]);
      }
      setIsDrawing(false);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getCoordinates(e);
    setCursorPos(pos);

    if (!isDrawing || !contextRef.current || !startPos.current) return;

    const ctx = contextRef.current;

    if (activeTool === Tool.PENCIL || activeTool === Tool.ERASER) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      tempPath.current.push(pos);
    } else {
      drawHistory();
      
      const currentAction: DrawingAction = {
        tool: activeTool,
        color: color,
        fillColor: fillColor,
        fillColor2: fillColor2,
        fillType: fillType,
        isFilled: isFilled && (activeTool === Tool.RECTANGLE || activeTool === Tool.CIRCLE),
        lineWidth: lineWidth,
        startPoint: startPos.current,
        endPoint: pos
      };

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.fillStyle = getFillStyle(ctx, currentAction);

      if (activeTool === Tool.RECTANGLE) {
        const x = startPos.current.x;
        const y = startPos.current.y;
        const w = pos.x - startPos.current.x;
        const h = pos.y - startPos.current.y;
        if (isFilled) ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      } else if (activeTool === Tool.CIRCLE) {
        const radius = Math.sqrt(
          Math.pow(pos.x - startPos.current.x, 2) + 
          Math.pow(pos.y - startPos.current.y, 2)
        );
        ctx.arc(startPos.current.x, startPos.current.y, radius, 0, 2 * Math.PI);
        if (isFilled) ctx.fill();
        ctx.stroke();
      } else if (activeTool === Tool.LINE) {
        ctx.moveTo(startPos.current.x, startPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
    }
  };

  const endDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const pos = getCoordinates(e);

    const newAction: DrawingAction = {
      tool: activeTool,
      color: activeTool === Tool.ERASER ? (isDarkMode ? '#09090b' : 'white') : color,
      fillColor: (isFilled && (activeTool === Tool.RECTANGLE || activeTool === Tool.CIRCLE)) ? fillColor : undefined,
      fillColor2: (isFilled && fillType !== FillType.SOLID && (activeTool === Tool.RECTANGLE || activeTool === Tool.CIRCLE)) ? fillColor2 : undefined,
      fillType: isFilled ? fillType : undefined,
      isFilled: (activeTool === Tool.RECTANGLE || activeTool === Tool.CIRCLE) && isFilled,
      lineWidth,
      path: activeTool === Tool.PENCIL || activeTool === Tool.ERASER ? [...tempPath.current] : undefined,
      startPoint: startPos.current || undefined,
      endPoint: pos
    };

    setHistory([...history, newAction]);
    setRedoStack([]);
    tempPath.current = [];
    startPos.current = null;
  };

  const finishMultiPointShape = () => {
    if (currentShapePoints.length < 2) {
      setCurrentShapePoints([]);
      return;
    }
    const newAction: DrawingAction = {
      tool: activeTool,
      color,
      fillColor: (activeTool === Tool.POLYGON && isFilled) ? fillColor : undefined,
      fillColor2: (activeTool === Tool.POLYGON && isFilled && fillType !== FillType.SOLID) ? fillColor2 : undefined,
      fillType: isFilled ? fillType : undefined,
      isFilled: activeTool === Tool.POLYGON && isFilled,
      lineWidth,
      path: [...currentShapePoints]
    };
    setHistory([...history, newAction]);
    setRedoStack([]);
    setCurrentShapePoints([]);
  };

  const undo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setRedoStack([last, ...redoStack]);
    setHistory(history.slice(0, -1));
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setHistory([...history, next]);
    setRedoStack(redoStack.slice(1));
  };

  const clearCanvas = () => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק הכל?')) {
      setHistory([]);
      setRedoStack([]);
      setCurrentShapePoints([]);
    }
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataURL = canvas.toDataURL('image/jpeg', 0.9);
    const link = document.createElement('a');
    link.download = `drawing-${Date.now()}.jpg`;
    link.href = dataURL;
    link.click();
  };

  const toolIcons: Record<Tool, React.ReactNode> = {
    [Tool.PENCIL]: <Pencil size={22} />,
    [Tool.ERASER]: <Eraser size={22} />,
    [Tool.RECTANGLE]: <Square size={22} />,
    [Tool.CIRCLE]: <CircleIcon size={22} />,
    [Tool.LINE]: <Minus size={22} className="rotate-45" />,
    [Tool.POLYLINE]: <Spline size={22} />,
    [Tool.POLYGON]: <Hexagon size={22} />,
    [Tool.TEXT]: <Type size={22} />
  };

  const toolLabels: Record<Tool, string> = {
    [Tool.PENCIL]: "עיפרון",
    [Tool.ERASER]: "מחק",
    [Tool.RECTANGLE]: "מלבן",
    [Tool.CIRCLE]: "עיגול",
    [Tool.LINE]: "קו",
    [Tool.POLYLINE]: "רב-קו",
    [Tool.POLYGON]: "מצולע",
    [Tool.TEXT]: "טקסט"
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-white dark:bg-zinc-950 overflow-hidden transition-colors duration-300">
      {/* Top Status Bar */}
      <div className="h-14 bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 flex items-center justify-between px-4 shadow-sm z-20">
        <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">צייר Pro</h1>
        
        <div className="flex gap-1 items-center">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors active:scale-90 text-gray-700 dark:text-gray-300"
            title="החלף מצב תצוגה"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="w-[1px] h-6 bg-gray-200 dark:bg-zinc-800 mx-1" />
          <button 
            onClick={undo} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors active:scale-90 disabled:opacity-30 text-gray-700 dark:text-gray-300"
            disabled={history.length === 0}
          >
            <RotateCcw size={20} />
          </button>
          <button 
            onClick={redo} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors active:scale-90 disabled:opacity-30 text-gray-700 dark:text-gray-300"
            disabled={redoStack.length === 0}
          >
            <RotateCw size={20} />
          </button>
          <div className="w-[1px] h-6 bg-gray-200 dark:bg-zinc-800 mx-1" />
          <button 
            onClick={clearCanvas} 
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-full transition-colors active:scale-90"
          >
            <Trash2 size={20} />
          </button>
          <button 
            onClick={downloadImage} 
            className="p-2 bg-blue-600 text-white rounded-full shadow-lg transition-transform active:scale-95 ml-2"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative overflow-hidden bg-gray-100 dark:bg-zinc-950 flex flex-col items-center justify-center">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
          className="cursor-crosshair bg-white dark:bg-zinc-950 shadow-inner"
        />

        {/* Multi-point Finish Button */}
        {currentShapePoints.length > 0 && (
          <button
            onClick={finishMultiPointShape}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounce z-40 active:scale-95"
          >
            <Check size={20} strokeWidth={3} />
            <span className="font-bold">סיים צורה</span>
          </button>
        )}

        {/* Floating Settings Tooltip */}
        {showSettings && (
          <div className="absolute bottom-24 right-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-800 animate-in fade-in slide-in-from-bottom-4 duration-200 z-30 w-72 max-h-[70vh] overflow-y-auto no-scrollbar">
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 block uppercase tracking-wider">צבע קו</label>
                <div className="grid grid-cols-5 gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-9 h-9 rounded-full border-2 transition-transform active:scale-90 ${color === c ? 'border-blue-500 scale-110 shadow-md' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">מילוי צורה</label>
                  <button 
                    onClick={() => setIsFilled(!isFilled)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${isFilled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-zinc-700'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isFilled ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                {isFilled && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg">
                      <button 
                        onClick={() => setFillType(FillType.SOLID)}
                        className={`flex-1 flex items-center justify-center py-1.5 rounded-md text-[10px] font-bold transition-all ${fillType === FillType.SOLID ? 'bg-white dark:bg-zinc-700 text-blue-600 shadow-sm' : 'text-gray-500'}`}
                      >
                        מלא
                      </button>
                      <button 
                        onClick={() => setFillType(FillType.LINEAR)}
                        className={`flex-1 flex items-center justify-center py-1.5 rounded-md text-[10px] font-bold transition-all ${fillType === FillType.LINEAR ? 'bg-white dark:bg-zinc-700 text-blue-600 shadow-sm' : 'text-gray-500'}`}
                      >
                        קווי
                      </button>
                      <button 
                        onClick={() => setFillType(FillType.RADIAL)}
                        className={`flex-1 flex items-center justify-center py-1.5 rounded-md text-[10px] font-bold transition-all ${fillType === FillType.RADIAL ? 'bg-white dark:bg-zinc-700 text-blue-600 shadow-sm' : 'text-gray-500'}`}
                      >
                        מעגלי
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-400 font-bold uppercase">צבע {fillType !== FillType.SOLID ? '1' : ''}</label>
                      <div className="grid grid-cols-5 gap-2">
                        {COLORS.map(c => (
                          <button
                            key={`fill1-${c}`}
                            onClick={() => setFillColor(c)}
                            className={`w-9 h-9 rounded-full border-2 transition-transform active:scale-90 ${fillColor === c ? 'border-blue-500 scale-110 shadow-md' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    {fillType !== FillType.SOLID && (
                      <div className="space-y-2 animate-in fade-in duration-200">
                        <label className="text-[10px] text-gray-400 font-bold uppercase">צבע 2</label>
                        <div className="grid grid-cols-5 gap-2">
                          {COLORS.map(c => (
                            <button
                              key={`fill2-${c}`}
                              onClick={() => setFillColor2(c)}
                              className={`w-9 h-9 rounded-full border-2 transition-transform active:scale-90 ${fillColor2 === c ? 'border-blue-500 scale-110 shadow-md' : 'border-transparent'}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 block uppercase tracking-wider">עובי קו</label>
                <div className="flex items-center justify-between gap-2">
                  {BRUSH_SIZES.map(size => (
                    <button
                      key={size}
                      onClick={() => setLineWidth(size)}
                      className={`flex-1 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${lineWidth === size ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600' : 'border-gray-100 dark:border-zinc-800 text-gray-400'}`}
                    >
                      <div className="rounded-full bg-current" style={{ width: size, height: size }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Toolbar */}
      <div className="h-20 bg-white dark:bg-zinc-900 border-t dark:border-zinc-800 flex items-center px-2 pb-2 pt-1 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20 overflow-x-auto no-scrollbar">
        <div className="flex items-center justify-between min-w-full gap-1">
          {(Object.values(Tool) as Tool[]).map((tool) => (
            <ToolButton 
              key={tool}
              active={activeTool === tool} 
              onClick={() => {
                setActiveTool(tool);
                setCurrentShapePoints([]);
              }} 
              icon={toolIcons[tool]} 
              label={toolLabels[tool]} 
            />
          ))}
          
          <div className="h-10 w-[1px] bg-gray-100 dark:bg-zinc-800 mx-1 flex-shrink-0" />

          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`flex flex-col items-center justify-center min-w-[56px] h-14 rounded-xl transition-all ${showSettings ? 'bg-blue-600 text-white shadow-inner' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
          >
            <Settings2 size={22} />
            <span className="text-[10px] mt-1 font-medium">הגדרות</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="h-10 bg-gray-50 dark:bg-zinc-950 border-t dark:border-zinc-900 flex items-center justify-between px-4 text-[10px] text-gray-500 dark:text-gray-400 z-20">
        <div>(C) Noam Gold AI 2026</div>
        <div className="flex items-center gap-2">
          <span>שלח משוב</span>
          <a href="mailto:goldnoamai@gmail.com" className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold hover:underline">
            <Mail size={12} />
            goldnoamai@gmail.com
          </a>
        </div>
      </footer>
    </div>
  );
}

interface ToolButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({ active, onClick, icon, label }) => {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center min-w-[56px] h-14 rounded-xl transition-all active:scale-90 ${active ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
    >
      <div className={`${active ? 'scale-110 transform' : ''} transition-transform`}>
        {icon}
      </div>
      <span className={`text-[10px] mt-1 font-medium ${active ? 'text-blue-600 font-bold' : 'text-gray-400 dark:text-gray-500'}`}>{label}</span>
      {active && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-0.5" />}
    </button>
  );
};
