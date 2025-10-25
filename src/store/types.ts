import {OverridableStringUnion} from "@mui/types";
import {AlertColor, AlertPropsColorOverrides} from "@mui/material";

export interface Notification {
  message: string
  level: OverridableStringUnion<AlertColor, AlertPropsColorOverrides>
  title: string
  id: string
}

export interface NotifyEvent {
  message: string
  level: OverridableStringUnion<AlertColor, AlertPropsColorOverrides>
  title: string
}
