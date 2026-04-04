# Backend: Ownership & Resource-Definitions — User Stories

Goal

Make the backend the single source of truth for resources and ownership policies by introducing Resource Definitions and normalizing Ownership Policies. Provide API endpoints that are predictable and validated so the frontend can render a dynamic UI without hard-coded lists.

Priorities

- P0: Required for frontend to function without hacks (resource-definitions endpoint, normalized ownership-policies GET, upsert per-resource).
- P1: Batch endpoints, combined resource-model endpoint, preview endpoint.
- P2: Admin CRUD for resource-definitions and advanced auditing / role-based admin UI.

P0 Stories (must-have)

P0-1: Resource Definitions endpoint
- Story: As a UI developer or Tenant Admin I want the server to expose resource definitions so the frontend can render resources + actions + allowed child resources dynamically.
- Endpoint: GET /api/v1/resource-definitions
- Response (200): Array of ResourceDefinition objects:
  - id (string) — resource id, e.g. `goals`
  - name (string) — display name
  - description (string)
  - actions (string[]) — action tokens, e.g. `["read","write","delete"]`
  - allowedChildResources (string[]) — ids of child resources
- Acceptance:
  - Returns JSON array, 200 OK
  - Each def has id, name, actions (non-empty array)
  - Endpoint covered by unit test

P0-2: Normalize ownership policies GET
- Story: As a frontend developer I want GET /api/v1/tenants/{tenantId}/ownership-policies to return a flat, predictable list of policies.
- Endpoint: GET /api/v1/tenants/{tenantId}/ownership-policies
- Response (200):
```json
{
  "message":"Success",
  "policies":[
    { "id":"...","tenantId":"...","resourceType":"goals","ownerPermissions":["goals:read","comments:read"],"parentOwnerPermissions":null }
  ]
}
```
- Acceptance:
  - Always return `policies` array.
  - Support legacy nested shape optionally via `?format=nested` for backward compatibility.

P0-3: Upsert ownership policy per resource
- Story: As a Tenant Admin I can create or update (upsert) the policy for a resource.
- Endpoint: PATCH /api/v1/tenants/{tenantId}/ownership-policies/{resourceType}
- Request body:
```json
{ "ownerPermissions": ["goals:read","comments:read"], "parentOwnerPermissions": ["goals:read"] }
```
- Behavior: validate permissions, upsert into DB, return saved policy
- Acceptance:
  - Validates permission format `<resource>:<action>` and that action exists in resource definitions (if definitions exist)
  - Returns 200 with the saved policy

P1 Stories (soon after)

P1-1: Batch update
- PUT /api/v1/tenants/{tenantId}/ownership-policies
- Accepts an array of policies and applies atomically (or with compensation strategy)

P1-2: Combined model endpoint
- GET /api/v1/tenants/{tenantId}/resource-model
- Returns { resourceDefinitions: [...], policies: [...] } so UI can fetch once

P1-3: Preview effective permissions
- POST /api/v1/tenants/{tenantId}/ownership-policies/preview
- Body: { resourceType: string, resourceId?: string }
- Response: { effectivePermissions: string[], sources: [{ permission, sourceResourceType, policyId }] }

P2 Stories (later)

- Admin CRUD for resource-definitions (POST/PUT/DELETE /api/v1/resource-definitions)
- Full RBAC for resource-definitions edits
- Auditing of policy changes (who/when/what)

Data model notes

- New table: resource_definitions
  - id (PK text)
  - name text
  - description text
  - actions JSON[] (strings)
  - allowed_child_resources JSON[]
  - createdAt, updatedAt

- Existing table: ownership_policies (one row per tenant+resourceType)
  - id (PK)
  - tenantId
  - resourceType
  - ownerPermissions JSON[]
  - parentOwnerPermissions JSON[]
  - createdAt, updatedAt

Validation rules

- Permissions must be strings of form `<resource>:<action>`.
- If resource-definitions exist, ensure that:
  - resource in front of `:` is a known resource
  - action exists in that resource's `actions` list
- Cross-resource permissions (e.g., `goals` includes `comments:read`) are allowed only if the parent resource definition includes the child in `allowedChildResources` OR a configuration flag allows unrestricted cross-resource permissions.

Migration & backward compatibility

- Add `resource_definitions` seeded with current resources (goals, comments, progress, teams, etc.).
- Make GET /tenants/{tenantId}/ownership-policies return `policies` by default and support a `?format=nested` query param that returns legacy shape for older clients.
- Frontend should migrate to the new shape, reading `policies` and `resource-definitions`.

Testing

- Unit tests for validation logic (permission format, action existence).
- Integration tests for GET/PUT/PATCH endpoints including preview.

Estimated effort

- Implement resource-definitions and normalize policies: 2–4 days.
- Preview and batch endpoints: 1–2 days.

Next steps

- Draft OpenAPI schema for new endpoints (I can provide if you want).
- Add DB migration scripts and seed data for resource_definitions.
- Provide sample responses for frontend developers.

