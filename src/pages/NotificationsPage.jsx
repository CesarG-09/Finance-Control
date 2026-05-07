import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import {
  getVisibleNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notificationService';

const NOTIFICATION_TYPES = [
  {
    value: '',
    label: 'Todas',
  },
  {
    value: 'info',
    label: 'Información',
  },
  {
    value: 'feature',
    label: 'Nuevas funciones',
  },
  {
    value: 'warning',
    label: 'Avisos',
  },
  {
    value: 'maintenance',
    label: 'Mantenimiento',
  },
];

function formatDateTime(value) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('es-PA', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getNotificationTypeLabel(type) {
  const match = NOTIFICATION_TYPES.find((item) => item.value === type);

  return match?.label || 'Notificación';
}

function NotificationCard({ notification, onMarkAsRead, markingId }) {
  return (
    <article
      className={`notification-card ${
        notification.is_read ? 'notification-card-read' : 'notification-card-unread'
      }`}
    >
      <div className="notification-card-header">
        <div>
          <span className={`notification-type-tag notification-type-${notification.an_type}`}>
            {getNotificationTypeLabel(notification.an_type)}
          </span>

          <h3>{notification.an_title}</h3>
        </div>

        {!notification.is_read && <span className="notification-unread-dot" />}
      </div>

      <p>{notification.an_message}</p>

      <div className="notification-card-footer">
        <small>Publicado: {formatDateTime(notification.an_publish_at)}</small>

        {notification.is_read ? (
          <small>Leída: {formatDateTime(notification.read_at)}</small>
        ) : (
          <button
            type="button"
            className="secondary-button"
            onClick={() => onMarkAsRead(notification.an_id)}
            disabled={markingId === notification.an_id}
          >
            {markingId === notification.an_id ? 'Marcando...' : 'Marcar como leída'}
          </button>
        )}
      </div>
    </article>
  );
}

export default function NotificationsPage() {
  const { clientProfile } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState('');

  const clientId = clientProfile?.cl_id;

  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => !notification.is_read).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (!selectedType) return notifications;

    return notifications.filter(
      (notification) => notification.an_type === selectedType
    );
  }, [notifications, selectedType]);

  useEffect(() => {
    if (!clientId) return;

    loadNotifications();
  }, [clientId]);

  async function loadNotifications() {
    try {
      setLoading(true);
      setError('');

      const data = await getVisibleNotifications(clientId);
      setNotifications(data);
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setLoading(false);
    }
  }

  function handleTypeChange(event) {
    setSelectedType(event.target.value);
  }

  async function handleMarkAsRead(notificationId) {
    try {
      setMarkingId(notificationId);
      setError('');

      await markNotificationAsRead(clientId, notificationId);
      await loadNotifications();
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setMarkingId(null);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      setMarkingAll(true);
      setError('');

      await markAllNotificationsAsRead(clientId, notifications);
      await loadNotifications();
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <section className="notifications-page">
      <div className="page-header">
        <div>
          <h1>Notificaciones</h1>
          <p>Consulta avisos, cambios y nuevas funcionalidades del programa.</p>
        </div>

        <div className="summary-card">
          <span>No leídas</span>
          <strong>{unreadCount}</strong>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}

      <section className="panel notifications-filter-panel">
        <div className="notifications-filter-row">
          <label className="filter-field">
            Tipo
            <select value={selectedType} onChange={handleTypeChange}>
              {NOTIFICATION_TYPES.map((type) => (
                <option key={type.value || 'all'} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="secondary-button"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || markingAll}
          >
            {markingAll ? 'Marcando...' : 'Marcar todas como leídas'}
          </button>
        </div>
      </section>

      <section className="notifications-list">
        {loading ? (
          <p>Cargando notificaciones...</p>
        ) : filteredNotifications.length === 0 ? (
          <p className="empty-message">
            No hay notificaciones para los filtros seleccionados.
          </p>
        ) : (
          filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification.an_id}
              notification={notification}
              markingId={markingId}
              onMarkAsRead={handleMarkAsRead}
            />
          ))
        )}
      </section>
    </section>
  );
}  