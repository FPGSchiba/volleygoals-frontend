import {
  IUser, ITeam, ITeamAssignment, ISeason, IGoal, IProgressReport,
  IProgressEntry, IComment, IInvite, IActivityEntry, ISeasonStats,
  ITeamSettings, ITeamUser, ICommentFile,
  ITenant, ITenantMember, IRoleDefinition, IOwnershipPolicy,
  UserType, RoleType, TeamMemberStatus, SeasonStatus, GoalType, GoalStatus, CommentType,
} from '../../store/types';

let counter = 0;
const uid = () => `test-${++counter}`;
const now = '2026-01-15T10:00:00.000Z';

export function buildUser(overrides?: Partial<IUser>): IUser {
  const id = uid();
  return {
    id,
    email: `${id}@test.com`,
    name: `User ${id}`,
    enabled: true,
    userStatus: 'CONFIRMED',
    userType: UserType.User,
    updatedAt: now,
    createdAt: now,
    ...overrides,
  };
}

export function buildTeam(overrides?: Partial<ITeam>): ITeam {
  const id = uid();
  return {
    id,
    name: `Team ${id}`,
    status: 'active',
    picture: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function buildTeamAssignment(overrides?: Partial<ITeamAssignment>): ITeamAssignment {
  return {
    team: buildTeam(),
    role: RoleType.Member,
    status: TeamMemberStatus.Active,
    ...overrides,
  };
}

export function buildSeason(overrides?: Partial<ISeason>): ISeason {
  const id = uid();
  return {
    id,
    teamId: uid(),
    name: `Season ${id}`,
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    status: SeasonStatus.Active,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function buildGoal(overrides?: Partial<IGoal>): IGoal {
  const id = uid();
  return {
    id,
    teamId: uid(),
    ownerId: uid(),
    goalType: GoalType.Team,
    title: `Goal ${id}`,
    description: `Description for ${id}`,
    status: GoalStatus.Open,
    createdBy: uid(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function buildProgressReport(overrides?: Partial<IProgressReport>): IProgressReport {
  const id = uid();
  return {
    id,
    seasonId: uid(),
    authorId: uid(),
    summary: `Summary ${id}`,
    details: `Details for ${id}`,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function buildProgressEntry(overrides?: Partial<IProgressEntry>): IProgressEntry {
  const id = uid();
  return {
    id,
    progressReportId: uid(),
    goalId: uid(),
    rating: 3,
    ...overrides,
  };
}

export function buildComment(overrides?: Partial<IComment>): IComment {
  const id = uid();
  return {
    id,
    authorId: uid(),
    commentType: CommentType.Goal,
    targetId: uid(),
    content: `Comment ${id}`,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function buildInvite(overrides?: Partial<IInvite>): IInvite {
  const id = uid();
  return {
    id,
    teamId: uid(),
    email: `invite-${id}@test.com`,
    role: RoleType.Member,
    token: `token-${id}`,
    invitedBy: uid(),
    expiresAt: '2026-12-31T00:00:00.000Z',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function buildActivityEntry(overrides?: Partial<IActivityEntry>): IActivityEntry {
  const id = uid();
  return {
    id,
    teamId: uid(),
    actorId: uid(),
    actorName: `Actor ${id}`,
    action: 'goal.created',
    description: `Created goal ${id}`,
    targetType: 'goal',
    timestamp: now,
    ...overrides,
  };
}

export function buildSeasonStats(overrides?: Partial<ISeasonStats>): ISeasonStats {
  return {
    goalCount: 10,
    completedGoalCount: 3,
    openGoalCount: 4,
    inProgressGoalCount: 3,
    reportCount: 5,
    memberCount: 8,
    ...overrides,
  };
}

export function buildTeamSettings(overrides?: Partial<ITeamSettings>): ITeamSettings {
  const id = uid();
  return {
    id,
    teamId: uid(),
    allowFileUploads: true,
    allowTeamGoalComments: true,
    allowIndividualGoalComments: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function buildTeamUser(overrides?: Partial<ITeamUser>): ITeamUser {
  const id = uid();
  return {
    id,
    email: `${id}@test.com`,
    name: `TeamUser ${id}`,
    role: RoleType.Member,
    status: TeamMemberStatus.Active.toString(),
    userStatus: 'CONFIRMED',
    ...overrides,
  };
}

export function buildCommentFile(overrides?: Partial<ICommentFile>): ICommentFile {
  const id = uid();
  return {
    id,
    commentId: uid(),
    storageKey: `files/${id}.png`,
    createdAt: now,
    ...overrides,
  };
}

export function buildTenant(overrides?: Partial<ITenant>): ITenant {
  const id = uid();
  return {
    id,
    name: `Tenant ${id}`,
    ownerId: uid(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function buildRoleDefinition(overrides?: Partial<IRoleDefinition>): IRoleDefinition {
  const id = uid();
  return {
    id,
    tenantId: uid(),
    name: `Role ${id}`,
    permissions: ['goals:read'],
    isDefault: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
