import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  updateClientProfile,
  updateUserEmail,
  updateUserPassword,
} from '../services/profileService';

export default function ProfileSettingsPage() {
  const { user, clientProfile, refreshProfile } = useAuth();

  const [profileForm, setProfileForm] = useState({
    cl_first_name: '',
    cl_middle_name: '',
    cl_last_name: '',
    cl_second_last_name: '',
    cl_gender: '',
    cl_birth_date: '',
    cl_profession: '',
  });

  const [emailForm, setEmailForm] = useState({
    email: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!clientProfile) return;

    setProfileForm({
      cl_first_name: clientProfile.cl_first_name ?? '',
      cl_middle_name: clientProfile.cl_middle_name ?? '',
      cl_last_name: clientProfile.cl_last_name ?? '',
      cl_second_last_name: clientProfile.cl_second_last_name ?? '',
      cl_gender: clientProfile.cl_gender ?? '',
      cl_birth_date: clientProfile.cl_birth_date ?? '',
      cl_profession: clientProfile.cl_profession ?? '',
    });
  }, [clientProfile]);

  useEffect(() => {
    setEmailForm({
      email: user?.email ?? '',
    });
  }, [user]);

  function handleProfileChange(event) {
    const { name, value } = event.target;

    setProfileForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function handleEmailChange(event) {
    const { name, value } = event.target;

    setEmailForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;

    setPasswordForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function validateProfileForm() {
    if (!profileForm.cl_first_name.trim()) return 'El primer nombre es obligatorio.';
    if (!profileForm.cl_last_name.trim()) return 'El apellido es obligatorio.';
    if (!profileForm.cl_gender) return 'El género es obligatorio.';
    if (!profileForm.cl_birth_date) return 'La fecha de nacimiento es obligatoria.';
    if (!profileForm.cl_profession.trim()) return 'La profesión es obligatoria.';

    return '';
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();

    const validationError = validateProfileForm();

    if (validationError) {
      setError(validationError);
      setSuccess('');
      return;
    }

    try {
      setSavingProfile(true);
      setError('');
      setSuccess('');

      await updateClientProfile(clientProfile.cl_id, profileForm);
      await refreshProfile();

      setSuccess('Perfil actualizado correctamente.');
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleEmailSubmit(event) {
    event.preventDefault();

    if (!emailForm.email.trim()) {
      setError('El correo es obligatorio.');
      setSuccess('');
      return;
    }

    if (emailForm.email.trim() === user?.email) {
      setError('El nuevo correo debe ser diferente al actual.');
      setSuccess('');
      return;
    }

    try {
      setSavingEmail(true);
      setError('');
      setSuccess('');

      await updateUserEmail(emailForm.email);

      setSuccess(
        'Solicitud de cambio de correo enviada. Revisa tu correo para confirmar el cambio.'
      );
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setSavingEmail(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();

    if (!passwordForm.password) {
      setError('La nueva contraseña es obligatoria.');
      setSuccess('');
      return;
    }

    if (passwordForm.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      setSuccess('');
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      setSuccess('');
      return;
    }

    try {
      setSavingPassword(true);
      setError('');
      setSuccess('');

      await updateUserPassword(passwordForm.password);

      setPasswordForm({
        password: '',
        confirmPassword: '',
      });

      setSuccess('Contraseña actualizada correctamente.');
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <section className="profile-settings-page">
      <div className="page-header">
        <div>
          <h1>Mi Perfil</h1>
          <p>Administra tus datos personales, correo y contraseña.</p>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}
      {success && <p className="info-message">{success}</p>}

      <div className="profile-settings-layout">
        <section className="panel profile-settings-panel">
          <h2>Datos personales</h2>

          <form className="form profile-form" onSubmit={handleProfileSubmit}>
            <label>
              <span className="label-row">
                Primer nombre
                <span className="required-tag">Obligatorio</span>
              </span>
              <input
                type="text"
                name="cl_first_name"
                value={profileForm.cl_first_name}
                onChange={handleProfileChange}
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
                value={profileForm.cl_middle_name}
                onChange={handleProfileChange}
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
                value={profileForm.cl_last_name}
                onChange={handleProfileChange}
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
                value={profileForm.cl_second_last_name}
                onChange={handleProfileChange}
              />
            </label>

            <label>
              <span className="label-row">
                Género
                <span className="required-tag">Obligatorio</span>
              </span>
              <select
                name="cl_gender"
                value={profileForm.cl_gender}
                onChange={handleProfileChange}
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
                value={profileForm.cl_birth_date}
                onChange={handleProfileChange}
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
                value={profileForm.cl_profession}
                onChange={handleProfileChange}
              />
            </label>

            <div className="form-actions profile-form-full">
              <button type="submit" disabled={savingProfile}>
                {savingProfile ? 'Guardando...' : 'Guardar datos personales'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel profile-settings-panel">
          <h2>Seguridad</h2>

          <form className="form" onSubmit={handleEmailSubmit}>
            <label>
              Correo
              <input
                type="email"
                name="email"
                value={emailForm.email}
                onChange={handleEmailChange}
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={savingEmail}>
                {savingEmail ? 'Enviando...' : 'Cambiar correo'}
              </button>
            </div>
          </form>

          <hr className="profile-settings-divider" />

          <form className="form" onSubmit={handlePasswordSubmit}>
            <label>
              Nueva contraseña
              <input
                type="password"
                name="password"
                value={passwordForm.password}
                onChange={handlePasswordChange}
                placeholder="Mínimo 6 caracteres"
              />
            </label>

            <label>
              Confirmar contraseña
              <input
                type="password"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={savingPassword}>
                {savingPassword ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </section>
  );
}