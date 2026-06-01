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
import BudgetSummaryHero from '../components/budget/BudgetSummaryHero';

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

const TABS = [
  { id: 'income', label: 'Ingresos fijos', icon: '⬇' },
  { id: 'expense', label: 'Gastos fijos', icon: '⬆' },
  { id: 'allocation', label: 'Distribución del mes', icon: '◐' },
  { id: 'evolution', label: 'Evolución', icon: '📈' },
];

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

  const [activeTab, setActiveTab] = useState('income');
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
  const available = Number(summary?.available_to_distribute ?? 0);

  // Conteos para badges en tabs
  const tabCounts = {
    income: incomes.length,
    expense: expenses.length,
    allocation: allocations.length,
  };

  return (
    <section className="budget-page">
      <div className="page-header">
        <div>
          <h1>Presupuesto</h1>
          <p>Define una sola vez tus ingresos y gastos fijos. Distribuye el restante mes a mes y mide tu evolución.</p>
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
        <div className="budget-loading">
          <p>Cargando presupuesto…</p>
        </div>
      ) : (
        <>
          <BudgetSummaryHero summary={summary} monthLabel={monthLabel} />

          <nav className="budget-tabs" role="tablist">
            {TABS.map((t) => {
              const isActive = activeTab === t.id;
              const count = tabCounts[t.id];
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`budget-tab ${isActive ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  <span className="budget-tab-icon">{t.icon}</span>
                  <span className="budget-tab-label">{t.label}</span>
                  {count != null && count > 0 && (
                    <span className="budget-tab-count">{count}</span>
                  )}
                </button>
              );
            })}
          </nav>

          <section className="panel budget-tab-panel">
            {activeTab === 'income' && (
              <>
                <header className="budget-tab-head">
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
              </>
            )}

            {activeTab === 'expense' && (
              <>
                <header className="budget-tab-head">
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
              </>
            )}

            {activeTab === 'allocation' && (
              <>
                <header className="budget-tab-head">
                  <div>
                    <h2>Distribución de {monthLabel}</h2>
                    <p>Asigna el disponible a categorías variables (luz, tarjeta, ahorro, ocio…).</p>
                  </div>
                </header>
                <MonthlyAllocationList
                  items={allocations}
                  subcategories={subcategories}
                  availableToDistribute={available}
                  saving={savingAllocations}
                  onSave={handleSaveAllocations}
                />
              </>
            )}

            {activeTab === 'evolution' && (
              <>
                <header className="budget-tab-head">
                  <div>
                    <h2>Evolución de los últimos 6 meses</h2>
                    <p>Planeado vs real. Las transferencias entre cuentas no cuentan como gasto.</p>
                  </div>
                </header>
                <BudgetEvolutionChart data={evolution} />
              </>
            )}
          </section>
        </>
      )}
    </section>
  );
}
