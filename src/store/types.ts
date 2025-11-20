import {OverridableStringUnion} from "@mui/types";
import {AlertColor, AlertPropsColorOverrides} from "@mui/material";

export interface Notification extends NotifyEvent{
  id: string
}

export interface NotifyEvent {
  message: string
  level: OverridableStringUnion<AlertColor, AlertPropsColorOverrides>
  title: string
  details?: string
}

export enum UserType {
  Admin = "ADMINS",
  User = "USERS",
}

export enum RoleType {
  Admin = "admin",
  Trainer = "trainer",
  Member = "member",

}

export interface ITeamAssignment {
  teamId: string;
  role: RoleType;
}

// Teams
export interface ITeam {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ITeamSettings {
  id: string;
  teamId: string;
  allowFileUploads: boolean;
  allowTeamGoalComments: boolean;
  allowIndividualGoalComments: boolean;
  createdAt: string;
  updatedAt: string;
}
