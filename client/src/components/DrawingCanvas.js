import React, { useEffect, useRef } from 'react';

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

// Expects props: { socket, colorRef, roomId, isJoined }
export default function DrawingCanvas({ socket, colorRef, roomId, isJoined }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const currentStroke = useRef({ color: '#000', width: 4, path: [] });

  // buffer for batching move points
  const emitBuffer = useRef([]);
  const emitTimer = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    // ensure canvas has backing store proportional to client size
    canvas.width = Math.max(1, canvas.clientWidth * devicePixelRatio);
    canvas.height = Math.max(1, canvas.clientHeight * devicePixelRatio);
    const ctx = canvas.getContext('2d');
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;

    const handleInit = (e) => {
      const drawingData = e.detail || [];
      drawingData.forEach(cmd => {
        if (cmd.type === 'stroke') drawStrokeImmediate(ctx, cmd.data);
        else if (cmd.type === 'clear') clearCanvasImmediate(ctx, canvas);
      });
    };
    window.addEventListener('initial-data', handleInit);
    return () => window.removeEventListener('initial-data', handleInit);
  }, []);

  function drawStrokeImmediate(ctx, stroke) {
    if (!stroke || !stroke.path || stroke.path.length === 0) return;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.beginPath();
    const p0 = stroke.path[0];
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < stroke.path.length; i++) ctx.lineTo(stroke.path[i].x, stroke.path[i].y);
    ctx.stroke();
  }

  function clearCanvasImmediate(ctx, canvas) {
    ctx.clearRect(0, 0, canvas.width / devicePixelRatio, canvas.height / devicePixelRatio);
  }

  // Remote incoming handlers - attach when socket exists
  useEffect(() => {
    if (!socket) return;
    const remoteStrokes = {};

    const onStart = ({ id, stroke }) => {
      remoteStrokes[id] = { ...stroke };
      drawStrokeImmediate(ctxRef.current, remoteStrokes[id]);
    };
    const onMove = ({ id, point }) => {
      if (!remoteStrokes[id]) remoteStrokes[id] = { color: '#000', width: 4, path: [] };
      remoteStrokes[id].path.push(point);
      const s = remoteStrokes[id];
      const n = s.path.length;
      if (n >= 2) {
        const ctx = ctxRef.current;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width;
        ctx.beginPath();
        ctx.moveTo(s.path[n - 2].x, s.path[n - 2].y);
        ctx.lineTo(s.path[n - 1].x, s.path[n - 1].y);
        ctx.stroke();
      }
    };
    const onEnd = ({ id, stroke }) => {
      if (stroke) drawStrokeImmediate(ctxRef.current, stroke);
      delete remoteStrokes[id];
    };
    const onClear = () => clearCanvasImmediate(ctxRef.current, canvasRef.current);

    socket.on('draw-start', onStart);
    socket.on('draw-move', onMove);
    socket.on('draw-end', onEnd);
    socket.on('clear-canvas', onClear);

    return () => {
      socket.off('draw-start', onStart);
      socket.off('draw-move', onMove);
      socket.off('draw-end', onEnd);
      socket.off('clear-canvas', onClear);
    };
  }, [socket]);

  // Local drawing handlers + batched emission
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const x = clamp((e.clientX ?? e.touches?.[0]?.clientX) - rect.left, 0, rect.width);
      const y = clamp((e.clientY ?? e.touches?.[0]?.clientY) - rect.top, 0, rect.height);
      return { x, y };
    }

    function startEmitBufferFlusher() {
      if (emitTimer.current) return;
      emitTimer.current = setInterval(() => {
        if (!socket || !socket.connected || !isJoined) return;
        const buf = emitBuffer.current.splice(0, emitBuffer.current.length);
        if (buf.length) {
          socket.emit('draw-move', { roomId, points: buf });
        }
      }, 30); // ~33fps flush
    }

    function stopEmitBufferFlusher() {
      if (emitTimer.current) { clearInterval(emitTimer.current); emitTimer.current = null; }
    }

    function onPointerDown(e) {
      e.preventDefault();
      drawing.current = true;
      const pos = getPos(e);
      const color = colorRef.current || '#000';
      const width = Number(document.getElementById('strokeWidth')?.value || 4);
      currentStroke.current = { color, width, path: [pos] };
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(pos.x, pos.y);

      if (socket && socket.connected && isJoined) {
        socket.emit('draw-start', { roomId, stroke: { color, width, path: [pos] } });
        startEmitBufferFlusher();
      } else {
        console.warn('draw-start blocked: not joined');
      }
    }

    function onPointerMove(e) {
      const pos = getPos(e);
      if (!drawing.current) {
        if (socket && socket.connected && isJoined) {
          socket.emit('cursor-move', { roomId, x: pos.x, y: pos.y, color: colorRef.current });
        }
        return;
      }
      currentStroke.current.path.push(pos);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      emitBuffer.current.push(pos);
    }

    function onPointerUp() {
      if (!drawing.current) return;
      drawing.current = false;
      const stroke = currentStroke.current;
      if (socket && socket.connected && isJoined) {
        const buf = emitBuffer.current.splice(0, emitBuffer.current.length);
        if (buf.length) socket.emit('draw-move', { roomId, points: buf });
        socket.emit('draw-end', { roomId, stroke });
      } else {
        console.warn('draw-end blocked: not joined');
      }
      stopEmitBufferFlusher();
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      stopEmitBufferFlusher();
    };
  }, [socket, colorRef, roomId, isJoined]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', background: '#fff', touchAction: 'none' }}
    />
  );
}
