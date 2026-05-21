/**
 * Calcula el porcentaje de cambio entre dos valores
 */
export function calculatePercentageChange(current, previous) {
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Agrupa movimientos por fecha
 */
export function groupMovementsByDate(movements) {
  return movements.reduce((acc, movement) => {
    const date = movement.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(movement);
    return acc;
  }, {});
}

/**
 * Agrupa movimientos por categoría
 */
export function groupMovementsByCategory(movements) {
  return movements.reduce((acc, movement) => {
    const category = movement.category || 'Sin categoría';
    if (!acc[category]) {
      acc[category] = {
        category,
        movements: [],
        total: 0,
      };
    }
    acc[category].movements.push(movement);
    acc[category].total += parseFloat(movement.amount) || 0;
    return acc;
  }, {});
}

/**
 * Calcula promedio diario de gastos en un período
 */
export function calculateDailyAverageExpense(movements, daysInMonth = 30) {
  const totalExpense = movements
    .filter((m) => m.type === 'expense' || m.amount < 0)
    .reduce((sum, m) => sum + Math.abs(parseFloat(m.amount) || 0), 0);

  return totalExpense / daysInMonth;
}

/**
 * Calcula ratio gasto/ingreso
 */
export function calculateExpenseIncomeRatio(movements) {
  const totalIncome = movements
    .filter((m) => m.type === 'income' || m.amount > 0)
    .reduce((sum, m) => sum + parseFloat(m.amount) || 0, 0);

  const totalExpense = movements
    .filter((m) => m.type === 'expense' || m.amount < 0)
    .reduce((sum, m) => sum + Math.abs(parseFloat(m.amount) || 0), 0);

  if (totalIncome === 0) return 0;
  return (totalExpense / totalIncome) * 100;
}

/**
 * Obtiene top N categorías por monto
 */
export function getTopCategories(movements, limit = 3) {
  const grouped = groupMovementsByCategory(movements);
  return Object.values(grouped)
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
    .slice(0, limit)
    .map((item) => ({
      category: item.category,
      amount: item.total,
      count: item.movements.length,
    }));
}

/**
 * Calcula indicador de salud financiera (0-100)
 */
export function calculateHealthScore(movements, totalIncome = 0) {
  const ratio = calculateExpenseIncomeRatio(movements);

  // Escala: 0-50% gasto/ingreso = 100, 50-100% = 50-0, >100% = negativo
  let score = 100;
  if (ratio > 100) {
    score = 0;
  } else if (ratio > 50) {
    score = 50 - (ratio - 50) / 2;
  }

  return Math.max(0, Math.min(100, score));
}
