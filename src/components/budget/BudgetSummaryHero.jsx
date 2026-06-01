function formatCurrency(value, opts = {}) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '$0.00';
  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: opts.compact ? 0 : 2,
  }).format(num);
}

function clampPct(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export default function BudgetSummaryHero({ summary, monthLabel }) {
  if (!summary) return null;

  const plannedIncome = Number(summary.planned_income ?? 0);
  const plannedFixedExpense = Number(summary.planned_fixed_expense ?? 0);
  const plannedVariable = Number(summary.planned_variable ?? 0);
  const plannedExpenseTotal = Number(summary.planned_expense_total ?? 0);
  const availableToDistribute = Number(summary.available_to_distribute ?? 0);
  const unallocated = Number(summary.unallocated_remainder ?? 0);
  const actualIncome = Number(summary.actual_income ?? 0);
  const actualExpense = Number(summary.actual_expense ?? 0);

  // Métricas para barras
  const incomeDenom = plannedIncome > 0 ? plannedIncome : 1;
  const fixedPct = clampPct((plannedFixedExpense / incomeDenom) * 100);
  const variablePct = clampPct((plannedVariable / incomeDenom) * 100);
  const usedPct = clampPct(fixedPct + variablePct);

  const availDenom = availableToDistribute > 0 ? availableToDistribute : 1;
  const allocPct = clampPct((plannedVariable / availDenom) * 100);
  const allocStatus = unallocated < 0 ? 'over' : (Math.abs(unallocated) < 0.01 ? 'ok' : 'under');

  const actualPct = plannedExpenseTotal > 0
    ? clampPct((actualExpense / plannedExpenseTotal) * 100)
    : 0;
  const actualStatus = actualPct > 100 ? 'over' : actualPct >= 80 ? 'warn' : 'ok';

  const fixedExceedsIncome = plannedFixedExpense > plannedIncome && plannedIncome > 0;

  return (
    <section className="budget-hero">
      <div className="budget-hero-grid">
        {/* Bloque 1: Flujo del mes */}
        <article className="budget-hero-card budget-hero-flow">
          <header>
            <span className="budget-hero-label">Flujo del mes</span>
            <small>Ingresos fijos − Gastos fijos = Disponible</small>
          </header>

          <div className="budget-flow-numbers">
            <div className="flow-step">
              <small>Ingresos</small>
              <strong className="is-positive">{formatCurrency(plannedIncome)}</strong>
            </div>
            <span className="flow-op">−</span>
            <div className="flow-step">
              <small>Fijos</small>
              <strong className="is-negative">{formatCurrency(plannedFixedExpense)}</strong>
            </div>
            <span className="flow-op">=</span>
            <div className="flow-step is-result">
              <small>Disponible</small>
              <strong className={availableToDistribute < 0 ? 'is-negative' : 'is-positive'}>
                {formatCurrency(availableToDistribute)}
              </strong>
            </div>
          </div>

          <div className="budget-flow-bar" title={`Uso del ingreso: ${usedPct.toFixed(0)}%`}>
            <div className="flow-bar-segment flow-bar-fixed" style={{ width: `${fixedPct}%` }} />
            <div className="flow-bar-segment flow-bar-variable" style={{ width: `${variablePct}%` }} />
          </div>
          <div className="budget-flow-bar-legend">
            <span><i className="legend-dot dot-fixed" /> Fijos {fixedPct.toFixed(0)}%</span>
            <span><i className="legend-dot dot-variable" /> Variables {variablePct.toFixed(0)}%</span>
            <span className="muted">Resto {Math.max(100 - usedPct, 0).toFixed(0)}%</span>
          </div>

          {fixedExceedsIncome && (
            <p className="budget-hero-warn">
              ⚠ Tus gastos fijos superan tus ingresos fijos.
            </p>
          )}
        </article>

        {/* Bloque 2: Distribución del restante */}
        <article className={`budget-hero-card budget-hero-alloc status-${allocStatus}`}>
          <header>
            <span className="budget-hero-label">Distribución variable</span>
            <small>{monthLabel}</small>
          </header>

          <div className="budget-hero-big">
            <strong className={unallocated < 0 ? 'is-negative' : ''}>
              {formatCurrency(unallocated)}
            </strong>
            <small>{unallocated < 0 ? 'Asignado de más' : unallocated === 0 ? 'Todo asignado' : 'Sin asignar'}</small>
          </div>

          <div className="budget-progress-track">
            <div
              className={`budget-progress-fill status-${allocStatus}`}
              style={{ width: `${allocPct}%` }}
            />
          </div>
          <div className="budget-hero-detail">
            <span>Asignado: <strong>{formatCurrency(plannedVariable)}</strong></span>
            <span>de <strong>{formatCurrency(availableToDistribute)}</strong></span>
          </div>
        </article>

        {/* Bloque 3: Real vs Planeado del mes */}
        <article className={`budget-hero-card budget-hero-actual status-${actualStatus}`}>
          <header>
            <span className="budget-hero-label">Real vs planeado</span>
            <small>Gastos del mes</small>
          </header>

          <div className="budget-hero-big">
            <strong className={actualStatus === 'over' ? 'is-negative' : actualStatus === 'warn' ? 'is-warn' : 'is-positive'}>
              {actualPct.toFixed(0)}%
            </strong>
            <small>
              {formatCurrency(actualExpense)} de {formatCurrency(plannedExpenseTotal)}
            </small>
          </div>

          <div className="budget-progress-track">
            <div
              className={`budget-progress-fill status-${actualStatus}`}
              style={{ width: `${Math.min(actualPct, 100)}%` }}
            />
          </div>
          <div className="budget-hero-detail">
            <span className="is-positive">+ {formatCurrency(actualIncome)}</span>
            <span className="is-negative">− {formatCurrency(actualExpense)}</span>
            <span>
              Neto:{' '}
              <strong className={actualIncome - actualExpense >= 0 ? 'is-positive' : 'is-negative'}>
                {formatCurrency(actualIncome - actualExpense)}
              </strong>
            </span>
          </div>
        </article>
      </div>
    </section>
  );
}
