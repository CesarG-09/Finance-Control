import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getBudgetByMonth,
  upsertBudgetHeader,
  saveBudgetItems,
  getBudgetVsActual,
  copyBudgetFromPreviousMonth,
  getCurrentMonth,
  getMonthLabel,
} from '../services/budgetService';
import { getActiveSubcategories } from '../services/transactionService';
import BudgetHeaderForm from '../components/budget/BudgetHeaderForm';
import BudgetDistribution from '../components/budget/BudgetDistribution';
import BudgetProgressCard from '../components/budget/BudgetProgressCard';

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
  const [budget, setBudget] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [vsActual, setVsActual] = useState([]);

  const [loading, setLoading] = useState(true);
  const [savingHeader, setSavingHeader] = useState(false);
  const [savingItems, setSavingItems] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAll = useCallback(async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      setError('');
      const [bg, subs, vs] = await Promise.all([
        getBudgetByMonth(clientId, year, month),
        getActiveSubcategories(),
        getBudgetVsActual(clientId, year, month),
      ]);
      setBudget(bg);
      setSubcategories(subs);
      setVsActual(vs);
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

  async function handleHeaderSubmit(values) {
    try {
      setSavingHeader(true);
      setError('');
      setSuccess('');
      await upsertBudgetHeader(clientId, { year, month, ...values });
      setSuccess('Presupuesto del mes guardado.');
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingHeader(false);
    }
  }

  async function handleSaveItems(items) {
    if (!budget?.bg_id) {
      setError('Guarda primero el paso 1 antes de distribuir.');
      return;
    }
    try {
      setSavingItems(true);
      setError('');
      setSuccess('');
      await saveBudgetItems(budget.bg_id, items);
      setSuccess('Distribución guardada.');
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingItems(false);
    }
  }

  async function handleCopyPrevious() {
    try {
      setCopying(true);
      setError('');
      setSuccess('');
      await copyBudgetFromPreviousMonth(clientId, year, month);
      setSuccess('Presupuesto copiado del mes anterior.');
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setCopying(false);
    }
  }

  const currentValue = `${year}-${month}`;
  const monthLabel = getMonthLabel(year, month);

  return (
    <section className="budget-page">
      <div className="page-header">
        <div>
          <h1>Presupuesto</h1>
          <p>Planea tus ingresos y gastos del mes, distribuye por categorías y sigue el avance real.</p>
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
        <div className="budget-layout">
          <section className="panel budget-step-panel">
            <header className="budget-step-header">
              <span className="budget-step-pill">Paso 1</span>
              <div>
                <h2>Ingresos y gastos del mes</h2>
                <p>Define los totales del mes para saber cuánto puedes distribuir.</p>
              </div>
            </header>

            <BudgetHeaderForm
              budget={budget}
              saving={savingHeader}
              onSubmit={handleHeaderSubmit}
              onCopyPrevious={handleCopyPrevious}
              copying={copying}
              monthLabel={monthLabel}
            />
          </section>

          <section className={`panel budget-step-panel ${!budget ? 'is-disabled' : ''}`}>
            <header className="budget-step-header">
              <span className="budget-step-pill">Paso 2</span>
              <div>
                <h2>Distribución por categoría</h2>
                <p>Asigna un tope por categoría; opcionalmente desglosa por subcategoría.</p>
              </div>
            </header>

            {budget ? (
              <BudgetDistribution
                subcategories={subcategories}
                initialItems={budget.budget_item ?? []}
                plannedExpenseTotal={budget.bg_planned_expense_total}
                saving={savingItems}
                onSave={handleSaveItems}
              />
            ) : (
              <p className="info-message">Guarda el paso 1 para habilitar la distribución.</p>
            )}
          </section>

          <section className="panel budget-progress-panel">
            <header className="budget-step-header">
              <span className="budget-step-pill">Avance</span>
              <div>
                <h2>Real vs planeado</h2>
                <p>Las transferencias entre cuentas no se incluyen en el gasto.</p>
              </div>
            </header>

            {vsActual.length === 0 ? (
              <p className="info-message">Aún no hay ítems en el presupuesto para comparar.</p>
            ) : (
              <div className="budget-progress-grid">
                {vsActual.map((row) => (
                  <BudgetProgressCard key={row.bgi_id} row={row} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
