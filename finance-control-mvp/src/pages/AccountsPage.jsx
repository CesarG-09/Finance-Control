import { useEffect, useMemo, useState } from 'react';
import AccountForm from '../components/accounts/AccountForm';
import { useAuth } from '../context/AuthContext';
import {
  createAccount,
  deactivateAccount,
  getAccountsByClientId,
  getActiveTypeAccounts,
  reactivateAccount,
  updateAccount,
} from '../services/accountService';

function formatCurrency(value) {
  const numericValue = Number(value ?? 0);

  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency: 'USD',
  }).format(numericValue);
}

function AccountCard({ account, onEdit, onDeactivate, onReactivate }) {
  return (
    <article
      className={`account-card ${
        account.ac_is_active
          ? 'account-card-active'
          : 'account-card-inactive'
      }`}
    >
      <div>
        <h3>{account.ac_name}</h3>
        <p>{account.account_type?.ta_name || 'Sin tipo'}</p>

        <span
          className={`account-status-pill ${
            account.ac_is_active ? 'active' : 'inactive'
          }`}
        >
          {account.ac_is_active ? 'Activa' : 'Inactiva'}
        </span>

        {account.ac_description && (
          <p className="muted-text">{account.ac_description}</p>
        )}
      </div>

      <div className="account-card-footer">
        <strong>{formatCurrency(account.ac_balance)}</strong>

        <div className="account-actions">
          {account.ac_is_active ? (
            <>
              <button type="button" onClick={() => onEdit(account)}>
                Editar
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => onDeactivate(account)}
              >
                Desactivar
              </button>
            </>
          ) : (
            <button type="button" onClick={() => onReactivate(account)}>
              Reactivar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function AccountsPage() {
  const { clientProfile } = useAuth();

  const [accounts, setAccounts] = useState([]);
  const [typeAccounts, setTypeAccounts] = useState([]);
  const [editingAccount, setEditingAccount] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const clientId = clientProfile?.cl_id;

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.ac_is_active),
    [accounts]
  );

  const inactiveAccounts = useMemo(
    () => accounts.filter((account) => !account.ac_is_active),
    [accounts]
  );

  const totalBalance = useMemo(
    () =>
      activeAccounts.reduce(
        (total, account) => total + Number(account.ac_balance ?? 0),
        0
      ),
    [activeAccounts]
  );

  useEffect(() => {
    if (!clientId) {
      return;
    }

    loadAccountsData();
  }, [clientId]);

  async function loadAccountsData() {
    try {
      setLoading(true);
      setError('');

      const [accountsData, typeAccountsData] = await Promise.all([
        getAccountsByClientId(clientId),
        getActiveTypeAccounts(),
      ]);

      setAccounts(accountsData);
      setTypeAccounts(typeAccountsData);
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(formData) {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (editingAccount) {
        await updateAccount(clientId, editingAccount.ac_id, formData);
        setSuccess('Cuenta actualizada correctamente.');
      } else {
        await createAccount(clientId, formData);
        setSuccess('Cuenta creada correctamente. El historial inicial se registra automáticamente.');
      }

      setEditingAccount(null);
      await loadAccountsData();
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(account) {
    const confirmed = window.confirm(
      `¿Deseas desactivar la cuenta "${account.ac_name}"? No se borrará físicamente.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await deactivateAccount(clientId, account.ac_id);
      setSuccess('Cuenta desactivada correctamente.');
      setEditingAccount(null);
      await loadAccountsData();
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReactivate(account) {
    const confirmed = window.confirm(
      `¿Deseas reactivar la cuenta "${account.ac_name}" manteniendo su balance actual?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await reactivateAccount(clientId, account.ac_id);
      setSuccess('Cuenta reactivada correctamente.');
      await loadAccountsData();
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(account) {
    setEditingAccount(account);
    setError('');
    setSuccess('');
  }

  function handleCancelEdit() {
    setEditingAccount(null);
    setError('');
    setSuccess('');
  }

  if (loading) {
    return <p>Cargando cuentas...</p>;
  }

  return (
    <section className="accounts-page">
      <div className="page-header">
        <div>
          <h1>Cuentas</h1>
          <p>Gestiona tus cuentas activas e inactivas.</p>
        </div>

        <div className="summary-card">
          <span>Balance total activo</span>
          <strong>{formatCurrency(totalBalance)}</strong>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}
      {success && <p className="info-message">{success}</p>}

      <div className="accounts-layout">
        <section className="panel account-form-panel">
          <h2>{editingAccount ? 'Editar cuenta' : 'Nueva cuenta'}</h2>

          <AccountForm
            typeAccounts={typeAccounts}
            initialData={editingAccount}
            saving={saving}
            onSubmit={handleSubmit}
            onCancel={handleCancelEdit}
          />
        </section>

        <div className="accounts-groups">
          <section className="panel accounts-section">
            <div className="section-header">
              <h2>Cuentas activas</h2>
              <span>{activeAccounts.length}</span>
            </div>

            <div className="accounts-scroll-list">
              {activeAccounts.length === 0 ? (
                <p className="empty-message">Aún no tienes cuentas activas.</p>
              ) : (
                activeAccounts.map((account) => (
                  <AccountCard
                    key={account.ac_id}
                    account={account}
                    onEdit={handleEdit}
                    onDeactivate={handleDeactivate}
                    onReactivate={handleReactivate}
                  />
                ))
              )}
            </div>
          </section>

          <section className="panel accounts-section">
            <div className="section-header">
              <h2>Cuentas inactivas</h2>
              <span>{inactiveAccounts.length}</span>
            </div>

            <div className="accounts-scroll-list">
              {inactiveAccounts.length === 0 ? (
                <p className="empty-message">No tienes cuentas inactivas.</p>
              ) : (
                inactiveAccounts.map((account) => (
                  <AccountCard
                    key={account.ac_id}
                    account={account}
                    onEdit={handleEdit}
                    onDeactivate={handleDeactivate}
                    onReactivate={handleReactivate}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}