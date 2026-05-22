import { useMemo } from 'react';
import { calculateNextGenerationDate } from '../../services/recurringTransactionService';

const FREQ_ICONS = {
  Diaria:    '📅',
  Semanal:   '📅',
  Quincenal: '📅',
  Mensual:   '🗓️',
  Anual:     '📆',
};

function formatDate(value) {
  if (!value) return null;
  const s = String(value);
  const str = s.includes('T') ? s : `${s}T00:00:00`;
  return new Intl.DateTimeFormat('es-PA', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(str));
}

export default function RecurringTransactionList({
  recurringTransactions,
  onEdit,
  onDeactivate,
  onCreateNew,
  loading,
}) {
  const sorted = useMemo(
    () =>
      [...(recurringTransactions ?? [])].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      ),
    [recurringTransactions]
  );

  if (!sorted.length) {
    return (
      <div className="rtr-empty-state">
        <div className="rtr-empty-icon">🔄</div>
        <h3>Sin transacciones recurrentes</h3>
        <p>Configura pagos o cobros que se repitan automáticamente.</p>
        <button type="button" onClick={onCreateNew} disabled={loading}>
          + Crear la primera
        </button>
      </div>
    );
  }

  return (
    <div className="rtr-list">
      <div className="rtr-list-header">
        <div>
          <h2>Transacciones recurrentes</h2>
          <p>{sorted.length} regla{sorted.length !== 1 ? 's' : ''} activa{sorted.length !== 1 ? 's' : ''}</p>
        </div>
        <button type="button" onClick={onCreateNew} disabled={loading}>
          + Nueva
        </button>
      </div>

      <div className="rtr-cards">
        {sorted.map(rtr => {
          const freqName = rtr.frequency?.fr_name ?? '';
          const nextDate = calculateNextGenerationDate(
            freqName,
            rtr.rtr_reference_day,
            rtr.rtr_start_date,
            rtr.rtr_finish_date
          );
          const isIncome = rtr.transaction_type?.ty_name?.toLowerCase() === 'entrada';
          const activeSubcats = (rtr.recurrent_transaction_subcategory ?? []).filter(
            s => s.rts_is_active
          );

          return (
            <article key={rtr.rtr_id} className="rtr-card">
              <div className="rtr-card-header">
                <div className="rtr-card-title-group">
                  <span className={`rtr-type-dot ${isIncome ? 'dot-income' : 'dot-expense'}`} />
                  <div>
                    <h3 className="rtr-card-name">{rtr.rtr_name}</h3>
                    {rtr.rtr_description && (
                      <p className="rtr-card-description">{rtr.rtr_description}</p>
                    )}
                  </div>
                </div>
                <span className={`status-tag ${isIncome ? 'income' : 'expense'}`}>
                  {rtr.transaction_type?.ty_name ?? '—'}
                </span>
              </div>

              <div className="rtr-card-body">
                <div className="rtr-card-amount">
                  <span className={isIncome ? 'amount-positive' : 'amount-negative'}>
                    {isIncome ? '+' : '-'}${Number(rtr.rtr_estimated_amount).toFixed(2)}
                  </span>
                </div>

                <div className="rtr-card-meta">
                  <span className="rtr-pill">
                    {FREQ_ICONS[freqName] ?? '📅'} {freqName}
                  </span>
                  <span className="rtr-pill">
                    🏦 {rtr.account?.ac_name ?? '—'}
                  </span>
                </div>

                {activeSubcats.length > 0 && (
                  <div className="rtr-card-subcats">
                    {activeSubcats.map(s => (
                      <span key={s.rts_id} className="rtr-pill rtr-pill--subcat">
                        {s.subcategory?.category?.ct_name} · {s.subcategory?.sct_name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="rtr-card-dates">
                  <span>
                    <strong>Inicio:</strong> {formatDate(rtr.rtr_start_date)}
                  </span>
                  {rtr.rtr_finish_date && (
                    <span>
                      <strong>Fin:</strong> {formatDate(rtr.rtr_finish_date)}
                    </span>
                  )}
                  <span>
                    <strong>Próxima:</strong>{' '}
                    {nextDate ? formatDate(nextDate.toISOString()) : (
                      <em>Sin próximas fechas</em>
                    )}
                  </span>
                </div>
              </div>

              <div className="rtr-card-footer">
                <button
                  type="button"
                  onClick={() => onEdit(rtr)}
                  disabled={loading}
                  className="btn-small"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => onDeactivate(rtr.rtr_id)}
                  disabled={loading}
                  className="btn-small danger-button"
                >
                  Desactivar
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
