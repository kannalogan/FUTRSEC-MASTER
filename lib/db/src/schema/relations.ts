import { relations } from "drizzle-orm";
import {
  usersTable,
  studentProfilesTable,
  mentorProfilesTable,
  tpoProfilesTable,
  employersTable,
  refreshTokensTable,
} from "./users";
import {
  tracksTable,
  learningModulesTable,
  lessonsTable,
  lessonVideosTable,
  lessonNotesTable,
  lessonPdfsTable,
  lessonQuizzesTable,
  lessonBookmarksTable,
} from "./learning";
import {
  assessmentsTable,
  assessmentQuestionsTable,
  assessmentOptionsTable,
  assessmentAnswersTable,
  assessmentAttemptsTable,
  assessmentResultsTable,
  ftsScoresTable,
  ftsHistoryTable,
} from "./assessments";
import {
  consentLogsTable,
  consentHistoryTable,
  dataDownloadRequestsTable,
  dataDeleteRequestsTable,
  dataCorrectionRequestsTable,
  auditLogsTable,
} from "./dpdp";
import {
  labsTable,
  labModulesTable,
  labAttemptsTable,
  labReportsTable,
  sandboxSessionsTable,
} from "./labs";
import {
  jobsTable,
  jobSkillsTable,
  jobApplicationsTable,
  jobShortlistsTable,
  interviewsTable,
  offersTable,
} from "./jobs";
import {
  assignmentsTable,
  assignmentSubmissionsTable,
  broadcastNotesTable,
  broadcastRecipientsTable,
  checkpointsTable,
  checkpointProgressTable,
  studentDeclarationsTable,
} from "./assignments";
import {
  aiInterviewsTable,
  aiReportsTable,
  aiResumeAnalysisTable,
  aiCareerReportsTable,
  aiSkillGapReportsTable,
  aiHistoryTable,
  subscriptionsTable,
  paymentsTable,
  invoicesTable,
} from "./ai";
import {
  batchesTable,
  batchStudentsTable,
  mentorStudentsTable,
  mentorTasksTable,
  mentorTaskBatchesTable,
  mentorTaskAssignmentsTable,
} from "./mentor";
import {
  studentTpoMapTable,
  eventsTable,
  eventRegistrationsTable,
} from "./placement";

// ─────────────────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────────────────
export const usersRelations = relations(usersTable, ({ one, many }) => ({
  studentProfile: one(studentProfilesTable, {
    fields: [usersTable.id],
    references: [studentProfilesTable.userId],
  }),
  mentorProfile: one(mentorProfilesTable, {
    fields: [usersTable.id],
    references: [mentorProfilesTable.userId],
  }),
  tpoProfile: one(tpoProfilesTable, {
    fields: [usersTable.id],
    references: [tpoProfilesTable.userId],
  }),
  employer: one(employersTable, {
    fields: [usersTable.id],
    references: [employersTable.userId],
  }),
  refreshTokens: many(refreshTokensTable),
  consentLog: one(consentLogsTable, {
    fields: [usersTable.id],
    references: [consentLogsTable.userId],
  }),
  consentHistory: many(consentHistoryTable),
  assessmentAttempts: many(assessmentAttemptsTable),
  ftsScore: one(ftsScoresTable, {
    fields: [usersTable.id],
    references: [ftsScoresTable.userId],
  }),
  ftsHistory: many(ftsHistoryTable),
  labAttempts: many(labAttemptsTable),
  labReports: many(labReportsTable),
  sandboxSessions: many(sandboxSessionsTable),
  jobApplications: many(jobApplicationsTable),
  subscriptions: many(subscriptionsTable),
  payments: many(paymentsTable),
  aiInterviews: many(aiInterviewsTable),
  aiReports: many(aiReportsTable),
  resumeAnalyses: many(aiResumeAnalysisTable),
  careerReports: many(aiCareerReportsTable),
  skillGapReports: many(aiSkillGapReportsTable),
  aiHistory: many(aiHistoryTable),
  lessonBookmarks: many(lessonBookmarksTable),
  dataDownloadRequests: many(dataDownloadRequestsTable),
  dataDeleteRequests: many(dataDeleteRequestsTable),
  dataCorrectionRequests: many(dataCorrectionRequestsTable),
  auditLogs: many(auditLogsTable),
}));

export const studentProfilesRelations = relations(
  studentProfilesTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [studentProfilesTable.userId],
      references: [usersTable.id],
    }),
  })
);

export const mentorProfilesRelations = relations(
  mentorProfilesTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [mentorProfilesTable.userId],
      references: [usersTable.id],
    }),
  })
);

export const tpoProfilesRelations = relations(
  tpoProfilesTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [tpoProfilesTable.userId],
      references: [usersTable.id],
    }),
  })
);

export const employersRelations = relations(employersTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [employersTable.userId],
    references: [usersTable.id],
  }),
  jobs: many(jobsTable),
}));

export const refreshTokensRelations = relations(
  refreshTokensTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [refreshTokensTable.userId],
      references: [usersTable.id],
    }),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Learning
// ─────────────────────────────────────────────────────────────────────────────
export const tracksRelations = relations(tracksTable, ({ many }) => ({
  modules: many(learningModulesTable),
  labs: many(labsTable),
  assessments: many(assessmentsTable),
  assignments: many(assignmentsTable),
  checkpoints: many(checkpointsTable),
}));

export const learningModulesRelations = relations(
  learningModulesTable,
  ({ one, many }) => ({
    track: one(tracksTable, {
      fields: [learningModulesTable.trackId],
      references: [tracksTable.id],
    }),
    lessons: many(lessonsTable),
    assignments: many(assignmentsTable),
  })
);

export const lessonsRelations = relations(lessonsTable, ({ one, many }) => ({
  module: one(learningModulesTable, {
    fields: [lessonsTable.moduleId],
    references: [learningModulesTable.id],
  }),
  video: one(lessonVideosTable, {
    fields: [lessonsTable.id],
    references: [lessonVideosTable.lessonId],
  }),
  notes: one(lessonNotesTable, {
    fields: [lessonsTable.id],
    references: [lessonNotesTable.lessonId],
  }),
  pdfs: many(lessonPdfsTable),
  quizzes: many(lessonQuizzesTable),
  bookmarks: many(lessonBookmarksTable),
}));

export const lessonBookmarksRelations = relations(
  lessonBookmarksTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [lessonBookmarksTable.userId],
      references: [usersTable.id],
    }),
    lesson: one(lessonsTable, {
      fields: [lessonBookmarksTable.lessonId],
      references: [lessonsTable.id],
    }),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Assessments
// ─────────────────────────────────────────────────────────────────────────────
export const assessmentsRelations = relations(
  assessmentsTable,
  ({ one, many }) => ({
    track: one(tracksTable, {
      fields: [assessmentsTable.trackId],
      references: [tracksTable.id],
    }),
    questions: many(assessmentQuestionsTable),
    attempts: many(assessmentAttemptsTable),
  })
);

export const assessmentQuestionsRelations = relations(
  assessmentQuestionsTable,
  ({ one, many }) => ({
    assessment: one(assessmentsTable, {
      fields: [assessmentQuestionsTable.assessmentId],
      references: [assessmentsTable.id],
    }),
    options: many(assessmentOptionsTable),
    answers: many(assessmentAnswersTable),
  })
);

export const assessmentOptionsRelations = relations(
  assessmentOptionsTable,
  ({ one }) => ({
    question: one(assessmentQuestionsTable, {
      fields: [assessmentOptionsTable.questionId],
      references: [assessmentQuestionsTable.id],
    }),
  })
);

export const assessmentAttemptsRelations = relations(
  assessmentAttemptsTable,
  ({ one, many }) => ({
    user: one(usersTable, {
      fields: [assessmentAttemptsTable.userId],
      references: [usersTable.id],
    }),
    assessment: one(assessmentsTable, {
      fields: [assessmentAttemptsTable.assessmentId],
      references: [assessmentsTable.id],
    }),
    answers: many(assessmentAnswersTable),
    result: one(assessmentResultsTable, {
      fields: [assessmentAttemptsTable.id],
      references: [assessmentResultsTable.attemptId],
    }),
  })
);

export const assessmentAnswersRelations = relations(
  assessmentAnswersTable,
  ({ one }) => ({
    attempt: one(assessmentAttemptsTable, {
      fields: [assessmentAnswersTable.attemptId],
      references: [assessmentAttemptsTable.id],
    }),
    question: one(assessmentQuestionsTable, {
      fields: [assessmentAnswersTable.questionId],
      references: [assessmentQuestionsTable.id],
    }),
  })
);

export const assessmentResultsRelations = relations(
  assessmentResultsTable,
  ({ one }) => ({
    attempt: one(assessmentAttemptsTable, {
      fields: [assessmentResultsTable.attemptId],
      references: [assessmentAttemptsTable.id],
    }),
    user: one(usersTable, {
      fields: [assessmentResultsTable.userId],
      references: [usersTable.id],
    }),
  })
);

export const ftsScoresRelations = relations(ftsScoresTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [ftsScoresTable.userId],
    references: [usersTable.id],
  }),
  history: many(ftsHistoryTable),
}));

export const ftsHistoryRelations = relations(ftsHistoryTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [ftsHistoryTable.userId],
    references: [usersTable.id],
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// DPDP
// ─────────────────────────────────────────────────────────────────────────────
export const consentLogsRelations = relations(consentLogsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [consentLogsTable.userId],
    references: [usersTable.id],
  }),
}));

export const consentHistoryRelations = relations(
  consentHistoryTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [consentHistoryTable.userId],
      references: [usersTable.id],
    }),
  })
);

export const dataDownloadRequestsRelations = relations(
  dataDownloadRequestsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [dataDownloadRequestsTable.userId],
      references: [usersTable.id],
    }),
  })
);

export const dataDeleteRequestsRelations = relations(
  dataDeleteRequestsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [dataDeleteRequestsTable.userId],
      references: [usersTable.id],
    }),
  })
);

export const dataCorrectionRequestsRelations = relations(
  dataCorrectionRequestsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [dataCorrectionRequestsTable.userId],
      references: [usersTable.id],
    }),
  })
);

export const auditLogsRelations = relations(auditLogsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [auditLogsTable.userId],
    references: [usersTable.id],
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Labs
// ─────────────────────────────────────────────────────────────────────────────
export const labsRelations = relations(labsTable, ({ one, many }) => ({
  track: one(tracksTable, {
    fields: [labsTable.trackId],
    references: [tracksTable.id],
  }),
  modules: many(labModulesTable),
  attempts: many(labAttemptsTable),
}));

export const labModulesRelations = relations(labModulesTable, ({ one }) => ({
  lab: one(labsTable, {
    fields: [labModulesTable.labId],
    references: [labsTable.id],
  }),
}));

export const labAttemptsRelations = relations(
  labAttemptsTable,
  ({ one, many }) => ({
    user: one(usersTable, {
      fields: [labAttemptsTable.userId],
      references: [usersTable.id],
    }),
    lab: one(labsTable, {
      fields: [labAttemptsTable.labId],
      references: [labsTable.id],
    }),
    reports: many(labReportsTable),
  })
);

export const labReportsRelations = relations(labReportsTable, ({ one }) => ({
  attempt: one(labAttemptsTable, {
    fields: [labReportsTable.attemptId],
    references: [labAttemptsTable.id],
  }),
  user: one(usersTable, {
    fields: [labReportsTable.userId],
    references: [usersTable.id],
  }),
  lab: one(labsTable, {
    fields: [labReportsTable.labId],
    references: [labsTable.id],
  }),
}));

export const sandboxSessionsRelations = relations(
  sandboxSessionsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [sandboxSessionsTable.userId],
      references: [usersTable.id],
    }),
    lab: one(labsTable, {
      fields: [sandboxSessionsTable.labId],
      references: [labsTable.id],
    }),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Jobs
// ─────────────────────────────────────────────────────────────────────────────
export const jobsRelations = relations(jobsTable, ({ one, many }) => ({
  employer: one(employersTable, {
    fields: [jobsTable.employerId],
    references: [employersTable.id],
  }),
  skills: many(jobSkillsTable),
  applications: many(jobApplicationsTable),
  shortlists: many(jobShortlistsTable),
}));

export const jobSkillsRelations = relations(jobSkillsTable, ({ one }) => ({
  job: one(jobsTable, {
    fields: [jobSkillsTable.jobId],
    references: [jobsTable.id],
  }),
}));

export const jobApplicationsRelations = relations(
  jobApplicationsTable,
  ({ one, many }) => ({
    job: one(jobsTable, {
      fields: [jobApplicationsTable.jobId],
      references: [jobsTable.id],
    }),
    student: one(usersTable, {
      fields: [jobApplicationsTable.studentId],
      references: [usersTable.id],
    }),
    interviews: many(interviewsTable),
    offer: one(offersTable, {
      fields: [jobApplicationsTable.id],
      references: [offersTable.applicationId],
    }),
  })
);

export const interviewsRelations = relations(interviewsTable, ({ one }) => ({
  application: one(jobApplicationsTable, {
    fields: [interviewsTable.applicationId],
    references: [jobApplicationsTable.id],
  }),
}));

export const offersRelations = relations(offersTable, ({ one }) => ({
  application: one(jobApplicationsTable, {
    fields: [offersTable.applicationId],
    references: [jobApplicationsTable.id],
  }),
  student: one(usersTable, {
    fields: [offersTable.studentId],
    references: [usersTable.id],
  }),
  job: one(jobsTable, {
    fields: [offersTable.jobId],
    references: [jobsTable.id],
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Assignments & Broadcasts
// ─────────────────────────────────────────────────────────────────────────────
export const assignmentsRelations = relations(
  assignmentsTable,
  ({ one, many }) => ({
    module: one(learningModulesTable, {
      fields: [assignmentsTable.moduleId],
      references: [learningModulesTable.id],
    }),
    track: one(tracksTable, {
      fields: [assignmentsTable.trackId],
      references: [tracksTable.id],
    }),
    submissions: many(assignmentSubmissionsTable),
  })
);

export const assignmentSubmissionsRelations = relations(
  assignmentSubmissionsTable,
  ({ one }) => ({
    assignment: one(assignmentsTable, {
      fields: [assignmentSubmissionsTable.assignmentId],
      references: [assignmentsTable.id],
    }),
    student: one(usersTable, {
      fields: [assignmentSubmissionsTable.studentId],
      references: [usersTable.id],
    }),
  })
);

export const broadcastNotesRelations = relations(
  broadcastNotesTable,
  ({ one, many }) => ({
    author: one(usersTable, {
      fields: [broadcastNotesTable.authorId],
      references: [usersTable.id],
    }),
    recipients: many(broadcastRecipientsTable),
  })
);

export const broadcastRecipientsRelations = relations(
  broadcastRecipientsTable,
  ({ one }) => ({
    broadcast: one(broadcastNotesTable, {
      fields: [broadcastRecipientsTable.broadcastId],
      references: [broadcastNotesTable.id],
    }),
    user: one(usersTable, {
      fields: [broadcastRecipientsTable.userId],
      references: [usersTable.id],
    }),
  })
);

export const checkpointsRelations = relations(
  checkpointsTable,
  ({ one, many }) => ({
    track: one(tracksTable, {
      fields: [checkpointsTable.trackId],
      references: [tracksTable.id],
    }),
    progress: many(checkpointProgressTable),
  })
);

export const checkpointProgressRelations = relations(
  checkpointProgressTable,
  ({ one }) => ({
    checkpoint: one(checkpointsTable, {
      fields: [checkpointProgressTable.checkpointId],
      references: [checkpointsTable.id],
    }),
    user: one(usersTable, {
      fields: [checkpointProgressTable.userId],
      references: [usersTable.id],
    }),
  })
);

export const studentDeclarationsRelations = relations(
  studentDeclarationsTable,
  ({ one }) => ({
    student: one(usersTable, {
      fields: [studentDeclarationsTable.studentId],
      references: [usersTable.id],
    }),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// AI & Subscriptions
// ─────────────────────────────────────────────────────────────────────────────
export const aiInterviewsRelations = relations(
  aiInterviewsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [aiInterviewsTable.userId],
      references: [usersTable.id],
    }),
    track: one(tracksTable, {
      fields: [aiInterviewsTable.trackId],
      references: [tracksTable.id],
    }),
    job: one(jobsTable, {
      fields: [aiInterviewsTable.jobId],
      references: [jobsTable.id],
    }),
  })
);

export const aiReportsRelations = relations(aiReportsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [aiReportsTable.userId],
    references: [usersTable.id],
  }),
}));

export const aiResumeAnalysisRelations = relations(
  aiResumeAnalysisTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [aiResumeAnalysisTable.userId],
      references: [usersTable.id],
    }),
  })
);

export const aiCareerReportsRelations = relations(
  aiCareerReportsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [aiCareerReportsTable.userId],
      references: [usersTable.id],
    }),
  })
);

export const aiSkillGapReportsRelations = relations(
  aiSkillGapReportsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [aiSkillGapReportsTable.userId],
      references: [usersTable.id],
    }),
    track: one(tracksTable, {
      fields: [aiSkillGapReportsTable.trackId],
      references: [tracksTable.id],
    }),
  })
);

export const aiHistoryRelations = relations(aiHistoryTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [aiHistoryTable.userId],
    references: [usersTable.id],
  }),
}));

export const subscriptionsRelations = relations(
  subscriptionsTable,
  ({ one, many }) => ({
    user: one(usersTable, {
      fields: [subscriptionsTable.userId],
      references: [usersTable.id],
    }),
    payments: many(paymentsTable),
  })
);

export const paymentsRelations = relations(paymentsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [paymentsTable.userId],
    references: [usersTable.id],
  }),
  subscription: one(subscriptionsTable, {
    fields: [paymentsTable.subscriptionId],
    references: [subscriptionsTable.id],
  }),
  invoice: one(invoicesTable, {
    fields: [paymentsTable.id],
    references: [invoicesTable.paymentId],
  }),
}));

export const invoicesRelations = relations(invoicesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [invoicesTable.userId],
    references: [usersTable.id],
  }),
  payment: one(paymentsTable, {
    fields: [invoicesTable.paymentId],
    references: [paymentsTable.id],
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Mentor (batches, assignments, task builder)
// ─────────────────────────────────────────────────────────────────────────────
export const batchesRelations = relations(batchesTable, ({ one, many }) => ({
  mentor: one(usersTable, {
    fields: [batchesTable.mentorId],
    references: [usersTable.id],
  }),
  students: many(batchStudentsTable),
}));

export const batchStudentsRelations = relations(
  batchStudentsTable,
  ({ one }) => ({
    batch: one(batchesTable, {
      fields: [batchStudentsTable.batchId],
      references: [batchesTable.id],
    }),
    student: one(usersTable, {
      fields: [batchStudentsTable.studentId],
      references: [usersTable.id],
    }),
  })
);

export const mentorStudentsRelations = relations(
  mentorStudentsTable,
  ({ one }) => ({
    mentor: one(usersTable, {
      fields: [mentorStudentsTable.mentorId],
      references: [usersTable.id],
    }),
    student: one(usersTable, {
      fields: [mentorStudentsTable.studentId],
      references: [usersTable.id],
    }),
    batch: one(batchesTable, {
      fields: [mentorStudentsTable.batchId],
      references: [batchesTable.id],
    }),
  })
);

export const mentorTasksRelations = relations(
  mentorTasksTable,
  ({ one, many }) => ({
    mentor: one(usersTable, {
      fields: [mentorTasksTable.mentorId],
      references: [usersTable.id],
    }),
    batches: many(mentorTaskBatchesTable),
    assignments: many(mentorTaskAssignmentsTable),
  })
);

export const mentorTaskBatchesRelations = relations(
  mentorTaskBatchesTable,
  ({ one }) => ({
    task: one(mentorTasksTable, {
      fields: [mentorTaskBatchesTable.taskId],
      references: [mentorTasksTable.id],
    }),
    batch: one(batchesTable, {
      fields: [mentorTaskBatchesTable.batchId],
      references: [batchesTable.id],
    }),
  })
);

export const mentorTaskAssignmentsRelations = relations(
  mentorTaskAssignmentsTable,
  ({ one }) => ({
    task: one(mentorTasksTable, {
      fields: [mentorTaskAssignmentsTable.taskId],
      references: [mentorTasksTable.id],
    }),
    student: one(usersTable, {
      fields: [mentorTaskAssignmentsTable.studentId],
      references: [usersTable.id],
    }),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Placement (TPO mapping + events)
// ─────────────────────────────────────────────────────────────────────────────
export const studentTpoMapRelations = relations(
  studentTpoMapTable,
  ({ one }) => ({
    tpo: one(usersTable, {
      fields: [studentTpoMapTable.tpoId],
      references: [usersTable.id],
    }),
    student: one(usersTable, {
      fields: [studentTpoMapTable.studentId],
      references: [usersTable.id],
    }),
  })
);

export const eventsRelations = relations(eventsTable, ({ one, many }) => ({
  tpo: one(usersTable, {
    fields: [eventsTable.tpoId],
    references: [usersTable.id],
  }),
  registrations: many(eventRegistrationsTable),
}));

export const eventRegistrationsRelations = relations(
  eventRegistrationsTable,
  ({ one }) => ({
    event: one(eventsTable, {
      fields: [eventRegistrationsTable.eventId],
      references: [eventsTable.id],
    }),
    student: one(usersTable, {
      fields: [eventRegistrationsTable.studentId],
      references: [usersTable.id],
    }),
  })
);
