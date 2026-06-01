function chipClassFor(event) {
  switch (event.type) {
    case 'cut': return 'calendar-chip calendar-chip-cut';
    case 'pay': return 'calendar-chip calendar-chip-pay';
    case 'recurrent': return 'calendar-chip calendar-chip-recurrent';
    case 'tx': return 'calendar-chip calendar-chip-tx';
    default: return 'calendar-chip';
  }
}

function chipIconFor(event) {
  switch (event.type) {
    case 'cut': return '✂';
    case 'pay': return '💸';
    case 'recurrent': return '🔁';
    case 'tx': return '•';
    default: return '';
  }
}

export default function CalendarDayCell({
  day,
  weekdayShort,
  weekdayNumber,
  dateStr,
  inMonth,
  isToday,
  events,
  onSelect,
}) {
  const visible = events.slice(0, 3);
  const hidden = Math.max(events.length - visible.length, 0);

  return (
    <button
      type="button"
      className={`calendar-day-cell ${inMonth ? '' : 'out-of-month'} ${isToday ? 'is-today' : ''}`}
      onClick={() => onSelect(dateStr)}
      title={`${weekdayShort} ${day} — día ${weekdayNumber} de la semana`}
    >
      <header className="calendar-day-head">
        <span className="calendar-day-weekday">{weekdayShort}</span>
        <span className="calendar-day-number">{day}</span>
        {isToday && <span className="calendar-today-pill">Hoy</span>}
      </header>

      <div className="calendar-day-chips">
        {visible.map((event, idx) => (
          <span key={idx} className={chipClassFor(event)} title={event.label}>
            <span className="calendar-chip-icon">{chipIconFor(event)}</span>
            <span className="calendar-chip-label">{event.label}</span>
          </span>
        ))}
        {hidden > 0 && (
          <span className="calendar-chip calendar-chip-more">+{hidden} más</span>
        )}
      </div>
    </button>
  );
}
