import { apiFetch } from '/src/services/api.js';
import { getState } from '/src/store/state.js';
import { subscribeToRealtimeUpdates } from '/src/services/realtime.js';
import { KonvoToast } from '/src/services/toast.js';

let notifications = [];

export async function initNotificationsPage() {
    console.log("[Notifications] Initializing Notifications Page...");
    const notificationList = document.getElementById('notification-list');
    if (!notificationList) return;

    await fetchAndRenderNotifications(notificationList);
    setupRealtimeNotificationListener(notificationList);
}

async function fetchAndRenderNotifications(notificationList) {
    try {
        const fetchedNotifications = await apiFetch('/api/notifications');
        notifications = fetchedNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        renderNotifications(notificationList);
    } catch (error) {
        console.error("[Notifications] Failed to fetch notifications:", error);
        KonvoToast.show("Failed to load notifications.", 'error');
    }
}

function renderNotifications(notificationList) {
    notificationList.innerHTML = '';
    if (notifications.length === 0) {
        notificationList.innerHTML = '<p class="text-muted" style="text-align: center; padding: 2rem;">No notifications yet.</p>';
        return;
    }

    notifications.forEach(n => {
        const notificationItem = document.createElement('div');
        notificationItem.className = `notification-item card ${n.read ? 'read' : 'unread'}`;
        notificationItem.dataset.notificationId = n.id;
        notificationItem.innerHTML = `
            <div class="notification-content">
                <span class="notification-type ${n.type}">${n.type.toUpperCase()}</span>
                <p class="notification-message">${n.message}</p>
                <span class="notification-time">${new Date(n.created_at).toLocaleString()}</span>
            </div>
            <div class="notification-actions">
                ${!n.read ? '<button class="btn btn-sm btn-secondary mark-read-btn">Mark as Read</button>' : ''}
                <button class="btn btn-sm btn-danger delete-btn">Delete</button>
            </div>
        `;
        notificationList.appendChild(notificationItem);

        notificationItem.querySelector('.mark-read-btn')?.addEventListener('click', () => markNotificationAsRead(n.id));
        notificationItem.querySelector('.delete-btn')?.addEventListener('click', () => deleteNotification(n.id));
    });
}

async function markNotificationAsRead(notificationId) {
    try {
        await apiFetch(`/api/notifications/${notificationId}/read`, { method: 'PUT' });
        notifications = notifications.map(n => n.id === notificationId ? { ...n, read: true } : n);
        renderNotifications(document.getElementById('notification-list'));
        KonvoToast.show("Notification marked as read.", 'success');
    } catch (error) {
        console.error("[Notifications] Failed to mark notification as read:", error);
        KonvoToast.show("Failed to mark notification as read.", 'error');
    }
}

async function deleteNotification(notificationId) {
    if (!confirm("Are you sure you want to delete this notification?")) return;
    try {
        await apiFetch(`/api/notifications/${notificationId}`, { method: 'DELETE' });
        notifications = notifications.filter(n => n.id !== notificationId);
        renderNotifications(document.getElementById('notification-list'));
        KonvoToast.show("Notification deleted.", 'success');
    } catch (error) {
        console.error("[Notifications] Failed to delete notification:", error);
        KonvoToast.show("Failed to delete notification.", 'error');
    }
}

function setupRealtimeNotificationListener(notificationList) {
    const currentUser = getState('currentUser');
    if (!currentUser) return;

    subscribeToRealtimeUpdates(`user_notifications_${currentUser.id}`, (payload) => {
        console.log("[Notifications] New real-time notification:", payload);
        const newNotification = { ...payload.notification, created_at: new Date(payload.notification.created_at) };
        notifications.unshift(newNotification); // Add to the beginning
        renderNotifications(notificationList);
        KonvoToast.show(`New ${newNotification.type} notification: ${newNotification.message}`, newNotification.type);
    });
}
