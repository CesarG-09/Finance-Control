import { useState } from 'react';

export default function EditRecurrenceDialog({
  transactionName,
  onChoice,
  onCancel,
  loading,
}) {
  const [choice, setChoice] = useState(null);

  return (
    <div className="modal-backdrop">
      <div className="modal-card rtr-edit-dialog">
        <h2>Editar transacción recurrente</h2>
        <p>
          Estás modificando <strong>"{transactionName}"</strong>.
          ¿Cómo deseas aplicar los cambios?
        </p>

        <div className="rtr-choice-list">
          <label className={`rtr-choice-option ${choice === 'single' ? 'rtr-choice-option--selected' : ''}`}>
            <input
              type="radio"
              name="editChoice"
              value="single"
              checked={choice === 'single'}
              onChange={() => setChoice('single')}
              disabled={loading}
            />
            <div className="rtr-choice-content">
              <span className="rtr-choice-icon">✏️</span>
              <div>
                <strong>Solo esta transacción</strong>
                <p>El cambio aplica únicamente a este registro.</p>
              </div>
            </div>
          </label>

          <label className={`rtr-choice-option ${choice === 'future' ? 'rtr-choice-option--selected' : ''}`}>
            <input
              type="radio"
              name="editChoice"
              value="future"
              checked={choice === 'future'}
              onChange={() => setChoice('future')}
              disabled={loading}
            />
            <div className="rtr-choice-content">
              <span className="rtr-choice-icon">🔄</span>
              <div>
                <strong>Esta y todas las futuras</strong>
                <p>Se actualiza la regla recurrente y los registros futuros.</p>
              </div>
            </div>
          </label>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="secondary-button"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onChoice(choice)}
            disabled={!choice || loading}
          >
            {loading ? 'Procesando…' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}
