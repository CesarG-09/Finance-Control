/**
 * Calcula resumen de un conjunto de movimientos
 */
export function calculateMovementsSummary(movements) {
  const income = movements
    .filter((m) => m.type === 'income' || m.amount > 0)
    .reduce((sum, m) => sum + parseFloat(m.amount) || 0, 0);

  const expenses = movements
    .filter((m) => m.type === 'expense' || m.amount < 0)
    .reduce((sum, m) => sum + Math.abs(parseFloat(m.amount) || 0), 0);

  return {
    income: Math.round(income * 100) / 100,
    expenses: Math.round(expenses * 100) / 100,
    net: Math.round((income - expenses) * 100) / 100,
    count: movements.length,
  };
}

/**
 * Compara resúmenes de dos períodos
 */
export function compareMovements(currentMovements, previousMovements) {
  const current = calculateMovementsSummary(currentMovements);
  const previous = calculateMovementsSummary(previousMovements);

  const changeIncome =
    previous.income === 0
      ? 0
      : ((current.income - previous.income) / previous.income) * 100;
  const changeExpenses =
    previous.expenses === 0
      ? 0
      : ((current.expenses - previous.expenses) / previous.expenses) * 100;

  return {
    current,
    previous,
    incomeChange: Math.round(changeIncome * 100) / 100,
    expensesChange: Math.round(changeExpenses * 100) / 100,
  };
}

/**
 * Ordena movimientos por campo
 */
export function sortMovements(movements, field = 'date', direction = 'desc') {
  const sorted = [...movements];
  sorted.sort((a, b) => {
    let aVal = a[field];
    let bVal = b[field];

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (direction === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  return sorted;
}

/**
 * Calcula tendencia simple (últimos N valores)
 */
export function calculateTrend(values) {
  if (values.length < 2) return 0;

  const first = values[0];
  const last = values[values.length - 1];

  if (first === 0) return 0;
  return ((last - first) / Math.abs(first)) * 100;
}

/**
 * Agrupa movimientos por mes
 */
export function groupMovementsByMonth(movements) {
  return movements.reduce((acc, movement) => {
    const date = new Date(movement.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      '0'
    )}`;

    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(movement);
    return acc;
  }, {});
}

/**
 * Calcula balance acumulado
 */
export function calculateAccumulatedBalance(movements) {
  let balance = 0;
  return movements.map((movement) => {
    const amount = parseFloat(movement.amount) || 0;
    balance += amount;
    return {
      ...movement,
      accumulatedBalance: balance,
    };
  });
}
