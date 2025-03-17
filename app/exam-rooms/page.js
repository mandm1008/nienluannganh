'use client';

import { useEffect, useState } from 'react';

export default function ExamRoomList() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExamRooms() {
      try {
        const response = await fetch('/api/exam-rooms');
        let data = await response.json();

        // format time
        data = data.map((d) => {
          d.timeOpen = formatDateTime(parseInt(d.timeOpen, 10));
          d.timeClose = formatDateTime(parseInt(d.timeClose, 10));
          return d;
        });

        setRooms(data);
      } catch (error) {
        console.error('Lỗi khi lấy danh sách ExamRoom:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchExamRooms();
  }, []);

  function formatDateTime(dateString) {
    console.log(dateString);

    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Danh sách Exam Rooms</h1>

      {loading ? (
        <p>Đang tải dữ liệu...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
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
                    <a
                      href={room.serviceUrl}
                      className="text-blue-500 underline"
                      target="_blank"
                    >
                      Link
                    </a>
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {room.timeOpen || 'N/A'}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {room.timeClose || 'N/A'}
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
