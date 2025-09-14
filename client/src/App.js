import React, { useState } from 'react';
import RoomJoin from './components/RoomJoin';
import Whiteboard from './components/Whiteboard';
export default function App() {
  const [roomId, setRoomId] = useState(null);
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'stretch' }}>
      {!roomId ? (
        <RoomJoin onJoin={(id) => setRoomId(id)} />
      ) : (
        <Whiteboard roomId={roomId} onLeave={() => setRoomId(null)} />
      )}
    </div>
  );
}
