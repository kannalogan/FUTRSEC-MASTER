---
name: File-upload submission trust boundary
description: Student/user file submissions must reference a server-validated fileId, never a client-supplied URL/path.
---

Any endpoint that accepts a user-uploaded file as part of a submission (assignment submit, profile docs, etc.) must accept a numeric `fileId`, not a client-supplied `fileUrl`/`fileName`.

**Why:** A client-supplied fileUrl lets a user point a submission at any object path (IDOR / forged attachment). The server must prove the file belongs to the actor and is live before trusting it.

**How to apply:**
- Load the row from `filesTable` by id; reject (404) if missing, `ownerId !== userId`, or `status === "deleted"`.
- Store the canonical server path (e.g. `/api/storage/files/:id/download`) and `originalName` from the DB row — never echo client strings.
- To serve it back (e.g. mentor opening a submission), verify the viewer's authorization (task ownership) then mint a short-lived signed token via `signFileToken(fileId, ttl)` → `/api/storage/shared/<token>`. Parse the fileId out of the stored canonical path.
