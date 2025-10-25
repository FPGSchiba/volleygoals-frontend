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

const useNotificationStore = create<NotificationState & NotificationActions>((set) => ({
  notifications: [],
  closeNotification: (id) => set((state) => ({notifications: state.notifications.filter(item => item.id != id)})),
  notify: (notification) => set((state) => ({notifications: [...state.notifications, {...notification, id: uuidv4()}]}))
}))

export {useNotificationStore}
