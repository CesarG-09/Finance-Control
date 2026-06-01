import { useMemo, useState } from 'react';

function formatCurrency(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '$0.00';
  return new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(num);
}

export default function BudgetCategoryRow({
  category,
  subcategories,
  categoryAmount,
  subcategoryAmounts,
  onCategoryAmountChange,
  onSubcategoryAmountChange,
  disabled,
}) {
  const [expanded, setExpanded] = useState(false);

  const subTotal = useMemo(
    () => subcategories.reduce((acc, s) => acc + (Number(subcategoryAmounts[s.sct_id]) || 0), 0),
    [subcategories, subcategoryAmounts]
  );

  const planned = Number(categoryAmount) || 0;
  const overflow = subTotal > planned;

  return (
    <div className={`budget-category-row ${overflow ? 'is-overflow' : ''}`}>
      <div className="budget-category-head">
        <button
          type="button"
          className="budget-category-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          disabled={subcategories.length === 0}
          title={subcategories.length === 0 ? 'Sin subcategorías' : (expanded ? 'Contraer' : 'Desglosar')}
        >
          <span className="budget-category-caret">{expanded ? '▾' : '▸'}</span>
          <strong>{category.ct_name}</strong>
          <small>{subcategories.length} subcat.</small>
        </button>

        <div className="amount-input-wrap budget-category-amount">
          <span className="currency-prefix">$</span>
          <input
            type="number"
            value={categoryAmount}
            onChange={(e) => onCategoryAmountChange(category.ct_id, e.target.value)}
            step="0.01"
            min="0"
            placeholder="0.00"
            disabled={disabled}
            className="amount-number-input"
          />
        </div>
      </div>

      {expanded && subcategories.length > 0 && (
        <div className="budget-subcategory-list">
          {subcategories.map((sub) => (
            <div key={sub.sct_id} className="budget-subcategory-row">
              <span className="budget-subcategory-name">{sub.sct_name}</span>
              <div className="amount-input-wrap">
                <span className="currency-prefix">$</span>
                <input
                  type="number"
                  value={subcategoryAmounts[sub.sct_id] ?? ''}
                  onChange={(e) => onSubcategoryAmountChange(sub.sct_id, e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  disabled={disabled}
                  className="amount-number-input"
                />
              </div>
            </div>
          ))}

          <div className={`budget-subcategory-summary ${overflow ? 'is-overflow' : ''}`}>
            <small>Σ subcategorías:</small>
            <strong>{formatCurrency(subTotal)}</strong>
            <small>/ {formatCurrency(planned)}</small>
            {overflow && <span className="budget-warn-pill">Supera el tope de la categoría</span>}
          </div>
        </div>
      )}
    </div>
  );
}
