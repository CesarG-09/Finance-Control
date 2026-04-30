import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { createProfile } = useAuth();

  const [form, setForm] = useState({
    cl_first_name: '',
    cl_middle_name: '',
    cl_last_name: '',
    cl_second_last_name: '',
    cl_gender: '',
    cl_birth_date: '',
    cl_profession: '',
  });

  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function validateForm() {
    if (!form.cl_first_name.trim()) return 'El primer nombre es obligatorio';
    if (!form.cl_last_name.trim()) return 'El apellido es obligatorio';
    if (!form.cl_gender) return 'El género es obligatorio';
    if (!form.cl_birth_date) return 'La fecha de nacimiento es obligatoria';
    if (!form.cl_profession.trim()) return 'La profesión es obligatoria';

    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setLoading(true);

    try {
      await createProfile(form);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo crear el perfil');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page profile-auth-page">
      <section className="profile-shell">
        <section className="auth-card profile-card">
          <div className="auth-card-header">
            <span className="auth-card-kicker">Perfil obligatorio</span>
            <h2>Completa tu perfil</h2>
            <p>
              Necesitamos estos datos para asociar tus cuentas y movimientos a un
              único perfil de usuario.
            </p>
          </div>

          <div className="profile-info-box">
            <strong>Importante</strong>
            <span>
              Solo podrás acceder al dashboard después de crear tu perfil.
            </span>
          </div>

          <form onSubmit={handleSubmit} className="form profile-form">
            <label>
              <span className="label-row">
                Primer nombre
                <span className="required-tag">Obligatorio</span>
              </span>
              <input
                type="text"
                name="cl_first_name"
                value={form.cl_first_name}
                onChange={handleChange}
                placeholder="Ej: María"
                required
              />
            </label>

            <label>
              <span className="label-row">
                Segundo nombre
                <span className="optional-tag">Opcional</span>
              </span>
              <input
                type="text"
                name="cl_middle_name"
                value={form.cl_middle_name}
                onChange={handleChange}
                placeholder="Ej: Isabel"
              />
            </label>

            <label>
              <span className="label-row">
                Apellido
                <span className="required-tag">Obligatorio</span>
              </span>
              <input
                type="text"
                name="cl_last_name"
                value={form.cl_last_name}
                onChange={handleChange}
                placeholder="Ej: Pérez"
                required
              />
            </label>

            <label>
              <span className="label-row">
                Segundo apellido
                <span className="optional-tag">Opcional</span>
              </span>
              <input
                type="text"
                name="cl_second_last_name"
                value={form.cl_second_last_name}
                onChange={handleChange}
                placeholder="Ej: Gómez"
              />
            </label>

            <label>
              <span className="label-row">
                Género
                <span className="required-tag">Obligatorio</span>
              </span>
              <select
                name="cl_gender"
                value={form.cl_gender}
                onChange={handleChange}
                required
              >
                <option value="">Selecciona una opción</option>
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
                <option value="Otro">Otro</option>
                <option value="Prefiero no decir">Prefiero no decir</option>
              </select>
            </label>

            <label>
              <span className="label-row">
                Fecha de nacimiento
                <span className="required-tag">Obligatorio</span>
              </span>
              <input
                type="date"
                name="cl_birth_date"
                value={form.cl_birth_date}
                onChange={handleChange}
                required
              />
            </label>

            <label className="profile-form-full">
              <span className="label-row">
                Profesión
                <span className="required-tag">Obligatorio</span>
              </span>
              <input
                type="text"
                name="cl_profession"
                value={form.cl_profession}
                onChange={handleChange}
                placeholder="Ej: Analista, estudiante, desarrollador"
                required
              />
            </label>

            {errorMessage && (
              <p className="error-message profile-form-full">{errorMessage}</p>
            )}

            <div className="form-actions profile-form-full">
              <button
                type="submit"
                disabled={loading}
                className="auth-submit-button"
              >
                {loading ? 'Guardando...' : 'Crear perfil'}
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}