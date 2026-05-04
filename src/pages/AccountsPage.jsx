import { useEffect, useMemo, useState } from 'react';
import AccountForm from '../components/accounts/AccountForm';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ui/ConfirmModal';
import {
  createAccount,
  deactivateAccount,
  getAccountsByClientId,
  getActiveTypeAccounts,
  reactivateAccount,
  updateAccount,
} from '../services/accountService';



const ACCOUNT_VIEWS = {
  FORM: 'form',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

function formatCurrency(value) {
  const numericValue = Number(value ?? 0);

  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency: 'USD',
  }).format(numericValue);
}

function AccountViewButton({
  isActive,
  label,
  count,
  onClick,
  variant = 'secondary',
}) {
  return (
    <button
      type="button"
      className={`accounts-view-tab accounts-view-tab-${variant} ${
        isActive ? 'active' : ''
      }`}
      onClick={onClick}
    >
      <span>{label}</span>
      {typeof count === 'number' && <small>{count}</small>}
    </button>
  );
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

  const [confirmAction, setConfirmAction] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [typeAccounts, setTypeAccounts] = useState([]);
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountView, setAccountView] = useState(ACCOUNT_VIEWS.FORM);

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

  function handleShowCreateForm() {
    setAccountView(ACCOUNT_VIEWS.FORM);
    setEditingAccount(null);
    setError('');
    setSuccess('');
  }

  function handleShowActiveAccounts() {
    setAccountView(ACCOUNT_VIEWS.ACTIVE);
    setEditingAccount(null);
    setError('');
    setSuccess('');
  }

  function handleShowInactiveAccounts() {
    setAccountView(ACCOUNT_VIEWS.INACTIVE);
    setEditingAccount(null);
    setError('');
    setSuccess('');
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
        setSuccess(
          'Cuenta creada correctamente. El historial inicial se registra automáticamente.'
        );
      }

      setEditingAccount(null);
      setAccountView(ACCOUNT_VIEWS.FORM);
      await loadAccountsData();
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setSaving(false);
    }
  }

  function handleDeactivate(account) {
    setConfirmAction({
      type: 'deactivate',
      account,
      title: 'Desactivar cuenta',
      message: `¿Deseas desactivar la cuenta "${account.ac_name}"?`,
      confirmText: 'Desactivar',
      danger: true,
    });
  }

  function handleReactivate(account) {
    setConfirmAction({
      type: 'reactivate',
      account,
      title: 'Reactivar cuenta',
      message: `¿Deseas reactivar la cuenta "${account.ac_name}" manteniendo su balance actual?`,
      confirmText: 'Reactivar',
      danger: false,
    });
  }

  async function handleConfirmAction() {
    if (!confirmAction?.account) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (confirmAction.type === 'deactivate') {
        await deactivateAccount(clientId, confirmAction.account.ac_id);
        setSuccess('Cuenta desactivada correctamente.');
        setEditingAccount(null);
      }

      if (confirmAction.type === 'reactivate') {
        await reactivateAccount(clientId, confirmAction.account.ac_id);
        setSuccess('Cuenta reactivada correctamente.');
      }

      setConfirmAction(null);
      await loadAccountsData();
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setSaving(false);
    }
  }

  function handleCancelConfirmAction() {
    if (saving) return;
    setConfirmAction(null);
  }

  function handleEdit(account) {
    setEditingAccount(account);
    setAccountView(ACCOUNT_VIEWS.FORM);
    setError('');
    setSuccess('');
  }

  function handleCancelEdit() {
    setEditingAccount(null);
    setError('');
    setSuccess('');
  }

  function renderFormView() {
    return (
      <div className="accounts-workspace-content accounts-form-view" key="form">
        <div className="accounts-form-centered">
          <h2>{editingAccount ? 'Editar cuenta' : 'Nueva cuenta'}</h2>

          <p>
            {editingAccount
              ? 'Actualiza los datos básicos de la cuenta seleccionada.'
              : 'Crea una nueva cuenta. El balance inicial se registrará automáticamente en el historial.'}
          </p>

          <AccountForm
            typeAccounts={typeAccounts}
            initialData={editingAccount}
            saving={saving}
            onSubmit={handleSubmit}
            onCancel={handleCancelEdit}
          />
        </div>
      </div>
    );
  }

  function renderAccountsList({
    title,
    description,
    accountsToRender,
    emptyMessage,
  }) {
    return (
      <div className="accounts-workspace-content accounts-list-view" key={title}>
        <div className="accounts-list-view-header">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>

          <span>{accountsToRender.length}</span>
        </div>

        <div className="accounts-scroll-list accounts-single-scroll-list">
          {accountsToRender.length === 0 ? (
            <p className="empty-message">{emptyMessage}</p>
          ) : (
            accountsToRender.map((account) => (
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
      </div>
    );
  }

  function renderWorkspaceContent() {
    if (accountView === ACCOUNT_VIEWS.ACTIVE) {
      return renderAccountsList({
        title: 'Cuentas activas',
        description: 'Consulta, edita o desactiva tus cuentas activas.',
        accountsToRender: activeAccounts,
        emptyMessage: 'Aún no tienes cuentas activas.',
      });
    }

    if (accountView === ACCOUNT_VIEWS.INACTIVE) {
      return renderAccountsList({
        title: 'Cuentas inactivas',
        description: 'Consulta o reactiva cuentas que fueron desactivadas.',
        accountsToRender: inactiveAccounts,
        emptyMessage: 'No tienes cuentas inactivas.',
      });
    }

    return renderFormView();
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

      <div className="accounts-tab-layout">
        <div className="accounts-tabs">
          <AccountViewButton
            label="Crear cuenta nueva"
            variant="primary"
            isActive={accountView === ACCOUNT_VIEWS.FORM}
            onClick={handleShowCreateForm}
          />

          <AccountViewButton
            label="Ver cuentas activas"
            variant="secondary"
            count={activeAccounts.length}
            isActive={accountView === ACCOUNT_VIEWS.ACTIVE}
            onClick={handleShowActiveAccounts}
          />

          <AccountViewButton
            label="Ver cuentas inactivas"
            variant="secondary"
            count={inactiveAccounts.length}
            isActive={accountView === ACCOUNT_VIEWS.INACTIVE}
            onClick={handleShowInactiveAccounts}
          />
        </div>

        <section
          className={`panel accounts-workspace-panel accounts-workspace-${accountView}`}
        >
          {renderWorkspaceContent()}
        </section>
      </div>

      <ConfirmModal
        open={Boolean(confirmAction)}
        title={confirmAction?.title}
        message={confirmAction?.message}
        confirmText={confirmAction?.confirmText}
        danger={confirmAction?.danger}
        loading={saving}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelConfirmAction}
      />

    </section>
  );
}