import React from 'react';

export default function Toolbar({ colorRef, socket, roomId, isJoined }) {
  const colors = [
    { name: 'Black', value: '#000000' },
    { name: 'Red', value: '#e63946' },
    { name: 'Blue', value: '#1d4ed8' },
    { name: 'Green', value: '#0b8457' }
  ];

  function handleColor(v) {
    colorRef.current = v;
  }

  function handleClear() {
    if (socket && socket.connected && isJoined) {
      socket.emit('clear-canvas', { roomId });
    } else {
      console.warn('clear-canvas blocked: not joined');
    }
    if (typeof window.clearCanvasLocal === 'function') window.clearCanvasLocal();
  }

  return (
    <div>
      <h3 style={{ margin: 0, marginBottom: 10 }}>Toolbar</h3>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#666' }}>Color</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {colors.map(c => (
            <button
              key={c.value}
              onClick={() => handleColor(c.value)}
              style={{
                width: 30, height: 30, background: c.value, border: '1px solid #ccc',
                borderRadius: 6, cursor: 'pointer'
              }}
              aria-label={`color-${c.name}`}
            />
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#666' }}>Stroke width</div>
        <input id="strokeWidth" type="range" min="1" max="20" defaultValue="4" style={{ width: '100%' }} />
      </div>

      <div>
        <button onClick={handleClear} style={{ padding: '8px 12px' }}>Clear Canvas</button>
      </div>
    </div>
  );
}
