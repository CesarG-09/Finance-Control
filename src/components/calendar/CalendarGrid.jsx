import CalendarDayCell from './CalendarDayCell';

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function pad(n) {
  return String(n).padStart(2, '0');
}

function isoDate(year, monthIndex, day) {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

export default function CalendarGrid({ year, monthIndex, events, onSelectDay }) {
  const firstDay = new Date(year, monthIndex, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();

  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  const eventsByDate = events.reduce((acc, e) => {
    if (!acc[e.date]) acc[e.date] = [];
    acc[e.date].push(e);
    return acc;
  }, {});

  const today = new Date();
  const todayStr = isoDate(today.getFullYear(), today.getMonth(), today.getDate());

  const cells = [];
  for (let i = 0; i < totalCells; i += 1) {
    const offset = i - startWeekday;
    let day;
    let cellMonth = monthIndex;
    let cellYear = year;
    let inMonth = true;

    if (offset < 0) {
      day = daysInPrevMonth + offset + 1;
      cellMonth = monthIndex - 1;
      if (cellMonth < 0) { cellMonth = 11; cellYear -= 1; }
      inMonth = false;
    } else if (offset >= daysInMonth) {
      day = offset - daysInMonth + 1;
      cellMonth = monthIndex + 1;
      if (cellMonth > 11) { cellMonth = 0; cellYear += 1; }
      inMonth = false;
    } else {
      day = offset + 1;
    }

    const dateStr = isoDate(cellYear, cellMonth, day);
    cells.push({
      key: `${cellYear}-${cellMonth}-${day}`,
      day,
      dateStr,
      inMonth,
      isToday: dateStr === todayStr,
      events: eventsByDate[dateStr] ?? [],
    });
  }

  return (
    <div className="calendar-grid-wrapper">
      <div className="calendar-weekdays">
        {WEEKDAYS.map((w) => (
          <span key={w} className="calendar-weekday">{w}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((cell) => (
          <CalendarDayCell
            key={cell.key}
            day={cell.day}
            dateStr={cell.dateStr}
            inMonth={cell.inMonth}
            isToday={cell.isToday}
            events={cell.events}
            onSelect={onSelectDay}
          />
        ))}
      </div>
    </div>
  );
}
