import { getUtilizationStats } from '../../services/accountCardService';

function formatCurrency(value) {
  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value ?? 0));
}

function formatShortDate(date) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-PA', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function getAccountIcon(type) {
  const typeNorm = (type || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (typeNorm.includes('ahorr')) return '🏦';
  if (typeNorm.includes('tarjeta')) return '💳';
  if (typeNorm.includes('efectivo')) return '💵';
  if (typeNorm.includes('inversi')) return '📈';
  return '🤑';
}

export function EnhancedAccountCard({
  account,
  onEdit,
  onDeactivate,
  onReactivate,
}) {
  const isCreditCard = Number(account.ta_id) === 1;
  const card = account.account_card ?? null;
  const stats = isCreditCard ? getUtilizationStats(card) : null;

  return (
    <article
      className={`account-card enhanced-account-card ${
        account.ac_is_active ? 'account-card-active' : 'account-card-inactive'
      } ${isCreditCard ? 'account-card-credit' : ''}`}
    >
      <div className="account-card-header">
        <div className="account-type-icon">
          {getAccountIcon(account.account_type?.ta_name)}
        </div>

        <div className="account-info-header">
          <h3>{account.ac_name}</h3>
          <span className="account-type-name">
            {account.account_type?.ta_name || 'Sin tipo'}
            {isCreditCard && (
              <span className="account-tc-badge" title="Tarjeta de Crédito">TC</span>
            )}
          </span>
        </div>

        <span
          className={`account-status-pill ${
            account.ac_is_active ? 'active' : 'inactive'
          }`}
        >
          {account.ac_is_active ? '✓ Activa' : '✗ Inactiva'}
        </span>
      </div>

      {account.ac_description && (
        <p className="account-description">{account.ac_description}</p>
      )}

      {isCreditCard && stats ? (
        <div className="account-card-credit-body">
          <div className="account-balance-section">
            <strong className="account-balance">{formatCurrency(stats.available)}</strong>
            <small className="balance-label">Crédito disponible</small>
          </div>

          <div className="account-credit-grid">
            <div>
              <small>Deuda actual</small>
              <strong>{formatCurrency(stats.debt)}</strong>
            </div>
            <div>
              <small>Límite</small>
              <strong>{formatCurrency(stats.limit)}</strong>
            </div>
          </div>

          <div className="account-credit-utilization">
            <div className="utilization-track">
              <div
                className="utilization-fill"
                style={{ width: `${stats.utilizationPct}%` }}
              />
            </div>
            <small>
              Uso {Math.round(stats.utilizationPct)}%
              {card?.acc_interest_rate != null && ` · Interés ${Number(card.acc_interest_rate)}%`}
            </small>
          </div>

          <div className="account-credit-dates">
            <span>📅 Corte: <strong>{formatShortDate(stats.nextCutDate)}</strong></span>
            <span>💸 Pago: <strong>{formatShortDate(stats.nextPayDate)}</strong></span>
          </div>
        </div>
      ) : (
        <div className="account-balance-section">
          <strong className="account-balance">{formatCurrency(account.ac_balance)}</strong>
          <small className="balance-label">Balance actual</small>
        </div>
      )}

      <div className="account-card-footer">
        {account.ac_is_active ? (
          <>
            <button
              type="button"
              className="secondary-button account-action"
              onClick={() => onEdit(account)}
            >
              ✎ Editar
            </button>

            <button
              type="button"
              className="danger-button account-action"
              onClick={() => onDeactivate(account)}
            >
              Desactivar
            </button>
          </>
        ) : (
          <button
            type="button"
            className="secondary-button account-action"
            onClick={() => onReactivate(account)}
          >
            ↻ Reactivar
          </button>
        )}
      </div>
    </article>
  );
}
