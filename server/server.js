// const express = require('express');
// const http = require('http');
// const cors = require('cors');
// const mongoose = require('mongoose');
// const { Server } = require('socket.io');
// const Room = require('./models/Room');
// const roomRoutes = require('./routes/rooms');

// const app = express();
// app.use(express.json());
// app.use(cors());

// app.use('/api/rooms', roomRoutes);

// const server = http.createServer(app);
// const io = new Server(server, { cors: { origin: '*' } });

// const rooms = new Map();
// function ensureRoomInit(roomId) {
//   if (!rooms.has(roomId)) rooms.set(roomId, { sockets: new Set(), cursors: new Map() });
// }

// io.on('connection', (socket) => {
//   console.log('socket connected', socket.id);
//   socket.on('join-room', async ({ roomId }) => {
//     if (!roomId) return;
//     socket.join(roomId);
//     ensureRoomInit(roomId);
//     const roomState = rooms.get(roomId);
//     roomState.sockets.add(socket.id);
//     io.to(roomId).emit('user-count', { count: roomState.sockets.size });
//     try {
//       const roomDoc = await Room.findOne({ roomId });
//       if (roomDoc && roomDoc.drawingData && roomDoc.drawingData.length) {
//         socket.emit('initial-data', roomDoc.drawingData);
//       }
//     } catch (err) { console.error(err); }
//   });

//   socket.on('leave-room', ({ roomId }) => {
//     if (!roomId) return;
//     socket.leave(roomId);
//     const roomState = rooms.get(roomId);
//     if (roomState) {
//       roomState.sockets.delete(socket.id);
//       roomState.cursors.delete(socket.id);
//       io.to(roomId).emit('user-count', { count: roomState.sockets.size });
//       io.to(roomId).emit('cursors', Array.from(roomState.cursors.values()));
//     }
//   });

//   socket.on('cursor-move', ({ roomId, x, y, color }) => {
//     if (!roomId) return;
//     const roomState = rooms.get(roomId);
//     if (!roomState) return;
//     roomState.cursors.set(socket.id, { id: socket.id, x, y, color, lastActive: Date.now() });
//     socket.to(roomId).emit('cursor-update', { id: socket.id, x, y, color });
//   });

//   socket.on('draw-start', ({ roomId, stroke }) => {
//     if (!roomId || !stroke) return;
//     socket.to(roomId).emit('draw-start', { id: socket.id, stroke });
//   });

//   socket.on('draw-move', ({ roomId, point }) => {
//     if (!roomId || !point) return;
//     socket.to(roomId).emit('draw-move', { id: socket.id, point });
//   });

//   socket.on('draw-end', async ({ roomId, stroke }) => {
//     if (!roomId || !stroke) return;
//     socket.to(roomId).emit('draw-end', { id: socket.id, stroke });
//     try {
//       await Room.updateOne({ roomId }, { $push: { drawingData: { type: 'stroke', data: stroke, timestamp: new Date() } }, $set: { lastActivity: new Date() } }, { upsert: true });
//     } catch (err) { console.error('persist stroke err', err); }
//   });

//   socket.on('clear-canvas', async ({ roomId }) => {
//     if (!roomId) return;
//     io.to(roomId).emit('clear-canvas');
//     try {
//       await Room.updateOne({ roomId }, { $push: { drawingData: { type: 'clear', data: {}, timestamp: new Date() } }, $set: { lastActivity: new Date() } }, { upsert: true });
//     } catch (err) { console.error('persist clear err', err); }
//   });

//   socket.on('disconnecting', () => {
//     const roomsJoined = Array.from(socket.rooms).filter(r => r !== socket.id);
//     roomsJoined.forEach((roomId) => {
//       const roomState = rooms.get(roomId);
//       if (roomState) {
//         roomState.sockets.delete(socket.id);
//         roomState.cursors.delete(socket.id);
//         io.to(roomId).emit('user-count', { count: roomState.sockets.size });
//         io.to(roomId).emit('cursors', Array.from(roomState.cursors.values()));
//       }
//     });
//   });

//   socket.on('disconnect', () => { console.log('socket disconnected', socket.id); });
// });

// const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whiteboard_db';
// const PORT = process.env.PORT || 4000;

// mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => {
//     console.log('mongo connected');
//     server.listen(PORT, () => console.log('Server listening on', PORT));
//   })
//   .catch((err) => {
//     console.error('Mongo connection error', err);
//     server.listen(PORT, () => console.log('Server started without Mongo on', PORT));
//   });
// server/server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const Room = require('./models/Room');
const roomRoutes = require('./routes/rooms');

const app = express();
app.use(express.json());
app.use(cors());

app.use('/api/rooms', roomRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// In-memory map of roomId -> { sockets: Set, cursors: Map<socketId, cursorInfo> }
const rooms = new Map();

function ensureRoomInit(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { sockets: new Set(), cursors: new Map() });
  }
}

io.on('connection', (socket) => {
  console.log('[server] socket connected', socket.id);

  // JOIN with acknowledgement callback
  socket.on('join-room', async ({ roomId } = {}, callback) => {
    console.log('[server] join-room request from', socket.id, 'roomId=', roomId);
    if (!roomId || typeof roomId !== 'string') {
      if (typeof callback === 'function') callback({ ok: false, error: 'invalid-roomId' });
      return;
    }

    try {
      socket.join(roomId);
      ensureRoomInit(roomId);
      const roomState = rooms.get(roomId);
      roomState.sockets.add(socket.id);

      // notify presence
      const memberCount = io.sockets.adapter.rooms.get(roomId)?.size || roomState.sockets.size;
      io.to(roomId).emit('user-count', { count: memberCount });

      // send persisted drawing data to joining socket
      try {
        const roomDoc = await Room.findOne({ roomId });
        if (roomDoc && roomDoc.drawingData && roomDoc.drawingData.length > 0) {
          socket.emit('initial-data', roomDoc.drawingData);
        }
      } catch (err) {
        console.error('[server] error fetching room doc for initial-data', err);
      }

      console.log('[server] socket', socket.id, 'joined room', roomId, 'members now:', memberCount);
      if (typeof callback === 'function') callback({ ok: true });
    } catch (err) {
      console.error('[server] join-room error', err);
      if (typeof callback === 'function') callback({ ok: false, error: 'server-error' });
    }
  });

  socket.on('leave-room', ({ roomId } = {}) => {
    if (!roomId) return;
    socket.leave(roomId);
    const roomState = rooms.get(roomId);
    if (roomState) {
      roomState.sockets.delete(socket.id);
      roomState.cursors.delete(socket.id);
      const memberCount = io.sockets.adapter.rooms.get(roomId)?.size || roomState.sockets.size;
      io.to(roomId).emit('user-count', { count: memberCount });
      io.to(roomId).emit('cursors', Array.from(roomState.cursors.values()));
    }
    console.log('[server] socket', socket.id, 'left room', roomId);
  });

  socket.on('cursor-move', ({ roomId, x, y, color } = {}) => {
    if (!roomId) return;
    const roomState = rooms.get(roomId);
    if (!roomState) return;
    roomState.cursors.set(socket.id, { id: socket.id, x, y, color, lastActive: Date.now() });
    socket.to(roomId).emit('cursor-update', { id: socket.id, x, y, color });
  });

  // draw-start: forward immediately to others
  socket.on('draw-start', ({ roomId, stroke } = {}) => {
    console.log('[server] draw-start from', socket.id, 'roomId=', roomId, 'pts=', stroke?.path?.length ?? 0);
    if (!roomId) return;
    // forward to everyone except sender
    socket.to(roomId).emit('draw-start', { id: socket.id, stroke });
  });

  // draw-move: accept single point or batched points array and forward quickly
  socket.on('draw-move', ({ roomId, point, points } = {}) => {
    if (!roomId) return;
    if (Array.isArray(points) && points.length > 0) {
      // forward each point to others (keeps remote drawing immediate)
      points.forEach(p => socket.to(roomId).emit('draw-move', { id: socket.id, point: p }));
    } else if (point) {
      socket.to(roomId).emit('draw-move', { id: socket.id, point });
    }
    // NOTE: avoid heavy logging here to prevent console spam in active drawing
  });

  // draw-end: forward and persist stroke
  socket.on('draw-end', async ({ roomId, stroke } = {}) => {
    console.log('[server] draw-end from', socket.id, 'roomId=', roomId, 'pts=', stroke?.path?.length ?? 0);
    if (!roomId) return;
    socket.to(roomId).emit('draw-end', { id: socket.id, stroke });

    // persist stroke to DB (append minimal stroke data)
    try {
      if (stroke) {
        await Room.updateOne(
          { roomId },
          { $push: { drawingData: { type: 'stroke', data: stroke, timestamp: new Date() } }, $set: { lastActivity: new Date() } },
          { upsert: true }
        );
      }
    } catch (err) {
      console.error('[server] persist stroke err', err);
    }
  });

  socket.on('clear-canvas', async ({ roomId } = {}) => {
    if (!roomId) return;
    console.log('[server] clear-canvas from', socket.id, 'roomId=', roomId);
    io.to(roomId).emit('clear-canvas');
    try {
      await Room.updateOne(
        { roomId },
        { $push: { drawingData: { type: 'clear', data: {}, timestamp: new Date() } }, $set: { lastActivity: new Date() } },
        { upsert: true }
      );
    } catch (err) {
      console.error('[server] persist clear err', err);
    }
  });

  socket.on('disconnecting', () => {
    const roomsJoined = Array.from(socket.rooms).filter(r => r !== socket.id);
    roomsJoined.forEach((roomId) => {
      const roomState = rooms.get(roomId);
      if (roomState) {
        roomState.sockets.delete(socket.id);
        roomState.cursors.delete(socket.id);
        const memberCount = io.sockets.adapter.rooms.get(roomId)?.size || roomState.sockets.size;
        io.to(roomId).emit('user-count', { count: memberCount });
        io.to(roomId).emit('cursors', Array.from(roomState.cursors.values()));
        console.log('[server] socket', socket.id, 'disconnecting left room', roomId, 'members now:', memberCount);
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('[server] socket disconnected', socket.id);
  });
});

// Mongo & server start
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whiteboard_db';
const PORT = process.env.PORT || 4000;

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('[server] mongo connected');
    server.listen(PORT, () => {
      console.log('[server] Server listening on', PORT);
    });
  })
  .catch((err) => {
    console.error('[server] Mongo connection error', err);
    // still start server in memory-only mode (draw persistence disabled)
    server.listen(PORT, () => {
      console.log('[server] Server started without Mongo on', PORT);
    });
  });
