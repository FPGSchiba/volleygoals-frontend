import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'volleyGoalsBucket',
  access: (allow) => ({
    'profile-pictures/{entity_id}/*': [
      allow.authenticated.to(['read']),
      allow.entity('identity').to(['read', 'write', 'delete'])
    ],
    'picture-uploads/{entity_id}/*': [
      allow.authenticated.to(['read']),
      allow.entity('identity').to(['read', 'write', 'delete'])
    ],
  }),
  isDefault: true,
});
