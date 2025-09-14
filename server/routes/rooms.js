const express = require('express');
const router = express.Router();
const Room = require('../models/Room');

router.post('/join', async (req, res) => {
  try {
    const { roomId } = req.body;
    if (!roomId || typeof roomId !== 'string') return res.status(400).json({ error: 'roomId required' });
    let room = await Room.findOne({ roomId });
    if (!room) { room = new Room({ roomId }); await room.save(); }
    res.json({ roomId: room.roomId, createdAt: room.createdAt, lastActivity: room.lastActivity });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ error: 'room not found' });
    res.json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
