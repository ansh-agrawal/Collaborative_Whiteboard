import React, { useState } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export default function RoomJoin({ onJoin }) {
  const [code, setCode] = useState('');
  function randomRoom() { setCode(uuidv4().slice(0,6)); }

  async function handleJoin(e) {
    e.preventDefault();
    const roomId = code.trim();
    if (!roomId) return alert('enter room code or generate one');
    try {
      await axios.post(`${process.env.REACT_APP_SERVER_URL || 'http://localhost:4000'}/api/rooms/join`, { roomId });
      // expose room for canvas events
      window.__ROOM_ID__ = roomId;
      onJoin(roomId);
    } catch (err) {
      console.error(err);
      alert('could not join/create room');
    }
  }

  return (
    <div style={{ margin: 'auto', width: 420, textAlign: 'center', padding: 24, border: '1px solid #ddd', borderRadius: 8 }}>
      <h2>Join or Create Whiteboard Room</h2>
      <form onSubmit={handleJoin}>
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="Enter room code (6-8 chars)" style={{ width: '100%', padding: 10, marginBottom: 10 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={randomRoom}>Generate</button>
          <button type="submit">Join</button>
        </div>
      </form>
      <p style={{ marginTop: 12, color: '#666' }}>No auth required — just share code to collaborate.</p>
    </div>
  );
}
