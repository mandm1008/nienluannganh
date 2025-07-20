import { io } from 'socket.io-client';

const socket = io({
  path: '/api/socket',
  autoConnect: false,
});

export default socket;
