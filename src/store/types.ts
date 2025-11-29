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

export enum TeamMemberStatus {
  Active = "active",
  Invited = "invited",
  Removed = "removed",
  Left = "left",
}

export interface ITeamAssignment {
  team: ITeam
  role: RoleType;
  status: TeamMemberStatus;
}

// Users
export interface IUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  preferredUsername?: string;
  enabled: boolean;
  userStatus: string;
  userType: UserType;
  updatedAt: string;
  createdAt: string;
  birthdate?: string;
}

export interface IUserUpdate {
  name?: string;
  picture?: string;
  preferredUsername?: string;
  birthdate?: string;
}

// Teams
export interface ITeam {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  picture: string
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

export interface ITeamMember {
  id: string;
  cognitoSub: string;
  teamId: string;
  role: RoleType;
  status: TeamMemberStatus;
  createdAt: string;
  updatedAt: string;
  joinedAt?: string;
  leftAt?: string;
}

// Invites
export interface IInvite {
  id: string;
  teamId: string;
  email: string;
  role: RoleType;
  token: string;
  message?: string;
  invitedBy: string;
  acceptedBy?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  declinedAt?: string;
}
