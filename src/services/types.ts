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
