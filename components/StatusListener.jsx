'use client';

import { useEffect, useState } from 'react';
import socket from '@/lib/tools/socket';
import { getStatusLabel } from '@/lib/moodle/status';

export default function StatusListener({ containerName, initialStatus = null }) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    if (!containerName) return;

    if (!socket.connected) socket.connect();

    // Subscribe to a specific container channel
    socket.emit('subscribe:status', containerName);

    const handler = ({ status }) => {
      setStatus(status);
    };

    socket.on('status:update', handler);

    return () => {
      socket.off('status:update', handler);
    };
  }, [containerName]);

  if (status === null) {
    return <span className="text-gray-400">Waiting for status...</span>;
  }

  return (
    <span
      className="px-2 py-1 text-sm rounded bg-blue-100 text-blue-800 font-medium inline-block whitespace-nowrap"
    >
      {getStatusLabel(status)}
    </span>
  );
}
