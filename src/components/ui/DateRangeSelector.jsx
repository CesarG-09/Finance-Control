import { useState, useEffect } from 'react';

export function DateRangeSelector({
  startDate,
  endDate,
  onDateChange,
  label = 'Rango de fechas',
}) {
  const [start, setStart] = useState(startDate || '');
  const [end, setEnd] = useState(endDate || '');

  useEffect(() => {
    setStart(startDate || '');
    setEnd(endDate || '');
  }, [startDate, endDate]);

  const handleStartChange = (e) => {
    const newStart = e.target.value;
    setStart(newStart);
    onDateChange?.(newStart, end);
  };

  const handleEndChange = (e) => {
    const newEnd = e.target.value;
    setEnd(newEnd);
    onDateChange?.(start, newEnd);
  };

  const handleReset = () => {
    setStart('');
    setEnd('');
    onDateChange?.('', '');
  };

  return (
    <div className="date-range-selector">
      <label>{label}</label>
      <div className="date-range-inputs">
        <div className="date-input-group">
          <label htmlFor="start-date" className="date-label">Desde:</label>
          <input
            id="start-date"
            type="date"
            value={start}
            onChange={handleStartChange}
            max={end || undefined}
          />
        </div>
        <span className="date-separator">→</span>
        <div className="date-input-group">
          <label htmlFor="end-date" className="date-label">Hasta:</label>
          <input
            id="end-date"
            type="date"
            value={end}
            onChange={handleEndChange}
            min={start || undefined}
          />
        </div>
        {(start || end) && (
          <button
            type="button"
            className="secondary-button"
            onClick={handleReset}
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
