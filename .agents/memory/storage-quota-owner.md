---
name: Storage quota charges file owner, not actor
description: Quota ledger and object ACL ownership must follow the file owner, even when an admin acts on their behalf
---

All storage quota accounting (check + decrement/increment) and object ACL ownership must target the **file owner** (`file.ownerId` / `head.ownerId`), never the acting request user (`req.user.userId`).

**Why:** the add-version route once checked and charged quota against the actor. When an admin uploads a new version of another user's file, that charged the admin's ledger while the row was owned by the original user — silently bypassing the owner's quota and corrupting both ledgers. Delete/restore already charged the owner correctly; only the version path was wrong.

**How to apply:** in any storage mutation that creates/removes bytes, derive `ownerId = head.ownerId` (or `file.ownerId`) and use it for `getOrCreateQuota`, the `fileQuotasTable` update `.where(userId, ownerId)`, and the object `setAcl({owner: String(ownerId)})`. The actor id is only for audit logs. Frontend `USAGE_AREAS` must mirror backend `FILE_USAGE_AREAS` exactly (plural: certificates/resumes/assignments/labs) or filter+upload metadata silently mismatch.
