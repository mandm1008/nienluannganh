'use client';

import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import moment from 'moment';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/scale.css';

export default function ExamCalendar() {
  const [events, setEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEvents, setFilteredEvents] = useState([]);

  useEffect(() => {
    const fetchExamData = async () => {
      try {
        const response = await fetch('/api/exam-rooms');
        const examData = await response.json();

        const formattedEvents = examData
          .filter((exam) => exam.timeOpen > 0)
          .map((exam) => ({
            id: exam._id,
            title: `${exam.quizName} (${exam.courseName})`,
            start: moment.unix(exam.timeOpen).toISOString(),
            end: moment.unix(exam.timeClose).toISOString(),
            allDay: false,
            serviceUrl: exam.serviceUrl || null,
          }));

        setEvents(formattedEvents);
        setFilteredEvents(formattedEvents);
      } catch (error) {
        console.error('Error fetching exam data:', error);
      }
    };

    fetchExamData();
  }, []);

  useEffect(() => {
    if (events && events.length > 0) {
      const filtered = events.filter((event) =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
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
              🕒 Bắt đầu:{' '}
              {moment(eventInfo.event.start).format('HH:mm, DD/MM/YYYY')}
            </p>
            <p>
              ⏳ Kết thúc:{' '}
              {moment(eventInfo.event.end).format('HH:mm, DD/MM/YYYY')}
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
        placement="top" // Vị trí tooltip (top, bottom, left, right)
        animation="scale" // Hiệu ứng mở tooltip (scale, shift-away, fade, ...)
        arrow={true} // Hiển thị mũi tên tooltip
        delay={[200, 0]} // Hiển thị sau 200ms, tắt ngay lập tức
        interactive={true} // Cho phép hover vào tooltip
        appendTo={document.body}
      >
        <div className="p-2 rounded-lg shadow-md flex items-center gap-2">
          <span className="font-semibold">
            {eventInfo.event.title}
            {'  '}
            {eventInfo.event.extendedProps.serviceUrl && <span>⭐</span>}
          </span>
        </div>
      </Tippy>
    );
  };

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Lịch Thi</h1>

      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Filtering by name..."
          className="p-2 border rounded-md w-100 pr-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="inline-block ml-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            Clear
          </button>
        )}
      </div>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="timeGridWeek"
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
      />
    </div>
  );
}
