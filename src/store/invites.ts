import {create} from "zustand";
import VolleyGoalsAPI from "../services/backend.api";
import {useNotificationStore} from "./notification";
import i18next from "i18next";
import {IInvite, ITeamMember} from "./types";
import {InviteErrorType} from "../pages/help/InviteError";

type InvitesState = {
  currentInvite?: {
    invite: IInvite;
    member: ITeamMember;
    userCreated: boolean;
    temporaryPassword?: string;
  }
}

type InvitesActions = {
  completeInvite: (token: string, email: string, accepted: boolean) => Promise<{success: boolean, error?: InviteErrorType}>
  getInvite: (token: string) => Promise<void>
}

const useInvitesStore = create<InvitesState & InvitesActions>((set) => ({
  currentInvite: undefined,
  completeInvite: async (token: string, email: string, accepted: boolean) => {
    const response = await VolleyGoalsAPI.completeInvite(token, email, accepted);
    if (response?.member != null && response?.invite != null && typeof response.userCreated === 'boolean') {
      set({
        currentInvite: {
          invite: response.invite as IInvite,
          member: response.member as ITeamMember,
          userCreated: response.userCreated,
          temporaryPassword: response.temporaryPassword ?? undefined
        }
      });
      return {success: true};
    } else {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while completing your invite."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
      switch (response.message) {
        case 'error.invite.noToken':
          return {success: false, error: InviteErrorType.NoToken};
        case 'error.invite.expired':
          return {success: false, error: InviteErrorType.ExpiredToken};
        case 'error.invite.alreadyCompleted':
          return {success: false, error: InviteErrorType.AlreadyCompleted};
        case 'error.invite.invalidToken':
          return {success: false, error: InviteErrorType.InvalidToken};
        default:
          return {success: false, error: InviteErrorType.UnknownError};
      }
    }
  },
  getInvite: async (token: string) => {
    const response = await VolleyGoalsAPI.getInvite(token);
    if (response?.invite != null) {
      set({
        currentInvite: {
          invite: response.invite as IInvite,
          member: {} as ITeamMember,
          userCreated: false
        }
      });
    } else {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while retrieving the invite."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    }
  }
}))

export {useInvitesStore}
