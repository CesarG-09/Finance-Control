import { useEffect, useState } from 'react';

function formatCurrency(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '$0.00';
  return new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(num);
}

const emptyForm = {
  plannedIncome: '0',
  plannedExpenseTotal: '0',
  notes: '',
};

export default function BudgetHeaderForm({
  budget,
  saving,
  onSubmit,
  onCopyPrevious,
  copying,
  monthLabel,
}) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (budget) {
      setForm({
        plannedIncome: String(budget.bg_planned_income ?? '0'),
        plannedExpenseTotal: String(budget.bg_planned_expense_total ?? '0'),
        notes: budget.bg_notes ?? '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [budget]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  const income = Number(form.plannedIncome) || 0;
  const expense = Number(form.plannedExpenseTotal) || 0;
  const available = income - expense;

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit({
      plannedIncome: income,
      plannedExpenseTotal: expense,
      notes: form.notes,
    });
  }

  return (
    <form className="form budget-header-form" onSubmit={handleSubmit}>
      <div className="budget-header-grid">
        <label>
          <span className="label-row">
            Ingresos planeados
            <span className="required-tag">Mes</span>
          </span>
          <div className="amount-input-wrap">
            <span className="currency-prefix">$</span>
            <input
              type="number"
              name="plannedIncome"
              value={form.plannedIncome}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="0.00"
              disabled={saving}
              className="amount-number-input"
            />
          </div>
        </label>

        <label>
          <span className="label-row">
            Gastos planeados
            <span className="required-tag">Mes</span>
          </span>
          <div className="amount-input-wrap">
            <span className="currency-prefix">$</span>
            <input
              type="number"
              name="plannedExpenseTotal"
              value={form.plannedExpenseTotal}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="0.00"
              disabled={saving}
              className="amount-number-input"
            />
          </div>
        </label>
      </div>

      <label className="budget-notes">
        <span className="label-row">
          Notas
          <span className="optional-tag">Opcional</span>
        </span>
        <input
          type="text"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Comentarios del mes"
          disabled={saving}
          autoComplete="off"
        />
      </label>

      <div className="budget-header-summary">
        <div>
          <small>Disponible para distribuir</small>
          <strong className={available < 0 ? 'is-negative' : ''}>{formatCurrency(available)}</strong>
        </div>
        <div>
          <small>Ahorro proyectado</small>
          <strong className={available < 0 ? 'is-negative' : 'is-positive'}>
            {formatCurrency(Math.max(available, 0))}
          </strong>
        </div>
        <div>
          <small>Mes</small>
          <strong className="budget-month-label">{monthLabel}</strong>
        </div>
      </div>

      <div className="form-actions budget-header-actions">
        {onCopyPrevious && (
          <button
            type="button"
            className="secondary-button"
            onClick={onCopyPrevious}
            disabled={saving || copying}
          >
            {copying ? 'Copiando...' : 'Copiar del mes anterior'}
          </button>
        )}
        <button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : budget ? 'Actualizar paso 1' : 'Guardar paso 1'}
        </button>
      </div>
    </form>
  );
}
