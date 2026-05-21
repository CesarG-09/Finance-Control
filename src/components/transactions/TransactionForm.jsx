import { useEffect, useMemo, useState } from 'react';

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = {
  ty_id: '',
  ct_id: '',
  sct_id: '',
  tr_name: '',
  tr_description: '',
  tr_amount: '',
  tr_date: getTodayDate(),
};

function getActiveSubcategoryData(transaction) {
  const activeRelation = transaction?.subcategories_transaction?.find(
    (item) => item.st_is_active
  );
  const subcategory = activeRelation?.subcategory ?? null;

  if (!subcategory) return { ct_id: '', sct_id: '' };

  return {
    ct_id: subcategory.ct_id
      ? String(subcategory.ct_id)
      : subcategory.category?.ct_id
        ? String(subcategory.category.ct_id)
        : '',
    sct_id: subcategory.sct_id ? String(subcategory.sct_id) : '',
  };
}

export default function TransactionForm({
  typeTransactions,
  subcategories,
  selectedAccountId,
  selectedAccountName,
  initialData,
  saving,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const isEditing = Boolean(initialData);
  const hasSelectedAccount = Boolean(selectedAccountId);

  /* Tipo seleccionado */
  const selectedType = useMemo(
    () => typeTransactions.find((t) => String(t.ty_id) === String(form.ty_id)),
    [typeTransactions, form.ty_id]
  );

  const isIncome = selectedType
    ? selectedType.ty_name?.toLowerCase() === 'entrada'
    : null;

  /* Categorías únicas */
  const categories = useMemo(() => {
    const map = new Map();
    subcategories.forEach((s) => {
      const cat = s.category;
      if (cat?.ct_id) map.set(String(cat.ct_id), { ct_id: cat.ct_id, ct_name: cat.ct_name });
    });
    return Array.from(map.values()).sort((a, b) => a.ct_name.localeCompare(b.ct_name));
  }, [subcategories]);

  /* Subcategorías filtradas */
  const filteredSubcategories = useMemo(
    () => subcategories.filter((s) => String(s.ct_id) === String(form.ct_id)),
    [subcategories, form.ct_id]
  );

  useEffect(() => {
    if (initialData) {
      const sub = getActiveSubcategoryData(initialData);
      setForm({
        ty_id: initialData.ty_id ? String(initialData.ty_id) : '',
        ct_id: sub.ct_id,
        sct_id: sub.sct_id,
        tr_name: initialData.tr_name ?? '',
        tr_description: initialData.tr_description ?? '',
        tr_amount: String(initialData.tr_amount ?? ''),
        tr_date: initialData.tr_date ?? getTodayDate(),
      });
    } else {
      setForm(emptyForm);
    }
    setError('');
  }, [initialData, selectedAccountId]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleCategoryChange(event) {
    setForm((prev) => ({ ...prev, ct_id: event.target.value, sct_id: '' }));
  }

  function handleTypeSelect(typeId) {
    setForm((prev) => ({ ...prev, ty_id: String(typeId) }));
  }

  function setToday() {
    setForm((prev) => ({ ...prev, tr_date: getTodayDate() }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!selectedAccountId) {
      setError('Selecciona una cuenta antes de registrar una transacción.');
      return;
    }
    if (!form.ty_id) { setError('Selecciona Entrada o Salida.'); return; }
    if (!form.ct_id) { setError('Selecciona una categoría.'); return; }
    if (!form.sct_id) { setError('Selecciona una subcategoría.'); return; }
    if (!form.tr_name.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!form.tr_date) { setError('La fecha es obligatoria.'); return; }

    const amount = Number(form.tr_amount);
    if (!Number.isFinite(amount)) { setError('El monto debe ser un número válido.'); return; }
    if (amount <= 0) { setError('El monto debe ser mayor a 0.'); return; }

    await onSubmit(form);
    if (!isEditing) setForm(emptyForm);
  }

  return (
    <form className="form transaction-form" onSubmit={handleSubmit}>
      {error && <p className="error-message">{error}</p>}

      {!hasSelectedAccount && (
        <p className="error-message">Selecciona una cuenta para registrar transacciones.</p>
      )}

      {hasSelectedAccount && (
        <p className="info-message">
          Cuenta: <strong>{selectedAccountName}</strong>
        </p>
      )}

      {/* Tipo — botones prominentes */}
      <div className="form-field">
        <span className="label-row">
          Tipo de movimiento
          <span className="required-tag">Obligatorio</span>
        </span>

        <div className="transaction-type-buttons">
          {typeTransactions.map((t) => {
            const isSelected = String(t.ty_id) === String(form.ty_id);
            const isEntry = t.ty_name?.toLowerCase() === 'entrada';

            return (
              <button
                key={t.ty_id}
                type="button"
                className={`type-option-button ${
                  isSelected
                    ? isEntry
                      ? 'selected-income'
                      : 'selected-expense'
                    : 'unselected'
                }`}
                onClick={() => handleTypeSelect(t.ty_id)}
                disabled={!hasSelectedAccount || saving}
              >
                <span className="type-btn-icon">{isEntry ? '↑' : '↓'}</span>
                {t.ty_name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Monto — destacado cuando hay tipo */}
      <label className={`amount-label-field ${form.ty_id ? `amount-${isIncome ? 'income' : 'expense'}` : ''}`}>
        <span className="label-row">
          Monto
          <span className="required-tag">Obligatorio</span>
        </span>
        <div className="amount-input-wrap">
          <span className="currency-prefix">$</span>
          <input
            type="number"
            name="tr_amount"
            value={form.tr_amount}
            onChange={handleChange}
            step="0.01"
            min="0.01"
            placeholder="0.00"
            disabled={!hasSelectedAccount || saving}
            className="amount-number-input"
          />
        </div>
      </label>

      {/* Categoría y subcategoría en fila */}
      <div className="category-row">
        <label>
          <span className="label-row">
            Categoría
            <span className="required-tag">Obligatorio</span>
          </span>
          <select
            name="ct_id"
            value={form.ct_id}
            onChange={handleCategoryChange}
            disabled={!hasSelectedAccount || saving}
          >
            <option value="">Selecciona</option>
            {categories.map((cat) => (
              <option key={cat.ct_id} value={cat.ct_id}>{cat.ct_name}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="label-row">
            Subcategoría
            <span className="required-tag">Obligatorio</span>
          </span>
          <select
            name="sct_id"
            value={form.sct_id}
            onChange={handleChange}
            disabled={!hasSelectedAccount || saving || !form.ct_id}
          >
            <option value="">
              {form.ct_id ? 'Selecciona' : '— elige categoría primero —'}
            </option>
            {filteredSubcategories.map((s) => (
              <option key={s.sct_id} value={s.sct_id}>{s.sct_name}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Nombre */}
      <label>
        <span className="label-row">
          Nombre
          <span className="required-tag">Obligatorio</span>
        </span>
        <input
          type="text"
          name="tr_name"
          value={form.tr_name}
          onChange={handleChange}
          placeholder="Ej: Supermercado, Salario, Gasolina"
          disabled={!hasSelectedAccount || saving}
          autoComplete="off"
        />
      </label>

      {/* Descripción */}
      <label>
        <span className="label-row">
          Descripción
          <span className="optional-tag">Opcional</span>
        </span>
        <input
          type="text"
          name="tr_description"
          value={form.tr_description}
          onChange={handleChange}
          placeholder="Detalle adicional"
          disabled={!hasSelectedAccount || saving}
          autoComplete="off"
        />
      </label>

      {/* Fecha */}
      <label>
        <span className="label-row">
          Fecha
          <span className="required-tag">Obligatorio</span>
        </span>
        <div className="date-input-wrap">
          <input
            type="date"
            name="tr_date"
            value={form.tr_date}
            onChange={handleChange}
            disabled={!hasSelectedAccount || saving}
          />
          <button
            type="button"
            className="today-btn"
            onClick={setToday}
            disabled={!hasSelectedAccount || saving}
            title="Usar fecha de hoy"
          >
            Hoy
          </button>
        </div>
      </label>

      <div className="form-actions">
        <button type="submit" disabled={saving || !hasSelectedAccount}>
          {saving
            ? 'Guardando...'
            : isEditing
              ? 'Guardar cambios'
              : 'Registrar transacción'}
        </button>

        {isEditing && (
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            disabled={saving}
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
