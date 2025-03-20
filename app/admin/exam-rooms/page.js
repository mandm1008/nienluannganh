'use client';

import Image from 'next/image';
import {
  DELETE_DATA,
  START_CTN,
  STOP_CTN,
} from '@/lib/tools/constants/exam-room';
import { useEffect, useState } from 'react';

export default function ExamRoomList() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRooms, setSelectedRooms] = useState(new Set());
  const [action, setAction] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    fetchExamRooms();
  }, []);

  async function fetchExamRooms() {
    try {
      const response = await fetch('/api/exam-rooms');
      let data = await response.json();

      data = data.map((d) => ({
        ...d,
        timeOpen: new Date(parseInt(d.timeOpen, 10) * 1000)
          .toISOString()
          .slice(0, 16),
        timeClose: new Date(parseInt(d.timeClose, 10) * 1000)
          .toISOString()
          .slice(0, 16),
      }));

      setRooms(data);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách ExamRoom:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelection(id) {
    setSelectedRooms((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return newSelection;
    });
  }

  function handleTimeChange(id, field, value) {
    setRooms((prevRooms) =>
      prevRooms.map((room) =>
        room._id === id ? { ...room, [field]: value } : room
      )
    );
  }

  async function handleBulkAction() {
    if (!action) {
      alert('Vui lòng chọn một hành động');
      return;
    }

    const selectedData = rooms
      .filter((room) => selectedRooms.has(room._id))
      .map((room) => ({
        id: room._id,
        timeOpen: room.timeOpen,
        timeClose: room.timeClose,
      }));

    setIsRunning(true);
    try {
      const response = await fetch('/api/exam-rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, rooms: selectedData }),
      });
      const result = await response.json();
      console.log(result);

      // Update UI
      await fetchExamRooms();
    } catch (error) {
      console.error('Lỗi khi gửi yêu cầu:', error);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Danh sách Exam Rooms</h1>

      <div className="mb-4 flex gap-4">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="px-4 py-2 border rounded"
        >
          <option value="">Chọn hành động</option>
          <option value={START_CTN}>Start Container Now</option>
          <option value={STOP_CTN}>Stop Container Now</option>
          <option value={DELETE_DATA}>Delete All</option>
        </select>
        <button
          onClick={handleBulkAction}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400 flex items-center"
          disabled={selectedRooms.size === 0 || !action || isRunning}
        >
          Thực hiện
        </button>
        {isRunning && (
          <Image
            src="/loading.svg"
            alt="Loading"
            width={32}
            height={32}
            className="ml-2"
          />
        )}
      </div>

      {loading ? (
        <p>Đang tải dữ liệu...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 px-4 py-2">Chọn</th>
                <th className="border border-gray-300 px-4 py-2">Quiz ID</th>
                <th className="border border-gray-300 px-4 py-2">Container</th>
                <th className="border border-gray-300 px-4 py-2">Database</th>
                <th className="border border-gray-300 px-4 py-2">Folder</th>
                <th className="border border-gray-300 px-4 py-2">
                  Service URL
                </th>
                <th className="border border-gray-300 px-4 py-2">Open Time</th>
                <th className="border border-gray-300 px-4 py-2">Close Time</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room._id} className="text-center">
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="checkbox"
                      onChange={() => toggleSelection(room._id)}
                      checked={selectedRooms.has(room._id)}
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {room.quizId}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {room.containerName}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {room.dbName}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {room.folderName}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {room.serviceUrl ? (
                      <a
                        href={room.serviceUrl}
                        className="text-blue-500 underline"
                        target="_blank"
                      >
                        Link
                      </a>
                    ) : (
                      'Wait open time'
                    )}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="datetime-local"
                      value={room.timeOpen}
                      onChange={(e) =>
                        handleTimeChange(room._id, 'timeOpen', e.target.value)
                      }
                      disabled={true}
                      className="time-open w-full p-1 border rounded"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="datetime-local"
                      value={room.timeClose}
                      onChange={(e) =>
                        handleTimeChange(room._id, 'timeClose', e.target.value)
                      }
                      disabled={true}
                      className="time-close w-full p-1 border rounded"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
