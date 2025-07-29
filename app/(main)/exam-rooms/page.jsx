'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import moment from 'moment';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/scale.css';
import { includesOf } from '@/lib/tools/slug';

const fetcher = async (url) => {
  const response = await fetch(url);
  const examData = await response.json();

  return examData
    .filter((exam) => exam.timeOpen > 0)
    .map((exam) => ({
      ...exam,
      id: exam._id,
      title: `${exam.quizName} (${
        exam.courseName.includes(exam.courseShortName)
          ? exam.courseName
          : `${exam.courseShortName} - ${exam.courseName}`
      })`,
      start: moment.unix(exam.timeOpen).toISOString(),
      end: moment.unix(exam.timeClose).toISOString(),
      allDay: false,
      serviceUrl: exam.containerCourseId ? exam.serviceUrl : null,
    }));
};

export default function ExamCalendar() {
  const [searchTerm, setSearchTerm] = useState('');
  const [username, setUsername] = useState('');
  const [filteredEvents, setFilteredEvents] = useState([]);

  const query = username.trim()
    ? `/api/exam-rooms?username=${username}`
    : '/api/exam-rooms';

  const {
    data: events = [],
    error,
    isLoading,
  } = useSWR(query, fetcher, {
    refreshInterval: 10000,
    revalidateOnMount: true,
    revalidateIfStale: true,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const urlUsername = params.get('username');
    const storedUsername = localStorage.getItem('elsystem_username');

    if (urlUsername) {
      setUsername(urlUsername);
      localStorage.setItem('elsystem_username', urlUsername);
    } else if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  useEffect(() => {
    if (!events || events.length === 0) {
      if (filteredEvents.length !== 0) setFilteredEvents([]);
      return;
    }

    const filtered = events.filter(
      (event) => event.title && includesOf(event.title, searchTerm)
    );

    const isSame =
      filteredEvents.length === filtered.length &&
      filteredEvents.every((e, i) => e.id === filtered[i].id);

    if (!isSame) {
      setFilteredEvents(filtered);
    }
  }, [searchTerm, events]);

  const renderEventTippy = (eventInfo) => {
    return (
      <Tippy
        content={
          <div className="text-sm p-2">
            <p>
              <strong>📌 {eventInfo.event.title}</strong>
            </p>
            <p>
              🕒 Start:{' '}
              {moment(eventInfo.event.start).format('HH:mm, DD/MM/YYYY')}
            </p>
            <p>
              ⏳ End: {moment(eventInfo.event.end).format('HH:mm, DD/MM/YYYY')}
            </p>
            {eventInfo.event.extendedProps.serviceUrl && (
              <p className="text-center mt-2">
                <a
                  href={eventInfo.event.extendedProps.serviceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                >
                  Go to room
                </a>
              </p>
            )}
          </div>
        }
        placement="top"
        animation="scale"
        arrow={true}
        delay={[200, 0]}
        interactive={true}
        appendTo={document.body}
      >
        <div className="rounded-sm pl-1 flex font-semibold text-white bg-blue-500 min-w-full min-h-full text-nowrap whitespace-nowrap">
          {eventInfo.event.title}{' '}
          {eventInfo.event.extendedProps.serviceUrl && <span>⭐</span>}
        </div>
      </Tippy>
    );
  };

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Exam Calendar</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mb-4 gap-2">
        {/* Search by exam name */}
        <input
          type="text"
          placeholder="Search by exam name..."
          className="p-2 border rounded-md w-full sm:w-64"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* Username filter */}
        <input
          type="text"
          placeholder="Filter by username..."
          className="p-2 border rounded-md w-full sm:w-64"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        {/* Clear both */}
        {(searchTerm || username) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setUsername('');
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            Clear
          </button>
        )}
      </div>

      {isLoading && <p>Loading exam calendar...</p>}
      {error && <p className="text-red-500">Error loading exam data.</p>}
      {!isLoading && filteredEvents.length === 0 && (
        <p className="text-center p-6 text-gray-500 border rounded-md bg-white">
          No upcoming exams found.
        </p>
      )}

      {filteredEvents.length > 0 && (
        <FullCalendar
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            interactionPlugin,
            listPlugin,
          ]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          buttonText={{
            today: 'Today',
            month: 'Month',
            week: 'Week',
            day: 'Day',
            list: 'List',
          }}
          events={filteredEvents}
          editable={false}
          selectable={true}
          nowIndicator={true}
          eventContent={renderEventTippy}
          eventClick={(info) => {
            if (info.event.extendedProps.serviceUrl) {
              window.open(info.event.extendedProps.serviceUrl, '_blank');
              info.jsEvent.preventDefault();
            }
          }}
          height="auto"
        />
      )}
    </div>
  );
}
