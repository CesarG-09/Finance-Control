import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getFixedItems,
  saveFixedItems,
  getMonthlyAllocations,
  saveMonthlyAllocations,
  getBudgetSummary,
  getBudgetEvolution,
  getCurrentMonth,
  getMonthLabel,
} from '../services/budgetService';
import { getActiveSubcategories } from '../services/transactionService';
import { getActiveRecurringTransactions } from '../services/recurringTransactionService';
import FixedItemsList from '../components/budget/FixedItemsList';
import MonthlyAllocationList from '../components/budget/MonthlyAllocationList';
import BudgetEvolutionChart from '../components/budget/BudgetEvolutionChart';

function formatCurrency(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '$0.00';
  return new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(num);
}

function buildMonthOptions() {
  const options = [];
  const today = new Date();
  for (let i = -6; i <= 6; i += 1) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    options.push({
      value: `${d.getFullYear()}-${d.getMonth() + 1}`,
      label: d.toLocaleDateString('es-PA', { month: 'long', year: 'numeric' }),
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    });
  }
  return options;
}

export default function BudgetPage() {
  const { clientProfile } = useAuth();
  const clientId = clientProfile?.cl_id;

  const monthOptions = useMemo(buildMonthOptions, []);
  const initial = getCurrentMonth();

  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);

  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [evolution, setEvolution] = useState([]);

  const [loading, setLoading] = useState(true);
  const [savingIncome, setSavingIncome] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [savingAllocations, setSavingAllocations] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAll = useCallback(async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      setError('');
      const [fixed, alloc, subs, recur, sum, evo] = await Promise.all([
        getFixedItems(clientId),
        getMonthlyAllocations(clientId, year, month),
        getActiveSubcategories(),
        getActiveRecurringTransactions(),
        getBudgetSummary(clientId, year, month),
        getBudgetEvolution(clientId, 6),
      ]);
      setIncomes(fixed.incomes);
      setExpenses(fixed.expenses);
      setAllocations(alloc);
      setSubcategories(subs);
      setRecurring(recur);
      setSummary(sum);
      setEvolution(evo);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clientId, year, month]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function handleMonthChange(event) {
    const opt = monthOptions.find((o) => o.value === event.target.value);
    if (opt) {
      setYear(opt.year);
      setMonth(opt.month);
      setSuccess('');
      setError('');
    }
  }

  async function handleSaveIncomes(items) {
    try {
      setSavingIncome(true);
      setError('');
      setSuccess('');
      await saveFixedItems(clientId, 'income', items);
      setSuccess('Ingresos fijos guardados.');
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingIncome(false);
    }
  }

  async function handleSaveExpenses(items) {
    try {
      setSavingExpense(true);
      setError('');
      setSuccess('');
      await saveFixedItems(clientId, 'expense', items);
      setSuccess('Gastos fijos guardados.');
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingExpense(false);
    }
  }

  async function handleSaveAllocations(items) {
    try {
      setSavingAllocations(true);
      setError('');
      setSuccess('');
      await saveMonthlyAllocations(clientId, year, month, items);
      setSuccess('Distribución del mes guardada.');
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingAllocations(false);
    }
  }

  const currentValue = `${year}-${month}`;
  const monthLabel = getMonthLabel(year, month);

  const plannedIncome = Number(summary?.planned_income ?? 0);
  const plannedFixedExpense = Number(summary?.planned_fixed_expense ?? 0);
  const plannedVariable = Number(summary?.planned_variable ?? 0);
  const plannedExpenseTotal = Number(summary?.planned_expense_total ?? 0);
  const availableToDistribute = Number(summary?.available_to_distribute ?? 0);
  const unallocated = Number(summary?.unallocated_remainder ?? 0);
  const actualIncome = Number(summary?.actual_income ?? 0);
  const actualExpense = Number(summary?.actual_expense ?? 0);

  return (
    <section className="budget-page">
      <div className="page-header">
        <div>
          <h1>Presupuesto</h1>
          <p>Define tus ingresos y gastos fijos una sola vez; distribuye el restante mes a mes.</p>
        </div>

        <div className="budget-month-selector">
          <label>
            <small>Mes</small>
            <select value={currentValue} onChange={handleMonthChange}>
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}
      {success && <p className="info-message">{success}</p>}

      {loading ? (
        <p>Cargando presupuesto...</p>
      ) : (
        <>
          <section className="panel budget-overview-panel">
            <div className="budget-overview-grid">
              <div>
                <small>Ingresos fijos</small>
                <strong className="is-positive">{formatCurrency(plannedIncome)}</strong>
              </div>
              <div>
                <small>Gastos fijos</small>
                <strong className="is-negative">{formatCurrency(plannedFixedExpense)}</strong>
              </div>
              <div>
                <small>Disponible para distribuir</small>
                <strong className={availableToDistribute < 0 ? 'is-negative' : 'is-positive'}>
                  {formatCurrency(availableToDistribute)}
                </strong>
              </div>
              <div>
                <small>Asignado este mes</small>
                <strong>{formatCurrency(plannedVariable)}</strong>
              </div>
              <div>
                <small>Sin asignar</small>
                <strong className={unallocated < 0 ? 'is-negative' : ''}>
                  {formatCurrency(unallocated)}
                </strong>
              </div>
              <div>
                <small>Real {monthLabel}</small>
                <strong>
                  <span className="is-positive">+{formatCurrency(actualIncome)}</span>
                  {' / '}
                  <span className="is-negative">-{formatCurrency(actualExpense)}</span>
                </strong>
              </div>
            </div>
          </section>

          <div className="budget-layout">
            <section className="panel budget-step-panel">
              <header className="budget-step-header">
                <span className="budget-step-pill">Paso 1</span>
                <div>
                  <h2>Ingresos fijos</h2>
                  <p>Salario, rentas, otros ingresos estables. Se mantienen mes a mes.</p>
                </div>
              </header>

              <FixedItemsList
                kind="income"
                items={incomes}
                recurring={recurring}
                subcategories={subcategories}
                typeId={1}
                saving={savingIncome}
                onSave={handleSaveIncomes}
              />
            </section>

            <section className="panel budget-step-panel">
              <header className="budget-step-header">
                <span className="budget-step-pill">Paso 2</span>
                <div>
                  <h2>Gastos fijos</h2>
                  <p>Internet, celular, deudas, préstamos. Se mantienen mes a mes.</p>
                </div>
              </header>

              <FixedItemsList
                kind="expense"
                items={expenses}
                recurring={recurring}
                subcategories={subcategories}
                typeId={2}
                saving={savingExpense}
                onSave={handleSaveExpenses}
              />
            </section>

            <section className="panel budget-step-panel budget-alloc-panel">
              <header className="budget-step-header">
                <span className="budget-step-pill">Paso 3</span>
                <div>
                  <h2>Distribuir restante — {monthLabel}</h2>
                  <p>Asigna lo disponible a categorías variables (luz, tarjeta, ahorro, ocio).</p>
                </div>
              </header>

              <MonthlyAllocationList
                items={allocations}
                subcategories={subcategories}
                availableToDistribute={availableToDistribute}
                saving={savingAllocations}
                onSave={handleSaveAllocations}
              />
            </section>

            <section className="panel budget-step-panel budget-evolution-panel">
              <header className="budget-step-header">
                <span className="budget-step-pill">Evolución</span>
                <div>
                  <h2>Planeado vs real (últimos 6 meses)</h2>
                  <p>Las transferencias entre cuentas no cuentan como gasto.</p>
                </div>
              </header>

              <BudgetEvolutionChart data={evolution} />
            </section>
          </div>
        </>
      )}
    </section>
  );
}
