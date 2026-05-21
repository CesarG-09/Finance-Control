export function calculatePercentageChange(current, previous) {
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function getSignedAmount(m) {
  if (m.movement_source === 'initial_balance') {
    return Number(m.abh_change_amount ?? 0);
  }
  const amount = Number(m.tr_amount ?? 0);
  const typeName = m.transaction_type?.ty_name?.toLowerCase() ?? '';
  return typeName === 'salida' ? -amount : amount;
}

function getCategory(m) {
  if (m.movement_source === 'initial_balance') return 'Balance inicial';
  const rel = m.subcategories_transaction?.find((s) => s.st_is_active);
  const catName = rel?.subcategory?.category?.ct_name;
  const subName = rel?.subcategory?.sct_name;
  if (!catName && !subName) return 'Sin categoría';
  return `${catName || 'Sin categoría'} - ${subName || 'Sin subcategoría'}`;
}

export function getTopCategories(movements, limit = 3) {
  const expenseMovements = movements.filter((m) => {
    const typeName = m.transaction_type?.ty_name?.toLowerCase() ?? '';
    return typeName === 'salida';
  });

  const grouped = {};
  for (const m of expenseMovements) {
    const category = getCategory(m);
    if (!grouped[category]) grouped[category] = { category, count: 0, total: 0 };
    grouped[category].count++;
    grouped[category].total += Number(m.tr_amount ?? 0);
  }

  return Object.values(grouped)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map((item) => ({ category: item.category, amount: item.total, count: item.count }));
}

export function calculateHealthScore(movements) {
  let income = 0;
  let expenses = 0;

  for (const m of movements) {
    if (m.movement_source === 'initial_balance') continue;
    const signed = getSignedAmount(m);
    if (signed >= 0) income += signed;
    else expenses += Math.abs(signed);
  }

  if (income === 0) return expenses === 0 ? 75 : 0;

  const ratio = (expenses / income) * 100;

  if (ratio > 100) return 0;
  if (ratio > 50) return Math.max(0, 50 - (ratio - 50) / 2);
  return 100;
}
