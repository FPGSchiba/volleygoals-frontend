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
