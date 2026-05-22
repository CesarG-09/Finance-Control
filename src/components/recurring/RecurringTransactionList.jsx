import { useMemo } from 'react';
import { calculateNextGenerationDate } from '../../services/recurringTransactionService';

export default function RecurringTransactionList({
  recurringTransactions,
  onEdit,
  onDeactivate,
  onCreateNew,
  loading,
}) {
  const sortedTransactions = useMemo(() => {
    return [...(recurringTransactions ?? [])].sort((a, b) =>
      a.rtr_start_date < b.rtr_start_date ? 1 : -1
    );
  }, [recurringTransactions]);

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
  }

  function getNextDate(frequency, referenceDay) {
    const nextDate = calculateNextGenerationDate(frequency, referenceDay);
    return nextDate ? formatDate(nextDate.toISOString()) : '';
  }

  if (!sortedTransactions || sortedTransactions.length === 0) {
    return (
      <div className="empty-state">
        <p>No tienes transacciones recurrentes configuradas.</p>
        <button
          type="button"
          onClick={onCreateNew}
          className="btn-primary"
          disabled={loading}
        >
          Crear primera transacción recurrente
        </button>
      </div>
    );
  }

  return (
    <div className="recurring-transaction-list">
      <div className="list-header">
        <h3>Transacciones Recurrentes</h3>
        <button
          type="button"
          onClick={onCreateNew}
          className="btn-primary"
          disabled={loading}
        >
          + Nueva transacción recurrente
        </button>
      </div>

      <div className="transactions-table-wrapper">
        <table className="transactions-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Frecuencia</th>
              <th>Monto</th>
              <th>Próxima</th>
              <th>Fin</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.map((rtr) => {
              const freqName = rtr.frequency?.fr_name ?? '';
              const nextDate = getNextDate(freqName, rtr.rtr_reference_day);

              return (
                <tr key={rtr.rtr_id} className="transaction-row">
                  <td className="name-cell">
                    <div className="transaction-name">{rtr.rtr_name}</div>
                    {rtr.rtr_description && (
                      <div className="transaction-description">{rtr.rtr_description}</div>
                    )}
                  </td>
                  <td className="frequency-cell">{freqName}</td>
                  <td className="amount-cell">
                    ${Number(rtr.rtr_estimated_amount).toFixed(2)}
                  </td>
                  <td className="next-date-cell">{nextDate}</td>
                  <td className="finish-date-cell">
                    {rtr.rtr_finish_date ? formatDate(rtr.rtr_finish_date) : '—'}
                  </td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      onClick={() => onEdit(rtr)}
                      className="btn-small"
                      disabled={loading}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeactivate(rtr.rtr_id)}
                      className="btn-small btn-danger"
                      disabled={loading}
                    >
                      Desactivar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
