import { useState } from 'react';

export default function EditRecurrenceDialog({
  transactionName,
  onChoice,
  onCancel,
  loading,
}) {
  const [choice, setChoice] = useState(null);

  function handleSubmit() {
    if (!choice) return;
    onChoice(choice);
  }

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <h3>Editar transacción recurrente</h3>
          <button
            type="button"
            onClick={onCancel}
            className="modal-close-btn"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <div className="modal-content">
          <p>
            Estás editando la transacción recurrente "{transactionName}".
            ¿Cómo deseas aplicar los cambios?
          </p>

          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="editChoice"
                value="single"
                checked={choice === 'single'}
                onChange={(e) => setChoice(e.target.value)}
                disabled={loading}
              />
              <span className="radio-text">
                <strong>Solo esta transacción</strong>
                <p className="radio-description">
                  Modifica solo el registro actual, sin afectar futuras instancias
                </p>
              </span>
            </label>

            <label className="radio-label">
              <input
                type="radio"
                name="editChoice"
                value="future"
                checked={choice === 'future'}
                onChange={(e) => setChoice(e.target.value)}
                disabled={loading}
              />
              <span className="radio-text">
                <strong>Esta y todas las futuras</strong>
                <p className="radio-description">
                  Actualiza la regla recurrente y todos los registros generados desde ahora en adelante
                </p>
              </span>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!choice || loading}
            className="btn-primary"
          >
            {loading ? 'Procesando...' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}
