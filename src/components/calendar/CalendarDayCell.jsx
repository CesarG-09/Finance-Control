function chipClassFor(event) {
  switch (event.type) {
    case 'cut': return 'calendar-chip calendar-chip-cut';
    case 'pay': return 'calendar-chip calendar-chip-pay';
    case 'recurrent': return 'calendar-chip calendar-chip-recurrent';
    case 'tx': return 'calendar-chip calendar-chip-tx';
    default: return 'calendar-chip';
  }
}

export default function CalendarDayCell({
  day,
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
    >
      <span className="calendar-day-number">{day}</span>

      <div className="calendar-day-chips">
        {visible.map((event, idx) => (
          <span key={idx} className={chipClassFor(event)} title={event.label}>
            {event.label}
          </span>
        ))}
        {hidden > 0 && (
          <span className="calendar-chip calendar-chip-more">+{hidden}</span>
        )}
      </div>
    </button>
  );
}
