import { useEffect, useMemo, useState } from 'react';

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = {
  ac_id: '',
  ty_id: '',
  sct_id: '',
  tr_name: '',
  tr_description: '',
  tr_amount: '',
  tr_date: getTodayDate(),
};

function getActiveSubcategoryId(transaction) {
  const activeRelation = transaction?.subcategories_transaction?.find(
    (item) => item.st_is_active
  );

  return activeRelation?.subcategory?.sct_id
    ? String(activeRelation.subcategory.sct_id)
    : '';
}

export default function TransactionForm({
  accounts,
  typeTransactions,
  subcategories,
  selectedAccountId,
  initialData,
  saving,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const isEditing = Boolean(initialData);

  const hasActiveAccounts = useMemo(
    () => accounts.some((account) => account.ac_is_active),
    [accounts]
  );

  useEffect(() => {
    if (initialData) {
      setForm({
        ac_id: initialData.ac_id ? String(initialData.ac_id) : '',
        ty_id: initialData.ty_id ? String(initialData.ty_id) : '',
        sct_id: getActiveSubcategoryId(initialData),
        tr_name: initialData.tr_name ?? '',
        tr_description: initialData.tr_description ?? '',
        tr_amount: String(initialData.tr_amount ?? ''),
        tr_date: initialData.tr_date ?? getTodayDate(),
      });
    } else {
      setForm({
        ...emptyForm,
        ac_id: selectedAccountId ? String(selectedAccountId) : '',
      });
    }

    setError('');
  }, [initialData, selectedAccountId]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function handleTypeSelect(typeId) {
    setForm((currentForm) => ({
      ...currentForm,
      ty_id: String(typeId),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.ac_id) {
      setError('Debes seleccionar una cuenta.');
      return;
    }

    if (!form.ty_id) {
      setError('Debes seleccionar Entrada o Salida.');
      return;
    }

    if (!form.sct_id) {
      setError('Debes seleccionar una categoría/subcategoría.');
      return;
    }

    if (!form.tr_name.trim()) {
      setError('El nombre de la transacción es obligatorio.');
      return;
    }

    if (!form.tr_date) {
      setError('La fecha es obligatoria.');
      return;
    }

    const amount = Number(form.tr_amount);

    if (!Number.isFinite(amount)) {
      setError('El monto debe ser un número válido.');
      return;
    }

    if (amount <= 0) {
      setError('El monto debe ser mayor a 0.');
      return;
    }

    await onSubmit(form);

    if (!isEditing) {
      setForm({
        ...emptyForm,
        ac_id: selectedAccountId ? String(selectedAccountId) : '',
      });
    }
  }

  return (
    <form className="form transaction-form" onSubmit={handleSubmit}>
      {error && <p className="error-message">{error}</p>}

      {!hasActiveAccounts && (
        <p className="error-message">
          Debes tener al menos una cuenta activa para registrar transacciones.
        </p>
      )}

      <label>
        <span className="label-row">
          Cuenta
          <span className="required-tag">Obligatorio</span>
        </span>
        <select
          name="ac_id"
          value={form.ac_id}
          onChange={handleChange}
          disabled={!hasActiveAccounts || saving}
        >
          <option value="">Selecciona una cuenta</option>
          {accounts
            .filter((account) => account.ac_is_active)
            .map((account) => (
              <option key={account.ac_id} value={account.ac_id}>
                {account.ac_name}
              </option>
            ))}
        </select>
      </label>

      <div className="form-field">
        <span className="label-row">
          Tipo
          <span className="required-tag">Obligatorio</span>
        </span>

        <div className="transaction-type-buttons">
          {typeTransactions.map((typeTransaction) => {
            const isSelected = String(typeTransaction.ty_id) === String(form.ty_id);

            return (
              <button
                key={typeTransaction.ty_id}
                type="button"
                className={`type-option-button ${isSelected ? 'selected' : 'muted'}`}
                onClick={() => handleTypeSelect(typeTransaction.ty_id)}
                disabled={!hasActiveAccounts || saving}
              >
                {typeTransaction.ty_name}
              </button>
            );
          })}
        </div>
      </div>

      <label>
        <span className="label-row">
          Categoría / Subcategoría
          <span className="required-tag">Obligatorio</span>
        </span>
        <select
          name="sct_id"
          value={form.sct_id}
          onChange={handleChange}
          disabled={!hasActiveAccounts || saving}
        >
          <option value="">Selecciona una categoría</option>
          {subcategories.map((subcategory) => (
            <option key={subcategory.sct_id} value={subcategory.sct_id}>
              {subcategory.category?.ct_name || 'Sin categoría'} - {subcategory.sct_name}
            </option>
          ))}
        </select>
      </label>

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
          placeholder="Ej: Supermercado, salario, gasolina"
          disabled={!hasActiveAccounts || saving}
        />
      </label>

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
          placeholder="Detalle opcional"
          disabled={!hasActiveAccounts || saving}
        />
      </label>

      <label>
        <span className="label-row">
          Monto
          <span className="required-tag">Obligatorio</span>
        </span>
        <input
          type="number"
          name="tr_amount"
          value={form.tr_amount}
          onChange={handleChange}
          step="0.01"
          min="0.01"
          placeholder="0.00"
          disabled={!hasActiveAccounts || saving}
        />
      </label>

      <label>
        <span className="label-row">
          Fecha
          <span className="required-tag">Obligatorio</span>
        </span>
        <input
          type="date"
          name="tr_date"
          value={form.tr_date}
          onChange={handleChange}
          disabled={!hasActiveAccounts || saving}
        />
      </label>

      <div className="form-actions">
        <button type="submit" disabled={saving || !hasActiveAccounts}>
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
            Cancelar edición
          </button>
        )}
      </div>
    </form>
  );
}