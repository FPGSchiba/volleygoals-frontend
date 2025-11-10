/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosInstance } from "axios";
import https from 'https';
import {ITeamFilterOption} from "./types";
import {ITeam} from "../store/types";
import {JWT} from "@aws-amplify/auth";

class VolleyGoalsAPI {
  protected static endpoint: AxiosInstance;
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
  private async ensureEndpoints(): Promise<void> {
    const maxWaitMs = 10000;
    const intervalMs = 100;
    const deadline = Date.now() + maxWaitMs;

    console.log("Ensuring VolleyGoalsAPI endpoints are initialized");

    // Ensure endpoints are initialized (retry until deadline)
    while (!VolleyGoalsAPI.endpoint && Date.now() < deadline) {
      this.reloadEndpoints();
      // wait a short period to allow session/token to be loaded
      // eslint-disable-next-line no-await-in-loop
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    console.log("Ensured VolleyGoalsAPI endpoints are initialized");

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

    console.log("Ensured VolleyGoalsAPI token are initialized");

    // If token became available, ensure endpoints carry the header
    if (this.token && VolleyGoalsAPI.endpoint) {
      VolleyGoalsAPI.endpoint.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
      console.log("Token set for VolleyGoalsAPI endpoints");
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

  // Teams
  public async listTeams(filter: ITeamFilterOption): Promise<{message: string, error?: string, count?: number, hasMore?: boolean, items?: ITeam[], nextToken?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.get('/teams', { params: filter });
      return response.data;
    } catch (reason: any) {
      console.log(reason);
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error,
      };
    }
  }

  public async getTeam(id: string): Promise<any> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.get(`/teams/${id}`);
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error || 'No additional error information available',
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
        error: reason.response?.data?.error || 'No additional error information available',
      }
    }
  }

  public async updateTeam(id: string, data: any): Promise<any> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.put(`/teams/${id}`, data);
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error || 'No additional error information available',
      }
    }
  }

  public async deleteTeam(id: string): Promise<any> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPI.endpoint.delete(`/teams/${id}`);
      return response.data;
    } catch (reason: any) {
      return {
        message: reason.response?.data?.message || 'error.internalServerError',
        error: reason.response?.data?.error || 'No additional error information available',
      }
    }
  }
}

export default VolleyGoalsAPI.getInstance();
