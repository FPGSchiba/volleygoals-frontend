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

export enum SeasonStatus {
  Planned = "planned",
  Active = "active",
  Completed = "completed",
  Archived = "archived",
}

export enum GoalType {
  Team = "team",
  Individual = "individual",
}

export enum GoalStatus {
  Open = "open",
  InProgress = "in_progress",
  Completed = "completed",
  Archived = "archived",
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

export interface IProfileUpdate {
  name?: string;
  picture?: string;
  preferredUsername?: string;
  birthdate?: string;
}

export interface IUserUpdate {
  enabled?: boolean;
  userType?: UserType;
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

export interface ITeamUser {
  id: string;
  name?: string;
  email: string;
  picture?: string;
  preferredUsername?: string;
  role: RoleType;
  status: string;
  userStatus: string;
  birthdate?: string;
  joinedAt?: string;
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
  status?: string; // "pending" | "accepted" | "declined" | "revoked"
}

// Seasons
export interface ISeason {
  id: string;
  teamId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: SeasonStatus;
  createdAt: string;
  updatedAt: string;
}

// Goals
export interface IGoal {
  id: string;
  seasonId: string;
  ownerId: string;
  owner?: { id: string; name?: string; preferredUsername?: string; picture?: string };
  goalType: GoalType;
  title: string;
  description: string;
  status: GoalStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  picture?: string;
  completionPercentage?: number; // API #17
}

// Progress Reports
export interface IProgressReport {
  id: string;
  seasonId: string;
  authorId: string;
  summary: string;
  details: string;
  overallDetails?: string; // optional overall summary/notes
  createdAt: string;
  updatedAt: string;
  progress?: IProgressEntry[]; // populated on single GET if backend embeds them
  authorName?: string;       // API #18
  authorPicture?: string | null;
}

export interface IProgressEntry {
  id: string;
  progressReportId: string;
  goalId: string;
  rating: number; // 1–5
  details?: string; // per-goal notes
}

// Season Stats
export interface ISeasonStats {
  goalCount: number;
  completedGoalCount: number;
  openGoalCount?: number;       // US-001: extended stats (optional until backend deployed)
  inProgressGoalCount?: number; // US-001: extended stats (optional until backend deployed)
  reportCount: number;
  memberCount: number;
}

// Activity Feed
export interface IActivityEntry {
  id: string;
  teamId: string;
  actorId: string;
  actorName?: string;
  actorPicture?: string;
  action: string;
  description: string;
  targetType: string;
  targetId?: string;
  timestamp: string;
}

// Comments
export enum CommentType {
  Goal = 'Goal',
  ProgressReport = 'ProgressReport',
  ProgressEntry = 'ProgressEntry',
}

export interface IComment {
  id: string;
  authorId: string;
  commentType: CommentType;
  targetId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorName?: string;          // API #13
  authorPicture?: string | null;
  files?: ICommentFile[];       // API #14
}

export interface ICommentFile {
  id: string;
  commentId: string;
  storageKey: string;
  createdAt: string;
  fileUrl?: string; // API #14
}
