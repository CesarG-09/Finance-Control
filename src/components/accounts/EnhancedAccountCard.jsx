import { useState, useEffect } from 'react';

export function EnhancedAccountCard({
  account,
  onEdit,
  onDeactivate,
  onReactivate,
}) {
  const [lastMovement, setLastMovement] = useState(null);
  const [transactionCount, setTransactionCount] = useState(0);

  useEffect(() => {
    // Calculate last movement and transaction count from account data
    // This would be passed as prop in a full implementation
    loadAccountMetrics();
  }, [account]);

  function loadAccountMetrics() {
    // Placeholder - in real implementation, fetch from service
    setTransactionCount(0);
    setLastMovement(null);
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('es-PA', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(value ?? 0));
  }

  function getAccountIcon(type) {
    const typeNorm = (type || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    if (typeNorm.includes('ahorr')) return '🏦';
    if (typeNorm.includes('tarjeta')) return '💳';
    if (typeNorm.includes('efectivo')) return '💵';
    if (typeNorm.includes('inversi')) return '📈';
    return '🤑';
  }

  return (
    <article
      className={`account-card enhanced-account-card ${
        account.ac_is_active
          ? 'account-card-active'
          : 'account-card-inactive'
      }`}
    >
      {/* Header */}
      <div className="account-card-header">
        <div className="account-type-icon">
          {getAccountIcon(account.account_type?.ta_name)}
        </div>

        <div className="account-info-header">
          <h3>{account.ac_name}</h3>
          <span className="account-type-name">
            {account.account_type?.ta_name || 'Sin tipo'}
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

      {/* Description */}
      {account.ac_description && (
        <p className="account-description">{account.ac_description}</p>
      )}

      {/* Balance section */}
      <div className="account-balance-section">
        <strong className="account-balance">
          {formatCurrency(account.ac_balance)}
        </strong>
        <small className="balance-label">Balance actual</small>
      </div>

      {/* Metrics (if data available) */}
      {(transactionCount > 0 || lastMovement) && (
        <div className="account-metrics">
          {transactionCount > 0 && (
            <div className="metric-item">
              <span className="metric-icon">📊</span>
              <div className="metric-info">
                <small className="metric-label">Transacciones este mes</small>
                <span className="metric-value">{transactionCount}</span>
              </div>
            </div>
          )}

          {lastMovement && (
            <div className="metric-item">
              <span className="metric-icon">🕒</span>
              <div className="metric-info">
                <small className="metric-label">Último movimiento</small>
                <span className="metric-value">{lastMovement}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer with actions */}
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
