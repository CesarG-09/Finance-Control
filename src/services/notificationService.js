import { supabase } from '../lib/supabaseClient';

const NOTIFICATION_SELECT = `
  an_id,
  an_title,
  an_message,
  an_type,
  an_target_type,
  an_target_cl_id,
  an_is_active,
  an_publish_at,
  an_expire_at,
  created_at,
  modified_at
`;

export async function getVisibleNotifications(clientId) {
  if (!clientId) {
    return [];
  }

  const { data: notifications, error: notificationsError } = await supabase
    .schema('ctrl_finance')
    .from('app_notification')
    .select(NOTIFICATION_SELECT)
    .order('an_publish_at', { ascending: false });

  if (notificationsError) {
    throw notificationsError;
  }

  const { data: readNotifications, error: readError } = await supabase
    .schema('ctrl_finance')
    .from('user_notification_read')
    .select('an_id, unr_read_at')
    .eq('cl_id', clientId);

  if (readError) {
    throw readError;
  }

  const readMap = new Map(
    (readNotifications ?? []).map((item) => [Number(item.an_id), item.unr_read_at])
  );

  return (notifications ?? []).map((notification) => ({
    ...notification,
    is_read: readMap.has(Number(notification.an_id)),
    read_at: readMap.get(Number(notification.an_id)) ?? null,
  }));
}

export async function getUnreadNotificationCount(clientId) {
  const notifications = await getVisibleNotifications(clientId);

  return notifications.filter((notification) => !notification.is_read).length;
}

export async function markNotificationAsRead(clientId, notificationId) {
  if (!clientId || !notificationId) {
    throw new Error('No se pudo marcar la notificación como leída.');
  }

  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('user_notification_read')
    .insert({
      cl_id: clientId,
      an_id: notificationId,
    })
    .select('unr_id, an_id, cl_id, unr_read_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return null;
    }

    throw error;
  }

  return data;
}

export async function markAllNotificationsAsRead(clientId, notifications) {
  if (!clientId) {
    throw new Error('No existe cliente válido.');
  }

  const unreadNotifications = notifications.filter(
    (notification) => !notification.is_read
  );

  await Promise.all(
    unreadNotifications.map((notification) =>
      markNotificationAsRead(clientId, notification.an_id)
    )
  );
}