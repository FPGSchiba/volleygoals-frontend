# Infra (Phase B): DynamoDB + Terraform — User Stories

Goal

Provide minimal infra user stories for Phase B to support the new resource_definitions and ownership_policies data model in DynamoDB, managed by Terraform.

P0 Infra Story: Create DynamoDB tables and Terraform resources
- Story: As an infra engineer I want Terraform-managed DynamoDB tables for `resource_definitions` and `ownership_policies` so the backend has a persistent, versioned store for resource metadata and tenant policies.
- Acceptance criteria:
  - Terraform module creates DynamoDB table `ResourceDefinitions` with primary key `id` (string) and attributes:
    - id (PK string)
    - name (string)
    - actions (list)
    - allowedChildResources (list)
    - createdAt, updatedAt (string / ISO timestamp)
  - Terraform module creates DynamoDB table `OwnershipPolicies` with primary key `id` (string) or composite key `(tenantId, resourceType)` as appropriate. Suggested design:
    - PK: `tenantId` (partition key), SK: `resourceType` (sort key)
    - Attributes: ownerPermissions (list), parentOwnerPermissions (list), createdAt, updatedAt, policyId
  - Tables have server-side encryption (SSE) enabled
  - Appropriate IAM role/policy created for the backend service to read/write these tables
  - Terraform state stored securely (S3 backend with locking)

P1 Infra Story: Migrations & seeding
- Story: As a devops/backend engineer I want a migration/seeding mechanism in Terraform or CI so resource_definitions are seeded with current resources (goals, comments, progress, teams) when deploying the first time.
- Acceptance criteria:
  - A migration script (or Terraform local-exec) runs after table creation to insert seed `ResourceDefinition` records
  - The seed is idempotent (safe to re-run)
  - Team documents where to update the seed list when adding new resources

Implementation notes

- Consider composite key for `OwnershipPolicies` to make per-tenant + per-resource lookups fast:
  - PK = tenantId
  - SK = resourceType
  - This maps well to common access pattern: fetch all policies for tenant (Query by tenantId) or fetch single policy (GetItem by tenantId+resourceType)

- Use DynamoDB attribute types: store `ownerPermissions` and `parentOwnerPermissions` as string sets or lists (string sets reduce duplicates but don't guarantee order; lists preserve order if needed)

- IAM & Security:
  - Create an IAM role for the backend service (lambda / ECS task) with least-privilege access to these tables
  - Use KMS CMK if required for encryption key management

- Backups & retention:
  - Enable on-demand backups or point-in-time recovery (PITR) per security requirements

- Terraform modules & best practices:
  - Use a stable module naming convention and include tags for owner and environment
  - Store Terraform state in an S3 bucket with DynamoDB lock table

Testing & rollout

- Validate that the backend can read seed data and that GET /resource-definitions returns seeded records.
- Run integration tests that exercise writes to `OwnershipPolicies` (create/update/read) in a staging environment.

Estimated effort

- Terraform module + IAM policy + seed script: 1–2 days
- Integration testing & rollout: 0.5–1 day

Next steps

- I can produce example Terraform snippets (aws_dynamodb_table resources) and a sample seed script (Node.js or Python) to insert initial ResourceDefinitions if you want. Let me know which language/tooling you prefer for seeding (AWS SDK v3, boto3, etc.).

