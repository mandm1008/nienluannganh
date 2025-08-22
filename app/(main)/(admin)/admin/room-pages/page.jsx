'use client';

import Image from 'next/image';
import { EXAMROOM_ACTION_LABELS } from '@/lib/moodle/actions/name';
import { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import useSWR from 'swr';
import moment from 'moment';
import StatusListener from '@/components/StatusListener';
import { STATUS_MAP_SHORT } from '@/lib/moodle/state/status';
import { ERROR_CODE, getErrorLabel } from '@/lib/moodle/state/errors';
import { useDebounce } from '@/lib/hooks';

const fetcher = async (url) => {
  const response = await fetch(url);
  const json = await response.json();

  return {
    ...json,
    data: json.data.map((d) => ({
      ...d,
      courseName: `${
        d.courseName.includes(d.courseShortName)
          ? d.courseName
          : `${d.courseShortName} - ${d.courseName}`
      }`,
      timeOpen: moment.unix(d.timeOpen).local().format('YYYY-MM-DDTHH:mm'),
      timeClose: moment.unix(d.timeClose).local().format('YYYY-MM-DDTHH:mm'),
    })),
  };
};

const STATUS_OPTIONS = Object.entries(STATUS_MAP_SHORT).map(
  ([key, { label, value }]) => ({
    label,
    value,
  })
);

const SORT_OPTIONS = [
  { value: 'asc', label: 'Sort by Open Time ↑' },
  { value: 'desc', label: 'Sort by Open Time ↓' },
];

const EXAMROOM_ACTION_OPTIONS = [
  { value: '', label: 'No Action' },
  ...Object.entries(EXAMROOM_ACTION_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

const LIMIT_OPTIONS = [5, 10, 20, 50].map((num) => ({
  label: `Show ${num}`,
  value: num,
}));

export default function ExamRoomList() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5); // default limit=5
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [sort, setSort] = useState('asc'); // 'asc' | 'desc'
  const [statusFilter, setStatusFilter] = useState([]);
  const statusQuery =
    statusFilter.length > 0 ? `&status=${statusFilter.join(',')}` : '';

  const [selectedRooms, setSelectedRooms] = useState(new Set());
  const [action, setAction] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const selectAllRef = useRef(null);

  const {
    data: response = { data: [], total: 0, totalPages: 1 },
    error,
    isLoading,
    mutate,
  } = useSWR(
    `/api/exam-rooms/pages?page=${page}&limit=${limit}&search=${encodeURIComponent(
      debouncedSearch
    )}&sort=${sort}${statusQuery}`,
    fetcher,
    {
      refreshInterval: 10000,
      revalidateOnMount: true,
      revalidateIfStale: true,
    }
  );

  const rooms = response.data || [];
  const totalPages = response.totalPages || 1;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (selectAllRef.current) {
      const selectable = rooms.filter((r) => r.canActions);
      const allSelected = selectable.every((r) => selectedRooms.has(r._id));
      const isIndeterminate = selectedRooms.size > 0 && !allSelected;

      selectAllRef.current.indeterminate = isIndeterminate;
    }
  }, [rooms, selectedRooms]);

  function toggleSelection(id) {
    const room = rooms.find((r) => r._id === id);
    if (!room?.canActions) return;

    setSelectedRooms((prev) => {
      const newSelection = new Set(prev);
      newSelection.has(id) ? newSelection.delete(id) : newSelection.add(id);
      return newSelection;
    });
  }

  function selectAll() {
    const selectable = rooms
      .filter((room) => room.canActions)
      .map((room) => room._id);
    setSelectedRooms(new Set(selectable));
  }

  function deselectAll() {
    setSelectedRooms(new Set());
  }

  function toggleSelectAll(checked) {
    if (checked) {
      const selectable = rooms
        .filter((room) => room.canActions)
        .map((room) => room._id);
      setSelectedRooms(new Set(selectable));
    } else {
      setSelectedRooms(new Set());
    }
  }

  async function handleBulkAction() {
    if (!action) {
      alert('Please select an action!');
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
      await fetch('/api/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rooms: selectedData }),
      });
      await mutate();
    } catch (error) {
      console.error('Failed to submit request:', error);
    } finally {
      setIsRunning(false);
      deselectAll();
    }
  }

  function generatePagination(current, total) {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= total; i++) {
      if (
        i === 1 ||
        i === total ||
        (i >= current - delta && i <= current + delta)
      ) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l > 2) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Exam Rooms</h1>

      {/* Search */}
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1); // Reset page on search
            deselectAll();
          }}
          placeholder="Search quiz/course name..."
          className="px-4 py-2 border rounded w-64"
        />

        {/* Sort */}
        {isMounted && (
          <Select
            options={SORT_OPTIONS}
            value={SORT_OPTIONS.find((opt) => opt.value === sort)}
            onChange={(selected) => {
              setSort(selected.value);
              setPage(1);
              deselectAll();
            }}
            className="min-w-[250px]"
            isSearchable={false}
          />
        )}

        {/* Status */}
        {isMounted && (
          <Select
            isMulti
            options={STATUS_OPTIONS}
            value={STATUS_OPTIONS.filter((opt) =>
              opt.value.some((v) => statusFilter.includes(v))
            )}
            onChange={(selected) => {
              const selectedValues = selected.flatMap((opt) => opt.value);
              setStatusFilter(selectedValues);
              setPage(1);
              deselectAll();
            }}
            placeholder="Filter by status..."
            className="min-w-[250px]"
          />
        )}
      </div>

      {/* Actions */}
      <div className="mb-4 flex flex-wrap gap-4">
        {isMounted && (
          <Select
            options={EXAMROOM_ACTION_OPTIONS}
            value={EXAMROOM_ACTION_OPTIONS.find((opt) => opt.value === action)}
            onChange={(selected) => setAction(selected?.value || '')}
            placeholder="Choose an action"
            className="min-w-[250px]"
            isSearchable={false}
          />
        )}

        <button
          onClick={handleBulkAction}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
          disabled={selectedRooms.size === 0 || !action || isRunning}
        >
          Execute
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
      </div>

      {isLoading ? (
        <p>Loading data...</p>
      ) : error ? (
        <p className="text-red-500">Failed to load data.</p>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="table-auto w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border px-4 py-2">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      className="w-5 h-5"
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      checked={
                        rooms.length > 0 &&
                        rooms
                          .filter((r) => r.canActions)
                          .every((r) => selectedRooms.has(r._id))
                      }
                    />
                  </th>
                  <th className="border px-4 py-2">Quiz ID</th>
                  <th className="border px-4 py-2">Quiz Name</th>
                  <th className="border px-4 py-2">Course Name</th>
                  {/* <th className="border px-4 py-2">Database</th>
                  <th className="border px-4 py-2">Folder</th> */}
                  <th className="border px-4 py-2">Service URL</th>
                  <th className="border px-4 py-2">Status</th>
                  <th className="border px-4 py-2">Open Time</th>
                  <th className="border px-4 py-2">Close Time</th>
                </tr>
              </thead>
              <tbody>
                {rooms.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center text-gray-500 py-4">
                      No upcoming exam schedules
                    </td>
                  </tr>
                ) : (
                  rooms.map((room, index) => (
                    <tr
                      key={room._id || index}
                      className={`text-center ${
                        !room.canActions ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      <td className="border px-4 py-2">
                        <input
                          type="checkbox"
                          onChange={() => toggleSelection(room._id)}
                          checked={selectedRooms.has(room._id)}
                          disabled={!room.canActions}
                          className="w-5 h-5"
                        />
                      </td>
                      <td className="border px-4 py-2">{room.quizId}</td>
                      <td className="border px-4 py-2">{room.quizName}</td>
                      <td className="border px-4 py-2">{room.courseName}</td>
                      {/* <td className="border px-4 py-2">{room.dbName}</td>
                      <td className="border px-4 py-2">{room.folderName}</td> */}
                      <td className="border px-4 py-2">
                        {room.serviceUrl ? (
                          <a
                            href={room.serviceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`px-2 py-1 text-sm rounded font-medium inline-block whitespace-nowrap ${
                              room.canActions
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed pointer-events-none'
                            }`}
                          >
                            Go!
                          </a>
                        ) : (
                          'No deploy'
                        )}
                      </td>
                      <td className="border px-4 py-2">
                        {room.error === ERROR_CODE.ERROR_KILL ? (
                          <span className="bg-red-600 text-white px-3 py-1 rounded font-bold">
                            {getErrorLabel(room.error)}
                          </span>
                        ) : (
                          <StatusListener
                            containerName={room.containerName}
                            initialStatus={room.status}
                          />
                        )}
                      </td>
                      <td className="border px-4 py-2">
                        <input
                          type="datetime-local"
                          value={room.timeOpen}
                          disabled
                          className="w-full p-1 border rounded"
                        />
                      </td>
                      <td className="border px-4 py-2">
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

          {/* Pagination */}
          <div className="flex justify-between items-center mt-6 flex-wrap">
            {/* Left: Pagination số */}
            <div className="flex gap-2 items-center flex-wrap justify-center shrink grow basis-0">
              <button
                onClick={() => {
                  setPage((prev) => Math.max(prev - 1, 1));
                  deselectAll();
                }}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Prev
              </button>

              {generatePagination(page, totalPages).map((item, idx) =>
                item === '...' ? (
                  <span key={idx} className="px-2 text-gray-500">
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => {
                      setPage(item);
                      deselectAll();
                    }}
                    className={`px-3 py-1 rounded border ${
                      item === page
                        ? 'bg-blue-500 text-white font-bold border-blue-500'
                        : 'bg-white text-gray-800 border-gray-300'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

              <button
                onClick={() => {
                  setPage((prev) => Math.min(prev + 1, totalPages));
                  deselectAll();
                }}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>

            {/* Right: Limit selector */}
            <div className="mt-2 sm:mt-0">
              {isMounted && (
                <Select
                  options={LIMIT_OPTIONS}
                  value={LIMIT_OPTIONS.find((opt) => opt.value === limit)}
                  onChange={(selected) => {
                    setLimit(selected.value);
                    setPage(1);
                    deselectAll();
                  }}
                  isSearchable={false}
                  menuPlacement="top"
                  className="min-w-[80px]"
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
