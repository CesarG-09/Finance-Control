function formatCurrency(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '$0.00';
  return new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(num);
}

export default function BudgetProgressCard({ row }) {
  const planned = Number(row.planned ?? 0);
  const actual = Number(row.actual ?? 0);
  const pct = Number(row.pct ?? 0);
  const status = row.status ?? 'ok';
  const diff = planned - actual;

  const label = row.level === 'subcategory'
    ? `${row.ct_name ?? '—'} / ${row.sct_name}`
    : row.ct_name ?? '—';

  return (
    <article className={`budget-progress-card status-${status}`}>
      <header className="budget-progress-head">
        <div>
          <strong>{label}</strong>
          <small>{row.level === 'subcategory' ? 'Subcategoría' : 'Categoría'}</small>
        </div>
        <span className={`budget-status-pill status-${status}`}>
          {status === 'over' ? 'Excedido' : status === 'warn' ? '≥ 80 %' : 'En rango'}
        </span>
      </header>

      <div className="budget-progress-track">
        <div
          className={`budget-progress-fill status-${status}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      <footer className="budget-progress-foot">
        <span>{formatCurrency(actual)} / {formatCurrency(planned)}</span>
        <span className={diff < 0 ? 'is-negative' : 'is-positive'}>
          {diff >= 0 ? 'Resta ' : 'Excede '}{formatCurrency(Math.abs(diff))}
        </span>
        <span>{pct}%</span>
      </footer>
    </article>
  );
}
