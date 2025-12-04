/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosInstance } from "axios";
import https from 'https';
import {
  ITeamFilterOption,
  ITeamInviteFilterOption,
  ITeamMemberFilterOption,
  IUserFilterOption
} from "./types";
import {
  IInvite,
  ITeam,
  ITeamAssignment,
  ITeamMember,
  ITeamSettings, ITeamUser,
  IUser,
  IProfileUpdate, IUserUpdate, RoleType
} from "../store/types";
import {JWT} from "@aws-amplify/auth";

class VolleyGoalsAPI {
  protected static endpoint: AxiosInstance;
  private static inflight = new Map<string, Promise<any>>();
  private static cache = new Map<string, { value: any; expiresAt?: number }>();
  private token: string | undefined;
  private static instance: VolleyGoalsAPI;

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

  private static serializeParams(params: any): string {
    if (!params) return '';
    // stable serialization: sort keys
    const build = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (Array.isArray(obj)) return obj.map(build);
      if (typeof obj === 'object') {
        return Object.keys(obj).sort().reduce((acc: any, key) => {
          acc[key] = build(obj[key]);
          return acc;
        }, {} as any);
      }
      return obj;
    };
    try {
      return JSON.stringify(build(params));
    } catch (e) {
      return String(params);
    }
  }

  private static makeKey(method: string, path: string, params?: any) {
    const p = this.serializeParams(params);
    return `${method.toUpperCase()}|${path}|${p}`;
  }

  private async requestDeduped<T>(method: 'GET'|'POST'|'PATCH'|'DELETE'|'PUT', path: string, axiosFn: () => Promise<any>, params?: any, ttlMs: number = 1000): Promise<T> {
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
        } catch (err: any) {
          // Standardize error response shape so callers receive the same structure
          const errorResp = {
            message: err?.response?.data?.message || err?.message || 'error.internalServerError',
            error: err?.response?.data?.error,
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
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      }
    }
  }

  // Self
  public async getSelf(): Promise<{message: string, error?: string, user?: IUser, assignments?: ITeamAssignment[]}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.get('/self');
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      }
    }
  }

  public async updateSelf(data: IProfileUpdate): Promise<{message: string, error?: string, user?: IUser}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.patch('/self', data);
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      }
    }
  }

  public async getPresignedSelfAvatarUploadUrl(filename: string, contentType: string): Promise<{ message: string, error?: string, uploadUrl?: string, key?: string, fileUrl?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.get('/self/picture/presign', { params: { filename, contentType }});
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      }
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
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      };
    }
  }

  public async getTeam(id: string): Promise<{message: string, error?: string, team?: ITeam, teamSettings?: ITeamSettings}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.get(`/teams/${id}`);
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      };
    }
  }

  public async createTeam(data: any): Promise<{message: string, error?: string, team?: ITeam}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.post('/teams', data);
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      }
    }
  }

  public async updateTeam(id: string, data: any): Promise<{ message: string, error?: string, team?: ITeam}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.patch(`/teams/${id}`, data);
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      }
    }
  }

  public async deleteTeam(id: string): Promise<{ message: string, error?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.delete(`/teams/${id}`);
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      }
    }
  }

  public async updateTeamSettings(teamId: string, settings: Partial<ITeamSettings>): Promise<{ message: string, error?: string, teamSettings?: ITeamSettings}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.patch(`/teams/${teamId}/settings`, settings);
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      }
    }
  }

  public async getPresignedTeamAvatarUploadUrl(teamId: string, filename: string, contentType: string): Promise<{ message: string, error?: string, uploadUrl?: string, key?: string, fileUrl?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.get(`/teams/${teamId}/picture/presign`, { params: { filename, contentType }});
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      }
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
      const data = await this.requestDeduped('GET', `/teams/${teamId}/invites`, async () => {
        await this.ensureEndpoints();
        return VolleyGoalsAPI.endpoint.get(`/teams/${teamId}/invites`, { params: normFilter });
      }, normFilter, 1000);
      return data as any;
    } catch (reason: any) {
      return {
        message: reason?.response?.data?.message || reason?.message || 'error.internalServerError',
        error: reason?.response?.data?.error,
      };
    }
  }

  // Users
  public async fetchUsers(filter?: IUserFilterOption): Promise<{message: string, error?: string, paginationToken?: string, users?: IUser[]}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.get('/users', { params: filter });
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      }
    }
  }

  public async getUser(id: string): Promise<{message: string, error?: string, user?: IUser, memberships?: ITeamMember[]}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.get(`/users/${id}`);
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      }
    }
  }

  public async deleteUser(id: string): Promise<{ message: string, error?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.delete(`/users/${id}`);
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      }
    }
  }

  public async updateUser(id: string, data: IUserUpdate): Promise<{ message: string, error?: string, user?: IUser}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.patch(`/users/${id}`, data);
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      }
    }
  }

  public async deleteMembership(id: string, teamId: string): Promise<{ message: string, error?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.delete(`/teams/${teamId}/members/${id}`);
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      }
    }
  }

  public async updateMembership(id: string, teamId: string, role: string, status: string): Promise<{ message: string, error?: string, teamMember?: ITeamMember}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.patch(`/teams/${teamId}/members/${id}`, { role, status });
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      }
    }
  }

  public async createMembership(teamId: string, userId: string, role: string): Promise<{ message: string, error?: string, teamMember?: ITeamMember}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.post(`/teams/${teamId}/members`, { role, userId });
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      }
    }
  }

  // Invites
  public async completeInvite(token: string, email: string, accepted: boolean): Promise<{ message: string, error?: string, member?: ITeamMember, invite?: IInvite, userCreated?: boolean, temporaryPassword?: string}> {
    try {
      await this.ensureEndpoints(false);
      const response = await VolleyGoalsAPI.endpoint.post('/invites/complete', { token, email, accepted });
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      }
    }
  }

  public async getInvite(token: string): Promise<{ message: string, error?: string, invite?: IInvite}> {
    try {
      await this.ensureEndpoints(false);
      const response = await VolleyGoalsAPI.endpoint.get(`/invites/${token}`);
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      }
    }
  }

  public async createInvite(teamId: string, email: string, role: RoleType, message: string, sendEmail: boolean): Promise<{ message: string, error?: string, invite?: IInvite}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.post(`/invites`, { teamId, email, role, message, sendEmail });
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      }
    }
  }

  public async resendInvite(inviteId: string): Promise<{ message: string, error?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.patch(`/invites/${inviteId}`);
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      }
    }
  }

  public async revokeInvite(inviteId: string): Promise<{ message: string, error?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.delete(`/invites/${inviteId}`);
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      }
    }
  }

  // Team Members
  public async listTeamMembers(teamId: string, filter?: ITeamMemberFilterOption): Promise<{ message: string, error?: string, count?: number, items?: ITeamUser[] }> {
    try {
      // Normalize filter so dedupe keys match (e.g. explicit defaults vs undefined)
      const normFilter = { ...(filter || {}), limit: filter?.limit ?? 10, sortOrder: filter?.sortOrder ?? 'asc', sortBy: filter?.sortBy };
      // Use centralized dedupe for GETs with a short TTL (1s)
      const data = await this.requestDeduped('GET', `/teams/${teamId}/members`, async () => {
        await this.ensureEndpoints();
        return VolleyGoalsAPI.endpoint.get(`/teams/${teamId}/members`, { params: normFilter });
      }, normFilter, 1000);
      return data as any;
    } catch (reason: any) {
      return {
        message: reason?.response?.data?.message || reason?.message || 'error.internalServerError',
        error: reason?.response?.data?.error,
      };
    }
  }
}

export default VolleyGoalsAPI.getInstance();
