function formatCurrencyCompact(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '$0';
  const abs = Math.abs(num);
  if (abs >= 1000) {
    return `${num < 0 ? '-' : ''}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  }
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
    return (
      <div className="budget-evolution-empty">
        <p>No hay datos suficientes para mostrar la evolución.</p>
        <small>Necesitas presupuesto y transacciones en los últimos meses.</small>
      </div>
    );
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

  // Y-axis ticks: 4 niveles (0, 25%, 50%, 75%, 100%)
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((t) => ({
    pct: t * 100,
    label: formatCurrencyCompact(maxValue * t),
  }));

  // Stats agregadas
  const sumPI = data.reduce((a, r) => a + Number(r.planned_income ?? 0), 0);
  const sumAI = data.reduce((a, r) => a + Number(r.actual_income ?? 0), 0);
  const sumPE = data.reduce((a, r) => a + Number(r.planned_expense ?? 0), 0);
  const sumAE = data.reduce((a, r) => a + Number(r.actual_expense ?? 0), 0);
  const avgVarIncome = data.length ? (sumAI - sumPI) / data.length : 0;
  const avgVarExpense = data.length ? (sumAE - sumPE) / data.length : 0;

  return (
    <div className="budget-evolution-v2">
      {/* Insights superiores */}
      <div className="evo-insights">
        <div>
          <small>Ingreso promedio (real)</small>
          <strong className="is-positive">
            {formatCurrencyCompact(data.length ? sumAI / data.length : 0)}
          </strong>
          <span className={avgVarIncome >= 0 ? 'is-positive' : 'is-negative'}>
            {avgVarIncome >= 0 ? '+' : ''}{formatCurrencyCompact(avgVarIncome)} vs planeado
          </span>
        </div>
        <div>
          <small>Gasto promedio (real)</small>
          <strong className="is-negative">
            {formatCurrencyCompact(data.length ? sumAE / data.length : 0)}
          </strong>
          <span className={avgVarExpense > 0 ? 'is-negative' : 'is-positive'}>
            {avgVarExpense >= 0 ? '+' : ''}{formatCurrencyCompact(avgVarExpense)} vs planeado
          </span>
        </div>
      </div>

      {/* Leyenda */}
      <div className="evo-legend">
        <span><i className="legend-swatch swatch-planned-income" /> Ingreso planeado</span>
        <span><i className="legend-swatch swatch-actual-income" /> Ingreso real</span>
        <span><i className="legend-swatch swatch-planned-expense" /> Gasto planeado</span>
        <span><i className="legend-swatch swatch-actual-expense" /> Gasto real</span>
      </div>

      {/* Plot area */}
      <div className="evo-plot">
        <div className="evo-y-axis">
          {ticks.map((t, idx) => (
            <span key={idx} className="evo-y-tick" style={{ bottom: `${t.pct}%` }}>
              {t.label}
            </span>
          ))}
        </div>

        <div className="evo-grid-wrapper">
          {/* Líneas guía horizontales */}
          <div className="evo-gridlines">
            {ticks.map((t, idx) => (
              <span key={idx} className="evo-gridline" style={{ bottom: `${t.pct}%` }} />
            ))}
          </div>

          <div className="evo-bars-grid">
            {data.map((row) => {
              const pInc = Number(row.planned_income ?? 0);
              const aInc = Number(row.actual_income ?? 0);
              const pExp = Number(row.planned_expense ?? 0);
              const aExp = Number(row.actual_expense ?? 0);
              const net = aInc - aExp;
              const overExp = aExp > pExp && pExp > 0;

              return (
                <div key={`${row.year}-${row.month}`} className="evo-month">
                  <div className="evo-bars">
                    <div className="evo-bar-pair">
                      <div
                        className="evo-bar bar-planned-income"
                        style={{ height: `${(pInc / maxValue) * 100}%` }}
                        title={`Planeado: ${formatCurrencyCompact(pInc)}`}
                      />
                      <div
                        className="evo-bar bar-actual-income"
                        style={{ height: `${(aInc / maxValue) * 100}%` }}
                        title={`Real: ${formatCurrencyCompact(aInc)}`}
                      >
                        {aInc > 0 && (
                          <span className="evo-bar-value">{formatCurrencyCompact(aInc)}</span>
                        )}
                      </div>
                    </div>
                    <div className="evo-bar-pair">
                      <div
                        className="evo-bar bar-planned-expense"
                        style={{ height: `${(pExp / maxValue) * 100}%` }}
                        title={`Planeado: ${formatCurrencyCompact(pExp)}`}
                      />
                      <div
                        className={`evo-bar bar-actual-expense ${overExp ? 'is-over' : ''}`}
                        style={{ height: `${(aExp / maxValue) * 100}%` }}
                        title={`Real: ${formatCurrencyCompact(aExp)}`}
                      >
                        {aExp > 0 && (
                          <span className="evo-bar-value">{formatCurrencyCompact(aExp)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="evo-month-foot">
                    <small className="evo-month-label">
                      {monthLabel(row.year, row.month)}
                    </small>
                    <span
                      className={`evo-month-net ${net >= 0 ? 'is-positive' : 'is-negative'}`}
                      title="Neto real (ingreso − gasto)"
                    >
                      {net >= 0 ? '+' : ''}{formatCurrencyCompact(net)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
