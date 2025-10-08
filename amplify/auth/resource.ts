import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    fullname: {
      mutable: true,
      required: true,
    },
    profilePicture: {
      mutable: true,
      required: false,
    }
  },
  groups: ["ADMINS", "TRAINERS", "MEMBERS"],
  multifactor: {
    mode: 'OPTIONAL',
    totp: true,
  },
});
