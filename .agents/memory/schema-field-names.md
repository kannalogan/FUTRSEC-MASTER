---
name: Schema field names
description: Actual column names in DB schema that differ from intuitive assumptions — check before writing workers/export code
---

When writing workers or data export code, grep the actual schema before assuming column names.

Key non-obvious names:
- `mentorProfilesTable`: has `linkedinUrl`, `calendlyUrl`, `company`, `designation`, `bio` — NO `websiteUrl`, NO `resumeUrl`
- `studentProfilesTable`: has `college`, `graduationYear`, `city`, `currentRole`, `bio`, `linkedinUrl`, `githubUrl`, `resumeUrl` — NO `yearsOfExperience`, NO `skills` array
- `ftsScoresTable`: has `totalScore`, `assessmentScore`, `labScore`, `assignmentScore`, `attendanceScore`, `updatedAt` — NO `overallScore`, `technicalScore`, `aptitudeScore`, `softSkillScore`, `lastCalculatedAt`
- `assessmentAttemptsTable`: has `startedAt`, `submittedAt`, `status` — NO `completedAt`
- `assessmentResultsTable`: has `score`, `totalMarks`, `percentage`, `passed`, `feedback`, `suggestedTrackLevel`, `createdAt` — NO `level`, NO `completedAt`
- `aiResumeAnalysisTable`: has `resumeUrl`, `analysisResult`, `atsScore`, `suggestions`, `keywords` — NO `resumeText`, NO `analysisJson`

**Why:** The DB schema uses descriptive names consistent with the domain but I initially guessed names based on other conventions (prisma-style, etc.)

**How to apply:** Before writing any worker that queries or updates schema tables, run `grep -n "pgTable\|column_name" lib/db/src/schema/<file>.ts` to confirm exact column names.
