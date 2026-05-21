/**
 * Filtra movimientos por rango de fechas
 */
export function filterByDateRange(movements, startDate, endDate) {
  return movements.filter((m) => {
    const date = new Date(m.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && date < start) return false;
    if (end && date > end) return false;
    return true;
  });
}

/**
 * Filtra movimientos por rango de montos
 */
export function filterByAmountRange(movements, minAmount, maxAmount) {
  return movements.filter((m) => {
    const amount = Math.abs(parseFloat(m.amount) || 0);
    if (minAmount !== null && amount < minAmount) return false;
    if (maxAmount !== null && amount > maxAmount) return false;
    return true;
  });
}

/**
 * Filtra movimientos por categoría
 */
export function filterByCategory(movements, category) {
  if (!category) return movements;
  return movements.filter(
    (m) => m.category?.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Busca movimientos por texto en descripción o nombre
 */
export function searchMovements(movements, searchTerm) {
  if (!searchTerm) return movements;

  const term = searchTerm.toLowerCase();
  return movements.filter(
    (m) =>
      (m.description && m.description.toLowerCase().includes(term)) ||
      (m.name && m.name.toLowerCase().includes(term)) ||
      (m.category && m.category.toLowerCase().includes(term))
  );
}

/**
 * Aplica múltiples filtros a un arreglo de movimientos
 */
export function applyFilters(movements, filters) {
  let filtered = movements;

  if (filters.startDate || filters.endDate) {
    filtered = filterByDateRange(
      filtered,
      filters.startDate,
      filters.endDate
    );
  }

  if (filters.minAmount !== null || filters.maxAmount !== null) {
    filtered = filterByAmountRange(
      filtered,
      filters.minAmount,
      filters.maxAmount
    );
  }

  if (filters.category) {
    filtered = filterByCategory(filtered, filters.category);
  }

  if (filters.searchTerm) {
    filtered = searchMovements(filtered, filters.searchTerm);
  }

  return filtered;
}

/**
 * Cuenta filtros activos
 */
export function countActiveFilters(filters) {
  return Object.values(filters).filter(
    (v) => v !== '' && v !== null && v !== undefined
  ).length;
}
