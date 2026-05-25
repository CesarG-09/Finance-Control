import CalendarDayCell from './CalendarDayCell';

const WEEKDAYS = [
  { short: 'Dom', long: 'Domingo' },
  { short: 'Lun', long: 'Lunes' },
  { short: 'Mar', long: 'Martes' },
  { short: 'Mié', long: 'Miércoles' },
  { short: 'Jue', long: 'Jueves' },
  { short: 'Vie', long: 'Viernes' },
  { short: 'Sáb', long: 'Sábado' },
];

function pad(n) {
  return String(n).padStart(2, '0');
}

function isoDate(year, monthIndex, day) {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

// Número de semana ISO 8601
function getISOWeek(date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = target - firstThursday;
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
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
    const dateObj = new Date(cellYear, cellMonth, day);

    cells.push({
      key: `${cellYear}-${cellMonth}-${day}`,
      day,
      dateStr,
      dateObj,
      weekdayIndex: dateObj.getDay(),
      inMonth,
      isToday: dateStr === todayStr,
      events: eventsByDate[dateStr] ?? [],
    });
  }

  // Agrupar en filas (semanas)
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <div className="calendar-grid-wrapper">
      <div className="calendar-weekdays">
        <span className="calendar-week-col-header" title="Semana">Sem</span>
        {WEEKDAYS.map((w, idx) => (
          <span key={w.short} className="calendar-weekday" title={w.long}>
            <strong>{w.short}</strong>
            <small>{idx + 1}</small>
          </span>
        ))}
      </div>

      <div className="calendar-grid">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="calendar-week-row">
            <span className="calendar-week-number">{getISOWeek(row[0].dateObj)}</span>
            {row.map((cell) => (
              <CalendarDayCell
                key={cell.key}
                day={cell.day}
                weekdayShort={WEEKDAYS[cell.weekdayIndex].short}
                weekdayNumber={cell.weekdayIndex + 1}
                dateStr={cell.dateStr}
                inMonth={cell.inMonth}
                isToday={cell.isToday}
                events={cell.events}
                onSelect={onSelectDay}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
