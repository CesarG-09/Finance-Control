import { TrendCard } from './TrendCard';

export function ComparisonSection({
  current,
  previous,
  topCategories = [],
}) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-PA', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(value ?? 0));
  };

  return (
    <section className="comparison-section panel">
      <div className="section-header">
        <div>
          <h2>Tendencias y Comparativas</h2>
          <p>Comparación con el mes anterior</p>
        </div>
      </div>

      <div className="comparison-grid">
        <TrendCard
          label="Ingresos"
          currentValue={current.income}
          previousValue={previous.income}
          icon="📈"
        />
        <TrendCard
          label="Gastos"
          currentValue={current.expenses}
          previousValue={previous.expenses}
          icon="📉"
        />
        <TrendCard
          label="Neto"
          currentValue={current.net}
          previousValue={previous.net}
          icon="💰"
        />
      </div>

      {topCategories.length > 0 && (
        <div className="top-categories">
          <h3>Top Categorías de Gasto</h3>
          <div className="categories-list">
            {topCategories.map((category, idx) => (
              <div key={idx} className="category-item">
                <div className="category-info">
                  <span className="category-rank">#{idx + 1}</span>
                  <span className="category-name">{category.category}</span>
                  <span className="category-count">({category.count} transacciones)</span>
                </div>
                <strong className="category-amount">
                  {formatCurrency(Math.abs(category.amount))}
                </strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
