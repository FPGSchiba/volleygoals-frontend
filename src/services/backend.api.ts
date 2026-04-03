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
  IProgressReport, IComment, ICommentFile, IActivityEntry, IGoalSeasonTag
} from "../store/types";
import {JWT} from "@aws-amplify/auth";

class VolleyGoalsAPI {
  protected static endpoint: AxiosInstance;
  private static inflight = new Map<string, Promise<unknown>>();
  private static cache = new Map<string, { value: unknown; expiresAt?: number }>();
  private token: string | undefined;
  private static instance: VolleyGoalsAPI;

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

  private static unwrap<T>(envelope: { message: string; data: T }): T {
    return envelope.data;
  }

  static getInstance(): VolleyGoalsAPI {
    if (!VolleyGoalsAPI.instance) {
      VolleyGoalsAPI.instance = new VolleyGoalsAPI().init();
    }
    return VolleyGoalsAPI.instance;
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
    VolleyGoalsAPI.endpoint = this.createAxiosInstance(userApiHost + apiPathRoot);
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
    while (!VolleyGoalsAPI.endpoint && Date.now() < deadline) {
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
      if (this.token && VolleyGoalsAPI.endpoint) {
        VolleyGoalsAPI.endpoint.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
      }
    }

    // Final attempt to initialize endpoints if still missing
    if (!VolleyGoalsAPI.endpoint) {
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
      VolleyGoalsAPI.endpoint,
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
    const key = VolleyGoalsAPI.makeKey(method, path, keyParams);

    // check cache
    const cached = VolleyGoalsAPI.cache.get(key);
    if (cached && cached.expiresAt && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    // only dedupe GET
    if (method !== 'GET') {
      const resp = await axiosFn();
      return resp.data as T;
    }

    const inflight = VolleyGoalsAPI.inflight.get(key);
    if (inflight) return inflight as Promise<T>;

    const p = (async () => {
      try {
        try {
          const resp = await axiosFn();
          const data = resp.data as T;
          if (ttlMs && ttlMs > 0) {
            VolleyGoalsAPI.cache.set(key, { value: data, expiresAt: Date.now() + ttlMs });
          }
          return data;
        } catch (err: unknown) {
          // Standardize error response shape so callers receive the same structure
          const extracted = VolleyGoalsAPI.extractError(err);
          const errorResp = {
            message: extracted.message,
            error: extracted.error,
          } as unknown as T;
          if (ttlMs && ttlMs > 0) {
            VolleyGoalsAPI.cache.set(key, { value: errorResp, expiresAt: Date.now() + ttlMs });
          }
          return errorResp;
        }
      } finally {
        VolleyGoalsAPI.inflight.delete(key);
      }
    })();

    VolleyGoalsAPI.inflight.set(key, p);
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
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  // Self
  public async getSelf(): Promise<{message: string, error?: string, user?: IUser, assignments?: ITeamAssignment[]}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.get('/self');
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async updateSelf(data: IProfileUpdate): Promise<{message: string, error?: string, user?: IUser}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.patch('/self', data);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async getPresignedSelfAvatarUploadUrl(filename: string, contentType: string): Promise<{ message: string, error?: string, uploadUrl?: string, key?: string, fileUrl?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.get('/self/picture/presign', { params: { filename, contentType }});
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
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
      const response = await VolleyGoalsAPI.endpoint.get('/teams', { params: filter });
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async getTeam(id: string): Promise<{message: string, error?: string, team?: ITeam, teamSettings?: ITeamSettings}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.get(`/teams/${id}`);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async createTeam(data: { name: string }): Promise<{message: string, error?: string, team?: ITeam}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.post('/teams', data);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async updateTeam(id: string, data: { name?: string; status?: string }): Promise<{ message: string, error?: string, team?: ITeam}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.patch(`/teams/${id}`, data);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async deleteTeam(id: string): Promise<{ message: string, error?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.delete(`/teams/${id}`);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async updateTeamSettings(teamId: string, settings: Partial<ITeamSettings>): Promise<{ message: string, error?: string, teamSettings?: ITeamSettings}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.patch(`/teams/${teamId}/settings`, settings);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async getPresignedTeamAvatarUploadUrl(teamId: string, filename: string, contentType: string): Promise<{ message: string, error?: string, uploadUrl?: string, key?: string, fileUrl?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.get(`/teams/${teamId}/picture/presign`, { params: { filename, contentType }});
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
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
        const response = await VolleyGoalsAPI.endpoint.get(`/teams/${teamId}/invites`, { params: normFilter });
        const unwrapped = { ...VolleyGoalsAPI.unwrap<{ error?: string; count?: number; items?: IInvite[]; nextToken?: string; hasMore?: boolean }>(response.data), message: response.data.message };
        return { data: unwrapped };
      }, normFilter as unknown as Record<string, unknown>, 1000);
      return data;
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  // Users
  public async fetchUsers(filter?: IUserFilterOption): Promise<{message: string, error?: string, paginationToken?: string, users?: IUser[]}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.get('/users', { params: filter });
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async getUser(id: string): Promise<{message: string, error?: string, user?: IUser, memberships?: ITeamMember[]}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.get(`/users/${id}`);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async deleteUser(id: string): Promise<{ message: string, error?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.delete(`/users/${id}`);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async updateUser(id: string, data: IUserUpdate): Promise<{ message: string, error?: string, user?: IUser}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.patch(`/users/${id}`, data);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async deleteMembership(id: string, teamId: string): Promise<{ message: string, error?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.delete(`/teams/${teamId}/members/${id}`);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async updateMembership(id: string, teamId: string, role: string, status: string): Promise<{ message: string, error?: string, teamMember?: ITeamMember}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.patch(`/teams/${teamId}/members/${id}`, { role, status });
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async createMembership(teamId: string, userId: string, role: string): Promise<{ message: string, error?: string, teamMember?: ITeamMember}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.post(`/teams/${teamId}/members`, { role, userId });
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  // Invites
  public async completeInvite(token: string, email: string, accepted: boolean): Promise<{ message: string, error?: string, member?: ITeamMember, invite?: IInvite, userCreated?: boolean, temporaryPassword?: string}> {
    try {
      await this.ensureEndpoints(false);
      const response = await VolleyGoalsAPI.endpoint.post('/invites/complete', { token, email, accepted });
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async getInvite(token: string): Promise<{ message: string, error?: string, invite?: IInvite}> {
    try {
      await this.ensureEndpoints(false);
      const response = await VolleyGoalsAPI.endpoint.get(`/invites/${token}`);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async createInvite(teamId: string, email: string, role: RoleType, message: string, sendEmail: boolean): Promise<{ message: string, error?: string, invite?: IInvite}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.post(`/invites`, { teamId, email, role, message, sendEmail });
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async resendInvite(inviteId: string): Promise<{ message: string, error?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.patch(`/invites/${inviteId}`);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async revokeInvite(inviteId: string): Promise<{ message: string, error?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.delete(`/invites/${inviteId}`);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  // Team Members
  public async listTeamMembers(teamId: string, filter?: ITeamMemberFilterOption): Promise<{ message: string, error?: string, count?: number, items?: ITeamUser[] }> {
    try {
      const normFilter = { ...(filter || {}), limit: filter?.limit ?? 10, sortOrder: filter?.sortOrder ?? 'asc', sortBy: filter?.sortBy };
      const data = await this.requestDeduped<{ message: string; error?: string; count?: number; items?: ITeamUser[] }>('GET', `/teams/${teamId}/members`, async () => {
        await this.ensureEndpoints();
        const response = await VolleyGoalsAPI.endpoint.get(`/teams/${teamId}/members`, { params: normFilter });
        const unwrapped = { ...VolleyGoalsAPI.unwrap<{ error?: string; count?: number; items?: ITeamUser[] }>(response.data), message: response.data.message };
        return { data: unwrapped };
      }, normFilter as unknown as Record<string, unknown>, 1000);
      return data;
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  // Seasons
  public async listSeasons(filter: ISeasonFilterOption): Promise<{ message: string, error?: string, count?: number, items?: ISeason[], nextToken?: string, hasMore?: boolean}> {
    try {
      await this.ensureEndpoints();
      const normFilter = { ...(filter || {}), limit: filter?.limit ?? 10, sortOrder: filter?.sortOrder ?? 'asc', sortBy: filter?.sortBy } as ISeasonFilterOption;
      const response = await VolleyGoalsAPI.endpoint.get(`/seasons`, { params: normFilter });
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async getSeason(id: string): Promise<{message: string, error?: string, season?: ISeason}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.get(`/seasons/${id}`);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async createSeason(data: {teamId: string, name: string, startDate: string, endDate: string}): Promise<{message: string, error?: string, season?: ISeason}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.post('/seasons', data);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async updateSeason(id: string, data: Partial<{name: string, startDate: string, endDate: string, status: SeasonStatus}>): Promise<{ message: string, error?: string, season?: ISeason}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.patch(`/seasons/${id}`, data);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async deleteSeason(id: string): Promise<{ message: string, error?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.delete(`/seasons/${id}`);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async getSeasonStats(seasonId: string): Promise<{
    message: string; error?: string;
    stats?: { goalCount: number; completedGoalCount: number; reportCount: number; memberCount: number };
  }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.get(`/seasons/${seasonId}/stats`);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  // Goals
  public async listGoals(teamId: string, filter: IGoalFilterOption): Promise<{ message: string, error?: string, count?: number, items?: IGoal[], nextToken?: string, hasMore?: boolean}> {
    try {
      await this.ensureEndpoints();
      const normFilter = { ...(filter || {}), limit: filter?.limit ?? 10, sortOrder: filter?.sortOrder ?? 'asc', sortBy: filter?.sortBy } as IGoalFilterOption;
      const response = await VolleyGoalsAPI.endpoint.get(`/teams/${teamId}/goals`, { params: normFilter });
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async getGoal(teamId: string, id: string): Promise<{message: string, error?: string, goal?: IGoal}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.get(`/teams/${teamId}/goals/${id}`);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async createGoal(teamId: string, data: {type: GoalType, title: string, description: string}): Promise<{message: string, error?: string, goal?: IGoal}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.post(`/teams/${teamId}/goals`, data);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async updateGoal(teamId: string, id: string, data: Partial<{title: string, description: string, status: GoalStatus, ownerId: string}>): Promise<{ message: string, error?: string, goal?: IGoal}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.put(`/teams/${teamId}/goals/${id}`, data);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async deleteGoal(teamId: string, id: string): Promise<{ message: string, error?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.delete(`/teams/${teamId}/goals/${id}`);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async uploadGoalPicture(teamId: string, goalId: string, data: { filename: string; contentType: string }): Promise<{ message: string, error?: string, fileUrl?: string }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.post(`/teams/${teamId}/goals/${goalId}/picture`, data);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async tagGoalToSeason(teamId: string, goalId: string, seasonId: string): Promise<{ message: string, error?: string }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.post(`/teams/${teamId}/goals/${goalId}/seasons/${seasonId}`);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async untagGoalFromSeason(teamId: string, goalId: string, seasonId: string): Promise<{ message: string, error?: string }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.delete(`/teams/${teamId}/goals/${goalId}/seasons/${seasonId}`);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async listGoalSeasons(teamId: string, goalId: string): Promise<{ message: string, error?: string, items?: IGoalSeasonTag[] }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.get(`/teams/${teamId}/goals/${goalId}/seasons`);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  // Progress Reports
  public async listProgressReports(seasonId: string, filter: IProgressReportFilterOption): Promise<{ message: string, error?: string, count?: number, items?: IProgressReport[], nextToken?: string, hasMore?: boolean }> {
    try {
      await this.ensureEndpoints();
      const normFilter = { ...(filter || {}), limit: filter?.limit ?? 10, sortOrder: filter?.sortOrder ?? 'asc' };
      const response = await VolleyGoalsAPI.endpoint.get(`/seasons/${seasonId}/progress-reports`, { params: normFilter });
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async getProgressReport(seasonId: string, reportId: string): Promise<{ message: string, error?: string, progressReport?: IProgressReport }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.get(`/seasons/${seasonId}/progress-reports/${reportId}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async createProgressReport(seasonId: string, data: { summary: string, details: string, progress?: { goalId: string, rating: number, details?: string }[] }): Promise<{ message: string, error?: string, progressReport?: IProgressReport }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.post(`/seasons/${seasonId}/progress-reports`, data);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async updateProgressReport(seasonId: string, reportId: string, data: Partial<{ summary: string, details: string, progress: { goalId: string, rating: number, details?: string }[] }>): Promise<{ message: string, error?: string, progressReport?: IProgressReport }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.patch(`/seasons/${seasonId}/progress-reports/${reportId}`, data);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async deleteProgressReport(seasonId: string, reportId: string): Promise<{ message: string, error?: string }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.delete(`/seasons/${seasonId}/progress-reports/${reportId}`);
      return response.data;
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  // Comments
  public async listComments(filter: ICommentFilterOption): Promise<{ message: string, error?: string, count?: number, items?: IComment[], nextToken?: string, hasMore?: boolean }> {
    try {
      await this.ensureEndpoints();
      const normFilter = { ...(filter || {}), limit: filter?.limit ?? 20 };
      const response = await VolleyGoalsAPI.endpoint.get(`/comments`, { params: normFilter });
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async createComment(data: { commentType: string, targetId: string, content: string }): Promise<{ message: string, error?: string, comment?: IComment }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.post(`/comments`, data);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async updateComment(commentId: string, content: string): Promise<{ message: string, error?: string, comment?: IComment }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.patch(`/comments/${commentId}`, { content });
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async deleteComment(commentId: string): Promise<{ message: string, error?: string }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.delete(`/comments/${commentId}`);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  public async getPresignedCommentFileUploadUrl(commentId: string, filename: string, contentType: string): Promise<{ message: string, error?: string, uploadUrl?: string, commentFile?: ICommentFile }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.get(`/comments/${commentId}/file/presign`, { params: { filename, contentType } });
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
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
      const response = await VolleyGoalsAPI.endpoint.get(`/teams/${teamId}/activity`, { params });
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }

  // Leave current team
  public async leaveTeam(teamId: string): Promise<{ message: string, error?: string }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.delete(`/teams/${teamId}/members/leave`);
      return { ...VolleyGoalsAPI.unwrap(response.data), message: response.data.message };
    } catch (reason: unknown) {
      return VolleyGoalsAPI.extractError(reason);
    }
  }
}

export default VolleyGoalsAPI.getInstance();
