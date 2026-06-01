import { useEffect, useMemo, useState } from 'react';
import BudgetCategoryRow from './BudgetCategoryRow';

const TRANSFER_CATEGORY_NAME = 'Transferencias';

function formatCurrency(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '$0.00';
  return new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(num);
}

export default function BudgetDistribution({
  subcategories,
  initialItems,
  plannedExpenseTotal,
  saving,
  onSave,
}) {
  // Agrupar subcategorías por categoría (excluir "Transferencias")
  const categoryGroups = useMemo(() => {
    const map = new Map();
    for (const sub of subcategories) {
      const cat = sub.category;
      if (!cat?.ct_id) continue;
      if (cat.ct_name === TRANSFER_CATEGORY_NAME) continue;
      if (!map.has(cat.ct_id)) {
        map.set(cat.ct_id, { category: cat, subcategories: [] });
      }
      map.get(cat.ct_id).subcategories.push(sub);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.category.ct_name.localeCompare(b.category.ct_name)
    );
  }, [subcategories]);

  // Estado por categoría y subcategoría
  const [categoryAmounts, setCategoryAmounts] = useState({});
  const [subcategoryAmounts, setSubcategoryAmounts] = useState({});

  useEffect(() => {
    const catMap = {};
    const subMap = {};
    for (const item of initialItems ?? []) {
      if (item.sct_id) {
        subMap[item.sct_id] = String(item.bgi_planned_amount ?? '');
      } else if (item.ct_id) {
        catMap[item.ct_id] = String(item.bgi_planned_amount ?? '');
      }
    }
    setCategoryAmounts(catMap);
    setSubcategoryAmounts(subMap);
  }, [initialItems]);

  function handleCategoryAmountChange(ctId, value) {
    setCategoryAmounts((prev) => ({ ...prev, [ctId]: value }));
  }

  function handleSubcategoryAmountChange(sctId, value) {
    setSubcategoryAmounts((prev) => ({ ...prev, [sctId]: value }));
  }

  const totalCategoryPlanned = useMemo(
    () =>
      Object.values(categoryAmounts).reduce(
        (acc, v) => acc + (Number(v) || 0),
        0
      ),
    [categoryAmounts]
  );

  const plannedExpense = Number(plannedExpenseTotal) || 0;
  const diff = totalCategoryPlanned - plannedExpense;
  const diffStatus =
    Math.abs(diff) < 0.01 ? 'ok' : diff > 0 ? 'over' : 'under';

  async function handleSubmit(event) {
    event.preventDefault();

    const items = [];
    for (const [ctId, amount] of Object.entries(categoryAmounts)) {
      const num = Number(amount);
      if (Number.isFinite(num) && num > 0) {
        items.push({ ct_id: Number(ctId), sct_id: null, planned_amount: num });
      }
    }
    for (const [sctId, amount] of Object.entries(subcategoryAmounts)) {
      const num = Number(amount);
      if (Number.isFinite(num) && num > 0) {
        items.push({ ct_id: null, sct_id: Number(sctId), planned_amount: num });
      }
    }

    await onSave(items);
  }

  return (
    <form className="form budget-distribution-form" onSubmit={handleSubmit}>
      <div className={`budget-distribution-summary status-${diffStatus}`}>
        <div>
          <small>Σ planeado por categorías</small>
          <strong>{formatCurrency(totalCategoryPlanned)}</strong>
        </div>
        <div>
          <small>Gastos planeados (Paso 1)</small>
          <strong>{formatCurrency(plannedExpense)}</strong>
        </div>
        <div>
          <small>Diferencia</small>
          <strong className={diff !== 0 ? `is-${diffStatus}` : ''}>
            {diff > 0 ? '+' : ''}
            {formatCurrency(diff)}
          </strong>
        </div>
      </div>

      <div className="budget-categories-list">
        {categoryGroups.length === 0 ? (
          <p className="info-message">No hay categorías de gasto disponibles.</p>
        ) : (
          categoryGroups.map((group) => (
            <BudgetCategoryRow
              key={group.category.ct_id}
              category={group.category}
              subcategories={group.subcategories}
              categoryAmount={categoryAmounts[group.category.ct_id] ?? ''}
              subcategoryAmounts={subcategoryAmounts}
              onCategoryAmountChange={handleCategoryAmountChange}
              onSubcategoryAmountChange={handleSubcategoryAmountChange}
              disabled={saving}
            />
          ))
        )}
      </div>

      <div className="form-actions">
        <button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar distribución'}
        </button>
      </div>
    </form>
  );
}
