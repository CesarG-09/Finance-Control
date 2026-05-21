import { calculatePercentageChange } from '../../services/chartService';

export function TrendCard({
  label,
  currentValue,
  previousValue,
  currency = '$',
  format = 'currency',
  icon = null,
}) {
  const percentChange = calculatePercentageChange(currentValue, previousValue);
  const isPositive = percentChange >= 0;
  const trendClass = isPositive ? 'trend-positive' : 'trend-negative';

  const formatValue = (value) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('es-PA', {
        style: 'currency',
        currency: 'USD',
      }).format(Number(value ?? 0));
    }
    if (format === 'percentage') {
      return `${Number(value ?? 0).toFixed(1)}%`;
    }
    return Number(value ?? 0).toFixed(2);
  };

  return (
    <article className="trend-card">
      <div className="trend-header">
        {icon && <span className="trend-icon">{icon}</span>}
        <h3 className="trend-label">{label}</h3>
      </div>

      <div className="trend-body">
        <strong className="trend-value">{formatValue(currentValue)}</strong>

        {previousValue !== null && previousValue !== undefined && (
          <div className={`trend-indicator ${trendClass}`}>
            <span className="trend-arrow">{isPositive ? '↑' : '↓'}</span>
            <span className="trend-percent">
              {Math.abs(percentChange).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {previousValue !== null && previousValue !== undefined && (
        <small className="trend-comparison">
          vs anterior: {formatValue(previousValue)}
        </small>
      )}

      {/* CSS-based trend line visualization */}
      <div className="trend-line-container">
        <div className="trend-line" />
      </div>
    </article>
  );
}
