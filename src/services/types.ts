import {GoalStatus, GoalType} from "../store/types";

export interface IFilterOption {
  limit?: number,
  nextToken?: string,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc',
}

export interface ITeamFilterOption extends IFilterOption {
  name?: string,
  status?: string,
}

export interface ITeamInviteFilterOption extends IFilterOption {
  email?: string,
  status?: string,
  role?: string,
  invitedBy?: string,
}

export interface ITeamMemberFilterOption extends IFilterOption {
  userId?: string,
  role?: string,
  status?: string,
}

export interface IUserFilterOption {
  limit?: number,
  nextToken?: string,
  groupName?: string,
  email?: string,
  name?: string,
  id?: string
  preferredUsername?: string,
  userStatus?: string,
  status?: boolean
}

export interface ISeasonFilterOption extends IFilterOption {
  name?: string,
  status?: string,
  teamId: string,
}

export interface IGoalFilterOption extends IFilterOption {
  ownerId?: string;
  goalType?: GoalType;
  status?: GoalStatus;
  title?: string;
}
