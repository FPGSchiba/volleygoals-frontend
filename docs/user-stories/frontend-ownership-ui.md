# Frontend: Dynamic Ownership & Permission UI — User Stories

Goal

Make the frontend consume the backend as the single source of truth for resource definitions and ownership policies. Build a dynamic, hierarchical UI so Tenant Admins can understand parent/child relationships and set explicit vs inherited permissions.

Reference

See `docs/api/README.md` and `docs/api/tenants.md` for current API documentation. These stories assume the backend will provide the endpoints described in `backend-ownership-policies.md`.

Priorities

- P0: Fetch resource-definitions + policies and render a permission editor (must support create/upsert). Show all resources/actions even with no policies.
- P1: Two-pane hierarchical UI (resource tree + permission matrix), preview effective permissions, show inherited vs explicit.
- P2: Bulk import/export and role editor reuse.

P0 Stories (must-have)

P0-F1: Fetch model and populate state
- Story: As a Tenant Admin I want the UI to fetch resource-definitions and tenant policies so the UI is driven by backend data.
- Implementation:
  - Add service methods in `src/services/backend.api.ts`:
    - getResourceDefinitions()
    - getOwnershipPolicies(tenantId)
    - upsertOwnershipPolicy(tenantId, resourceType, body)
  - Add types `ResourceDefinition` and `ResourcePolicy` (e.g., `src/types/api-types.ts`).
  - Extend tenant store `src/store/tenants.ts` to store `resourceDefinitions` and `ownershipPolicies` and actions `fetchResourceModel`.
- Acceptance:
  - UI uses API responses (no hard-coded resource list)
  - Policies and resourceDefs are available in store for other pages

P0-F2: Render editable permissions for each resource
- Story: As a Tenant Admin I can open a resource and edit ownerPermissions and parentOwnerPermissions.
- Implementation:
  - Update `src/pages/admin/TenantPolicies.tsx` to use `resourceDefinitions` and `ownershipPolicies` from the store.
  - For each resourceDefinition, render action checkboxes for resource-level actions and child-action checkboxes for allowed child resources.
  - Ensure Save calls `upsertOwnershipPolicy`.
- Acceptance:
  - All actions from resourceDefinitions are visible as checkboxes even if no policy exists
  - Saving persists via the API and refreshes store

P1 Stories (improve UX)

P1-F1: Two-pane hierarchical editor
- Story: As a Tenant Admin I want a left pane listing resources and a right pane showing the permission editor for the selected resource (resource-level + child matrix).
- Implementation details:
  - Left: MUI `List` or `TreeView` showing resource names and actionable counts
  - Right: `PermissionEditor` component (see sketch below) that renders a resource actions checklist and a child matrix (table) for child resources
- Acceptance:
  - Selecting a resource updates the right panel
  - Editor shows explicit checkboxes and inherited indicators

P1-F2: Show explicit vs inherited + available sources
- Story: As a Tenant Admin I want to know whether a permission cell is explicitly set by this resource or inherited from another policy.
- Implementation:
  - Compute inheritance on the client by scanning `ownershipPolicies` and mapping permission keys to source policies
  - Show inherited-only permissions faded with tooltip listing sources
  - Allow checking a box explicitly to override inherited state (explicit wins)
- Acceptance:
  - Tooltip shows source policy resourceTypes or IDs
  - Toggling an explicit checkbox updates draft and can be saved

P1-F3: Preview effective permissions
- Story: As a Tenant Admin I can preview the union of permissions for owners of a resource instance.
- Implementation:
  - Call POST /api/v1/tenants/{tenantId}/ownership-policies/preview
  - Show a modal listing permissions and their sources
- Acceptance:
  - Modal correctly lists effective permissions after combining explicit and inherited ones

P2 Stories (extra)

- Bulk import/export policies (download JSON / upload JSON and call batch PUT)
- Reuse resourceDefinitions when editing tenant roles so role builder shows same action lists

UI component sketch (PermissionEditor)

- Props: resourceDefinition, policy (ResourcePolicy | null), resourceDefinitions[], policies[], onSave
- Sections:
  - Header: name, description, badge showing explicit count
  - Left panel: Resource-level actions (checkboxes for `resourceId:action`)
  - Right panel: Child resources table: rows = allowedChildResources, columns = actions
  - Each child cell: explicit checkbox, if not explicit but available via other policies show faded "inherited" tag with tooltip showing sources
  - Buttons: Save, Reset, Preview Effective

Mapping to repo files

- `src/pages/admin/TenantPolicies.tsx`: refactor to use new components and store
- `src/services/backend.api.ts`: add typed service functions
- `src/store/tenants.ts`: add state/handlers for resourceDefinitions and policies
- New: `src/types/api-types.ts` for ResourceDefinition and ResourcePolicy
- New components: `src/components/PermissionEditor/*` (PermissionEditor.tsx, PermissionMatrix.tsx)

Testing & QA

- Unit tests for service calls and store actions (mock HTTP)
- Component tests for PermissionEditor (render matrix, toggle, save)
- E2E: visit tenant policies, change permissions, save, verify API persisted

Estimated effort

- Wiring services + store + basic editable UI: 1–2 days
- Full two-pane editor + preview + inheritance tooltips: 1–2 days
- Bulk features + polish: 1–2 days

Next steps

- Backend team implements resource-definitions and normalized policies endpoints (see backend file). I can create a frontend patch for the initial wiring once backend endpoints are available.

