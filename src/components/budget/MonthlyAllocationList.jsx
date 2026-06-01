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
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (items && items.length > 0) {
      setRows(items.map(rowFromItem));
    } else {
      setRows([]);
    }
    setDirty(false);
  }, [items]);

  const filteredSubcategories = useMemo(
    () => (subcategories ?? []).filter((s) => s.category?.ct_name !== 'Transferencias'),
    [subcategories]
  );

  function update(key, field, value) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
    setDirty(true);
  }

  function handleSubcategoryChange(key, sctId) {
    if (!sctId) {
      update(key, 'sct_id', '');
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
    setDirty(true);
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
    setDirty(true);
  }

  function removeRow(key) {
    setRows((prev) => prev.filter((r) => r.key !== key));
    setDirty(true);
  }

  const total = useMemo(
    () => rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0),
    [rows]
  );

  const available = Number(availableToDistribute) || 0;
  const remainder = available - total;
  const status = Math.abs(remainder) < 0.01 ? 'ok' : remainder > 0 ? 'under' : 'over';
  const usedPct = available > 0 ? Math.min(100, (total / available) * 100) : 0;

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
    setDirty(false);
  }

  return (
    <form className="form alloc-form" onSubmit={handleSubmit}>
      <div className={`alloc-summary status-${status}`}>
        <div className="alloc-summary-meter">
          <div className="alloc-summary-meter-head">
            <span>
              Asignado: <strong>{formatCurrency(total)}</strong>
            </span>
            <span>
              Disponible: <strong>{formatCurrency(available)}</strong>
            </span>
          </div>
          <div className="budget-progress-track">
            <div className={`budget-progress-fill status-${status}`} style={{ width: `${usedPct}%` }} />
          </div>
          <div className="alloc-summary-meter-foot">
            <span className={`is-${status}`}>
              {status === 'ok' && '✓ Todo asignado'}
              {status === 'under' && `Restante: ${formatCurrency(Math.abs(remainder))}`}
              {status === 'over' && `Te pasaste por ${formatCurrency(Math.abs(remainder))}`}
            </span>
          </div>
        </div>
      </div>

      <header className="alloc-head">
        <span>{rows.length} ítem(s) en la distribución del mes</span>
        <button type="button" className="secondary-button" onClick={addRow} disabled={saving}>
          + Agregar línea
        </button>
      </header>

      {rows.length === 0 ? (
        <div className="fixed-empty">
          <p>Aún no has distribuido el restante de este mes.</p>
          <small>Ejemplos: Luz, Agua, Tarjeta, Ahorro, Ocio…</small>
          <div className="fixed-empty-actions">
            <button type="button" className="secondary-button" onClick={addRow} disabled={saving}>
              + Agregar primer ítem
            </button>
          </div>
        </div>
      ) : (
        <div className="fixed-list">
          {rows.map((row, idx) => (
            <div key={row.key} className="fixed-item is-variable">
              <div className="fixed-item-line-main">
                <input
                  type="text"
                  value={row.label}
                  onChange={(e) => update(row.key, 'label', e.target.value)}
                  placeholder={`Ej: Luz, Tarjeta, Ahorro… (línea ${idx + 1})`}
                  disabled={saving}
                  className="fixed-item-label"
                />

                <div className="amount-input-wrap fixed-item-amount">
                  <span className="currency-prefix">$</span>
                  <input
                    type="number"
                    value={row.amount}
                    onChange={(e) => update(row.key, 'amount', e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    disabled={saving}
                    className="amount-number-input"
                  />
                </div>

                <button
                  type="button"
                  className="fixed-item-remove"
                  onClick={() => removeRow(row.key)}
                  disabled={saving}
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>

              <div className="fixed-item-line-meta">
                <select
                  value={row.sct_id}
                  onChange={(e) => handleSubcategoryChange(row.key, e.target.value)}
                  disabled={saving}
                  className="fixed-item-select"
                >
                  <option value="">— Sin categoría —</option>
                  {filteredSubcategories.map((s) => (
                    <option key={s.sct_id} value={s.sct_id}>
                      {s.category?.ct_name ? `${s.category.ct_name} · ` : ''}{s.sct_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div className="form-actions fixed-form-submit">
          <small className={dirty ? 'dirty-tag' : 'saved-tag'}>
            {dirty ? '● Cambios sin guardar' : '✓ Guardado'}
          </small>
          <button type="submit" disabled={saving || !dirty}>
            {saving ? 'Guardando...' : 'Guardar distribución del mes'}
          </button>
        </div>
      )}
    </form>
  );
}
