'use client';

import Image from 'next/image';
import { EXAMROOM_ACTIONS } from '@/lib/tools/constants/actions';
import { useState } from 'react';
import useSWR from 'swr';
import moment from 'moment';
import StatusListener from '@/components/StatusListener';

const fetcher = async (url) => {
  const response = await fetch(url);
  let data = await response.json();
  return data.map((d) => ({
    ...d,
    timeOpen: moment.unix(d.timeOpen).local().format('YYYY-MM-DDTHH:mm'),
    timeClose: moment.unix(d.timeClose).local().format('YYYY-MM-DDTHH:mm'),
  }));
};

export default function ExamRoomList() {
  const {
    data: rooms = [],
    error,
    isLoading,
    mutate, // để gọi lại thủ công sau khi POST
  } = useSWR('/api/exam-rooms', fetcher, {
    refreshInterval: 10000, // tự động refresh mỗi 10s
    revalidateOnMount: true,
    revalidateIfStale: true,
  });

  const [selectedRooms, setSelectedRooms] = useState(new Set());
  const [action, setAction] = useState('');
  const [isRunning, setIsRunning] = useState(false);

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

  function selectAll() {
    setSelectedRooms(new Set(rooms.map((room) => room._id)));
  }

  function deselectAll() {
    setSelectedRooms(new Set());
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
      await fetch('/api/exam-rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, rooms: selectedData }),
      });

      await mutate(); // reload lại data ngay sau khi thực hiện xong
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
          <option value={EXAMROOM_ACTIONS.START_CTN}>Start Container</option>
          <option value={EXAMROOM_ACTIONS.STOP_CTN}>Stop Container</option>
          <option value={EXAMROOM_ACTIONS.DELETE_DATA}>
            Delete (Không lưu)
          </option>
          <option value={EXAMROOM_ACTIONS.DELETE_SAVE_DATA}>
            Delete (Lưu)
          </option>
        </select>
        <button
          onClick={handleBulkAction}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
          disabled={selectedRooms.size === 0 || !action || isRunning}
        >
          Thực hiện
        </button>
        {isRunning && (
          <Image
            src="/loading.svg"
            alt="Loading"
            width={40}
            height={40}
            className="ml-2"
          />
        )}
        <button
          onClick={selectAll}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Chọn tất cả
        </button>
        <button
          onClick={deselectAll}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Hủy chọn tất cả
        </button>
      </div>

      {isLoading ? (
        <p>Đang tải dữ liệu...</p>
      ) : error ? (
        <p className="text-red-500">Lỗi khi tải dữ liệu.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 px-4 py-2">Chọn</th>
                <th className="border border-gray-300 px-4 py-2">Quiz ID</th>
                <th className="border border-gray-300 px-4 py-2">Quiz Name</th>
                <th className="border border-gray-300 px-4 py-2">
                  Course Name
                </th>
                <th className="border border-gray-300 px-4 py-2">Database</th>
                <th className="border border-gray-300 px-4 py-2">Folder</th>
                <th className="border border-gray-300 px-4 py-2">
                  Service URL
                </th>
                <th className="border border-gray-300 px-4 py-2">Status</th>
                <th className="border border-gray-300 px-4 py-2">Open Time</th>
                <th className="border border-gray-300 px-4 py-2">Close Time</th>
              </tr>
            </thead>
            <tbody>
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center text-gray-500 py-4">
                    Không có lịch thi nào sắp đến
                  </td>
                </tr>
              ) : (
                rooms.map((room, index) => (
                  <tr key={room._id || index} className="text-center">
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="checkbox"
                        onChange={() => toggleSelection(room._id)}
                        checked={selectedRooms.has(room._id)}
                        className="w-5 h-5"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {room.quizId}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {room.quizName}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {room.courseName}
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
                          href={
                            room.serviceUrl && room.containerCourseId
                              ? room.serviceUrl
                              : undefined
                          }
                          onClick={(e) => {
                            if (!room.containerCourseId) e.preventDefault();
                          }}
                          className={`px-2 py-1 text-sm rounded font-medium inline-block whitespace-nowrap ${
                            room.containerCourseId
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-200 text-gray-500 cursor-not-allowed pointer-events-none'
                          }`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Go!
                        </a>
                      ) : (
                        'No deploy'
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <StatusListener
                        containerName={room.containerName}
                        initialStatus={room.status}
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="datetime-local"
                        value={room.timeOpen}
                        disabled
                        className="w-full p-1 border rounded"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="datetime-local"
                        value={room.timeClose}
                        disabled
                        className="w-full p-1 border rounded"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
