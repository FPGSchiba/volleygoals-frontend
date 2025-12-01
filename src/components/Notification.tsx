import * as React from 'react';
import { useNotificationStore } from "../store/notification";
import {Snackbar} from "@mui/material";
import {ClosingAlert} from "./ClosingAlert";

export function Notification() {
  const notifications = useNotificationStore((state) => state.notifications);

  return (
    <Snackbar
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      open={notifications.length > 0}
    >
      <div>
        { notifications.map(function (notification) {
          return (
            <ClosingAlert notification={notification} key={notification.id} />
          )
        })}
      </div>
    </Snackbar>
  )
}
