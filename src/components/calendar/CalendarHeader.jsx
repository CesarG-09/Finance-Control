const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function CalendarHeader({ year, monthIndex, onPrev, onNext, onToday }) {
  return (
    <header className="calendar-header">
      <button type="button" className="secondary-button" onClick={onPrev} title="Mes anterior">
        «
      </button>

      <div className="calendar-header-title">
        <h2>{MONTH_NAMES[monthIndex]} {year}</h2>
      </div>

      <div className="calendar-header-actions">
        <button type="button" className="secondary-button" onClick={onToday}>Hoy</button>
        <button type="button" className="secondary-button" onClick={onNext} title="Mes siguiente">
          »
        </button>
      </div>
    </header>
  );
}
