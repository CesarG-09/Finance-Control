import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import CalendarHeader from '../components/calendar/CalendarHeader';
import CalendarGrid from '../components/calendar/CalendarGrid';
import { getMonthEvents } from '../services/calendarService';

export default function CalendarPage() {
  const { clientProfile } = useAuth();
  const navigate = useNavigate();
  const clientId = clientProfile?.cl_id;

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [monthIndex, setMonthIndex] = useState(today.getMonth());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadEvents = useCallback(async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      setError('');
      const data = await getMonthEvents(clientId, year, monthIndex);
      setEvents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clientId, year, monthIndex]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  function goPrev() {
    if (monthIndex === 0) {
      setMonthIndex(11);
      setYear((y) => y - 1);
    } else {
      setMonthIndex((m) => m - 1);
    }
  }

  function goNext() {
    if (monthIndex === 11) {
      setMonthIndex(0);
      setYear((y) => y + 1);
    } else {
      setMonthIndex((m) => m + 1);
    }
  }

  function goToday() {
    const now = new Date();
    setYear(now.getFullYear());
    setMonthIndex(now.getMonth());
  }

  function handleSelectDay(dateStr) {
    // Navega a Transacciones con la fecha preseleccionada
    navigate(`/transacciones?fecha=${dateStr}`);
  }

  return (
    <section className="calendar-page">
      <div className="page-header">
        <div>
          <h1>Calendario</h1>
          <p>Fechas de corte, pago, recurrentes y movimientos del mes.</p>
        </div>

        <div className="calendar-legend">
          <span className="calendar-legend-item"><i className="legend-dot dot-cut" /> Corte TC</span>
          <span className="calendar-legend-item"><i className="legend-dot dot-pay" /> Pago TC</span>
          <span className="calendar-legend-item"><i className="legend-dot dot-recurrent" /> Recurrente</span>
          <span className="calendar-legend-item"><i className="legend-dot dot-tx" /> Movimiento</span>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="panel calendar-panel">
        <CalendarHeader
          year={year}
          monthIndex={monthIndex}
          onPrev={goPrev}
          onNext={goNext}
          onToday={goToday}
        />

        {loading ? (
          <p>Cargando calendario...</p>
        ) : (
          <CalendarGrid
            year={year}
            monthIndex={monthIndex}
            events={events}
            onSelectDay={handleSelectDay}
          />
        )}
      </div>
    </section>
  );
}
