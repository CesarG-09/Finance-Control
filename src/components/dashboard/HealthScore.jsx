function getSignedAmount(m) {
  if (m.movement_source === 'initial_balance') {
    return Number(m.abh_change_amount ?? 0);
  }
  const amount = Number(m.tr_amount ?? 0);
  const typeName = m.transaction_type?.ty_name?.toLowerCase() ?? '';
  return typeName === 'salida' ? -amount : amount;
}

export function HealthScore({ score = 75, movements = [] }) {
  const getScoreColor = (s) => {
    if (s >= 80) return '#047857';
    if (s >= 60) return '#2563eb';
    if (s >= 40) return '#f59e0b';
    return '#b91c1c';
  };

  const getScoreLabel = (s) => {
    if (s >= 80) return 'Excelente';
    if (s >= 60) return 'Buena';
    if (s >= 40) return 'Regular';
    return 'Necesita mejora';
  };

  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  let totalIncome = 0;
  let totalExpenses = 0;

  for (const m of movements) {
    if (m.movement_source === 'initial_balance') continue;
    const signed = getSignedAmount(m);
    if (signed >= 0) totalIncome += signed;
    else totalExpenses += Math.abs(signed);
  }

  const ratio = totalIncome === 0 ? 0 : (totalExpenses / totalIncome) * 100;

  return (
    <article className="health-score-card panel">
      <div className="health-header">
        <h3>Indicador de Salud Financiera</h3>
      </div>

      <div className="health-body">
        <div className="health-score-display">
          <div
            className="health-score-circle"
            style={{
              background: `conic-gradient(${color} ${score}%, #e5e7eb ${score}%)`,
            }}
          >
            <div className="health-score-inner">
              <strong>{Math.round(score)}</strong>
              <small>/ 100</small>
            </div>
          </div>

          <div className="health-info">
            <h4 className="health-label" style={{ color }}>
              {label}
            </h4>
            <p className="health-description">
              Tu ratio gasto/ingreso es <strong>{ratio.toFixed(1)}%</strong>
            </p>
            {ratio > 100 && (
              <p className="health-warning">
                ⚠️ Estás gastando más de lo que ingresas
              </p>
            )}
            {ratio > 80 && ratio <= 100 && (
              <p className="health-warning">
                ⚠️ Considera reducir gastos para mejorar tu salud financiera
              </p>
            )}
            {ratio <= 80 && (
              <p className="health-success">
                ✓ Buen control de gastos respecto a ingresos
              </p>
            )}
          </div>
        </div>

        <div className="health-metrics">
          <div className="health-metric">
            <span className="metric-label">Ingresos</span>
            <strong className="amount-positive">
              ${totalIncome.toFixed(2)}
            </strong>
          </div>
          <div className="health-metric">
            <span className="metric-label">Gastos</span>
            <strong className="amount-negative">
              ${totalExpenses.toFixed(2)}
            </strong>
          </div>
          <div className="health-metric">
            <span className="metric-label">Disponible</span>
            <strong
              className={
                totalIncome - totalExpenses >= 0
                  ? 'amount-positive'
                  : 'amount-negative'
              }
            >
              ${(totalIncome - totalExpenses).toFixed(2)}
            </strong>
          </div>
        </div>
      </div>
    </article>
  );
}
