import {ITeamMember, IUser} from "./types";
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
}

const useUsersStore = create<UsersState & UsersActions>((set) => ({
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
    }
  }),
}))

export {useUsersStore}
