import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: '',
    password: '',
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

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const result = await login(form.email, form.password);

      if (result.profile) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/perfil', { replace: true });
      }
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo iniciar sesión');
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
            <span className="auth-eyebrow">Control financiero personal</span>
            <h1>Organiza tus cuentas, movimientos y balance en un solo lugar.</h1>
            <p>
              Accede a tu dashboard para consultar tus cuentas, registrar entradas y
              salidas, y revisar los movimientos del mes.
            </p>
          </div>

          <div className="auth-hero-footer">
            <span>v1.0</span>
            <strong>Finance Control</strong>
          </div>
        </aside>

        <section className="auth-card">
          <div className="auth-card-header">
            <span className="auth-card-kicker">Bienvenido de nuevo</span>
            <h2>Iniciar sesión</h2>
            <p>Ingresa tus credenciales para continuar.</p>
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
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                required
              />
            </label>

            {errorMessage && <p className="error-message">{errorMessage}</p>}

            <button type="submit" disabled={loading} className="auth-submit-button">
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="auth-switch-text">
            ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
          </p>
        </section>
      </section>
    </main>
  );
}