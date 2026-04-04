export interface ResourceDefinition {
  id: string; // e.g. 'goals'
  name: string; // human friendly name
  description?: string;
  actions: string[]; // e.g. ['read','write','delete']
  allowedChildResources?: string[]; // e.g. ['comments','progress']
}

export interface ResourcePolicy {
  id?: string;
  tenantId?: string;
  resourceType: string;
  ownerPermissions: string[];
  parentOwnerPermissions?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResourceModelResponse {
  resourceDefinitions?: ResourceDefinition[];
  policies?: ResourcePolicy[];
}

