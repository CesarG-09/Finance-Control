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
    sct_id: '',
  };
}

function rowFromItem(item) {
  return {
    key: String(item.bma_id),
    label: item.bma_label ?? '',
    amount: item.bma_amount != null ? String(item.bma_amount) : '',
    sct_id: item.sct_id ? String(item.sct_id) : '',
  };
}

export default function MonthlyAllocationList({
  items,
  subcategories,
  availableToDistribute,
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

  const filteredSubcategories = useMemo(
    () => (subcategories ?? []).filter((s) => s.category?.ct_name !== 'Transferencias'),
    [subcategories]
  );

  function updateRow(key, field, value) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function handleSubcategoryChange(key, sctId) {
    if (!sctId) {
      updateRow(key, 'sct_id', '');
      return;
    }
    const sub = filteredSubcategories.find((s) => String(s.sct_id) === String(sctId));
    setRows((prev) =>
      prev.map((r) =>
        r.key === key
          ? {
              ...r,
              sct_id: String(sctId),
              label: r.label || sub?.sct_name || '',
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

  const available = Number(availableToDistribute) || 0;
  const remainder = available - total;
  const remainderStatus =
    Math.abs(remainder) < 0.01 ? 'ok' : remainder > 0 ? 'under' : 'over';

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = rows
      .filter((r) => String(r.label).trim() !== '')
      .map((r) => {
        const sub = filteredSubcategories.find((s) => String(s.sct_id) === String(r.sct_id));
        return {
          label: r.label,
          amount: r.amount,
          ct_id: sub?.category?.ct_id ? String(sub.category.ct_id) : null,
          sct_id: r.sct_id || null,
        };
      });
    await onSave(payload);
  }

  return (
    <form className="form budget-alloc-form" onSubmit={handleSubmit}>
      <div className={`budget-alloc-summary status-${remainderStatus}`}>
        <div>
          <small>Disponible (Ingresos − Gastos fijos)</small>
          <strong>{formatCurrency(available)}</strong>
        </div>
        <div>
          <small>Σ asignaciones</small>
          <strong>{formatCurrency(total)}</strong>
        </div>
        <div>
          <small>Restante</small>
          <strong className={`is-${remainderStatus}`}>
            {remainder >= 0 ? '' : '-'}
            {formatCurrency(Math.abs(remainder))}
          </strong>
        </div>
      </div>

      <div className="budget-fixed-head">
        <span>{rows.length} ítem(s)</span>
        <button type="button" className="secondary-button" onClick={addRow} disabled={saving}>
          + Agregar
        </button>
      </div>

      <div className="budget-fixed-list">
        {rows.map((row) => (
          <div key={row.key} className="budget-fixed-row budget-alloc-row">
            <input
              type="text"
              value={row.label}
              onChange={(e) => updateRow(row.key, 'label', e.target.value)}
              placeholder="Ej: Luz, Pago a tarjeta…"
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
              value={row.sct_id}
              onChange={(e) => handleSubcategoryChange(row.key, e.target.value)}
              disabled={saving}
              className="budget-fixed-select budget-alloc-select"
            >
              <option value="">— Sin categoría —</option>
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
          {saving ? 'Guardando...' : 'Guardar distribución del mes'}
        </button>
      </div>
    </form>
  );
}
