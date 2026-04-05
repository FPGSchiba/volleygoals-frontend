import axios, { AxiosInstance } from "axios";
import https from 'https';
import {
  IGoalFilterOption,
  ISeasonFilterOption,
  ITeamFilterOption,
  ITeamInviteFilterOption,
  ITeamMemberFilterOption,
  IUserFilterOption,
  IProgressReportFilterOption,
  ICommentFilterOption
} from "./types";
import {
  IInvite,
  ITeam,
  ITeamAssignment,
  ITeamMember,
  ITeamSettings, ITeamUser,
  IUser,
  IProfileUpdate, IUserUpdate, RoleType, ISeason, SeasonStatus, IGoal, GoalType, GoalStatus,
  IProgressReport, IComment, ICommentFile, IActivityEntry, IGoalSeasonTag,
  ITenant, ITenantMember, IRoleDefinition, IOwnershipPolicy
} from "../store/types";
import {JWT} from "@aws-amplify/auth";

class VolleyGoalsAPIV1 {
  protected static endpoint: AxiosInstance;
  private static inflight = new Map<string, Promise<unknown>>();
  private static cache = new Map<string, { value: unknown; expiresAt?: number }>();
  private token: string | undefined;
  private static instance: VolleyGoalsAPIV1;

  private static extractError(reason: unknown): { message: string; error?: string } {
    if (reason && typeof reason === 'object' && 'response' in reason) {
      const resp = (reason as { response?: { data?: { message?: string; error?: string } } }).response;
      return {
        message: resp?.data?.message || 'error.internalServerError',
        error: resp?.data?.error,
      };
    }
    if (reason instanceof Error) {
      return { message: reason.message || 'error.internalServerError' };
    }
    return { message: 'error.internalServerError' };
  }

  static getInstance(): VolleyGoalsAPIV1 {
    if (!VolleyGoalsAPIV1.instance) {
      VolleyGoalsAPIV1.instance = new VolleyGoalsAPIV1().init();
    }
    return VolleyGoalsAPIV1.instance;
  }

  private createAxiosInstance(baseURL: string): AxiosInstance {
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    const instance = axios.create({
      baseURL,
      httpsAgent,
    });

    // If token exists, set it for the new instance
    if (this.token) {
      instance.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    }

    return instance;
  }

  private initializeEndpoints(): void {
    const apiProtocol = process.env.API_PROTOCOL || 'https';
    const apiHost = process.env.API_HOST || 'localhost:8000';
    const apiPathRoot = process.env.API_PATH_ROOT || '/api/v1';

    const userApiHost = `${apiProtocol}://${apiHost}`;
    VolleyGoalsAPIV1.endpoint = this.createAxiosInstance(userApiHost + apiPathRoot);
  }

  public init(): this {
    this.initializeEndpoints();
    return this;
  }

  // New method to reload endpoints
  public reloadEndpoints(): void {
    this.initializeEndpoints();
  }

  // Modified to ensure endpoints are fresh
  private async ensureEndpoints(needsToken: boolean = true): Promise<void> {
    const maxWaitMs = 10000;
    const intervalMs = 100;
    const deadline = Date.now() + maxWaitMs;

    // Ensure endpoints are initialized (retry until deadline)
    while (!VolleyGoalsAPIV1.endpoint && Date.now() < deadline) {
      this.reloadEndpoints();
      // wait a short period to allow session/token to be loaded
      // eslint-disable-next-line no-await-in-loop
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    if (needsToken) {
      // If token is not yet set, wait until it appears (or until deadline)
      while (!this.token && Date.now() < deadline) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }

      // If token still isn't set after waiting, cancel by throwing an error
      if (!this.token && this.token === '') {
        console.warn("Token not set within deadline - cancelling request");
        throw new Error('error.tokenTimeout');
      }

      // If token became available, ensure endpoints carry the header
      if (this.token && VolleyGoalsAPIV1.endpoint) {
        VolleyGoalsAPIV1.endpoint.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
      }
    }

    // Final attempt to initialize endpoints if still missing
    if (!VolleyGoalsAPIV1.endpoint) {
      this.reloadEndpoints();
    }
  }

  public setToken(token?: JWT): void {
    if (!token) {
      this.token = undefined;
      return;
    }
    this.token = token.toString();
    // Update token for all endpoints
    [
      VolleyGoalsAPIV1.endpoint,
    ].forEach(endpoint => {
      if (endpoint) {
        endpoint.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
      }
    });
  }

  private static serializeParams(params?: Record<string, unknown>): string {
    if (!params) return '';
    // stable serialization: sort keys
    const build = (obj: unknown): unknown => {
      if (obj === null || obj === undefined) return obj;
      if (Array.isArray(obj)) return obj.map(build);
      if (typeof obj === 'object') {
        return Object.keys(obj).sort().reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = build((obj as Record<string, unknown>)[key]);
          return acc;
        }, {});
      }
      return obj;
    };
    try {
      return JSON.stringify(build(params));
    } catch {
      return String(params);
    }
  }

  private static makeKey(method: string, path: string, params?: Record<string, unknown>) {
    const p = this.serializeParams(params);
    return `${method.toUpperCase()}|${path}|${p}`;
  }

  private async requestDeduped<T>(method: 'GET'|'POST'|'PATCH'|'DELETE'|'PUT', path: string, axiosFn: () => Promise<{ data: T }>, params?: Record<string, unknown>, ttlMs: number = 1000): Promise<T> {
    // Only dedupe GET requests; other methods bypass
    // For GET requests normalize params for the dedupe key so undefined vs defaulted params are equivalent
    let keyParams = params;
    if (method === 'GET') {
      keyParams = { ...(params || {}), limit: params?.limit ?? 10, sortOrder: params?.sortOrder ?? 'asc', sortBy: params?.sortBy };
    }
    const key = VolleyGoalsAPIV1.makeKey(method, path, keyParams);

    // check cache
    const cached = VolleyGoalsAPIV1.cache.get(key);
    if (cached && cached.expiresAt && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    // only dedupe GET
    if (method !== 'GET') {
      const resp = await axiosFn();
      return resp.data as T;
    }

    const inflight = VolleyGoalsAPIV1.inflight.get(key);
    if (inflight) return inflight as Promise<T>;

    const p = (async () => {
      try {
        try {
          const resp = await axiosFn();
          const data = resp.data as T;
          if (ttlMs && ttlMs > 0) {
            VolleyGoalsAPIV1.cache.set(key, { value: data, expiresAt: Date.now() + ttlMs });
          }
          return data;
        } catch (err: unknown) {
          // Standardize error response shape so callers receive the same structure
          const extracted = VolleyGoalsAPIV1.extractError(err);
          const errorResp = {
            message: extracted.message,
            error: extracted.error,
          } as unknown as T;
          if (ttlMs && ttlMs > 0) {
            VolleyGoalsAPIV1.cache.set(key, { value: errorResp, expiresAt: Date.now() + ttlMs });
          }
          return errorResp;
        }
      } finally {
        VolleyGoalsAPIV1.inflight.delete(key);
      }
    })();

    VolleyGoalsAPIV1.inflight.set(key, p);
    return p;
  }

  public async uploadFileToPresignedUrl(file: File, presignedUrl: string, onProgress?: (pct: number) => void): Promise<{ message: string, error?: string}> {
    try {
      // Use PUT to upload the raw file. Axios in browser will set Content-Type properly if provided.
      await axios.put(presignedUrl, file, {
        headers: {
          'Content-Type': file.type,
        },
        onUploadProgress: (progressEvent) => {
          if (!onProgress) return;
          const pct = Math.round((progressEvent.loaded * 100) / (progressEvent.total || file.size));
          onProgress(pct);
        },
      });
      return { message: 'success' };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  // Self
  public async getSelf(): Promise<{message: string, error?: string, user?: IUser, assignments?: ITeamAssignment[]}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; user?: IUser; assignments?: ITeamAssignment[] }>('/self');
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async updateSelf(data: IProfileUpdate): Promise<{message: string, error?: string, user?: IUser}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.patch<{ message: string; error?: string; user?: IUser }>('/self', data);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async getPresignedSelfAvatarUploadUrl(filename: string, contentType: string): Promise<{ message: string, error?: string, uploadUrl?: string, key?: string, fileUrl?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; uploadUrl?: string; key?: string; fileUrl?: string }>('/self/picture/presign', { params: { filename, contentType }});
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async uploadSelfAvatar(file: File, onProgress?: (pct: number) => void): Promise<{message: string, error?: string, fileUrl?: string}> {
    const presign = await this.getPresignedSelfAvatarUploadUrl(file.name, file.type);
    if (presign.error || !presign.uploadUrl) {
      return presign;
    }
    const uploadResult = await this.uploadFileToPresignedUrl(file , presign.uploadUrl, onProgress);
    if (uploadResult.error) {
      return uploadResult;
    }
    return { message: 'success', fileUrl: presign.fileUrl };
  }

  // Teams
  public async listTeams(filter: ITeamFilterOption): Promise<{message: string, error?: string, count?: number, hasMore?: boolean, items?: ITeam[], nextToken?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; count?: number; hasMore?: boolean; items?: ITeam[]; nextToken?: string }>('/teams', { params: filter });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async getTeam(id: string): Promise<{message: string, error?: string, team?: ITeam, teamSettings?: ITeamSettings}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; team?: ITeam; teamSettings?: ITeamSettings }>(`/teams/${id}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async createTeam(data: { name: string }): Promise<{message: string, error?: string, team?: ITeam}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.post<{ message: string; error?: string; team?: ITeam }>('/teams', data);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async updateTeam(id: string, data: { name?: string; status?: string; tenantId?: string }): Promise<{ message: string, error?: string, team?: ITeam}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.patch<{ message: string; error?: string; team?: ITeam }>(`/teams/${id}`, data);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async deleteTeam(id: string): Promise<{ message: string, error?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.delete<{ message: string; error?: string }>(`/teams/${id}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async updateTeamSettings(teamId: string, settings: Partial<ITeamSettings>): Promise<{ message: string, error?: string, teamSettings?: ITeamSettings}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.patch<{ message: string; error?: string; teamSettings?: ITeamSettings }>(`/teams/${teamId}/settings`, settings);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async getPresignedTeamAvatarUploadUrl(teamId: string, filename: string, contentType: string): Promise<{ message: string, error?: string, uploadUrl?: string, key?: string, fileUrl?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; uploadUrl?: string; key?: string; fileUrl?: string }>(`/teams/${teamId}/picture/presign`, { params: { filename, contentType }});
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async uploadTeamAvatar(teamId: string, file: File, onProgress?: (pct: number) => void): Promise<{message: string, error?: string, fileUrl?: string}> {
    const presign = await this.getPresignedTeamAvatarUploadUrl(teamId, file.name, file.type);
    if (presign.error || !presign.uploadUrl) {
      return presign;
    }
    const uploadResult = await this.uploadFileToPresignedUrl(file , presign.uploadUrl, onProgress);
    if (uploadResult.error) {
      return uploadResult;
    }
    return { message: 'success', fileUrl: presign.fileUrl };
  }

  public async listTeamInvites(teamId: string, filter?: ITeamInviteFilterOption): Promise<{ message: string, error?: string, count?: number, items?: IInvite[], nextToken?: string, hasMore?: boolean }> {
    try {
      const normFilter = { ...(filter || {}), limit: filter?.limit ?? 10, sortOrder: filter?.sortOrder ?? 'asc', sortBy: filter?.sortBy } as ITeamInviteFilterOption;
      const data = await this.requestDeduped<{ message: string; error?: string; count?: number; items?: IInvite[]; nextToken?: string; hasMore?: boolean }>('GET', `/teams/${teamId}/invites`, async () => {
        await this.ensureEndpoints();
        const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; count?: number; items?: IInvite[]; nextToken?: string; hasMore?: boolean }>(`/teams/${teamId}/invites`, { params: normFilter });
        const unwrapped = response.data;
        return { data: unwrapped };
      }, normFilter as unknown as Record<string, unknown>, 1000);
      return data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  // Users
  public async fetchUsers(filter?: IUserFilterOption): Promise<{message: string, error?: string, paginationToken?: string, users?: IUser[]}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; paginationToken?: string; users?: IUser[] }>(`/users`, { params: filter });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async getUser(id: string): Promise<{message: string, error?: string, user?: IUser, memberships?: ITeamMember[]}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; user?: IUser; memberships?: ITeamMember[] }>(`/users/${id}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async deleteUser(id: string): Promise<{ message: string, error?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.delete<{ message: string; error?: string }>(`/users/${id}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async updateUser(id: string, data: IUserUpdate): Promise<{ message: string, error?: string, user?: IUser}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.patch<{ message: string; error?: string; user?: IUser }>(`/users/${id}`, data);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async deleteMembership(id: string, teamId: string): Promise<{ message: string, error?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.delete<{ message: string; error?: string }>(`/teams/${teamId}/members/${id}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async updateMembership(id: string, teamId: string, role: string, status: string): Promise<{ message: string, error?: string, teamMember?: ITeamMember}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.patch<{ message: string; error?: string; teamMember?: ITeamMember }>(`/teams/${teamId}/members/${id}`, { role, status });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async createMembership(teamId: string, userId: string, role: string): Promise<{ message: string, error?: string, teamMember?: ITeamMember}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.post<{ message: string; error?: string; teamMember?: ITeamMember }>(`/teams/${teamId}/members`, { role, userId });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  // Invites
  public async completeInvite(token: string, email: string, accepted: boolean): Promise<{ message: string, error?: string, member?: ITeamMember, invite?: IInvite, userCreated?: boolean, temporaryPassword?: string}> {
    try {
      await this.ensureEndpoints(false);
      const response = await VolleyGoalsAPIV1.endpoint.post<{ message: string; error?: string; member?: ITeamMember; invite?: IInvite; userCreated?: boolean; temporaryPassword?: string }>(`/invites/complete`, { token, email, accepted });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async getInvite(token: string): Promise<{ message: string, error?: string, invite?: IInvite}> {
    try {
      await this.ensureEndpoints(false);
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; invite?: IInvite }>(`/invites/${token}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async createInvite(teamId: string, email: string, role: RoleType, message: string, sendEmail: boolean): Promise<{ message: string, error?: string, invite?: IInvite}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.post<{ message: string; error?: string; invite?: IInvite }>(`/invites`, { teamId, email, role, message, sendEmail });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async resendInvite(inviteId: string): Promise<{ message: string, error?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.patch<{ message: string; error?: string }>(`/invites/${inviteId}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async revokeInvite(inviteId: string): Promise<{ message: string, error?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.delete<{ message: string; error?: string }>(`/invites/${inviteId}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  // Team Members
  public async listTeamMembers(teamId: string, filter?: ITeamMemberFilterOption): Promise<{ message: string, error?: string, count?: number, items?: ITeamUser[] }> {
    try {
      const normFilter = { ...(filter || {}), limit: filter?.limit ?? 10, sortOrder: filter?.sortOrder ?? 'asc', sortBy: filter?.sortBy };
      const data = await this.requestDeduped<{ message: string; error?: string; count?: number; items?: ITeamUser[] }>('GET', `/teams/${teamId}/members`, async () => {
        await this.ensureEndpoints();
        const response = await VolleyGoalsAPIV1.endpoint.get(`/teams/${teamId}/members`, { params: normFilter });
        const unwrapped = response.data;
        return { data: unwrapped };
      }, normFilter as unknown as Record<string, unknown>, 1000);
      return data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  // Seasons
  public async listSeasons(filter: ISeasonFilterOption): Promise<{ message: string, error?: string, count?: number, items?: ISeason[], nextToken?: string, hasMore?: boolean}> {
    try {
      await this.ensureEndpoints();
      const normFilter = { ...(filter || {}), limit: filter?.limit ?? 10, sortOrder: filter?.sortOrder ?? 'asc', sortBy: filter?.sortBy } as ISeasonFilterOption;
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; count?: number; items?: ISeason[]; nextToken?: string; hasMore?: boolean }>(`/seasons`, { params: normFilter });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async getSeason(id: string): Promise<{message: string, error?: string, season?: ISeason}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; season?: ISeason }>(`/seasons/${id}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async createSeason(data: {teamId: string, name: string, startDate: string, endDate: string}): Promise<{message: string, error?: string, season?: ISeason}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.post<{ message: string; error?: string; season?: ISeason }>(`/seasons`, data);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async updateSeason(id: string, data: Partial<{name: string, startDate: string, endDate: string, status: SeasonStatus}>): Promise<{ message: string, error?: string, season?: ISeason}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.patch<{ message: string; error?: string; season?: ISeason }>(`/seasons/${id}`, data);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async deleteSeason(id: string): Promise<{ message: string, error?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.delete<{ message: string; error?: string }>(`/seasons/${id}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async getSeasonStats(seasonId: string): Promise<{
    message: string; error?: string;
    stats?: { goalCount: number; completedGoalCount: number; reportCount: number; memberCount: number };
  }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; stats?: { goalCount: number; completedGoalCount: number; reportCount: number; memberCount: number } }>(`/seasons/${seasonId}/stats`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  // Goals
  public async listGoals(teamId: string, filter: IGoalFilterOption): Promise<{ message: string, error?: string, count?: number, items?: IGoal[], nextToken?: string, hasMore?: boolean}> {
    try {
      await this.ensureEndpoints();
      const normFilter = { ...(filter || {}), limit: filter?.limit ?? 10, sortOrder: filter?.sortOrder ?? 'asc', sortBy: filter?.sortBy } as IGoalFilterOption;
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; count?: number; items?: IGoal[]; nextToken?: string; hasMore?: boolean }>(`/teams/${teamId}/goals`, { params: normFilter });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async getGoal(teamId: string, id: string): Promise<{message: string, error?: string, goal?: IGoal}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; goal?: IGoal }>(`/teams/${teamId}/goals/${id}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async createGoal(teamId: string, data: {type: GoalType, title: string, description: string}): Promise<{message: string, error?: string, goal?: IGoal}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.post<{ message: string; error?: string; goal?: IGoal }>(`/teams/${teamId}/goals`, data);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async updateGoal(teamId: string, id: string, data: Partial<{title: string, description: string, status: GoalStatus, ownerId: string}>): Promise<{ message: string, error?: string, goal?: IGoal}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.put<{ message: string; error?: string; goal?: IGoal }>(`/teams/${teamId}/goals/${id}`, data);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async deleteGoal(teamId: string, id: string): Promise<{ message: string, error?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.delete<{ message: string; error?: string }>(`/teams/${teamId}/goals/${id}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async uploadGoalPicture(teamId: string, goalId: string, data: { filename: string; contentType: string }): Promise<{ message: string, error?: string, fileUrl?: string }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.post<{ message: string; error?: string; fileUrl?: string }>(`/teams/${teamId}/goals/${goalId}/picture`, data);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async tagGoalToSeason(teamId: string, goalId: string, seasonId: string): Promise<{ message: string, error?: string }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.post<{ message: string; error?: string }>(`/teams/${teamId}/goals/${goalId}/seasons/${seasonId}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async untagGoalFromSeason(teamId: string, goalId: string, seasonId: string): Promise<{ message: string, error?: string }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.delete<{ message: string; error?: string }>(`/teams/${teamId}/goals/${goalId}/seasons/${seasonId}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async listGoalSeasons(teamId: string, goalId: string): Promise<{ message: string, error?: string, items?: IGoalSeasonTag[] }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; items?: IGoalSeasonTag[] }>(`/teams/${teamId}/goals/${goalId}/seasons`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  // Progress Reports
  public async listProgressReports(seasonId: string, filter: IProgressReportFilterOption): Promise<{ message: string, error?: string, count?: number, items?: IProgressReport[], nextToken?: string, hasMore?: boolean }> {
    try {
      await this.ensureEndpoints();
      const normFilter = { ...(filter || {}), limit: filter?.limit ?? 10, sortOrder: filter?.sortOrder ?? 'asc' };
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; count?: number; items?: IProgressReport[]; nextToken?: string; hasMore?: boolean }>(`/seasons/${seasonId}/progress-reports`, { params: normFilter });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async getProgressReport(seasonId: string, reportId: string): Promise<{ message: string, error?: string, progressReport?: IProgressReport }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; progressReport?: IProgressReport }>(`/seasons/${seasonId}/progress-reports/${reportId}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async createProgressReport(seasonId: string, data: { summary: string, details: string, progress?: { goalId: string, rating: number, details?: string }[] }): Promise<{ message: string, error?: string, progressReport?: IProgressReport }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.post<{ message: string; error?: string; progressReport?: IProgressReport }>(`/seasons/${seasonId}/progress-reports`, data);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async updateProgressReport(seasonId: string, reportId: string, data: Partial<{ summary: string, details: string, progress: { goalId: string, rating: number, details?: string }[] }>): Promise<{ message: string, error?: string, progressReport?: IProgressReport }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.patch<{ message: string; error?: string; progressReport?: IProgressReport }>(`/seasons/${seasonId}/progress-reports/${reportId}`, data);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async deleteProgressReport(seasonId: string, reportId: string): Promise<{ message: string, error?: string }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.delete<{ message: string; error?: string }>(`/seasons/${seasonId}/progress-reports/${reportId}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  // Comments
  public async listComments(filter: ICommentFilterOption): Promise<{ message: string, error?: string, count?: number, items?: IComment[], nextToken?: string, hasMore?: boolean }> {
    try {
      await this.ensureEndpoints();
      const normFilter = { ...(filter || {}), limit: filter?.limit ?? 20 };
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; count?: number; items?: IComment[]; nextToken?: string; hasMore?: boolean }>(`/comments`, { params: normFilter });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async createComment(data: { commentType: string, targetId: string, content: string }): Promise<{ message: string, error?: string, comment?: IComment }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.post<{ message: string; error?: string; comment?: IComment }>(`/comments`, data);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async updateComment(commentId: string, content: string): Promise<{ message: string, error?: string, comment?: IComment }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.patch<{ message: string; error?: string; comment?: IComment }>(`/comments/${commentId}`, { content });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async deleteComment(commentId: string): Promise<{ message: string, error?: string }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.delete<{ message: string; error?: string }>(`/comments/${commentId}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async getPresignedCommentFileUploadUrl(commentId: string, filename: string, contentType: string): Promise<{ message: string, error?: string, uploadUrl?: string, commentFile?: ICommentFile }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; uploadUrl?: string; commentFile?: ICommentFile }>(`/comments/${commentId}/file/presign`, { params: { filename, contentType } });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  // Team Activity Feed
  public async getTeamActivity(teamId: string, filter?: { limit?: number; nextToken?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }): Promise<{ message: string, error?: string, items?: IActivityEntry[], nextToken?: string, hasMore?: boolean }> {
    try {
      await this.ensureEndpoints();
      const params: Record<string, unknown> = { limit: filter?.limit ?? 20 };
      if (filter?.nextToken) params.nextToken = filter.nextToken;
      if (filter?.sortBy) params.sortBy = filter.sortBy;
      if (filter?.sortOrder) params.sortOrder = filter.sortOrder;
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; items?: IActivityEntry[]; nextToken?: string; hasMore?: boolean }>(`/teams/${teamId}/activity`, { params });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  // Leave current team
  public async leaveTeam(teamId: string): Promise<{ message: string, error?: string }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.delete<{ message: string; error?: string }>(`/teams/${teamId}/members/leave`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  // ─── Tenants ─────────────────────────────────────────────────────────────────

  public async createTenant(name: string): Promise<{ message: string; error?: string; tenant?: ITenant }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.post<{ message: string; error?: string; tenant?: ITenant }>(`/tenants`, { name });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async listTenants(filter?: { limit?: number; nextToken?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }): Promise<{ message: string; error?: string; items?: ITenant[]; count?: number; nextToken?: string; hasMore?: boolean }> {
    try {
      await this.ensureEndpoints();
      const params: Record<string, unknown> = { limit: filter?.limit ?? 50 };
      if (filter?.nextToken) params.nextToken = filter.nextToken;
      if (filter?.sortBy) params.sortBy = filter.sortBy;
      if (filter?.sortOrder) params.sortOrder = filter.sortOrder;
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; items?: ITenant[]; count?: number; nextToken?: string; hasMore?: boolean }>(`/tenants`, { params });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async getTenant(id: string): Promise<{ message: string; error?: string; tenant?: ITenant }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; tenant?: ITenant }>(`/tenants/${id}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async updateTenant(id: string, name: string): Promise<{ message: string; error?: string; tenant?: ITenant }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.patch<{ message: string; error?: string; tenant?: ITenant }>(`/tenants/${id}`, { name });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async deleteTenant(id: string): Promise<{ message: string; error?: string }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.delete<{ message: string; error?: string }>(`/tenants/${id}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async addTenantMember(tenantId: string, userId: string, role: 'admin' | 'member'): Promise<{ message: string; error?: string; member?: ITenantMember }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.post<{ message: string; error?: string; member?: ITenantMember }>(`/tenants/${tenantId}/members`, { userId, role });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async listTenantMembers(tenantId: string, filter?: { limit?: number; nextToken?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }): Promise<{ message: string; error?: string; items?: ITenantMember[]; count?: number; nextToken?: string; hasMore?: boolean }> {
    try {
      await this.ensureEndpoints();
      const params: Record<string, unknown> = { limit: filter?.limit ?? 50 };
      if (filter?.nextToken) params.nextToken = filter.nextToken;
      if (filter?.sortBy) params.sortBy = filter.sortBy;
      if (filter?.sortOrder) params.sortOrder = filter.sortOrder;
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; items?: ITenantMember[]; count?: number; nextToken?: string; hasMore?: boolean }>(`/tenants/${tenantId}/members`, { params });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async removeTenantMember(tenantId: string, memberId: string): Promise<{ message: string; error?: string }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.delete<{ message: string; error?: string }>(`/tenants/${tenantId}/members/${memberId}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async listTenantedTeams(tenantId: string, filter?: { limit?: number; nextToken?: string; sortBy?: string; sortOrder?: 'asc' | 'desc'; name?: string; status?: string }): Promise<{ message: string; error?: string; items?: ITeam[]; count?: number; nextToken?: string; hasMore?: boolean }> {
    try {
      await this.ensureEndpoints();
      const params: Record<string, unknown> = { limit: filter?.limit ?? 50 };
      if (filter?.nextToken) params.nextToken = filter.nextToken;
      if (filter?.sortBy) params.sortBy = filter.sortBy;
      if (filter?.sortOrder) params.sortOrder = filter.sortOrder;
      if (filter?.name) params.name = filter.name;
      if (filter?.status) params.status = filter.status;
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; items?: ITeam[]; count?: number; nextToken?: string; hasMore?: boolean }>(`/tenants/${tenantId}/teams`, { params });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async listRoleDefinitions(tenantId: string): Promise<{ message: string; error?: string; items?: IRoleDefinition[] }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; items?: IRoleDefinition[] }>(`/tenants/${tenantId}/roles`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async createRoleDefinition(tenantId: string, name: string, permissions: string[]): Promise<{ message: string; error?: string; roleDefinition?: IRoleDefinition }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.post<{ message: string; error?: string; roleDefinition?: IRoleDefinition }>(`/tenants/${tenantId}/roles`, { name, permissions });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async updateRoleDefinition(tenantId: string, roleId: string, permissions: string[]): Promise<{ message: string; error?: string; roleDefinition?: IRoleDefinition }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.patch<{ message: string; error?: string; roleDefinition?: IRoleDefinition }>(`/tenants/${tenantId}/roles/${roleId}`, { permissions });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async deleteRoleDefinition(tenantId: string, roleId: string): Promise<{ message: string; error?: string }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.delete<{ message: string; error?: string }>(`/tenants/${tenantId}/roles/${roleId}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async listOwnershipPolicies(tenantId: string): Promise<{ message: string; error?: string; items?: IOwnershipPolicy[] }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; items?: IOwnershipPolicy[] }>(`/tenants/${tenantId}/ownership-policies`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  // Resource definitions (server-controlled metadata for resources/actions/relations)
  public async getResourceDefinitions(): Promise<{ message: string; error?: string; items?: { id: string; name: string; description?: string; actions?: string[]; allowedChildResources?: string[] }[] }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; items?: { id: string; name: string; description?: string; actions?: string[]; allowedChildResources?: string[] }[] }>(`/resource-definitions`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  // Combined resource model for a tenant if backend supports it (resourceDefinitions + policies)
  public async getTenantResourceModel(tenantId: string): Promise<{ message: string; error?: string; resourceDefinitions?: any[]; policies?: IOwnershipPolicy[] }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get<{ message: string; error?: string; resourceDefinitions?: any[]; policies?: IOwnershipPolicy[] }>(`/tenants/${tenantId}/resource-model`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async updateOwnershipPolicy(tenantId: string, resourceType: string, ownerPermissions: string[], parentOwnerPermissions: string[]): Promise<{ message: string; error?: string; policy?: IOwnershipPolicy }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.patch<{ message: string; error?: string; policy?: IOwnershipPolicy }>(`/tenants/${tenantId}/ownership-policies/${resourceType}`, { ownerPermissions, parentOwnerPermissions });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  /**
   * Preview effective permissions for a resource instance in a tenant.
   * POST /tenants/{tenantId}/ownership-policies/preview
   * Body: { resourceType: string, instanceId?: string }
   */
  public async previewOwnershipPermissions(tenantId: string, body: { resourceType: string; instanceId?: string }): Promise<any> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.post(`/tenants/${tenantId}/ownership-policies/preview`, body);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async createTenantedTeam(tenantId: string, name: string): Promise<{ message: string; error?: string; team?: ITeam }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.post<{ message: string; error?: string; team?: ITeam }>(`/tenants/${tenantId}/teams`, { name });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }
}

export default VolleyGoalsAPIV1.getInstance();
