import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    if (form.password !== form.confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden');
      return;
    }

    if (form.password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const data = await register(form.email, form.password);

      if (data.session) {
        navigate('/perfil', { replace: true });
      } else {
        setInfoMessage(
          'Usuario creado. Revisa tu correo para confirmar la cuenta y luego inicia sesión.'
        );
      }
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo registrar el usuario');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <aside className="auth-hero">
          <div className="auth-logo">FC</div>

          <div>
            <span className="auth-eyebrow">Empieza tu control financiero</span>
            <h1>Crea tu cuenta y configura tu perfil para usar el aplicativo.</h1>
            <p>
              Después del registro, deberás crear tu perfil obligatorio antes de
              acceder al dashboard.
            </p>
          </div>

          <div className="auth-hero-footer">
            <span>Registro seguro</span>
            <strong>Supabase Auth</strong>
          </div>
        </aside>

        <section className="auth-card">
          <div className="auth-card-header">
            <span className="auth-card-kicker">Nuevo usuario</span>
            <h2>Crear cuenta</h2>
            <p>Regístrate para comenzar a gestionar tus finanzas.</p>
          </div>

          <form onSubmit={handleSubmit} className="form auth-form">
            <label>
              Correo
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="tu_correo@email.com"
                autoComplete="email"
                required
              />
            </label>

            <label>
              Contraseña
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                required
              />
            </label>

            <label>
              Confirmar contraseña
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repite tu contraseña"
                autoComplete="new-password"
                required
              />
            </label>

            {errorMessage && <p className="error-message">{errorMessage}</p>}
            {infoMessage && <p className="info-message">{infoMessage}</p>}

            <button type="submit" disabled={loading} className="auth-submit-button">
              {loading ? 'Creando cuenta...' : 'Registrarme'}
            </button>
          </form>

          <p className="auth-switch-text">
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          </p>
        </section>
      </section>
    </main>
  );
}