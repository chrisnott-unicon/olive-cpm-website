# Security Specification - Unicon CPM

## Data Invariants
1. Users must have a role to perform operations.
2. Only `Super_Admin` (`chris.nott@uniconsa.co.za` or `chris.nott@unicons.co.za`) can create or modify projects, create users, and assign permissions.
3. `User` can only access projects and tools that are explicitly assigned to their `allowedProjects` and `allowedTools` arrays.
4. Project life stages are strictly updated manually by the `Super_Admin`.
5. All IDs must match `^[a-zA-Z0-9_\-]+$`.
6. Timestamps `createdAt` and `updatedAt` must be server-validated.

## The Dirty Dozen Payloads (Rejection Tests)

1. **Identity Spoofing**: Attempt to create a user with `role: 'Super_Admin'` as a non-admin.
2. **Privilege Escalation**: Attempt to update a project's `status` as a `User`.
3. **Ghost Field**: Adding `isVerified: true` to a site diary entry.
4. **Invalid Contract**: Setting a project `contractType` to `INVALID_CONTRACT`.
5. **Timestamp Forge**: Setting `createdAt` to a date in the past.
6. **Geofence Poisoning**: Setting a 10MB string as a geofence description.
7. **Orphaned Writes**: Creating a valuation for a project that doesn't exist.
8. **Owner Stealing**: Attempting to change the `ownerId` of a site event.
9. **Bulk Scrape**: Attempting to list all users from a `User` account.
10. **ID Poisoning**: Using a 2KB string as a project ID.
11. **Type Mismatch**: Sending a string for `retentionRate`.
12. **Negative Quantity**: Setting BOQ item quantity to `-100`.

## Test Runner logic
- We will verify that these payloads return `PERMISSION_DENIED`.
