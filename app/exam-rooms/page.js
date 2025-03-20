'use client';

import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import moment from 'moment';

export default function ExamCalendar() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchExamData = async () => {
      try {
        const response = await fetch('/api/exam-rooms');
        const examData = await response.json();

        const formattedEvents = examData
          .filter((exam) => exam.timeOpen > 0)
          .map((exam) => ({
            id: exam._id,
            title: exam.quizName,
            start: moment.unix(exam.timeOpen).toISOString(),
            end: moment.unix(exam.timeClose).toISOString(),
            allDay: false,
            serviceUrl: exam.serviceUrl || null,
          }));

        setEvents(formattedEvents);
      } catch (error) {
        console.error('Error fetching exam data:', error);
      }
    };

    fetchExamData();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Lịch Thi</h1>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
        }}
        events={events}
        editable={false}
        selectable={true}
        nowIndicator={true}
        eventContent={(arg) => {
          const event = arg.event;
          return {
            domNodes: [
              (() => {
                const container = document.createElement('div');
                container.className =
                  'p-2 rounded-lg shadow-md flex items-center gap-2';

                const title = document.createElement('span');
                title.className = 'font-semibold';
                title.innerText = event.title;
                container.appendChild(title);

                if (event.extendedProps.serviceUrl) {
                  const button = document.createElement('a');
                  button.href = event.extendedProps.serviceUrl;
                  button.target = '_blank';
                  button.innerText = 'Goo';
                  button.className =
                    'ml-2 px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600';
                  container.appendChild(button);
                }

                return container;
              })(),
            ],
          };
        }}
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
