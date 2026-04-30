import { useEffect, useState } from 'react';

const emptyForm = {
  ac_name: '',
  ta_id: '',
  ac_description: '',
  ac_balance: '0',
};

export default function AccountForm({
  typeAccounts,
  initialData,
  saving,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const isEditing = Boolean(initialData);

  useEffect(() => {
    if (initialData) {
      setForm({
        ac_name: initialData.ac_name ?? '',
        ta_id: initialData.ta_id ? String(initialData.ta_id) : '',
        ac_description: initialData.ac_description ?? '',
        ac_balance: String(initialData.ac_balance ?? 0),
      });
    } else {
      setForm(emptyForm);
    }

    setError('');
  }, [initialData]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.ac_name.trim()) {
      setError('El nombre de la cuenta es obligatorio.');
      return;
    }

    if (!form.ta_id) {
      setError('Debes seleccionar un tipo de cuenta.');
      return;
    }

    if (!isEditing) {
    const balance = Number(form.ac_balance);

    if (!Number.isFinite(balance)) {
        setError('El balance inicial debe ser un número válido.');
        return;
    }

    if (balance < 0) {
        setError('El balance inicial no puede ser negativo.');
        return;
    }
    }

    await onSubmit(form);

    if (!isEditing) {
      setForm(emptyForm);
    }
  }

  return (
    <form className="form account-form" onSubmit={handleSubmit}>
      {error && <p className="error-message">{error}</p>}

      <label>
        <span className="label-row">
          Nombre de cuenta
          <span className="required-tag">Obligatorio</span>
        </span>
        <input
          type="text"
          name="ac_name"
          value={form.ac_name}
          onChange={handleChange}
          placeholder="Ej: Cuenta de ahorros principal"
        />
      </label>

      <label>
        <span className="label-row">
          Tipo de cuenta
          <span className="required-tag">Obligatorio</span>
        </span>
        <select name="ta_id" value={form.ta_id} onChange={handleChange}>
          <option value="">Selecciona un tipo</option>
          {typeAccounts.map((typeAccount) => (
            <option key={typeAccount.ta_id} value={typeAccount.ta_id}>
              {typeAccount.ta_name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="label-row">
          Descripción
          <span className="optional-tag">Opcional</span>
        </span>
        <input
          type="text"
          name="ac_description"
          value={form.ac_description}
          onChange={handleChange}
          placeholder="Ej: Cuenta para gastos mensuales"
        />
      </label>

      {!isEditing && (
        <label>
          <span className="label-row">
            Balance inicial
            <span className="required-tag">Obligatorio</span>
          </span>
          <input
            type="number"
            name="ac_balance"
            value={form.ac_balance}
            onChange={handleChange}
            step="0.01"
            placeholder="0.00"
          />
        </label>
      )}

      {isEditing && (
        <p className="info-message">
          El balance no se edita desde aquí. El balance se actualiza con movimientos
          e historial para mantener consistencia.
        </p>
      )}

      <div className="form-actions">
        <button type="submit" disabled={saving}>
          {saving
            ? 'Guardando...'
            : isEditing
              ? 'Guardar cambios'
              : 'Crear cuenta'}
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