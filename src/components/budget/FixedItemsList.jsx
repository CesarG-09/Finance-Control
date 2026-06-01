import { useEffect, useMemo, useState } from 'react';

function formatCurrency(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '$0.00';
  return new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(num);
}

function emptyRow() {
  return {
    key: Math.random().toString(36).slice(2),
    label: '',
    amount: '',
    rtr_id: '',
    sct_id: '',
    notes: '',
  };
}

function rowFromItem(item) {
  return {
    key: String(item.bfi_id),
    label: item.bfi_label ?? '',
    amount: item.bfi_amount != null ? String(item.bfi_amount) : '',
    rtr_id: item.rtr_id ? String(item.rtr_id) : '',
    sct_id: item.sct_id ? String(item.sct_id) : '',
    notes: item.bfi_notes ?? '',
  };
}

export default function FixedItemsList({
  kind,                  // 'income' | 'expense'
  items,                 // current persisted items
  recurring,             // active recurrent_transaction list (filtered by type)
  subcategories,         // list of {sct_id, sct_name, category}
  typeId,                // 1 for income, 2 for expense (filter recurring)
  saving,
  onSave,
}) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (items && items.length > 0) {
      setRows(items.map(rowFromItem));
    } else {
      setRows([emptyRow()]);
    }
  }, [items]);

  const filteredRecurring = useMemo(
    () => (recurring ?? []).filter((r) => Number(r.ty_id) === Number(typeId)),
    [recurring, typeId]
  );

  const filteredSubcategories = useMemo(() => {
    // Excluir subcategoría reservada de "Transferencias"
    return (subcategories ?? []).filter(
      (s) => s.category?.ct_name !== 'Transferencias'
    );
  }, [subcategories]);

  function updateRow(key, field, value) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r))
    );
  }

  function handleRecurringSelect(key, rtrId) {
    if (!rtrId) {
      updateRow(key, 'rtr_id', '');
      return;
    }
    const rtr = filteredRecurring.find((r) => String(r.rtr_id) === String(rtrId));
    setRows((prev) =>
      prev.map((r) =>
        r.key === key
          ? {
              ...r,
              rtr_id: String(rtrId),
              label: r.label || rtr?.rtr_name || '',
              amount: r.amount || (rtr?.rtr_estimated_amount != null ? String(rtr.rtr_estimated_amount) : ''),
            }
          : r
      )
    );
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(key) {
    setRows((prev) => {
      const next = prev.filter((r) => r.key !== key);
      return next.length === 0 ? [emptyRow()] : next;
    });
  }

  const total = useMemo(
    () => rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0),
    [rows]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = rows
      .filter((r) => String(r.label).trim() !== '')
      .map((r) => ({
        label: r.label,
        amount: r.amount,
        rtr_id: r.rtr_id || null,
        sct_id: r.sct_id || null,
        notes: r.notes || null,
      }));
    await onSave(payload);
  }

  const isIncome = kind === 'income';
  const recurringPlaceholder = isIncome
    ? '— Sin recurrente —'
    : '— Sin recurrente —';

  return (
    <form className="form budget-fixed-form" onSubmit={handleSubmit}>
      <div className="budget-fixed-head">
        <span>
          {rows.length} ítem(s) · Total: <strong>{formatCurrency(total)}</strong>
        </span>
        <button type="button" className="secondary-button" onClick={addRow} disabled={saving}>
          + Agregar
        </button>
      </div>

      <div className="budget-fixed-list">
        {rows.map((row) => (
          <div key={row.key} className="budget-fixed-row">
            <input
              type="text"
              value={row.label}
              onChange={(e) => updateRow(row.key, 'label', e.target.value)}
              placeholder={isIncome ? 'Ej: Salario' : 'Ej: Internet'}
              disabled={saving}
              className="budget-fixed-label"
            />

            <div className="amount-input-wrap budget-fixed-amount">
              <span className="currency-prefix">$</span>
              <input
                type="number"
                value={row.amount}
                onChange={(e) => updateRow(row.key, 'amount', e.target.value)}
                step="0.01"
                min="0"
                placeholder="0.00"
                disabled={saving}
                className="amount-number-input"
              />
            </div>

            <select
              value={row.rtr_id}
              onChange={(e) => handleRecurringSelect(row.key, e.target.value)}
              disabled={saving}
              className="budget-fixed-select"
              title="Vincular a una transacción recurrente (opcional)"
            >
              <option value="">{recurringPlaceholder}</option>
              {filteredRecurring.map((r) => (
                <option key={r.rtr_id} value={r.rtr_id}>
                  {r.rtr_name}
                  {r.frequency?.fr_name ? ` · ${r.frequency.fr_name}` : ''}
                </option>
              ))}
            </select>

            <select
              value={row.sct_id}
              onChange={(e) => updateRow(row.key, 'sct_id', e.target.value)}
              disabled={saving}
              className="budget-fixed-select"
              title="Subcategoría asociada (opcional)"
            >
              <option value="">— Sin subcategoría —</option>
              {filteredSubcategories.map((s) => (
                <option key={s.sct_id} value={s.sct_id}>
                  {s.category?.ct_name ? `${s.category.ct_name} · ` : ''}{s.sct_name}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="budget-fixed-remove"
              onClick={() => removeRow(row.key)}
              disabled={saving}
              title="Eliminar ítem"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="form-actions">
        <button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : `Guardar ${isIncome ? 'ingresos' : 'gastos'} fijos`}
        </button>
      </div>
    </form>
  );
}
