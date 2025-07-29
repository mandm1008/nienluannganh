'use client';

import { useEffect, useState } from 'react';
import socket from '@/lib/tools/socket';
import { getStatusLabel, STATUS_SOCKET_NAME } from '@/lib/moodle/state/status';

export default function StatusListener({
  containerName,
  initialStatus = null,
}) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    if (!containerName) return;

    if (!socket.connected) socket.connect();

    // Subscribe to a specific container channel
    socket.emit(`subscribe:${STATUS_SOCKET_NAME}`, containerName);

    const handler = ({ containerName: name, status }) => {
      if (containerName === name) setStatus(status);
    };

    socket.on(`update:${STATUS_SOCKET_NAME}`, handler);

    return () => {
      socket.off(`update:${STATUS_SOCKET_NAME}`, handler);
    };
  }, [containerName]);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  if (status === null) {
    return <span className="text-gray-400">Waiting for status...</span>;
  }

  return (
    <span className="px-2 py-1 text-sm rounded bg-blue-100 text-blue-800 font-medium inline-block whitespace-nowrap">
      {getStatusLabel(status)}
    </span>
  );
}
