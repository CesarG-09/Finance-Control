function formatCurrency(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '$0';
  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(num);
}

function monthLabel(year, month) {
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('es-PA', { month: 'short' });
}

export default function BudgetEvolutionChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="info-message">No hay datos suficientes para mostrar evolución.</p>;
  }

  const maxValue = data.reduce((max, row) => {
    return Math.max(
      max,
      Number(row.planned_income ?? 0),
      Number(row.planned_expense ?? 0),
      Number(row.actual_income ?? 0),
      Number(row.actual_expense ?? 0)
    );
  }, 0) || 1;

  return (
    <div className="budget-evolution">
      <div className="budget-evolution-legend">
        <span><i className="legend-dot dot-planned-income" /> Ingreso planeado</span>
        <span><i className="legend-dot dot-actual-income" /> Ingreso real</span>
        <span><i className="legend-dot dot-planned-expense" /> Gasto planeado</span>
        <span><i className="legend-dot dot-actual-expense" /> Gasto real</span>
      </div>

      <div className="budget-evolution-grid">
        {data.map((row) => {
          const pInc = Number(row.planned_income ?? 0);
          const aInc = Number(row.actual_income ?? 0);
          const pExp = Number(row.planned_expense ?? 0);
          const aExp = Number(row.actual_expense ?? 0);
          const overExp = aExp > pExp && pExp > 0;

          return (
            <div key={`${row.bma_year}-${row.bma_month}`} className="budget-evolution-col">
              <div className="budget-evolution-bars">
                <div className="budget-evolution-pair">
                  <div
                    className="bar bar-planned-income"
                    style={{ height: `${(pInc / maxValue) * 100}%` }}
                    title={`Ingreso planeado: ${formatCurrency(pInc)}`}
                  />
                  <div
                    className="bar bar-actual-income"
                    style={{ height: `${(aInc / maxValue) * 100}%` }}
                    title={`Ingreso real: ${formatCurrency(aInc)}`}
                  />
                </div>
                <div className="budget-evolution-pair">
                  <div
                    className="bar bar-planned-expense"
                    style={{ height: `${(pExp / maxValue) * 100}%` }}
                    title={`Gasto planeado: ${formatCurrency(pExp)}`}
                  />
                  <div
                    className={`bar bar-actual-expense ${overExp ? 'is-over' : ''}`}
                    style={{ height: `${(aExp / maxValue) * 100}%` }}
                    title={`Gasto real: ${formatCurrency(aExp)}`}
                  />
                </div>
              </div>
              <small className="budget-evolution-label">
                {monthLabel(row.bma_year, row.bma_month)}
              </small>
            </div>
          );
        })}
      </div>
    </div>
  );
}
