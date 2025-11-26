import * as React from 'react';
import { useNotificationStore } from "../store/notification";
import {Alert} from "@mui/material";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from '@mui/icons-material/Close';
import {Notification} from "../store/types";
import {useEffect} from "react";

export function ClosingAlert(props: Readonly<{ notification: Notification }>) {
  const closeNotification = useNotificationStore((state) => state.closeNotification);
  const {notification} = props;

  useEffect(() => {
    setTimeout(() => {
      closeNotification(notification.id);
    }, notification.details !== undefined ? 20000 : 8000);
  }, []);

  return (
    <Alert className="notification notification-paper" severity={notification.level} key={notification.id} style={{overflow: "auto"}}>
      <div className="notification notification-body notification-body-wrapper">
        <Typography className="notification notification-body notification-body-header" variant="h5">{notification.title}</Typography>
        <Typography className="notification notification-body notification-body-message" variant="body1">{notification.message}</Typography>
        {notification.details && (
          <details className="notification notification-details" style={{marginTop: 8}}>
            <summary style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: 0}}>
              <Typography variant="body2" className="notification notification-details-summary">Details</Typography>
              <span aria-hidden style={{fontSize: 18, lineHeight: 1}}>▾</span>
            </summary>
            <textarea
              readOnly
              defaultValue={notification.details}
              className="notification notification-details-content"
              style={{whiteSpace: 'pre-wrap', marginTop: 6, width: '100%', minHeight: 96, resize: 'vertical', borderRadius: 4, border: '1px solid rgba(0,0,0,0.12)', padding: 8, fontFamily: 'inherit', fontSize: '0.875rem'}}
            />
          </details>
        )}
      </div>
      <IconButton
        size="small"
        aria-label="close"
        color="inherit"
        className="notification notification-button"
        onClick={() => closeNotification(notification.id)}
      >
        <CloseIcon fontSize="small"/>
      </IconButton>
    </Alert>
  )
}
