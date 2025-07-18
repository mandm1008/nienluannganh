// pages/api/socket.js
import { Server } from 'socket.io';
import { EventManager } from '@/lib/tools/events';
import { STATUS_CHANGE } from '@/lib/moodle/status';

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log('[SOCKET] Initializing socket...');

    const io = new Server(res.socket.server, {
      path: '/api/socket',
      cors: { origin: '*' },
    });

    io.on('connection', (socket) => {
      console.log('[SOCKET] Connected:', socket.id);

      socket.on('subscribe:status', (containerName) => {
        socket.join(containerName);
        console.log(`[SOCKET] ${socket.id} joined room: ${containerName}`);
      });

      socket.on('disconnect', () => {
        console.log('[SOCKET] Disconnected:', socket.id);
      });
    });

    EventManager.on(STATUS_CHANGE, ({ containerName, status }) => {
      console.log(`[SOCKET] Status for ${containerName}: ${status}`);
      io.to(containerName).emit('status:update', { containerName, status });
    });

    res.socket.server.io = io;
  }

  res.end();
}
