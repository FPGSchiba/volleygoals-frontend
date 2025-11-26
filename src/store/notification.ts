import {Notification, NotifyEvent} from "./types";
import {create} from "zustand";
import {v4 as uuidv4} from 'uuid';

type NotificationState = {
  notifications: Notification[]
}

type NotificationActions = {
  closeNotification: (id: string) => void
  notify: (notification: NotifyEvent) => void
}

// short-lived dedupe cache for recent notifications
const recent = new Map<string, number>(); // key -> expiresAt
const RECENT_TTL_MS = 2000;

function recentKey(n: NotifyEvent) {
  return `${n.level}|${n.title}|${n.message}`;
}

const useNotificationStore = create<NotificationState & NotificationActions>((set) => ({
  notifications: [],
  closeNotification: (id) => set((state) => ({notifications: state.notifications.filter(item => item.id != id)})),
  notify: (notification) => {
    const key = recentKey(notification);
    const now = Date.now();
    const expires = recent.get(key) || 0;
    if (expires > now) {
      // duplicate notification within TTL - ignore
      return;
    }
    // record recent
    recent.set(key, now + RECENT_TTL_MS);
    // schedule cleanup
    setTimeout(() => {
      const exp = recent.get(key);
      if (exp && exp <= Date.now()) recent.delete(key);
    }, RECENT_TTL_MS + 100);

    set((state) => ({notifications: [...state.notifications, {...notification, id: uuidv4()}]}));
  }
}))

export {useNotificationStore}
