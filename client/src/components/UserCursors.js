import React from 'react';
export default function UserCursors({ cursors }) {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', width: '100%', height: '100%' }}>
      {cursors.map(c => (
        <div key={c.id} style={{
          position: 'absolute', left: c.x, top: c.y, transform: 'translate(-50%, -50%)',
          background: c.color || '#000', color: '#fff', fontSize: 12, padding: '2px 6px', borderRadius: 8,
        }}>{c.id.slice(0,4)}</div>
      ))}
    </div>
  );
}
