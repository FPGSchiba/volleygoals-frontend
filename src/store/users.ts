import {ITeamMember, IUser, IUserUpdate} from "./types";
import {create} from "zustand";
import {IUserFilterOption} from "../services/types";
import VolleyGoalsAPI from "../services/backend.api";
import {useNotificationStore} from "./notification";
import i18next from "i18next";

type UsersState = {
  userList: {
    users?: IUser[];
    paginationToken?: string;
    filter?: IUserFilterOption
  }
  currentUser?: IUser;
  currentUserMemberships?: ITeamMember[];
}

type UsersActions = {
  fetchUsers: (filter?: IUserFilterOption) => Promise<void>;
  getUser: (id: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateUser: (id: string, userData: IUserUpdate) => Promise<void>;
  deleteMembership: (id: string, teamId: string) => Promise<void>;
  updateMembership: (id: string, teamId: string, role: string, status: string) => Promise<void>;
  createMembership: (teamId: string, userId: string, role: string) => Promise<void>;
}

const useUsersStore = create<UsersState & UsersActions>((set, get) => ({
  userList: [],
  currentUser: undefined,
  currentUserMemberships: undefined,
  fetchUsers: (async (filter?: IUserFilterOption) => {
    const response = await VolleyGoalsAPI.fetchUsers(filter);
    if (response.users) {
      set(() => ({
        userList: {
          users: response.users,
          paginationToken: response.paginationToken,
          filter: filter
        }
      }));
    } else{
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while creating the team."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    }
  }),
  getUser: (async (id: string) => {
    const response = await VolleyGoalsAPI.getUser(id);
    if (response.user) {
      set(() => ({
        currentUser: response.user,
        currentUserMemberships: response.memberships
      }));
    } else {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while creating the team."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    }
  }),
  deleteUser: (async (id: string) => {
    const response = await VolleyGoalsAPI.deleteUser(id);
    if (response.error) {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while creating the team."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    } else {
      await get().fetchUsers(get().userList.filter);
    }
  }),
  updateUser: async (id: string, userData: IUserUpdate) => {
    const response = await VolleyGoalsAPI.updateUser(id, userData);
    if (response.error) {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while creating the team."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    } else if (response.user) {
      set(() => ({
        currentUser: response.user
      }));
      await get().fetchUsers(get().userList.filter);
    }
  },
  deleteMembership: async (id: string, teamId: string) => {
    const response = await VolleyGoalsAPI.deleteMembership(id, teamId);
    if (response.error) {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while creating the team."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    } else {
      set((state) => {
        const updatedMemberships = state.currentUserMemberships?.filter((m) => !(m.id === id && m.teamId === teamId));
        return {
          currentUserMemberships: updatedMemberships
        };
      });
    }
  },
  updateMembership: async (id: string, teamId: string, role: string, status: string) => {
    const response = await VolleyGoalsAPI.updateMembership(id, teamId, role, status);
    if (response.error) {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while creating the team."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    } else {
      set((state) => {
        const updatedMemberships = state.currentUserMemberships?.map((m) => {
          if (m.id === id && m.teamId === teamId) {
            return {
              ...m,
              role: role as unknown as ITeamMember['role'],
              status: status as unknown as ITeamMember['status']
            } as ITeamMember;
          }
          return m;
        });
        return {
          currentUserMemberships: updatedMemberships
        };
      });
    }
  },
  createMembership: async (teamId: string, userId: string, role: string) => {
    const response = await VolleyGoalsAPI.createMembership(teamId, userId, role);
    if (response.error) {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while creating the team."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    } else if (response.teamMember) {
      set((state) => ({
        currentUserMemberships: [...(state.currentUserMemberships || []), response.teamMember as ITeamMember]
      }));
    }
  }
}))

export {useUsersStore}
