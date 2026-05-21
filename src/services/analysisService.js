function getSignedAmount(m) {
  if (m.movement_source === 'initial_balance') {
    return Number(m.abh_change_amount ?? 0);
  }
  const amount = Number(m.tr_amount ?? 0);
  const typeName = m.transaction_type?.ty_name?.toLowerCase() ?? '';
  return typeName === 'salida' ? -amount : amount;
}

export function calculateMovementsSummary(movements) {
  let income = 0;
  let expenses = 0;

  for (const m of movements) {
    const signed = getSignedAmount(m);
    if (signed >= 0) income += signed;
    else expenses += Math.abs(signed);
  }

  return {
    income: Math.round(income * 100) / 100,
    expenses: Math.round(expenses * 100) / 100,
    net: Math.round((income - expenses) * 100) / 100,
    count: movements.filter((m) => m.movement_source !== 'initial_balance').length,
  };
}

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
