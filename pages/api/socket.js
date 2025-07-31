// pages/api/socket.js
import { Server } from 'socket.io';
import { EventManager } from '@/lib/tools/events';
import {
  STATUS_CHANGE,
  STATUS_SOCKET_NAME,
  getStatusLabel,
} from '@/lib/moodle/state/status';
import { startAutoFix } from '@/lib/moodle/auto-fix';
import { scheduleAllJob } from '@/lib/tools/schedule';
import { overrideConsole } from '@/logger';

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log('[SOCKET] Starting socket server...');

    const io = new Server(res.socket.server, {
      path: '/api/socket',
      cors: { origin: '*' },
    });

    io.on('connection', (socket) => {
      console.log('[SOCKET] Connected:', socket.id);

      socket.on(`subscribe:${STATUS_SOCKET_NAME}`, (containerName) => {
        socket.join(containerName);
        // console.log(
        //   `[SOCKET] ${socket.id} joined room: ${STATUS_SOCKET_NAME}:${containerName}`
        // );
      });

      // socket.on('disconnect', () => {
      //   console.log('[SOCKET] Disconnected:', socket.id);
      // });
    });

    EventManager.on(STATUS_CHANGE, ({ containerName, status }) => {
      console.log(
        `[SOCKET] Status for ${STATUS_SOCKET_NAME}:${containerName} -> ${getStatusLabel(
          status
        )}`
      );
      io.to(containerName).emit(`update:${STATUS_SOCKET_NAME}`, {
        containerName,
        status,
      });
    });

    console.log('[SOCKET] Started!');

    // init server logic
    try {
      overrideConsole();
      startAutoFix();
      scheduleAllJob();
    } catch (error) {}

    res.socket.server.io = io;
  }

  res.end();
}
