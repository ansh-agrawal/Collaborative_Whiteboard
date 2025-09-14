import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import DrawingCanvas from './DrawingCanvas';
import Toolbar from './Toolbar';
import UserCursors from './UserCursors';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:4000';

export default function Whiteboard({ roomId, onLeave }) {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null); // active socket instance state
  const [userCount, setUserCount] = useState(1);
  const [cursors, setCursors] = useState([]);
  const [isJoined, setIsJoined] = useState(false);
  const colorRef = useRef('#000000');

  useEffect(() => {
    const s = io(SERVER_URL, { transports: ['websocket'] });
    socketRef.current = s;
    setSocket(s);
    window.__socket_instance__ = s; // debug helper

    s.on('connect', () => {
      console.log('[client] socket connected', s.id);
      s.emit('join-room', { roomId }, (res) => {
        console.log('[client] join-room ack', res);
        if (res && res.ok) setIsJoined(true);
        else setIsJoined(false);
      });
    });

    s.on('user-count', ({ count }) => setUserCount(count));
    s.on('cursor-update', (cursor) => {
      setCursors(prev => {
        const others = prev.filter(c => c.id !== cursor.id);
        return [...others, cursor];
      });
    });
    s.on('cursors', (arr) => setCursors(arr));

    s.on('initial-data', (drawingData) => {
      window.dispatchEvent(new CustomEvent('initial-data', { detail: drawingData }));
    });

    s.on('disconnect', (reason) => {
      console.log('[client] socket disconnected', reason);
      setIsJoined(false);
    });

    s.on('connect_error', (err) => console.error('[client] connect_error', err));

    return () => {
      try { if (s && s.connected) s.emit('leave-room', { roomId }); } catch (e) {}
      s.disconnect();
      setSocket(null);
    };
  }, [roomId]);

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', height: '100vh' }}>
      <div style={{
        padding: 8, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', borderBottom: '1px solid #eee'
      }}>
        <div>
          <strong>Room:</strong> {roomId} &nbsp; <small>• Users: {userCount}</small> &nbsp;
          <small style={{ color: isJoined ? 'green' : '#999' }}>{isJoined ? '• Joined' : '• Joining...'}</small>
        </div>
        <div>
          <button onClick={() => { onLeave(); }}>Leave</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <DrawingCanvas
            socket={socket}
            colorRef={colorRef}
            roomId={roomId}
            isJoined={isJoined}
          />
          <UserCursors cursors={cursors} />
        </div>

        <div style={{ width: 240, borderLeft: '1px solid #eee', padding: 12 }}>
          <Toolbar
            colorRef={colorRef}
            socket={socket}
            roomId={roomId}
            isJoined={isJoined}
          />
          <div style={{ marginTop: 18, color: '#666', fontSize: 12 }}>
            Tip: Use a second browser or incognito to test realtime sync.
          </div>
        </div>
      </div>
    </div>
  );
}
