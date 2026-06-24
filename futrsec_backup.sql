--
-- PostgreSQL database dump
--

\restrict fJdTxVZHwrAs6wwU1VfycnyuJUg5aSMFhfyd2vyDNp9iJYi4s2zgG8GmQqxPReR

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: assessment_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.assessment_type AS ENUM (
    'pre_assessment',
    'module_quiz',
    'final_exam',
    'practice'
);


ALTER TYPE public.assessment_type OWNER TO postgres;

--
-- Name: batch_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.batch_status AS ENUM (
    'upcoming',
    'active',
    'completed',
    'archived'
);


ALTER TYPE public.batch_status OWNER TO postgres;

--
-- Name: career_track; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.career_track AS ENUM (
    'soc',
    'vapt',
    'grc'
);


ALTER TYPE public.career_track OWNER TO postgres;

--
-- Name: consent_action; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.consent_action AS ENUM (
    'granted',
    'withdrawn',
    'updated'
);


ALTER TYPE public.consent_action OWNER TO postgres;

--
-- Name: consent_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.consent_type AS ENUM (
    'marketing',
    'analytics',
    'dataProcessing',
    'thirdParty'
);


ALTER TYPE public.consent_type OWNER TO postgres;

--
-- Name: data_request_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.data_request_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'rejected'
);


ALTER TYPE public.data_request_status OWNER TO postgres;

--
-- Name: data_request_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.data_request_type AS ENUM (
    'download',
    'deletion',
    'correction'
);


ALTER TYPE public.data_request_type OWNER TO postgres;

--
-- Name: difficulty; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.difficulty AS ENUM (
    'beginner',
    'intermediate',
    'advanced'
);


ALTER TYPE public.difficulty OWNER TO postgres;

--
-- Name: domain; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.domain AS ENUM (
    'soc',
    'vapt',
    'grc',
    'ai_security',
    'cloud_security',
    'forensics'
);


ALTER TYPE public.domain OWNER TO postgres;

--
-- Name: mentor_task_assignment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.mentor_task_assignment_status AS ENUM (
    'assigned',
    'in_progress',
    'completed',
    'missed'
);


ALTER TYPE public.mentor_task_assignment_status OWNER TO postgres;

--
-- Name: mentor_task_audience; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.mentor_task_audience AS ENUM (
    'all_students',
    'trial_students',
    'all_batches',
    'specific_batches',
    'future_batches'
);


ALTER TYPE public.mentor_task_audience OWNER TO postgres;

--
-- Name: mentor_task_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.mentor_task_status AS ENUM (
    'draft',
    'scheduled',
    'published',
    'archived'
);


ALTER TYPE public.mentor_task_status OWNER TO postgres;

--
-- Name: mentor_task_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.mentor_task_type AS ENUM (
    'assessment',
    'resource',
    'assignment',
    'declaration'
);


ALTER TYPE public.mentor_task_type OWNER TO postgres;

--
-- Name: mock_interview_assignment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.mock_interview_assignment_status AS ENUM (
    'assigned',
    'in_progress',
    'completed',
    'missed'
);


ALTER TYPE public.mock_interview_assignment_status OWNER TO postgres;

--
-- Name: mock_interview_source; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.mock_interview_source AS ENUM (
    'ai',
    'bank',
    'custom'
);


ALTER TYPE public.mock_interview_source OWNER TO postgres;

--
-- Name: mock_interview_template_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.mock_interview_template_status AS ENUM (
    'draft',
    'published',
    'archived'
);


ALTER TYPE public.mock_interview_template_status OWNER TO postgres;

--
-- Name: mock_interview_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.mock_interview_type AS ENUM (
    'technical',
    'hr',
    'scenario',
    'practical',
    'viva',
    'mixed'
);


ALTER TYPE public.mock_interview_type OWNER TO postgres;

--
-- Name: onboarding_step; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.onboarding_step AS ENUM (
    'consent',
    'profile',
    'track_selection',
    'pre_assessment',
    'pending_approval',
    'complete'
);


ALTER TYPE public.onboarding_step OWNER TO postgres;

--
-- Name: question_difficulty; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.question_difficulty AS ENUM (
    'beginner',
    'intermediate',
    'advanced',
    'expert'
);


ALTER TYPE public.question_difficulty OWNER TO postgres;

--
-- Name: question_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.question_status AS ENUM (
    'draft',
    'pending',
    'approved',
    'rejected',
    'archived'
);


ALTER TYPE public.question_status OWNER TO postgres;

--
-- Name: question_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.question_type AS ENUM (
    'mcq',
    'multi_select',
    'true_false',
    'code',
    'practical',
    'scenario'
);


ALTER TYPE public.question_type OWNER TO postgres;

--
-- Name: quiz_question_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.quiz_question_type AS ENUM (
    'mcq',
    'multi_select',
    'true_false',
    'scenario'
);


ALTER TYPE public.quiz_question_type OWNER TO postgres;

--
-- Name: role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.role AS ENUM (
    'student',
    'mentor',
    'tpo',
    'employer',
    'admin'
);


ALTER TYPE public.role OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_career_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_career_reports (
    id integer NOT NULL,
    user_id integer NOT NULL,
    "current_role" text,
    target_role text,
    roadmap text,
    timeline_months integer,
    confidence integer,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_career_reports OWNER TO postgres;

--
-- Name: ai_career_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_career_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_career_reports_id_seq OWNER TO postgres;

--
-- Name: ai_career_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_career_reports_id_seq OWNED BY public.ai_career_reports.id;


--
-- Name: ai_feature_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_feature_config (
    id integer NOT NULL,
    feature text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    settings jsonb,
    updated_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_feature_config OWNER TO postgres;

--
-- Name: ai_feature_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_feature_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_feature_config_id_seq OWNER TO postgres;

--
-- Name: ai_feature_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_feature_config_id_seq OWNED BY public.ai_feature_config.id;


--
-- Name: ai_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    session_id text NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    model text,
    tokens integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_history OWNER TO postgres;

--
-- Name: ai_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_history_id_seq OWNER TO postgres;

--
-- Name: ai_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_history_id_seq OWNED BY public.ai_history.id;


--
-- Name: ai_interviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_interviews (
    id integer NOT NULL,
    user_id integer NOT NULL,
    track_id integer,
    job_id integer,
    status text DEFAULT 'pending'::text NOT NULL,
    difficulty text DEFAULT 'intermediate'::text NOT NULL,
    total_questions integer DEFAULT 10 NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    interview_type text DEFAULT 'text'::text NOT NULL,
    questions jsonb,
    answers jsonb,
    evaluation jsonb,
    overall_score integer,
    template_id integer,
    assignment_id integer,
    assigned_by integer
);


ALTER TABLE public.ai_interviews OWNER TO postgres;

--
-- Name: ai_interviews_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_interviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_interviews_id_seq OWNER TO postgres;

--
-- Name: ai_interviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_interviews_id_seq OWNED BY public.ai_interviews.id;


--
-- Name: ai_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_reports (
    id integer NOT NULL,
    user_id integer NOT NULL,
    entity_type text NOT NULL,
    entity_id integer NOT NULL,
    report_type text NOT NULL,
    content text NOT NULL,
    metadata text,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_reports OWNER TO postgres;

--
-- Name: ai_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_reports_id_seq OWNER TO postgres;

--
-- Name: ai_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_reports_id_seq OWNED BY public.ai_reports.id;


--
-- Name: ai_resume_analysis; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_resume_analysis (
    id integer NOT NULL,
    user_id integer NOT NULL,
    resume_url text NOT NULL,
    analysis_result text,
    ats_score integer,
    suggestions text,
    keywords text[] DEFAULT '{}'::text[] NOT NULL,
    analyzed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_resume_analysis OWNER TO postgres;

--
-- Name: ai_resume_analysis_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_resume_analysis_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_resume_analysis_id_seq OWNER TO postgres;

--
-- Name: ai_resume_analysis_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_resume_analysis_id_seq OWNED BY public.ai_resume_analysis.id;


--
-- Name: ai_skill_gap_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_skill_gap_reports (
    id integer NOT NULL,
    user_id integer NOT NULL,
    track_id integer,
    current_skills text[] DEFAULT '{}'::text[] NOT NULL,
    required_skills text[] DEFAULT '{}'::text[] NOT NULL,
    gap_skills text[] DEFAULT '{}'::text[] NOT NULL,
    recommendations text,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_skill_gap_reports OWNER TO postgres;

--
-- Name: ai_skill_gap_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_skill_gap_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_skill_gap_reports_id_seq OWNER TO postgres;

--
-- Name: ai_skill_gap_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_skill_gap_reports_id_seq OWNED BY public.ai_skill_gap_reports.id;


--
-- Name: application_status_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.application_status_history (
    id integer NOT NULL,
    application_id integer NOT NULL,
    from_status text,
    to_status text NOT NULL,
    note text,
    changed_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.application_status_history OWNER TO postgres;

--
-- Name: application_status_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.application_status_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.application_status_history_id_seq OWNER TO postgres;

--
-- Name: application_status_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.application_status_history_id_seq OWNED BY public.application_status_history.id;


--
-- Name: assessment_answers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assessment_answers (
    id integer NOT NULL,
    attempt_id integer NOT NULL,
    question_id integer NOT NULL,
    selected_option_ids integer[] NOT NULL,
    is_correct boolean,
    points_awarded integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.assessment_answers OWNER TO postgres;

--
-- Name: assessment_answers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assessment_answers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assessment_answers_id_seq OWNER TO postgres;

--
-- Name: assessment_answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assessment_answers_id_seq OWNED BY public.assessment_answers.id;


--
-- Name: assessment_attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assessment_attempts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    assessment_id integer NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    submitted_at timestamp with time zone,
    status text DEFAULT 'in_progress'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.assessment_attempts OWNER TO postgres;

--
-- Name: assessment_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assessment_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assessment_attempts_id_seq OWNER TO postgres;

--
-- Name: assessment_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assessment_attempts_id_seq OWNED BY public.assessment_attempts.id;


--
-- Name: assessment_options; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assessment_options (
    id integer NOT NULL,
    question_id integer NOT NULL,
    option_text text NOT NULL,
    is_correct boolean DEFAULT false NOT NULL,
    "order" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.assessment_options OWNER TO postgres;

--
-- Name: assessment_options_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assessment_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assessment_options_id_seq OWNER TO postgres;

--
-- Name: assessment_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assessment_options_id_seq OWNED BY public.assessment_options.id;


--
-- Name: assessment_questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assessment_questions (
    id integer NOT NULL,
    assessment_id integer NOT NULL,
    question_text text NOT NULL,
    question_type public.question_type DEFAULT 'mcq'::public.question_type NOT NULL,
    explanation text,
    points integer DEFAULT 1 NOT NULL,
    "order" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    source_bank_question_id integer
);


ALTER TABLE public.assessment_questions OWNER TO postgres;

--
-- Name: assessment_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assessment_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assessment_questions_id_seq OWNER TO postgres;

--
-- Name: assessment_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assessment_questions_id_seq OWNED BY public.assessment_questions.id;


--
-- Name: assessment_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assessment_results (
    id integer NOT NULL,
    attempt_id integer NOT NULL,
    user_id integer NOT NULL,
    assessment_id integer NOT NULL,
    score integer NOT NULL,
    total_marks integer NOT NULL,
    percentage real NOT NULL,
    passed boolean NOT NULL,
    feedback text,
    suggested_track_level text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.assessment_results OWNER TO postgres;

--
-- Name: assessment_results_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assessment_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assessment_results_id_seq OWNER TO postgres;

--
-- Name: assessment_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assessment_results_id_seq OWNED BY public.assessment_results.id;


--
-- Name: assessments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assessments (
    id integer NOT NULL,
    title text NOT NULL,
    type public.assessment_type NOT NULL,
    track_id integer,
    total_questions integer DEFAULT 0 NOT NULL,
    duration_minutes integer DEFAULT 30 NOT NULL,
    passing_score integer DEFAULT 70 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.assessments OWNER TO postgres;

--
-- Name: assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assessments_id_seq OWNER TO postgres;

--
-- Name: assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assessments_id_seq OWNED BY public.assessments.id;


--
-- Name: assignment_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignment_submissions (
    id integer NOT NULL,
    assignment_id integer NOT NULL,
    student_id integer NOT NULL,
    submission_url text,
    content text,
    status text DEFAULT 'submitted'::text NOT NULL,
    score integer,
    feedback text,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.assignment_submissions OWNER TO postgres;

--
-- Name: assignment_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assignment_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assignment_submissions_id_seq OWNER TO postgres;

--
-- Name: assignment_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assignment_submissions_id_seq OWNED BY public.assignment_submissions.id;


--
-- Name: assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignments (
    id integer NOT NULL,
    module_id integer,
    track_id integer,
    title text NOT NULL,
    description text NOT NULL,
    due_date timestamp with time zone,
    max_score integer DEFAULT 100 NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.assignments OWNER TO postgres;

--
-- Name: assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assignments_id_seq OWNER TO postgres;

--
-- Name: assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assignments_id_seq OWNED BY public.assignments.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    action text NOT NULL,
    entity_type text,
    entity_id text,
    ip_address text,
    user_agent text,
    metadata text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: auto_apply_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auto_apply_settings (
    id integer NOT NULL,
    student_id integer NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    min_salary integer,
    preferred_location text,
    work_mode text,
    company_size text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.auto_apply_settings OWNER TO postgres;

--
-- Name: auto_apply_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.auto_apply_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.auto_apply_settings_id_seq OWNER TO postgres;

--
-- Name: auto_apply_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.auto_apply_settings_id_seq OWNED BY public.auto_apply_settings.id;


--
-- Name: batch_students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.batch_students (
    id integer NOT NULL,
    batch_id integer NOT NULL,
    student_id integer NOT NULL,
    assigned_by integer,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.batch_students OWNER TO postgres;

--
-- Name: batch_students_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.batch_students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.batch_students_id_seq OWNER TO postgres;

--
-- Name: batch_students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.batch_students_id_seq OWNED BY public.batch_students.id;


--
-- Name: batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.batches (
    id integer NOT NULL,
    name text NOT NULL,
    code text,
    career_track public.career_track NOT NULL,
    mentor_id integer,
    status public.batch_status DEFAULT 'upcoming'::public.batch_status NOT NULL,
    description text,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.batches OWNER TO postgres;

--
-- Name: batches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.batches_id_seq OWNER TO postgres;

--
-- Name: batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.batches_id_seq OWNED BY public.batches.id;


--
-- Name: broadcast_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.broadcast_notes (
    id integer NOT NULL,
    author_id integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    target_roles text[] DEFAULT '{}'::text[] NOT NULL,
    target_track_ids integer[] DEFAULT '{}'::integer[] NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.broadcast_notes OWNER TO postgres;

--
-- Name: broadcast_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.broadcast_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.broadcast_notes_id_seq OWNER TO postgres;

--
-- Name: broadcast_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.broadcast_notes_id_seq OWNED BY public.broadcast_notes.id;


--
-- Name: broadcast_recipients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.broadcast_recipients (
    id integer NOT NULL,
    broadcast_id integer NOT NULL,
    user_id integer NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.broadcast_recipients OWNER TO postgres;

--
-- Name: broadcast_recipients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.broadcast_recipients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.broadcast_recipients_id_seq OWNER TO postgres;

--
-- Name: broadcast_recipients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.broadcast_recipients_id_seq OWNED BY public.broadcast_recipients.id;


--
-- Name: campus_drive_registrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campus_drive_registrations (
    id integer NOT NULL,
    drive_id integer NOT NULL,
    student_id integer NOT NULL,
    status text DEFAULT 'registered'::text NOT NULL,
    attended boolean DEFAULT false NOT NULL,
    result text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.campus_drive_registrations OWNER TO postgres;

--
-- Name: campus_drive_registrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.campus_drive_registrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campus_drive_registrations_id_seq OWNER TO postgres;

--
-- Name: campus_drive_registrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.campus_drive_registrations_id_seq OWNED BY public.campus_drive_registrations.id;


--
-- Name: campus_drives; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campus_drives (
    id integer NOT NULL,
    name text NOT NULL,
    company_name text NOT NULL,
    career_track public.career_track NOT NULL,
    eligible_colleges text[] DEFAULT '{}'::text[] NOT NULL,
    eligible_years text[] DEFAULT '{}'::text[] NOT NULL,
    eligibility_criteria text,
    package_details text,
    mode text DEFAULT 'onsite'::text NOT NULL,
    deadline timestamp with time zone,
    status text DEFAULT 'open'::text NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.campus_drives OWNER TO postgres;

--
-- Name: campus_drives_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.campus_drives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campus_drives_id_seq OWNER TO postgres;

--
-- Name: campus_drives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.campus_drives_id_seq OWNED BY public.campus_drives.id;


--
-- Name: certificate_auto_issue_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.certificate_auto_issue_config (
    id integer NOT NULL,
    source_type text NOT NULL,
    source_id integer NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    expiry_months integer,
    allow_reissue boolean DEFAULT false NOT NULL,
    template_id integer,
    certificate_type text,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.certificate_auto_issue_config OWNER TO postgres;

--
-- Name: certificate_auto_issue_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.certificate_auto_issue_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.certificate_auto_issue_config_id_seq OWNER TO postgres;

--
-- Name: certificate_auto_issue_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.certificate_auto_issue_config_id_seq OWNED BY public.certificate_auto_issue_config.id;


--
-- Name: certificate_generation_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.certificate_generation_jobs (
    id integer NOT NULL,
    bull_job_id text,
    status text DEFAULT 'queued'::text NOT NULL,
    total integer DEFAULT 0 NOT NULL,
    processed integer DEFAULT 0 NOT NULL,
    succeeded integer DEFAULT 0 NOT NULL,
    failed integer DEFAULT 0 NOT NULL,
    certificate_ids jsonb NOT NULL,
    failed_ids jsonb,
    avg_ms_per_cert integer,
    duration_ms integer,
    error text,
    created_by integer NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    parent_job_id integer,
    is_shard boolean DEFAULT false NOT NULL,
    shard_index integer,
    shard_count integer DEFAULT 1 NOT NULL,
    partition integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.certificate_generation_jobs OWNER TO postgres;

--
-- Name: certificate_generation_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.certificate_generation_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.certificate_generation_jobs_id_seq OWNER TO postgres;

--
-- Name: certificate_generation_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.certificate_generation_jobs_id_seq OWNED BY public.certificate_generation_jobs.id;


--
-- Name: certificate_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.certificate_templates (
    id integer NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'course_completion'::text NOT NULL,
    career_track public.career_track,
    logo_url text,
    signature_url text,
    signature_name text,
    body_template text,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.certificate_templates OWNER TO postgres;

--
-- Name: certificate_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.certificate_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.certificate_templates_id_seq OWNER TO postgres;

--
-- Name: certificate_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.certificate_templates_id_seq OWNED BY public.certificate_templates.id;


--
-- Name: certificates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.certificates (
    id integer NOT NULL,
    certificate_code text NOT NULL,
    user_id integer NOT NULL,
    template_id integer,
    type text DEFAULT 'course_completion'::text NOT NULL,
    title text NOT NULL,
    career_track public.career_track,
    course_name text,
    internship_name text,
    mentor_id integer,
    duration_text text,
    achievement_label text,
    issued_date date NOT NULL,
    verify_token text NOT NULL,
    status text DEFAULT 'issued'::text NOT NULL,
    metadata jsonb,
    issued_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_date date,
    pdf_object_path text,
    source_type text DEFAULT 'manual'::text NOT NULL,
    source_id integer
);


ALTER TABLE public.certificates OWNER TO postgres;

--
-- Name: certificates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.certificates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.certificates_id_seq OWNER TO postgres;

--
-- Name: certificates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.certificates_id_seq OWNED BY public.certificates.id;


--
-- Name: checkpoint_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.checkpoint_progress (
    id integer NOT NULL,
    user_id integer NOT NULL,
    checkpoint_id integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    score integer,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.checkpoint_progress OWNER TO postgres;

--
-- Name: checkpoint_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.checkpoint_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.checkpoint_progress_id_seq OWNER TO postgres;

--
-- Name: checkpoint_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.checkpoint_progress_id_seq OWNED BY public.checkpoint_progress.id;


--
-- Name: checkpoints; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.checkpoints (
    id integer NOT NULL,
    track_id integer NOT NULL,
    title text NOT NULL,
    description text,
    "order" integer NOT NULL,
    required_score integer DEFAULT 70 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.checkpoints OWNER TO postgres;

--
-- Name: checkpoints_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.checkpoints_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.checkpoints_id_seq OWNER TO postgres;

--
-- Name: checkpoints_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.checkpoints_id_seq OWNED BY public.checkpoints.id;


--
-- Name: community_post_likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.community_post_likes (
    id integer NOT NULL,
    post_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.community_post_likes OWNER TO postgres;

--
-- Name: community_post_likes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.community_post_likes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.community_post_likes_id_seq OWNER TO postgres;

--
-- Name: community_post_likes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.community_post_likes_id_seq OWNED BY public.community_post_likes.id;


--
-- Name: community_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.community_posts (
    id integer NOT NULL,
    author_id integer NOT NULL,
    content text NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    like_count integer DEFAULT 0 NOT NULL,
    comment_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.community_posts OWNER TO postgres;

--
-- Name: community_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.community_posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.community_posts_id_seq OWNER TO postgres;

--
-- Name: community_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.community_posts_id_seq OWNED BY public.community_posts.id;


--
-- Name: consent_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consent_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    consent_type public.consent_type NOT NULL,
    action public.consent_action NOT NULL,
    ip_address text NOT NULL,
    user_agent text,
    metadata text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.consent_history OWNER TO postgres;

--
-- Name: consent_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.consent_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.consent_history_id_seq OWNER TO postgres;

--
-- Name: consent_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.consent_history_id_seq OWNED BY public.consent_history.id;


--
-- Name: consent_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consent_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    marketing boolean DEFAULT false NOT NULL,
    analytics boolean DEFAULT false NOT NULL,
    data_processing boolean DEFAULT false NOT NULL,
    third_party boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    cookie_preferences jsonb
);


ALTER TABLE public.consent_logs OWNER TO postgres;

--
-- Name: consent_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.consent_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.consent_logs_id_seq OWNER TO postgres;

--
-- Name: consent_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.consent_logs_id_seq OWNED BY public.consent_logs.id;


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coupons (
    id integer NOT NULL,
    code text NOT NULL,
    description text,
    discount_type text DEFAULT 'percent'::text NOT NULL,
    discount_value integer DEFAULT 0 NOT NULL,
    plan text,
    max_redemptions integer,
    times_redeemed integer DEFAULT 0 NOT NULL,
    valid_from timestamp with time zone,
    valid_until timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.coupons OWNER TO postgres;

--
-- Name: coupons_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.coupons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.coupons_id_seq OWNER TO postgres;

--
-- Name: coupons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.coupons_id_seq OWNED BY public.coupons.id;


--
-- Name: data_correction_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_correction_requests (
    id integer NOT NULL,
    user_id integer NOT NULL,
    field text NOT NULL,
    current_value text NOT NULL,
    requested_value text NOT NULL,
    supporting_note text,
    status public.data_request_status DEFAULT 'pending'::public.data_request_status NOT NULL,
    completed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.data_correction_requests OWNER TO postgres;

--
-- Name: data_correction_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.data_correction_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.data_correction_requests_id_seq OWNER TO postgres;

--
-- Name: data_correction_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.data_correction_requests_id_seq OWNED BY public.data_correction_requests.id;


--
-- Name: data_delete_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_delete_requests (
    id integer NOT NULL,
    user_id integer NOT NULL,
    reason text NOT NULL,
    status public.data_request_status DEFAULT 'pending'::public.data_request_status NOT NULL,
    completed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.data_delete_requests OWNER TO postgres;

--
-- Name: data_delete_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.data_delete_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.data_delete_requests_id_seq OWNER TO postgres;

--
-- Name: data_delete_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.data_delete_requests_id_seq OWNED BY public.data_delete_requests.id;


--
-- Name: data_download_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_download_requests (
    id integer NOT NULL,
    user_id integer NOT NULL,
    status public.data_request_status DEFAULT 'pending'::public.data_request_status NOT NULL,
    download_url text,
    expires_at timestamp with time zone,
    completed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.data_download_requests OWNER TO postgres;

--
-- Name: data_download_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.data_download_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.data_download_requests_id_seq OWNER TO postgres;

--
-- Name: data_download_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.data_download_requests_id_seq OWNED BY public.data_download_requests.id;


--
-- Name: declarations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.declarations (
    id integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    version text DEFAULT '1.0'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.declarations OWNER TO postgres;

--
-- Name: declarations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.declarations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.declarations_id_seq OWNER TO postgres;

--
-- Name: declarations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.declarations_id_seq OWNED BY public.declarations.id;


--
-- Name: discussion_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.discussion_comments (
    id integer NOT NULL,
    post_id integer NOT NULL,
    user_id integer NOT NULL,
    body text NOT NULL,
    is_accepted_answer boolean DEFAULT false NOT NULL,
    like_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.discussion_comments OWNER TO postgres;

--
-- Name: discussion_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.discussion_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.discussion_comments_id_seq OWNER TO postgres;

--
-- Name: discussion_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.discussion_comments_id_seq OWNED BY public.discussion_comments.id;


--
-- Name: discussion_likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.discussion_likes (
    id integer NOT NULL,
    user_id integer NOT NULL,
    post_id integer,
    comment_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.discussion_likes OWNER TO postgres;

--
-- Name: discussion_likes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.discussion_likes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.discussion_likes_id_seq OWNER TO postgres;

--
-- Name: discussion_likes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.discussion_likes_id_seq OWNED BY public.discussion_likes.id;


--
-- Name: discussion_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.discussion_posts (
    id integer NOT NULL,
    lesson_id integer NOT NULL,
    user_id integer NOT NULL,
    body text NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    is_solved boolean DEFAULT false NOT NULL,
    like_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.discussion_posts OWNER TO postgres;

--
-- Name: discussion_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.discussion_posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.discussion_posts_id_seq OWNER TO postgres;

--
-- Name: discussion_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.discussion_posts_id_seq OWNED BY public.discussion_posts.id;


--
-- Name: drive_invites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.drive_invites (
    id integer NOT NULL,
    drive_id integer NOT NULL,
    student_id integer NOT NULL,
    stage text DEFAULT 'invited'::text NOT NULL,
    status text DEFAULT 'invited'::text NOT NULL,
    invited_by integer NOT NULL,
    invited_at timestamp with time zone DEFAULT now() NOT NULL,
    responded_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.drive_invites OWNER TO postgres;

--
-- Name: drive_invites_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.drive_invites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.drive_invites_id_seq OWNER TO postgres;

--
-- Name: drive_invites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.drive_invites_id_seq OWNED BY public.drive_invites.id;


--
-- Name: drive_rounds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.drive_rounds (
    id integer NOT NULL,
    drive_id integer NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'technical'::text NOT NULL,
    sequence integer DEFAULT 1 NOT NULL,
    scheduled_at timestamp with time zone,
    duration_minutes integer DEFAULT 30 NOT NULL,
    venue text,
    meeting_url text,
    interviewer_id integer,
    interviewer_name text,
    capacity integer,
    status text DEFAULT 'scheduled'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.drive_rounds OWNER TO postgres;

--
-- Name: drive_rounds_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.drive_rounds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.drive_rounds_id_seq OWNER TO postgres;

--
-- Name: drive_rounds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.drive_rounds_id_seq OWNED BY public.drive_rounds.id;


--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_logs (
    id integer NOT NULL,
    user_id integer,
    email text NOT NULL,
    subject text NOT NULL,
    body text,
    status text DEFAULT 'sent'::text NOT NULL,
    provider text DEFAULT 'smtp'::text NOT NULL,
    error text,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_logs OWNER TO postgres;

--
-- Name: email_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.email_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_logs_id_seq OWNER TO postgres;

--
-- Name: email_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.email_logs_id_seq OWNED BY public.email_logs.id;


--
-- Name: employers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employers (
    id integer NOT NULL,
    user_id integer NOT NULL,
    company_name text NOT NULL,
    company_size text,
    industry text,
    website text,
    logo_url text,
    is_verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    linkedin_url text,
    designation text,
    approval_status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by integer,
    reviewed_at timestamp with time zone,
    rejection_reason text
);


ALTER TABLE public.employers OWNER TO postgres;

--
-- Name: employers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employers_id_seq OWNER TO postgres;

--
-- Name: employers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employers_id_seq OWNED BY public.employers.id;


--
-- Name: event_registrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_registrations (
    id integer NOT NULL,
    event_id integer NOT NULL,
    student_id integer NOT NULL,
    status text DEFAULT 'registered'::text NOT NULL,
    registered_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.event_registrations OWNER TO postgres;

--
-- Name: event_registrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.event_registrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_registrations_id_seq OWNER TO postgres;

--
-- Name: event_registrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.event_registrations_id_seq OWNED BY public.event_registrations.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.events (
    id integer NOT NULL,
    tpo_id integer NOT NULL,
    title text NOT NULL,
    description text,
    type text DEFAULT 'placement_drive'::text NOT NULL,
    location text,
    is_online boolean DEFAULT false NOT NULL,
    meeting_url text,
    career_track public.career_track,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    max_attendees integer,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.events OWNER TO postgres;

--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.events_id_seq OWNER TO postgres;

--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: file_quotas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.file_quotas (
    user_id integer NOT NULL,
    quota_bytes bigint DEFAULT '2147483648'::bigint NOT NULL,
    used_bytes bigint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.file_quotas OWNER TO postgres;

--
-- Name: files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.files (
    id integer NOT NULL,
    object_path text NOT NULL,
    owner_id integer NOT NULL,
    original_name text NOT NULL,
    content_type text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    folder text DEFAULT '/'::text NOT NULL,
    usage_area text DEFAULT 'general'::text NOT NULL,
    visibility text DEFAULT 'private'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    parent_file_id integer,
    is_latest boolean DEFAULT true NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    scan_status text DEFAULT 'pending'::text NOT NULL,
    metadata jsonb,
    expires_at timestamp with time zone,
    deleted_at timestamp with time zone,
    deleted_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.files OWNER TO postgres;

--
-- Name: files_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.files_id_seq OWNER TO postgres;

--
-- Name: files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.files_id_seq OWNED BY public.files.id;


--
-- Name: fts_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fts_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    event text NOT NULL,
    score_delta real NOT NULL,
    previous_score real NOT NULL,
    new_score real NOT NULL,
    metadata text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.fts_history OWNER TO postgres;

--
-- Name: fts_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fts_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fts_history_id_seq OWNER TO postgres;

--
-- Name: fts_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fts_history_id_seq OWNED BY public.fts_history.id;


--
-- Name: fts_scores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fts_scores (
    id integer NOT NULL,
    user_id integer NOT NULL,
    total_score real DEFAULT 0 NOT NULL,
    assessment_score real DEFAULT 0 NOT NULL,
    lab_score real DEFAULT 0 NOT NULL,
    assignment_score real DEFAULT 0 NOT NULL,
    attendance_score real DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.fts_scores OWNER TO postgres;

--
-- Name: fts_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fts_scores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fts_scores_id_seq OWNER TO postgres;

--
-- Name: fts_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fts_scores_id_seq OWNED BY public.fts_scores.id;


--
-- Name: interviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.interviews (
    id integer NOT NULL,
    application_id integer NOT NULL,
    type text DEFAULT 'technical'::text NOT NULL,
    scheduled_at timestamp with time zone,
    status text DEFAULT 'scheduled'::text NOT NULL,
    meeting_url text,
    feedback text,
    interviewer_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.interviews OWNER TO postgres;

--
-- Name: interviews_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.interviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.interviews_id_seq OWNER TO postgres;

--
-- Name: interviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.interviews_id_seq OWNED BY public.interviews.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    user_id integer NOT NULL,
    payment_id integer NOT NULL,
    invoice_number text NOT NULL,
    amount integer NOT NULL,
    tax integer DEFAULT 0 NOT NULL,
    total_amount integer NOT NULL,
    s3_key text,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    gst_number text,
    gst_rate integer,
    place_of_supply text,
    billing_name text
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoices_id_seq OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: job_applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_applications (
    id integer NOT NULL,
    job_id integer NOT NULL,
    student_id integer NOT NULL,
    cover_letter text,
    resume_url text,
    status text DEFAULT 'applied'::text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.job_applications OWNER TO postgres;

--
-- Name: job_applications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.job_applications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_applications_id_seq OWNER TO postgres;

--
-- Name: job_applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.job_applications_id_seq OWNED BY public.job_applications.id;


--
-- Name: job_matches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_matches (
    id integer NOT NULL,
    student_id integer NOT NULL,
    job_id integer NOT NULL,
    match_score integer DEFAULT 0 NOT NULL,
    reasons text,
    factors jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    breakdown jsonb,
    missing_skills jsonb,
    recommendations jsonb
);


ALTER TABLE public.job_matches OWNER TO postgres;

--
-- Name: job_matches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.job_matches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_matches_id_seq OWNER TO postgres;

--
-- Name: job_matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.job_matches_id_seq OWNED BY public.job_matches.id;


--
-- Name: job_shortlists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_shortlists (
    id integer NOT NULL,
    job_id integer NOT NULL,
    student_id integer NOT NULL,
    shortlisted_by integer NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.job_shortlists OWNER TO postgres;

--
-- Name: job_shortlists_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.job_shortlists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_shortlists_id_seq OWNER TO postgres;

--
-- Name: job_shortlists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.job_shortlists_id_seq OWNED BY public.job_shortlists.id;


--
-- Name: job_skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_skills (
    id integer NOT NULL,
    job_id integer NOT NULL,
    skill text NOT NULL,
    level text DEFAULT 'required'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.job_skills OWNER TO postgres;

--
-- Name: job_skills_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.job_skills_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_skills_id_seq OWNER TO postgres;

--
-- Name: job_skills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.job_skills_id_seq OWNED BY public.job_skills.id;


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jobs (
    id integer NOT NULL,
    employer_id integer,
    title text NOT NULL,
    description text NOT NULL,
    type text DEFAULT 'full_time'::text NOT NULL,
    location text,
    is_remote boolean DEFAULT false NOT NULL,
    min_salary integer,
    max_salary integer,
    experience text,
    required_tracks text[] DEFAULT '{}'::text[] NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    application_deadline timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by_admin_id integer
);


ALTER TABLE public.jobs OWNER TO postgres;

--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jobs_id_seq OWNER TO postgres;

--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: lab_assets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lab_assets (
    id integer NOT NULL,
    lab_id integer NOT NULL,
    kind text NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    storage_key text,
    size_bytes integer,
    uploaded_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lab_assets OWNER TO postgres;

--
-- Name: lab_assets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lab_assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lab_assets_id_seq OWNER TO postgres;

--
-- Name: lab_assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lab_assets_id_seq OWNED BY public.lab_assets.id;


--
-- Name: lab_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lab_assignments (
    id integer NOT NULL,
    lab_id integer NOT NULL,
    assigned_by integer NOT NULL,
    audience_type text NOT NULL,
    student_id integer,
    batch_id integer,
    track_id integer,
    due_at timestamp with time zone,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lab_assignments OWNER TO postgres;

--
-- Name: lab_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lab_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lab_assignments_id_seq OWNER TO postgres;

--
-- Name: lab_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lab_assignments_id_seq OWNED BY public.lab_assignments.id;


--
-- Name: lab_attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lab_attempts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    lab_id integer NOT NULL,
    status text DEFAULT 'in_progress'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    total_score real DEFAULT 0 NOT NULL,
    hints_used integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lab_attempts OWNER TO postgres;

--
-- Name: lab_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lab_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lab_attempts_id_seq OWNER TO postgres;

--
-- Name: lab_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lab_attempts_id_seq OWNED BY public.lab_attempts.id;


--
-- Name: lab_hints; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lab_hints (
    id integer NOT NULL,
    lab_module_id integer NOT NULL,
    "order" integer DEFAULT 1 NOT NULL,
    content text NOT NULL,
    penalty_points integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lab_hints OWNER TO postgres;

--
-- Name: lab_hints_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lab_hints_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lab_hints_id_seq OWNER TO postgres;

--
-- Name: lab_hints_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lab_hints_id_seq OWNED BY public.lab_hints.id;


--
-- Name: lab_module_completions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lab_module_completions (
    id integer NOT NULL,
    attempt_id integer NOT NULL,
    user_id integer NOT NULL,
    lab_id integer NOT NULL,
    lab_module_id integer NOT NULL,
    points_awarded integer DEFAULT 0 NOT NULL,
    solved_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lab_module_completions OWNER TO postgres;

--
-- Name: lab_module_completions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lab_module_completions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lab_module_completions_id_seq OWNER TO postgres;

--
-- Name: lab_module_completions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lab_module_completions_id_seq OWNED BY public.lab_module_completions.id;


--
-- Name: lab_modules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lab_modules (
    id integer NOT NULL,
    lab_id integer NOT NULL,
    title text NOT NULL,
    "order" integer NOT NULL,
    task_description text NOT NULL,
    hint text,
    flag_format text,
    points integer DEFAULT 10 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    flag text,
    solution_explanation text,
    walkthrough text
);


ALTER TABLE public.lab_modules OWNER TO postgres;

--
-- Name: lab_modules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lab_modules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lab_modules_id_seq OWNER TO postgres;

--
-- Name: lab_modules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lab_modules_id_seq OWNED BY public.lab_modules.id;


--
-- Name: lab_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lab_reports (
    id integer NOT NULL,
    attempt_id integer NOT NULL,
    user_id integer NOT NULL,
    lab_id integer NOT NULL,
    report_content text,
    s3_key text,
    submitted_at timestamp with time zone,
    reviewed_at timestamp with time zone,
    reviewed_by integer,
    grade text,
    feedback text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lab_reports OWNER TO postgres;

--
-- Name: lab_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lab_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lab_reports_id_seq OWNER TO postgres;

--
-- Name: lab_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lab_reports_id_seq OWNED BY public.lab_reports.id;


--
-- Name: lab_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lab_versions (
    id integer NOT NULL,
    lab_id integer NOT NULL,
    version integer NOT NULL,
    snapshot jsonb NOT NULL,
    note text,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lab_versions OWNER TO postgres;

--
-- Name: lab_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lab_versions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lab_versions_id_seq OWNER TO postgres;

--
-- Name: lab_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lab_versions_id_seq OWNED BY public.lab_versions.id;


--
-- Name: labs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.labs (
    id integer NOT NULL,
    track_id integer,
    title text NOT NULL,
    slug text NOT NULL,
    description text NOT NULL,
    difficulty text DEFAULT 'beginner'::text NOT NULL,
    type text DEFAULT 'ctf'::text NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    total_points integer DEFAULT 100 NOT NULL,
    estimated_minutes integer DEFAULT 60 NOT NULL,
    docker_image text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    simulator jsonb,
    author_id integer,
    author_role text,
    status text DEFAULT 'published'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    learning_objectives text[] DEFAULT '{}'::text[] NOT NULL,
    walkthrough text
);


ALTER TABLE public.labs OWNER TO postgres;

--
-- Name: labs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.labs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.labs_id_seq OWNER TO postgres;

--
-- Name: labs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.labs_id_seq OWNED BY public.labs.id;


--
-- Name: learning_modules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.learning_modules (
    id integer NOT NULL,
    track_id integer NOT NULL,
    title text NOT NULL,
    description text,
    "order" integer NOT NULL,
    lesson_count integer DEFAULT 0 NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category text,
    difficulty public.difficulty DEFAULT 'beginner'::public.difficulty NOT NULL,
    thumbnail_url text,
    xp_reward integer DEFAULT 100 NOT NULL,
    estimated_minutes integer DEFAULT 60 NOT NULL
);


ALTER TABLE public.learning_modules OWNER TO postgres;

--
-- Name: learning_modules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.learning_modules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.learning_modules_id_seq OWNER TO postgres;

--
-- Name: learning_modules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.learning_modules_id_seq OWNED BY public.learning_modules.id;


--
-- Name: lesson_bookmarks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lesson_bookmarks (
    id integer NOT NULL,
    user_id integer NOT NULL,
    lesson_id integer NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lesson_bookmarks OWNER TO postgres;

--
-- Name: lesson_bookmarks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lesson_bookmarks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lesson_bookmarks_id_seq OWNER TO postgres;

--
-- Name: lesson_bookmarks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lesson_bookmarks_id_seq OWNED BY public.lesson_bookmarks.id;


--
-- Name: lesson_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lesson_notes (
    id integer NOT NULL,
    lesson_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lesson_notes OWNER TO postgres;

--
-- Name: lesson_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lesson_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lesson_notes_id_seq OWNER TO postgres;

--
-- Name: lesson_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lesson_notes_id_seq OWNED BY public.lesson_notes.id;


--
-- Name: lesson_pdfs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lesson_pdfs (
    id integer NOT NULL,
    lesson_id integer NOT NULL,
    title text NOT NULL,
    s3_key text NOT NULL,
    file_size_bytes integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lesson_pdfs OWNER TO postgres;

--
-- Name: lesson_pdfs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lesson_pdfs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lesson_pdfs_id_seq OWNER TO postgres;

--
-- Name: lesson_pdfs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lesson_pdfs_id_seq OWNED BY public.lesson_pdfs.id;


--
-- Name: lesson_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lesson_progress (
    id integer NOT NULL,
    user_id integer NOT NULL,
    lesson_id integer NOT NULL,
    module_id integer NOT NULL,
    completed_at timestamp with time zone DEFAULT now() NOT NULL,
    time_spent_seconds integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.lesson_progress OWNER TO postgres;

--
-- Name: lesson_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lesson_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lesson_progress_id_seq OWNER TO postgres;

--
-- Name: lesson_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lesson_progress_id_seq OWNED BY public.lesson_progress.id;


--
-- Name: lesson_quiz_questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lesson_quiz_questions (
    id integer NOT NULL,
    quiz_id integer NOT NULL,
    question text NOT NULL,
    type public.quiz_question_type DEFAULT 'mcq'::public.quiz_question_type NOT NULL,
    options text[] DEFAULT '{}'::text[] NOT NULL,
    correct_answers integer[] DEFAULT '{}'::integer[] NOT NULL,
    explanation text,
    points integer DEFAULT 10 NOT NULL,
    "order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.lesson_quiz_questions OWNER TO postgres;

--
-- Name: lesson_quiz_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lesson_quiz_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lesson_quiz_questions_id_seq OWNER TO postgres;

--
-- Name: lesson_quiz_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lesson_quiz_questions_id_seq OWNED BY public.lesson_quiz_questions.id;


--
-- Name: lesson_quizzes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lesson_quizzes (
    id integer NOT NULL,
    lesson_id integer NOT NULL,
    title text NOT NULL,
    passing_score integer DEFAULT 70 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    source_type text,
    source_assessment_id integer
);


ALTER TABLE public.lesson_quizzes OWNER TO postgres;

--
-- Name: lesson_quizzes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lesson_quizzes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lesson_quizzes_id_seq OWNER TO postgres;

--
-- Name: lesson_quizzes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lesson_quizzes_id_seq OWNED BY public.lesson_quizzes.id;


--
-- Name: lesson_resources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lesson_resources (
    id integer NOT NULL,
    lesson_id integer NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    type text DEFAULT 'link'::text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lesson_resources OWNER TO postgres;

--
-- Name: lesson_resources_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lesson_resources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lesson_resources_id_seq OWNER TO postgres;

--
-- Name: lesson_resources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lesson_resources_id_seq OWNED BY public.lesson_resources.id;


--
-- Name: lesson_video_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lesson_video_progress (
    id integer NOT NULL,
    user_id integer NOT NULL,
    lesson_id integer NOT NULL,
    position_seconds integer DEFAULT 0 NOT NULL,
    watched_percent integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lesson_video_progress OWNER TO postgres;

--
-- Name: lesson_video_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lesson_video_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lesson_video_progress_id_seq OWNER TO postgres;

--
-- Name: lesson_video_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lesson_video_progress_id_seq OWNED BY public.lesson_video_progress.id;


--
-- Name: lesson_videos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lesson_videos (
    id integer NOT NULL,
    lesson_id integer NOT NULL,
    s3_key text,
    video_url text,
    duration_seconds integer,
    resolution text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    title text,
    description text,
    thumbnail_url text,
    provider text,
    transcript text
);


ALTER TABLE public.lesson_videos OWNER TO postgres;

--
-- Name: lesson_videos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lesson_videos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lesson_videos_id_seq OWNER TO postgres;

--
-- Name: lesson_videos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lesson_videos_id_seq OWNED BY public.lesson_videos.id;


--
-- Name: lessons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lessons (
    id integer NOT NULL,
    module_id integer NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    "order" integer NOT NULL,
    type text DEFAULT 'video'::text NOT NULL,
    duration_minutes integer,
    is_published boolean DEFAULT false NOT NULL,
    is_free boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lessons OWNER TO postgres;

--
-- Name: lessons_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lessons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lessons_id_seq OWNER TO postgres;

--
-- Name: lessons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lessons_id_seq OWNED BY public.lessons.id;


--
-- Name: mentor_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mentor_profiles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    specialization text,
    years_of_experience integer,
    company text,
    designation text,
    linkedin_url text,
    calendly_url text,
    bio text,
    is_available boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    career_track public.career_track
);


ALTER TABLE public.mentor_profiles OWNER TO postgres;

--
-- Name: mentor_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mentor_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mentor_profiles_id_seq OWNER TO postgres;

--
-- Name: mentor_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mentor_profiles_id_seq OWNED BY public.mentor_profiles.id;


--
-- Name: mentor_students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mentor_students (
    id integer NOT NULL,
    mentor_id integer NOT NULL,
    student_id integer NOT NULL,
    batch_id integer,
    is_trial boolean DEFAULT false NOT NULL,
    assigned_by integer,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.mentor_students OWNER TO postgres;

--
-- Name: mentor_students_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mentor_students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mentor_students_id_seq OWNER TO postgres;

--
-- Name: mentor_students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mentor_students_id_seq OWNED BY public.mentor_students.id;


--
-- Name: mentor_task_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mentor_task_assignments (
    id integer NOT NULL,
    task_id integer NOT NULL,
    student_id integer NOT NULL,
    status public.mentor_task_assignment_status DEFAULT 'assigned'::public.mentor_task_assignment_status NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.mentor_task_assignments OWNER TO postgres;

--
-- Name: mentor_task_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mentor_task_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mentor_task_assignments_id_seq OWNER TO postgres;

--
-- Name: mentor_task_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mentor_task_assignments_id_seq OWNED BY public.mentor_task_assignments.id;


--
-- Name: mentor_task_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mentor_task_batches (
    id integer NOT NULL,
    task_id integer NOT NULL,
    batch_id integer NOT NULL
);


ALTER TABLE public.mentor_task_batches OWNER TO postgres;

--
-- Name: mentor_task_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mentor_task_batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mentor_task_batches_id_seq OWNER TO postgres;

--
-- Name: mentor_task_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mentor_task_batches_id_seq OWNED BY public.mentor_task_batches.id;


--
-- Name: mentor_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mentor_tasks (
    id integer NOT NULL,
    mentor_id integer NOT NULL,
    type public.mentor_task_type NOT NULL,
    title text NOT NULL,
    description text,
    content_url text,
    ref_id integer,
    career_track public.career_track NOT NULL,
    status public.mentor_task_status DEFAULT 'draft'::public.mentor_task_status NOT NULL,
    audience public.mentor_task_audience DEFAULT 'all_students'::public.mentor_task_audience NOT NULL,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    scheduled_at timestamp with time zone,
    published_at timestamp with time zone,
    archived_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.mentor_tasks OWNER TO postgres;

--
-- Name: mentor_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mentor_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mentor_tasks_id_seq OWNER TO postgres;

--
-- Name: mentor_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mentor_tasks_id_seq OWNED BY public.mentor_tasks.id;


--
-- Name: mock_interview_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mock_interview_assignments (
    id integer NOT NULL,
    template_id integer NOT NULL,
    student_id integer NOT NULL,
    batch_id integer,
    assigned_by integer NOT NULL,
    status public.mock_interview_assignment_status DEFAULT 'assigned'::public.mock_interview_assignment_status NOT NULL,
    interview_id integer,
    due_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    score integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.mock_interview_assignments OWNER TO postgres;

--
-- Name: mock_interview_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mock_interview_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mock_interview_assignments_id_seq OWNER TO postgres;

--
-- Name: mock_interview_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mock_interview_assignments_id_seq OWNED BY public.mock_interview_assignments.id;


--
-- Name: mock_interview_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mock_interview_templates (
    id integer NOT NULL,
    created_by integer NOT NULL,
    title text NOT NULL,
    description text,
    career_track public.career_track NOT NULL,
    interview_type public.mock_interview_type DEFAULT 'technical'::public.mock_interview_type NOT NULL,
    difficulty public.question_difficulty DEFAULT 'intermediate'::public.question_difficulty NOT NULL,
    status public.mock_interview_template_status DEFAULT 'draft'::public.mock_interview_template_status NOT NULL,
    total_questions integer DEFAULT 10 NOT NULL,
    duration_min integer DEFAULT 30 NOT NULL,
    rounds integer DEFAULT 1 NOT NULL,
    passing_score integer DEFAULT 60 NOT NULL,
    allow_voice boolean DEFAULT true NOT NULL,
    question_source public.mock_interview_source DEFAULT 'ai'::public.mock_interview_source NOT NULL,
    question_bank_ids integer[] DEFAULT '{}'::integer[] NOT NULL,
    custom_questions jsonb,
    focus_skills text[] DEFAULT '{}'::text[] NOT NULL,
    instructions text,
    scheduled_at timestamp with time zone,
    deadline timestamp with time zone,
    published_at timestamp with time zone,
    archived_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.mock_interview_templates OWNER TO postgres;

--
-- Name: mock_interview_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mock_interview_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mock_interview_templates_id_seq OWNER TO postgres;

--
-- Name: mock_interview_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mock_interview_templates_id_seq OWNED BY public.mock_interview_templates.id;


--
-- Name: module_enrollments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.module_enrollments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    module_id integer NOT NULL,
    track_id integer NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    progress_percent integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.module_enrollments OWNER TO postgres;

--
-- Name: module_enrollments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.module_enrollments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.module_enrollments_id_seq OWNER TO postgres;

--
-- Name: module_enrollments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.module_enrollments_id_seq OWNED BY public.module_enrollments.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    role text,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'system'::text NOT NULL,
    channel text DEFAULT 'in_app'::text NOT NULL,
    entity_type text,
    entity_id integer,
    link text,
    is_read boolean DEFAULT false NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: offers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.offers (
    id integer NOT NULL,
    application_id integer NOT NULL,
    student_id integer NOT NULL,
    job_id integer NOT NULL,
    salary integer,
    joining_date text,
    offer_letter_url text,
    status text DEFAULT 'sent'::text NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.offers OWNER TO postgres;

--
-- Name: offers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.offers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.offers_id_seq OWNER TO postgres;

--
-- Name: offers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.offers_id_seq OWNED BY public.offers.id;


--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_transactions (
    id integer NOT NULL,
    payment_id integer NOT NULL,
    provider text DEFAULT 'manual'::text NOT NULL,
    provider_txn_id text,
    status text DEFAULT 'success'::text NOT NULL,
    amount integer DEFAULT 0 NOT NULL,
    raw_payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payment_transactions OWNER TO postgres;

--
-- Name: payment_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_transactions_id_seq OWNER TO postgres;

--
-- Name: payment_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_transactions_id_seq OWNED BY public.payment_transactions.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    subscription_id integer,
    amount integer NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    gateway text DEFAULT 'razorpay'::text NOT NULL,
    gateway_order_id text,
    gateway_payment_id text,
    failure_reason text,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: placement_drives; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.placement_drives (
    id integer NOT NULL,
    tpo_id integer NOT NULL,
    company_id integer,
    company_name text NOT NULL,
    role text NOT NULL,
    career_track text,
    package_details text,
    mode text DEFAULT 'onsite'::text NOT NULL,
    venue text,
    meeting_url text,
    eligibility_criteria text,
    min_fts_score integer,
    status text DEFAULT 'draft'::text NOT NULL,
    drive_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.placement_drives OWNER TO postgres;

--
-- Name: placement_drives_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.placement_drives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.placement_drives_id_seq OWNER TO postgres;

--
-- Name: placement_drives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.placement_drives_id_seq OWNED BY public.placement_drives.id;


--
-- Name: placements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.placements (
    id integer NOT NULL,
    student_id integer NOT NULL,
    job_id integer,
    application_id integer,
    offer_id integer,
    employer_id integer,
    company_name text,
    career_track public.career_track,
    package_amount integer,
    status text DEFAULT 'placed'::text NOT NULL,
    placed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.placements OWNER TO postgres;

--
-- Name: placements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.placements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.placements_id_seq OWNER TO postgres;

--
-- Name: placements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.placements_id_seq OWNED BY public.placements.id;


--
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.platform_settings (
    id integer NOT NULL,
    trial_days integer DEFAULT 15 NOT NULL,
    logo_url text,
    banner_url text,
    terms_content text,
    privacy_content text,
    refund_content text,
    contact_email text,
    contact_phone text,
    contact_address text,
    updated_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.platform_settings OWNER TO postgres;

--
-- Name: platform_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.platform_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.platform_settings_id_seq OWNER TO postgres;

--
-- Name: platform_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.platform_settings_id_seq OWNED BY public.platform_settings.id;


--
-- Name: question_bank; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.question_bank (
    id integer NOT NULL,
    question_text text NOT NULL,
    question_type public.question_type DEFAULT 'mcq'::public.question_type NOT NULL,
    career_track public.career_track NOT NULL,
    difficulty public.question_difficulty DEFAULT 'intermediate'::public.question_difficulty NOT NULL,
    status public.question_status DEFAULT 'draft'::public.question_status NOT NULL,
    created_by integer NOT NULL,
    creator_role public.role NOT NULL,
    approved_by integer,
    approved_at timestamp with time zone,
    rejection_reason text,
    is_shared boolean DEFAULT false NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    topic text,
    bloom_level text,
    estimated_time_min integer,
    marks integer DEFAULT 1 NOT NULL,
    negative_marks real DEFAULT 0 NOT NULL,
    skills text[] DEFAULT '{}'::text[] NOT NULL,
    keywords text[] DEFAULT '{}'::text[] NOT NULL,
    explanation text,
    code_language text,
    code_template text,
    expected_output text,
    scenario_context text,
    usage_count integer DEFAULT 0 NOT NULL,
    ai_quality_score integer,
    ai_generated boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.question_bank OWNER TO postgres;

--
-- Name: question_bank_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.question_bank_batches (
    id integer NOT NULL,
    question_id integer NOT NULL,
    batch_id integer NOT NULL
);


ALTER TABLE public.question_bank_batches OWNER TO postgres;

--
-- Name: question_bank_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.question_bank_batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.question_bank_batches_id_seq OWNER TO postgres;

--
-- Name: question_bank_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.question_bank_batches_id_seq OWNED BY public.question_bank_batches.id;


--
-- Name: question_bank_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.question_bank_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.question_bank_id_seq OWNER TO postgres;

--
-- Name: question_bank_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.question_bank_id_seq OWNED BY public.question_bank.id;


--
-- Name: question_bank_options; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.question_bank_options (
    id integer NOT NULL,
    question_id integer NOT NULL,
    option_text text NOT NULL,
    is_correct boolean DEFAULT false NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.question_bank_options OWNER TO postgres;

--
-- Name: question_bank_options_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.question_bank_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.question_bank_options_id_seq OWNER TO postgres;

--
-- Name: question_bank_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.question_bank_options_id_seq OWNED BY public.question_bank_options.id;


--
-- Name: question_bank_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.question_bank_versions (
    id integer NOT NULL,
    question_id integer NOT NULL,
    version integer NOT NULL,
    snapshot jsonb NOT NULL,
    changed_by integer,
    change_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.question_bank_versions OWNER TO postgres;

--
-- Name: question_bank_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.question_bank_versions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.question_bank_versions_id_seq OWNER TO postgres;

--
-- Name: question_bank_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.question_bank_versions_id_seq OWNED BY public.question_bank_versions.id;


--
-- Name: quiz_attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quiz_attempts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    quiz_id integer NOT NULL,
    lesson_id integer NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    max_score integer DEFAULT 0 NOT NULL,
    passed boolean DEFAULT false NOT NULL,
    time_spent_seconds integer DEFAULT 0 NOT NULL,
    completed_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quiz_attempts OWNER TO postgres;

--
-- Name: quiz_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.quiz_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quiz_attempts_id_seq OWNER TO postgres;

--
-- Name: quiz_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.quiz_attempts_id_seq OWNED BY public.quiz_attempts.id;


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referrals (
    id integer NOT NULL,
    referrer_user_id integer NOT NULL,
    referred_user_id integer,
    code text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reward_type text,
    reward_value integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.referrals OWNER TO postgres;

--
-- Name: referrals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.referrals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.referrals_id_seq OWNER TO postgres;

--
-- Name: referrals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.referrals_id_seq OWNED BY public.referrals.id;


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.refresh_tokens_id_seq OWNER TO postgres;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: retention_policies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.retention_policies (
    id integer NOT NULL,
    entity_type text NOT NULL,
    retention_days integer NOT NULL,
    legal_basis text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.retention_policies OWNER TO postgres;

--
-- Name: retention_policies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.retention_policies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.retention_policies_id_seq OWNER TO postgres;

--
-- Name: retention_policies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.retention_policies_id_seq OWNED BY public.retention_policies.id;


--
-- Name: retention_purge_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.retention_purge_runs (
    id integer NOT NULL,
    trigger text DEFAULT 'scheduler'::text NOT NULL,
    triggered_by integer,
    dry_run boolean DEFAULT false NOT NULL,
    status text DEFAULT 'running'::text NOT NULL,
    summary jsonb,
    total_deleted integer DEFAULT 0 NOT NULL,
    error text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


ALTER TABLE public.retention_purge_runs OWNER TO postgres;

--
-- Name: retention_purge_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.retention_purge_runs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.retention_purge_runs_id_seq OWNER TO postgres;

--
-- Name: retention_purge_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.retention_purge_runs_id_seq OWNED BY public.retention_purge_runs.id;


--
-- Name: round_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.round_schedules (
    id integer NOT NULL,
    round_id integer NOT NULL,
    drive_id integer NOT NULL,
    student_id integer NOT NULL,
    slot_start timestamp with time zone NOT NULL,
    slot_end timestamp with time zone NOT NULL,
    venue text,
    meeting_url text,
    status text DEFAULT 'scheduled'::text NOT NULL,
    result text DEFAULT 'pending'::text NOT NULL,
    attendance text DEFAULT 'unknown'::text NOT NULL,
    score integer,
    feedback text,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.round_schedules OWNER TO postgres;

--
-- Name: round_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.round_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.round_schedules_id_seq OWNER TO postgres;

--
-- Name: round_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.round_schedules_id_seq OWNED BY public.round_schedules.id;


--
-- Name: sandbox_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sandbox_sessions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    lab_id integer,
    session_token text NOT NULL,
    container_name text,
    status text DEFAULT 'starting'::text NOT NULL,
    ip_address text,
    port integer,
    expires_at timestamp with time zone NOT NULL,
    terminated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sandbox_sessions OWNER TO postgres;

--
-- Name: sandbox_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sandbox_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sandbox_sessions_id_seq OWNER TO postgres;

--
-- Name: sandbox_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sandbox_sessions_id_seq OWNED BY public.sandbox_sessions.id;


--
-- Name: saved_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.saved_jobs (
    id integer NOT NULL,
    student_id integer NOT NULL,
    job_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.saved_jobs OWNER TO postgres;

--
-- Name: saved_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.saved_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.saved_jobs_id_seq OWNER TO postgres;

--
-- Name: saved_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.saved_jobs_id_seq OWNED BY public.saved_jobs.id;


--
-- Name: student_declarations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_declarations (
    id integer NOT NULL,
    student_id integer NOT NULL,
    declaration_id integer NOT NULL,
    signed_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.student_declarations OWNER TO postgres;

--
-- Name: student_declarations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_declarations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_declarations_id_seq OWNER TO postgres;

--
-- Name: student_declarations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_declarations_id_seq OWNED BY public.student_declarations.id;


--
-- Name: student_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_profiles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    college text,
    graduation_year integer,
    city text,
    linkedin_url text,
    github_url text,
    resume_url text,
    "current_role" text,
    bio text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    portfolio_url text,
    twitter_url text
);


ALTER TABLE public.student_profiles OWNER TO postgres;

--
-- Name: student_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_profiles_id_seq OWNER TO postgres;

--
-- Name: student_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_profiles_id_seq OWNED BY public.student_profiles.id;


--
-- Name: student_tpo_map; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_tpo_map (
    id integer NOT NULL,
    tpo_id integer NOT NULL,
    student_id integer NOT NULL,
    institution text,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.student_tpo_map OWNER TO postgres;

--
-- Name: student_tpo_map_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_tpo_map_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_tpo_map_id_seq OWNER TO postgres;

--
-- Name: student_tpo_map_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_tpo_map_id_seq OWNED BY public.student_tpo_map.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscriptions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    plan text DEFAULT 'free'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    start_date timestamp with time zone DEFAULT now() NOT NULL,
    end_date timestamp with time zone,
    payment_gateway text,
    external_sub_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    trial_ends_at timestamp with time zone,
    auto_renew boolean DEFAULT false NOT NULL,
    coupon_code text,
    referral_code text,
    canceled_at timestamp with time zone
);


ALTER TABLE public.subscriptions OWNER TO postgres;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscriptions_id_seq OWNER TO postgres;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: support_ticket_replies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_ticket_replies (
    id integer NOT NULL,
    ticket_id integer NOT NULL,
    author_id integer NOT NULL,
    message text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.support_ticket_replies OWNER TO postgres;

--
-- Name: support_ticket_replies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.support_ticket_replies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.support_ticket_replies_id_seq OWNER TO postgres;

--
-- Name: support_ticket_replies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.support_ticket_replies_id_seq OWNED BY public.support_ticket_replies.id;


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_tickets (
    id integer NOT NULL,
    ticket_uid uuid DEFAULT gen_random_uuid() NOT NULL,
    category text DEFAULT 'other'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    subject text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_by integer NOT NULL,
    assigned_to integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone
);


ALTER TABLE public.support_tickets OWNER TO postgres;

--
-- Name: support_tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.support_tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.support_tickets_id_seq OWNER TO postgres;

--
-- Name: support_tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.support_tickets_id_seq OWNED BY public.support_tickets.id;


--
-- Name: tpo_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tpo_profiles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    institution text NOT NULL,
    institution_code text,
    designation text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    approval_status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by integer,
    reviewed_at timestamp with time zone,
    rejection_reason text
);


ALTER TABLE public.tpo_profiles OWNER TO postgres;

--
-- Name: tpo_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tpo_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tpo_profiles_id_seq OWNER TO postgres;

--
-- Name: tpo_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tpo_profiles_id_seq OWNED BY public.tpo_profiles.id;


--
-- Name: tracks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tracks (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    domain public.domain NOT NULL,
    description text NOT NULL,
    difficulty public.difficulty NOT NULL,
    duration_weeks integer NOT NULL,
    total_modules integer DEFAULT 0 NOT NULL,
    enrolled_count integer DEFAULT 0 NOT NULL,
    icon_url text,
    accent_color text DEFAULT '#2563EB'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tracks OWNER TO postgres;

--
-- Name: tracks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tracks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tracks_id_seq OWNER TO postgres;

--
-- Name: tracks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tracks_id_seq OWNED BY public.tracks.id;


--
-- Name: user_lesson_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_lesson_notes (
    id integer NOT NULL,
    user_id integer NOT NULL,
    lesson_id integer NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_lesson_notes OWNER TO postgres;

--
-- Name: user_lesson_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_lesson_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_lesson_notes_id_seq OWNER TO postgres;

--
-- Name: user_lesson_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_lesson_notes_id_seq OWNED BY public.user_lesson_notes.id;


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_preferences (
    id integer NOT NULL,
    user_id integer NOT NULL,
    theme text DEFAULT 'system'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email_notifications boolean DEFAULT true NOT NULL,
    push_notifications boolean DEFAULT true NOT NULL,
    marketing_emails boolean DEFAULT false NOT NULL,
    weekly_digest boolean DEFAULT true NOT NULL,
    profile_visible boolean DEFAULT true NOT NULL,
    show_on_leaderboard boolean DEFAULT true NOT NULL
);


ALTER TABLE public.user_preferences OWNER TO postgres;

--
-- Name: user_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_preferences_id_seq OWNER TO postgres;

--
-- Name: user_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_preferences_id_seq OWNED BY public.user_preferences.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email text,
    phone text,
    full_name text,
    role public.role DEFAULT 'student'::public.role NOT NULL,
    onboarding_step public.onboarding_step DEFAULT 'consent'::public.onboarding_step NOT NULL,
    selected_track_id integer,
    avatar_url text,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    password_hash text,
    career_track public.career_track
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: ai_career_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_career_reports ALTER COLUMN id SET DEFAULT nextval('public.ai_career_reports_id_seq'::regclass);


--
-- Name: ai_feature_config id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_feature_config ALTER COLUMN id SET DEFAULT nextval('public.ai_feature_config_id_seq'::regclass);


--
-- Name: ai_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_history ALTER COLUMN id SET DEFAULT nextval('public.ai_history_id_seq'::regclass);


--
-- Name: ai_interviews id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_interviews ALTER COLUMN id SET DEFAULT nextval('public.ai_interviews_id_seq'::regclass);


--
-- Name: ai_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_reports ALTER COLUMN id SET DEFAULT nextval('public.ai_reports_id_seq'::regclass);


--
-- Name: ai_resume_analysis id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_resume_analysis ALTER COLUMN id SET DEFAULT nextval('public.ai_resume_analysis_id_seq'::regclass);


--
-- Name: ai_skill_gap_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_skill_gap_reports ALTER COLUMN id SET DEFAULT nextval('public.ai_skill_gap_reports_id_seq'::regclass);


--
-- Name: application_status_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_status_history ALTER COLUMN id SET DEFAULT nextval('public.application_status_history_id_seq'::regclass);


--
-- Name: assessment_answers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_answers ALTER COLUMN id SET DEFAULT nextval('public.assessment_answers_id_seq'::regclass);


--
-- Name: assessment_attempts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_attempts ALTER COLUMN id SET DEFAULT nextval('public.assessment_attempts_id_seq'::regclass);


--
-- Name: assessment_options id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_options ALTER COLUMN id SET DEFAULT nextval('public.assessment_options_id_seq'::regclass);


--
-- Name: assessment_questions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_questions ALTER COLUMN id SET DEFAULT nextval('public.assessment_questions_id_seq'::regclass);


--
-- Name: assessment_results id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_results ALTER COLUMN id SET DEFAULT nextval('public.assessment_results_id_seq'::regclass);


--
-- Name: assessments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessments ALTER COLUMN id SET DEFAULT nextval('public.assessments_id_seq'::regclass);


--
-- Name: assignment_submissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_submissions ALTER COLUMN id SET DEFAULT nextval('public.assignment_submissions_id_seq'::regclass);


--
-- Name: assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments ALTER COLUMN id SET DEFAULT nextval('public.assignments_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: auto_apply_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auto_apply_settings ALTER COLUMN id SET DEFAULT nextval('public.auto_apply_settings_id_seq'::regclass);


--
-- Name: batch_students id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batch_students ALTER COLUMN id SET DEFAULT nextval('public.batch_students_id_seq'::regclass);


--
-- Name: batches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batches ALTER COLUMN id SET DEFAULT nextval('public.batches_id_seq'::regclass);


--
-- Name: broadcast_notes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_notes ALTER COLUMN id SET DEFAULT nextval('public.broadcast_notes_id_seq'::regclass);


--
-- Name: broadcast_recipients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_recipients ALTER COLUMN id SET DEFAULT nextval('public.broadcast_recipients_id_seq'::regclass);


--
-- Name: campus_drive_registrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campus_drive_registrations ALTER COLUMN id SET DEFAULT nextval('public.campus_drive_registrations_id_seq'::regclass);


--
-- Name: campus_drives id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campus_drives ALTER COLUMN id SET DEFAULT nextval('public.campus_drives_id_seq'::regclass);


--
-- Name: certificate_auto_issue_config id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificate_auto_issue_config ALTER COLUMN id SET DEFAULT nextval('public.certificate_auto_issue_config_id_seq'::regclass);


--
-- Name: certificate_generation_jobs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificate_generation_jobs ALTER COLUMN id SET DEFAULT nextval('public.certificate_generation_jobs_id_seq'::regclass);


--
-- Name: certificate_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificate_templates ALTER COLUMN id SET DEFAULT nextval('public.certificate_templates_id_seq'::regclass);


--
-- Name: certificates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates ALTER COLUMN id SET DEFAULT nextval('public.certificates_id_seq'::regclass);


--
-- Name: checkpoint_progress id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checkpoint_progress ALTER COLUMN id SET DEFAULT nextval('public.checkpoint_progress_id_seq'::regclass);


--
-- Name: checkpoints id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checkpoints ALTER COLUMN id SET DEFAULT nextval('public.checkpoints_id_seq'::regclass);


--
-- Name: community_post_likes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_post_likes ALTER COLUMN id SET DEFAULT nextval('public.community_post_likes_id_seq'::regclass);


--
-- Name: community_posts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_posts ALTER COLUMN id SET DEFAULT nextval('public.community_posts_id_seq'::regclass);


--
-- Name: consent_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consent_history ALTER COLUMN id SET DEFAULT nextval('public.consent_history_id_seq'::regclass);


--
-- Name: consent_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consent_logs ALTER COLUMN id SET DEFAULT nextval('public.consent_logs_id_seq'::regclass);


--
-- Name: coupons id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupons ALTER COLUMN id SET DEFAULT nextval('public.coupons_id_seq'::regclass);


--
-- Name: data_correction_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_correction_requests ALTER COLUMN id SET DEFAULT nextval('public.data_correction_requests_id_seq'::regclass);


--
-- Name: data_delete_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_delete_requests ALTER COLUMN id SET DEFAULT nextval('public.data_delete_requests_id_seq'::regclass);


--
-- Name: data_download_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_download_requests ALTER COLUMN id SET DEFAULT nextval('public.data_download_requests_id_seq'::regclass);


--
-- Name: declarations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.declarations ALTER COLUMN id SET DEFAULT nextval('public.declarations_id_seq'::regclass);


--
-- Name: discussion_comments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discussion_comments ALTER COLUMN id SET DEFAULT nextval('public.discussion_comments_id_seq'::regclass);


--
-- Name: discussion_likes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discussion_likes ALTER COLUMN id SET DEFAULT nextval('public.discussion_likes_id_seq'::regclass);


--
-- Name: discussion_posts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discussion_posts ALTER COLUMN id SET DEFAULT nextval('public.discussion_posts_id_seq'::regclass);


--
-- Name: drive_invites id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drive_invites ALTER COLUMN id SET DEFAULT nextval('public.drive_invites_id_seq'::regclass);


--
-- Name: drive_rounds id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drive_rounds ALTER COLUMN id SET DEFAULT nextval('public.drive_rounds_id_seq'::regclass);


--
-- Name: email_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_logs ALTER COLUMN id SET DEFAULT nextval('public.email_logs_id_seq'::regclass);


--
-- Name: employers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employers ALTER COLUMN id SET DEFAULT nextval('public.employers_id_seq'::regclass);


--
-- Name: event_registrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_registrations ALTER COLUMN id SET DEFAULT nextval('public.event_registrations_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: files id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files ALTER COLUMN id SET DEFAULT nextval('public.files_id_seq'::regclass);


--
-- Name: fts_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fts_history ALTER COLUMN id SET DEFAULT nextval('public.fts_history_id_seq'::regclass);


--
-- Name: fts_scores id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fts_scores ALTER COLUMN id SET DEFAULT nextval('public.fts_scores_id_seq'::regclass);


--
-- Name: interviews id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interviews ALTER COLUMN id SET DEFAULT nextval('public.interviews_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: job_applications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_applications ALTER COLUMN id SET DEFAULT nextval('public.job_applications_id_seq'::regclass);


--
-- Name: job_matches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_matches ALTER COLUMN id SET DEFAULT nextval('public.job_matches_id_seq'::regclass);


--
-- Name: job_shortlists id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_shortlists ALTER COLUMN id SET DEFAULT nextval('public.job_shortlists_id_seq'::regclass);


--
-- Name: job_skills id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_skills ALTER COLUMN id SET DEFAULT nextval('public.job_skills_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: lab_assets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_assets ALTER COLUMN id SET DEFAULT nextval('public.lab_assets_id_seq'::regclass);


--
-- Name: lab_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_assignments ALTER COLUMN id SET DEFAULT nextval('public.lab_assignments_id_seq'::regclass);


--
-- Name: lab_attempts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_attempts ALTER COLUMN id SET DEFAULT nextval('public.lab_attempts_id_seq'::regclass);


--
-- Name: lab_hints id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_hints ALTER COLUMN id SET DEFAULT nextval('public.lab_hints_id_seq'::regclass);


--
-- Name: lab_module_completions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_module_completions ALTER COLUMN id SET DEFAULT nextval('public.lab_module_completions_id_seq'::regclass);


--
-- Name: lab_modules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_modules ALTER COLUMN id SET DEFAULT nextval('public.lab_modules_id_seq'::regclass);


--
-- Name: lab_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_reports ALTER COLUMN id SET DEFAULT nextval('public.lab_reports_id_seq'::regclass);


--
-- Name: lab_versions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_versions ALTER COLUMN id SET DEFAULT nextval('public.lab_versions_id_seq'::regclass);


--
-- Name: labs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.labs ALTER COLUMN id SET DEFAULT nextval('public.labs_id_seq'::regclass);


--
-- Name: learning_modules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.learning_modules ALTER COLUMN id SET DEFAULT nextval('public.learning_modules_id_seq'::regclass);


--
-- Name: lesson_bookmarks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_bookmarks ALTER COLUMN id SET DEFAULT nextval('public.lesson_bookmarks_id_seq'::regclass);


--
-- Name: lesson_notes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_notes ALTER COLUMN id SET DEFAULT nextval('public.lesson_notes_id_seq'::regclass);


--
-- Name: lesson_pdfs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_pdfs ALTER COLUMN id SET DEFAULT nextval('public.lesson_pdfs_id_seq'::regclass);


--
-- Name: lesson_progress id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_progress ALTER COLUMN id SET DEFAULT nextval('public.lesson_progress_id_seq'::regclass);


--
-- Name: lesson_quiz_questions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_quiz_questions ALTER COLUMN id SET DEFAULT nextval('public.lesson_quiz_questions_id_seq'::regclass);


--
-- Name: lesson_quizzes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_quizzes ALTER COLUMN id SET DEFAULT nextval('public.lesson_quizzes_id_seq'::regclass);


--
-- Name: lesson_resources id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_resources ALTER COLUMN id SET DEFAULT nextval('public.lesson_resources_id_seq'::regclass);


--
-- Name: lesson_video_progress id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_video_progress ALTER COLUMN id SET DEFAULT nextval('public.lesson_video_progress_id_seq'::regclass);


--
-- Name: lesson_videos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_videos ALTER COLUMN id SET DEFAULT nextval('public.lesson_videos_id_seq'::regclass);


--
-- Name: lessons id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons ALTER COLUMN id SET DEFAULT nextval('public.lessons_id_seq'::regclass);


--
-- Name: mentor_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_profiles ALTER COLUMN id SET DEFAULT nextval('public.mentor_profiles_id_seq'::regclass);


--
-- Name: mentor_students id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_students ALTER COLUMN id SET DEFAULT nextval('public.mentor_students_id_seq'::regclass);


--
-- Name: mentor_task_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_task_assignments ALTER COLUMN id SET DEFAULT nextval('public.mentor_task_assignments_id_seq'::regclass);


--
-- Name: mentor_task_batches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_task_batches ALTER COLUMN id SET DEFAULT nextval('public.mentor_task_batches_id_seq'::regclass);


--
-- Name: mentor_tasks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_tasks ALTER COLUMN id SET DEFAULT nextval('public.mentor_tasks_id_seq'::regclass);


--
-- Name: mock_interview_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mock_interview_assignments ALTER COLUMN id SET DEFAULT nextval('public.mock_interview_assignments_id_seq'::regclass);


--
-- Name: mock_interview_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mock_interview_templates ALTER COLUMN id SET DEFAULT nextval('public.mock_interview_templates_id_seq'::regclass);


--
-- Name: module_enrollments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_enrollments ALTER COLUMN id SET DEFAULT nextval('public.module_enrollments_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: offers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.offers ALTER COLUMN id SET DEFAULT nextval('public.offers_id_seq'::regclass);


--
-- Name: payment_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_transactions ALTER COLUMN id SET DEFAULT nextval('public.payment_transactions_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: placement_drives id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.placement_drives ALTER COLUMN id SET DEFAULT nextval('public.placement_drives_id_seq'::regclass);


--
-- Name: placements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.placements ALTER COLUMN id SET DEFAULT nextval('public.placements_id_seq'::regclass);


--
-- Name: platform_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_settings ALTER COLUMN id SET DEFAULT nextval('public.platform_settings_id_seq'::regclass);


--
-- Name: question_bank id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank ALTER COLUMN id SET DEFAULT nextval('public.question_bank_id_seq'::regclass);


--
-- Name: question_bank_batches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank_batches ALTER COLUMN id SET DEFAULT nextval('public.question_bank_batches_id_seq'::regclass);


--
-- Name: question_bank_options id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank_options ALTER COLUMN id SET DEFAULT nextval('public.question_bank_options_id_seq'::regclass);


--
-- Name: question_bank_versions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank_versions ALTER COLUMN id SET DEFAULT nextval('public.question_bank_versions_id_seq'::regclass);


--
-- Name: quiz_attempts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_attempts ALTER COLUMN id SET DEFAULT nextval('public.quiz_attempts_id_seq'::regclass);


--
-- Name: referrals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals ALTER COLUMN id SET DEFAULT nextval('public.referrals_id_seq'::regclass);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Name: retention_policies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retention_policies ALTER COLUMN id SET DEFAULT nextval('public.retention_policies_id_seq'::regclass);


--
-- Name: retention_purge_runs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retention_purge_runs ALTER COLUMN id SET DEFAULT nextval('public.retention_purge_runs_id_seq'::regclass);


--
-- Name: round_schedules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.round_schedules ALTER COLUMN id SET DEFAULT nextval('public.round_schedules_id_seq'::regclass);


--
-- Name: sandbox_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sandbox_sessions ALTER COLUMN id SET DEFAULT nextval('public.sandbox_sessions_id_seq'::regclass);


--
-- Name: saved_jobs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_jobs ALTER COLUMN id SET DEFAULT nextval('public.saved_jobs_id_seq'::regclass);


--
-- Name: student_declarations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_declarations ALTER COLUMN id SET DEFAULT nextval('public.student_declarations_id_seq'::regclass);


--
-- Name: student_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles ALTER COLUMN id SET DEFAULT nextval('public.student_profiles_id_seq'::regclass);


--
-- Name: student_tpo_map id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_tpo_map ALTER COLUMN id SET DEFAULT nextval('public.student_tpo_map_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- Name: support_ticket_replies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_ticket_replies ALTER COLUMN id SET DEFAULT nextval('public.support_ticket_replies_id_seq'::regclass);


--
-- Name: support_tickets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets ALTER COLUMN id SET DEFAULT nextval('public.support_tickets_id_seq'::regclass);


--
-- Name: tpo_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tpo_profiles ALTER COLUMN id SET DEFAULT nextval('public.tpo_profiles_id_seq'::regclass);


--
-- Name: tracks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tracks ALTER COLUMN id SET DEFAULT nextval('public.tracks_id_seq'::regclass);


--
-- Name: user_lesson_notes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_lesson_notes ALTER COLUMN id SET DEFAULT nextval('public.user_lesson_notes_id_seq'::regclass);


--
-- Name: user_preferences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_preferences_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: ai_career_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_career_reports (id, user_id, "current_role", target_role, roadmap, timeline_months, confidence, generated_at, created_at) FROM stdin;
1	11	Cybersecurity (learner)	Cybersecurity	[{"phase":1,"title":"Foundations","durationWeeks":4,"focus":["SIEM (Splunk/ELK) log analysis","Incident triage & escalation","MITRE ATT&CK mapping"]},{"phase":2,"title":"Hands-on depth","durationWeeks":6,"focus":["Network traffic analysis","Threat intelligence","Windows/Linux event forensics"]},{"phase":3,"title":"Specialisation & evidence","durationWeeks":4,"focus":["Detection engineering","Playbook automation (SOAR)"]},{"phase":4,"title":"Placement prep","durationWeeks":2,"focus":["Resume + portfolio","Mock interviews","Targeted applications"]}]	4	0	2026-06-21 09:30:01.776954+00	2026-06-21 09:30:01.776954+00
2	11	Cybersecurity (learner)	Cybersecurity	[{"phase":1,"title":"Foundations","durationWeeks":4,"focus":["SIEM (Splunk/ELK) log analysis","Incident triage & escalation","MITRE ATT&CK mapping"]},{"phase":2,"title":"Hands-on depth","durationWeeks":6,"focus":["Network traffic analysis","Threat intelligence","Windows/Linux event forensics"]},{"phase":3,"title":"Specialisation & evidence","durationWeeks":4,"focus":["Detection engineering","Playbook automation (SOAR)"]},{"phase":4,"title":"Placement prep","durationWeeks":2,"focus":["Resume + portfolio","Mock interviews","Targeted applications"]}]	4	0	2026-06-21 09:30:30.148746+00	2026-06-21 09:30:30.148746+00
\.


--
-- Data for Name: ai_feature_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_feature_config (id, feature, enabled, settings, updated_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ai_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_history (id, user_id, session_id, role, content, model, tokens, created_at) FROM stdin;
1	11	tutor-11-1782034194086	user	Explain: SQL injection (beginner)	\N	\N	2026-06-21 09:29:54.087212+00
2	11	tutor-11-1782034194086	assistant	Let's break down "SQL injection" in the context of Cybersecurity work. At its core, SQL injection is about understanding how attackers and defenders interact so you can make the right decision quickly. As a Cybersecurity, you'll meet SQL injection whenever you investigate activity, justify a finding, or design a control. Start with the "what" and "why" before the "how": know what problem SQL injection solves, then learn the tools that apply it.	mock	\N	2026-06-21 09:29:54.093764+00
3	14	tutor-14-1782036714577	user	Explain: What is a firewall (beginner)	\N	\N	2026-06-21 10:11:54.579107+00
4	14	tutor-14-1782036714577	assistant	A firewall is a security device or software that monitors and controls incoming and outgoing network traffic based on predetermined security rules. It acts as a barrier between a trusted internal network and untrusted external networks, like the internet, to prevent unauthorized access and threats.	openai	\N	2026-06-21 10:11:54.589222+00
5	14	career-14	user	How do I get my first SOC job?	\N	\N	2026-06-21 10:12:30.839825+00
6	14	career-14	assistant	Getting your first Security Operations Center (SOC) job can be a challenging but rewarding journey. Here’s a step-by-step guide tailored for you, considering your current status:\n\n### Step 1: Understand the SOC Role\n1. **Research SOC Functions**: Understand the responsibilities of SOC analysts, which typically include monitoring security alerts, analyzing incidents, and responding to security threats.\n2. **Learn Key Concepts**: Familiarize yourself with concepts like SIEM (Security Information and Event Management), incident response, threat hunting, and network security.\n\n### Step 2: Education and Skill Development\n1. **Enroll in Cybersecurity Courses**: Look for online courses that cover foundational cybersecurity topics. Platforms like Coursera, edX, or Udemy offer relevant courses. Consider certifications like CompTIA Security+, which is recognized and valuable in India.\n2. **Hands-on Labs**: Engage in practical labs. Websites like TryHackMe, Hack The Box, or Cybrary provide hands-on experiences that are crucial for SOC roles. Aim for at least 5-10 labs to build your confidence.\n\n### Step 3: Build Your Resume\n1. **Create a Resume**: Start crafting your resume. Highlight any relevant coursework, certifications, and any personal projects or labs you’ve completed. Use a clear format and tailor your resume for SOC positions.\n2. **Include Technical Skills**: Emphasize skills such as familiarity with security tools (e.g., Splunk, Wireshark), basic scripting (Python, Bash), and knowledge of operating systems (Linux, Windows).\n\n### Step 4: Networking and Community Engagement\n1. **Join Cybersecurity Communities**: Engage with local or online communities. Look for groups on platforms like LinkedIn, Meetup, or even Discord focused on cybersecurity in India. Participate in discussions, ask questions, and learn from peers.\n2. **Attend Webinars and Workshops**: Participate in cybersecurity webinars and workshops. These are often hosted by industry experts and can provide insights as well as networking opportunities.\n\n### Step 5: Gain Experience\n1. **Internships and Entry-Level Positions**: Look for internships or entry-level positions in IT support or junior cybersecurity roles. Many companies in India have internships specifically for SOC positions, which can provide valuable experience.\n2. **Volunteer or Freelance**: Offer your skills to non-profits or startups that may need help with their cybersecurity posture. This can help you gain practical experience and references.\n\n### Step 6: Prepare for Interviews\n1. **Mock Interviews**: Once you feel prepared, practice mock interviews. You can do this with peers or use platforms designed for interview practice. Focus on both technical and behavioral questions.\n2. **Study Common Interview Questions**: Prepare for common SOC analyst interview questions such as:\n   - Describe a time you handled a security incident.\n   - What tools and technologies are you familiar with?\n   - How do you stay updated on the latest cybersecurity threats?\n\n### Step 7: Apply for SOC Roles\n1. **Job Portals**: Use job portals like Naukri, LinkedIn, and Indeed to search for SOC analyst roles. Tailor your application for each job based on the skills and experiences mentioned in the job description.\n2. **Follow Up**: After applying, follow up on your applications if you do not hear back within a couple of weeks. This shows your interest in the position.\n\n### Step 8: Continuous Learning\n1. **Stay Updated**: Cybersecurity is an ever-evolving field. Follow blogs, podcasts, and news sources like Krebs on Security, Dark Reading, or The Hacker News to keep abreast of the latest trends and threats.\n2. **Consider Further Certifications**: Once you gain some experience, consider pursuing advanced certifications like CEH (Certified Ethical Hacker) or CISSP (Certified Information Systems Security Professional).\n\nBy following these actionable steps and maintaining a proactive approach, you can significantly enhance your chances of landing your first SOC job in India. Good luck!	openai	\N	2026-06-21 10:12:30.885906+00
7	14	tutor-14-1782036816682	user	Explain: What is a firewall (beginner)	\N	\N	2026-06-21 10:13:36.683704+00
8	14	tutor-14-1782036816682	assistant	Let's break down "What is a firewall" in the context of Cybersecurity work. At its core, What is a firewall is about understanding how attackers and defenders interact so you can make the right decision quickly. As a Cybersecurity, you'll meet What is a firewall whenever you investigate activity, justify a finding, or design a control. Start with the "what" and "why" before the "how": know what problem What is a firewall solves, then learn the tools that apply it.	mock	\N	2026-06-21 10:13:36.690465+00
9	14	tutor-14-1782036846187	user	Explain: What is SIEM (beginner)	\N	\N	2026-06-21 10:14:06.188635+00
10	14	tutor-14-1782036846187	assistant	SIEM stands for Security Information and Event Management. It is a solution that collects, analyzes, and manages security data from across an organization's IT infrastructure. SIEM helps in identifying potential threats, monitoring security events in real-time, and ensuring compliance with regulations.	openai	\N	2026-06-21 10:14:06.313313+00
11	4	career-4	user	What skills do I need for my track?	\N	\N	2026-06-23 04:43:42.436336+00
12	4	career-4	assistant	As a SOC (Security Operations Center) Analyst, there are several key skills and areas of knowledge that you need to develop to be successful in this role, particularly in the Indian job market. Here’s a breakdown of essential skills and knowledge areas:\n\n### 1. **Technical Skills**\n   - **Network Security**: Understand TCP/IP, network protocols, firewalls, VPNs, and intrusion detection/prevention systems (IDS/IPS).\n   - **Operating Systems**: Familiarity with various operating systems, particularly Windows and Linux, as they are commonly targeted by cyber threats.\n   - **Security Information and Event Management (SIEM)**: Learn to use SIEM tools like Splunk, IBM QRadar, or ArcSight to analyze security events and alerts.\n   - **Incident Response**: Know the steps involved in detecting, responding to, and recovering from security incidents.\n\n### 2. **Tools and Technologies**\n   - **Endpoint Protection**: Familiarity with antivirus/anti-malware solutions, endpoint detection and response (EDR) tools.\n   - **Vulnerability Management Tools**: Understanding of tools like Nessus or Qualys for identifying vulnerabilities in systems.\n   - **Threat Intelligence Platforms**: Familiarity with platforms that aggregate threat data to help identify potential risks.\n\n### 3. **Certifications**\n   - Consider pursuing relevant certifications that can enhance your resume:\n     - **CompTIA Security+**: A foundational certification covering essential security concepts.\n     - **Certified SOC Analyst (CSA)**: A certification specifically for SOC analysts.\n     - **Certified Information Systems Security Professional (CISSP)**: More advanced and recognized globally.\n\n### 4. **Soft Skills**\n   - **Analytical Thinking**: Ability to analyze large volumes of data to identify patterns and anomalies.\n   - **Communication Skills**: Strong verbal and written communication skills are essential for reporting incidents and collaborating with teams.\n   - **Attention to Detail**: Being meticulous can help in identifying subtle signs of breaches or vulnerabilities.\n\n### 5. **Knowledge of Cybersecurity Frameworks**\n   - Familiarize yourself with frameworks and standards like NIST, ISO 27001, and CIS Controls, which are essential for understanding security best practices.\n\n### 6. **Regulatory Compliance**\n   - Understand key regulations relevant to India, such as the Information Technology Act, GDPR (if working with European clients), and industry-specific compliance standards.\n\n### Actionable Steps:\n1. **Start Learning**: Enroll in online courses focusing on SOC Analyst topics. Platforms like Coursera, Udemy, or Cybrary offer relevant courses.\n2. **Hands-On Labs**: Look for platforms that provide practical labs, such as TryHackMe or Hack The Box, to gain hands-on experience.\n3. **Build Your Resume**: Start working on your resume. Include any relevant coursework, labs, or projects. Highlight any technical skills you are currently developing.\n4. **Mock Interviews**: Begin practicing with mock interviews. This will help you articulate your knowledge and experience effectively.\n5. **Networking**: Join cybersecurity forums, attend local meetups, or connect with professionals on LinkedIn to learn from their experiences and find mentorship opportunities.\n\n### Conclusion\nBy focusing on these skills and taking actionable steps, you can significantly improve your readiness for a role as a SOC Analyst in India. Aim for a balanced approach, combining technical knowledge with practical experience, and actively seek opportunities to network and learn from others in the field.	openai	\N	2026-06-23 04:43:42.45226+00
13	26	tutor-26-1782198331902	user	Explain: xss (beginner)	\N	\N	2026-06-23 07:05:31.904534+00
14	26	tutor-26-1782198331902	assistant	XSS, or Cross-Site Scripting, is a web vulnerability that allows attackers to inject malicious scripts into web pages viewed by users. This can lead to unauthorized actions or data theft. It typically occurs when a web application does not properly validate or sanitize user input.	openai	\N	2026-06-23 07:05:31.90989+00
\.


--
-- Data for Name: ai_interviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_interviews (id, user_id, track_id, job_id, status, difficulty, total_questions, started_at, completed_at, created_at, interview_type, questions, answers, evaluation, overall_score, template_id, assignment_id, assigned_by) FROM stdin;
1	14	\N	\N	in_progress	intermediate	6	2026-06-21 10:12:33.332+00	\N	2026-06-21 10:12:33.333644+00	text	[{"index": 0, "question": "Walk me through how you would triage a suspected phishing alert from your SIEM."}, {"index": 1, "question": "What is the difference between an IOC and an IOA? Give an example of each."}, {"index": 2, "question": "How would you use the MITRE ATT&CK framework during an investigation?"}, {"index": 3, "question": "A user reports their machine is slow and pops up ads. How do you investigate?"}, {"index": 4, "question": "Explain the difference between true positive, false positive, and benign true positive."}, {"index": 5, "question": "How do you reduce alert fatigue in a SOC?"}]	[]	\N	\N	\N	\N	\N
2	14	\N	\N	in_progress	intermediate	4	2026-06-21 10:13:04.68+00	\N	2026-06-21 10:13:04.681939+00	text	[{"index": 0, "question": "Walk me through how you would triage a suspected phishing alert from your SIEM."}, {"index": 1, "question": "What is the difference between an IOC and an IOA? Give an example of each."}, {"index": 2, "question": "How would you use the MITRE ATT&CK framework during an investigation?"}, {"index": 3, "question": "A user reports their machine is slow and pops up ads. How do you investigate?"}]	[]	\N	\N	\N	\N	\N
3	2	\N	\N	completed	intermediate	8	2026-06-22 03:17:13.28+00	2026-06-22 03:17:27.685+00	2026-06-22 03:17:13.28159+00	voice	[{"index": 0, "question": "Walk me through how you would triage a suspected phishing alert from your SIEM."}, {"index": 1, "question": "What is the difference between an IOC and an IOA? Give an example of each."}, {"index": 2, "question": "How would you use the MITRE ATT&CK framework during an investigation?"}, {"index": 3, "question": "A user reports their machine is slow and pops up ads. How do you investigate?"}, {"index": 4, "question": "Explain the difference between true positive, false positive, and benign true positive."}, {"index": 5, "question": "How do you reduce alert fatigue in a SOC?"}, {"index": 6, "question": "What Windows event IDs would you look at for failed and successful logons?"}, {"index": 7, "question": "Describe the incident response lifecycle and where the SOC fits in."}]	[{"index": 0, "answer": "Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.", "question": "Walk me through how you would triage a suspected phishing alert from your SIEM."}, {"index": 1, "answer": "Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.", "question": "What is the difference between an IOC and an IOA? Give an example of each."}, {"index": 2, "answer": "Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.", "question": "How would you use the MITRE ATT&CK framework during an investigation?"}, {"index": 3, "answer": "Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.", "question": "A user reports their machine is slow and pops up ads. How do you investigate?"}, {"index": 4, "answer": "Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.", "question": "Explain the difference between true positive, false positive, and benign true positive."}, {"index": 5, "answer": "Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.", "question": "How do you reduce alert fatigue in a SOC?"}, {"index": 6, "answer": "Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.", "question": "What Windows event IDs would you look at for failed and successful logons?"}, {"index": 7, "answer": "Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.", "question": "Describe the incident response lifecycle and where the SOC fits in."}]	{"scores": {"grammar": 80, "quality": 85, "thinking": 80, "technical": 90, "confidence": 90, "communication": 85}, "overall": 85, "strengths": ["Strong technical knowledge", "Good understanding of SIEM and incident response", "Confident in responses"], "weaknesses": ["Repetitive answers suggesting a lack of depth in specific questions", "Grammar could be improved for clarity"], "perQuestion": [{"score": 85, "answer": "Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.", "feedback": "Good structure but could include more specific steps.", "question": "Walk me through how you would triage a suspected phishing alert from your SIEM."}, {"score": 80, "answer": "Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.", "feedback": "Answer was too generic; examples were needed.", "question": "What is the difference between an IOC and an IOA? Give an example of each."}, {"score": 85, "answer": "Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.", "feedback": "Good understanding but could elaborate on practical application.", "question": "How would you use the MITRE ATT&CK framework during an investigation?"}, {"score": 80, "answer": "Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.", "feedback": "Need to focus more on specific investigative steps.", "question": "A user reports their machine is slow and pops up ads. How do you investigate?"}, {"score": 80, "answer": "Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.", "feedback": "Clarification needed on definitions and examples.", "question": "Explain the difference between true positive, false positive, and benign true positive."}, {"score": 85, "answer": "Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.", "feedback": "Solid answer but could include innovative strategies.", "question": "How do you reduce alert fatigue in a SOC?"}, {"score": 80, "answer": "Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.", "feedback": "Specific IDs needed for a complete answer.", "question": "What Windows event IDs would you look at for failed and successful logons?"}, {"score": 85, "answer": "Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.", "feedback": "Good overall understanding but more detail on SOC integration would help.", "question": "Describe the incident response lifecycle and where the SOC fits in."}], "recommendations": ["Provide more varied and specific examples in answers", "Work on grammar and sentence structure for better clarity"]}	85	1	1	16
4	2	\N	\N	completed	beginner	3	2026-06-22 03:31:53.316+00	2026-06-22 03:32:00.813+00	2026-06-22 03:31:53.317387+00	voice	[{"index": 0, "question": "What is a log file and why is it important in security operations?"}, {"index": 1, "question": "Can you explain the difference between system logs and application logs?"}, {"index": 2, "question": "What are some common log formats you might encounter in a security operations center?"}]	[{"index": 0, "answer": "Logs are event records used to detect and investigate security incidents.", "question": "What is a log file and why is it important in security operations?"}, {"index": 1, "answer": "Logs are event records used to detect and investigate security incidents.", "question": "Can you explain the difference between system logs and application logs?"}, {"index": 2, "answer": "Logs are event records used to detect and investigate security incidents.", "question": "What are some common log formats you might encounter in a security operations center?"}]	{"scores": {"grammar": 80, "quality": 25, "thinking": 20, "technical": 20, "confidence": 40, "communication": 30}, "overall": 36, "strengths": ["Good grammar"], "weaknesses": ["Lack of technical knowledge", "Inability to differentiate between log types", "Poor communication of ideas", "Low confidence in responses", "Inadequate depth of answers"], "perQuestion": [{"score": 20, "answer": "Logs are event records used to detect and investigate security incidents.", "feedback": "The answer is too vague and lacks specific details about the importance of log files in security operations.", "question": "What is a log file and why is it important in security operations?"}, {"score": 10, "answer": "Logs are event records used to detect and investigate security incidents.", "feedback": "The answer does not address the question at all; no differentiation is provided.", "question": "Can you explain the difference between system logs and application logs?"}, {"score": 10, "answer": "Logs are event records used to detect and investigate security incidents.", "feedback": "The response is a repetition of previous answers and does not provide any information on log formats.", "question": "What are some common log formats you might encounter in a security operations center?"}], "recommendations": ["Study log file formats and their significance in security", "Practice articulating differences between log types", "Develop confidence through mock interviews", "Enhance communication skills by explaining concepts to peers", "Engage with practical examples in security operations"]}	36	3	2	16
5	1	\N	\N	in_progress	beginner	5	2026-06-23 04:27:22.013+00	\N	2026-06-23 04:27:22.014815+00	voice	[{"index": 0, "question": "Explain how you would approach a black-box web application penetration test."}, {"index": 1, "question": "What is the difference between stored, reflected, and DOM-based XSS?"}, {"index": 2, "question": "How does a SQL injection attack work and how do you remediate it?"}, {"index": 3, "question": "Walk me through privilege escalation on a Linux host you've already accessed."}, {"index": 4, "question": "How do you score a vulnerability using CVSS? What goes into the base metrics?"}]	[]	\N	\N	\N	\N	\N
8	26	\N	\N	completed	beginner	3	2026-06-23 08:23:36.368+00	2026-06-23 08:30:26.818+00	2026-06-23 08:23:36.368841+00	text	[{"index": 0, "question": "Explain how you would approach a black-box web application penetration test."}, {"index": 1, "question": "What is the difference between stored, reflected, and DOM-based XSS?"}, {"index": 2, "question": "How does a SQL injection attack work and how do you remediate it?"}]	[{"index": 0, "answer": "\\"When approaching a black-box web application penetration test, I treat it as a simulation of a real-world, external attacker with zero prior knowledge of the target. To ensure the assessment is thorough, safe, and actionable for the client, I follow a strict, structured methodology aligned with frameworks like the OWASP Web Security Testing Guide (WSTG).My approach is broken down into six distinct phases:1. Pre-Engagement and Scope ValidationBefore running any technical tools, I review the Rules of Engagement (RoE). I confirm the exact scope—including domains, subdomains, and APIs—and note any explicit exclusions, rate limits, or testing windows. This ensures we stay legally compliant and avoid disrupting production environments.2. Passive and Active ReconnaissanceNext, I map out the attack surface.Passively, I use OSINT, historical DNS records, and tools like Shodan to find exposed infrastructure without touching the target directly.Actively, I fingerprinted the tech stack using tools like WhatWeb or Burp Suite to identify the web server, underlying frameworks, OS, and any CMS versions, looking for known CVEs right out of the gate.3. Enumeration and Attack Surface MappingI then map the entire application logic. I use spidering and crawling tools to find visible paths, combined with directory brute-forcing using tools like ffuf or Gobuster to discover unlinked assets, backup files, or hidden admin panels. I pay close attention to all input vectors—such as URL parameters, HTTP headers, cookies, and API endpoints.4. Vulnerability Assessment & Deep Manual TestingWhile I might use automated scanners like Burp Scanner or Nuclei to catch low-hanging fruit quickly, the core of my testing is manual. I focus heavily on the OWASP Top 10:Authentication/Session Management: I check for weak password controls, session fixation, and brute-force protections.Input Validation: I manually inject payloads to test for SQLi, XSS, and Command Injection.Access Controls: I actively test for Broken Object Level Authorization (BOLA/IDOR) by swapping user identifiers in requests to see if a low-privilege user can access unauthorized data.5. Controlled ExploitationIf I find a vulnerability, I attempt exploitation to verify its impact and eliminate false positives. However, I always do this safely. If I find a Remote Code Execution (RCE) flaw, I will stop at a benign Proof of Concept—like running whoami or hostname—rather than executing disruptive actions, unless explicitly authorized by the client to proceed further.6. Reporting and DeliverablesFinally, the most critical part of the test is translating findings into value for the client. I draft a report split into two sections:An Executive Summary explaining the overall security posture and business risk in non-technical terms.A detailed Technical Findings section providing step-by-step reproduction instructions, CVSS scoring, and specific, actionable remediation advice—such as advising developers on parameterized queries for SQLi or context-aware encoding for XSS.Ultimately, my goal isn't just to 'break' things, but to provide a clear roadmap that helps the development and security teams effectively harden their ap", "question": "Explain how you would approach a black-box web application penetration test."}, {"index": 1, "answer": "\\"The fundamental difference between Stored, Reflected, and DOM-based Cross-Site Scripting (XSS) lies in where the malicious payload resides and how it gets executed by the victim’s browser.Here is how I break them down:1. Stored XSS (Persistent)Stored XSS is the most dangerous type because the malicious script is permanently saved on the target server—such as in a database, a comment section, a profile field, or a chat log.Mechanism: The attacker submits a malicious script into a form vector. The server saves it directly to the database. Later, whenever a clean user requests that specific page, the server retrieves the payload and serves it back to their browser, executing the script automatically.Impact: High. It requires no social engineering or convincing a user to click a link. Anyone who visits the affected page becomes a victim.2. Reflected XSS (Non-Persistent)Reflected XSS occurs when the malicious payload is part of the request sent to the server and is immediately 'reflected' back in the server's immediate HTTP response.Mechanism: The attacker crafts a malicious URL containing the script parameter (e.g., http://example.com<script>...) and tricks a victim into clicking it. The server takes that input, inserts it directly into the response page without proper validation or sanitization, and sends it back to the browser, which then executes it.Impact: Medium. It requires active social engineering (like a phishing email) to deliver the malicious link to a specific target. If a user doesn't click the link, they aren't infected.3. DOM-based XSS (Client-Side)Unlike Stored and Reflected XSS, where the payload goes to the server and comes back in the HTML source code, DOM-based XSS happens entirely on the client-side, inside the browser's Document Object Model (DOM).Mechanism: The server is completely unaware of the payload. Instead, the application's legitimate, client-side JavaScript reads data from an untrusted user-controlled 'Source' (like location.search or document.referrer) and insecurely passes it to an execution 'Sink' (like element.innerHTML, eval(), or document.write).Impact: Medium. Like Reflected XSS, it requires a user to click a link, but it can bypass many traditional server-side Web Application Firewalls (WAFs) because the payload never hits the server-side logic.", "question": "What is the difference between stored, reflected, and DOM-based XSS?"}, {"index": 2, "answer": "At its core, a SQL Injection—or SQLi—attack occurs when an application takes user-supplied data and insecurely concatenates it directly into a database query string. This breaks the boundary between data and code, allowing an attacker to manipulate the structure of the query and execute arbitrary SQL commands.How It WorksTo give a classic example, imagine a standard login form. The backend might generate a query dynamically like:SELECT * FROM users WHERE username = 'INPUT_USER' AND password = 'INPUT_PASSWORD'.If the application is vulnerable, an attacker can input something like admin' OR '1'='1 into the username field. Because the input isn't isolated, that single quote closes the data block early, and the OR '1'='1' adds a condition that evaluates to true for every single row. The database executes this modified logic, bypasses the password check entirely, and returns the first record—granting the attacker administrative access.Depending on the type of SQLi—whether it's In-band where they see the data directly, Inferential/Blind where they infer data based on true/false responses or time delays, or Out-of-band—the business impact can range from complete data exfiltration and tampering to total database destruction or even Remote Code Execution (RCE) on the underlying server.How to Remediate ItWhen advising development teams, I emphasize that the goal is to enforce a strict separation between code and data. There are three key ways I address remediation:Parameterized Queries (Prepared Statements): This is the gold-standard defense. By using placeholders instead of string concatenation, the database compiles the SQL query structure before the user input is inserted. When the input finally arrives, the database treats it strictly as a literal value—a string or an integer—and never as executable code. Even if a payload like OR '1'='1' is passed, it is safely stored as a literal username.Object-Relational Mapping (ORMs): I encourage teams to leverage modern ORMs like Hibernate, Entity Framework, or Django ORM. By default, these frameworks natively construct parameterized queries under the hood for standard database interactions.Defense-in-Depth Measures: For elements that cannot be parameterized—such as dynamic table names or sorting parameters like ASC and DESC—I mandate strict allow-listing. Furthermore, I advocate for the Principle of Least Privilege at the database level. The web application’s database account should only have the minimal permissions needed to function—such as SELECT and INSERT—and should never run with administrative roles like DBA, sa, or root to heavily limit the blast radius if a vulnerability does slip through.", "question": "How does a SQL injection attack work and how do you remediate it?"}]	{"scores": {"grammar": 90, "quality": 90, "thinking": 90, "technical": 95, "confidence": 80, "communication": 85}, "overall": 88, "strengths": ["In-depth technical knowledge", "Structured approach to penetration testing", "Clear understanding of web vulnerabilities"], "weaknesses": ["Could improve on concise communication", "Some minor grammatical errors"], "perQuestion": [{"score": 95, "answer": "\\"When approaching a black-box web application penetration test, I treat it as a simulation of a real-world, external attacker with zero prior knowledge of the target. To ensure the assessment is thorough, safe, and actionable for the client, I follow a strict, structured methodology aligned with frameworks like the OWASP Web Security Testing Guide (WSTG).My approach is broken down into six distinct phases:1. Pre-Engagement and Scope ValidationBefore running any technical tools, I review the Rules of Engagement (RoE). I confirm the exact scope—including domains, subdomains, and APIs—and note any explicit exclusions, rate limits, or testing windows. This ensures we stay legally compliant and avoid disrupting production environments.2. Passive and Active ReconnaissanceNext, I map out the attack surface.Passively, I use OSINT, historical DNS records, and tools like Shodan to find exposed infrastructure without touching the target directly.Actively, I fingerprinted the tech stack using tools like WhatWeb or Burp Suite to identify the web server, underlying frameworks, OS, and any CMS versions, looking for known CVEs right out of the gate.3. Enumeration and Attack Surface MappingI then map the entire application logic. I use spidering and crawling tools to find visible paths, combined with directory brute-forcing using tools like ffuf or Gobuster to discover unlinked assets, backup files, or hidden admin panels. I pay close attention to all input vectors—such as URL parameters, HTTP headers, cookies, and API endpoints.4. Vulnerability Assessment & Deep Manual TestingWhile I might use automated scanners like Burp Scanner or Nuclei to catch low-hanging fruit quickly, the core of my testing is manual. I focus heavily on the OWASP Top 10:Authentication/Session Management: I check for weak password controls, session fixation, and brute-force protections.Input Validation: I manually inject payloads to test for SQLi, XSS, and Command Injection.Access Controls: I actively test for Broken Object Level Authorization (BOLA/IDOR) by swapping user identifiers in requests to see if a low-privilege user can access unauthorized data.5. Controlled ExploitationIf I find a vulnerability, I attempt exploitation to verify its impact and eliminate false positives. However, I always do this safely. If I find a Remote Code Execution (RCE) flaw, I will stop at a benign Proof of Concept—like running whoami or hostname—rather than executing disruptive actions, unless explicitly authorized by the client to proceed further.6. Reporting and DeliverablesFinally, the most critical part of the test is translating findings into value for the client. I draft a report split into two sections:An Executive Summary explaining the overall security posture and business risk in non-technical terms.A detailed Technical Findings section providing step-by-step reproduction instructions, CVSS scoring, and specific, actionable remediation advice—such as advising developers on parameterized queries for SQLi or context-aware encoding for XSS.Ultimately, my goal isn't just to 'break' things, but to provide a clear roadmap that helps the development and security teams effectively harden their ap", "feedback": "Excellent structured approach and technical depth.", "question": "Explain how you would approach a black-box web application penetration test."}, {"score": 90, "answer": "\\"The fundamental difference between Stored, Reflected, and DOM-based Cross-Site Scripting (XSS) lies in where the malicious payload resides and how it gets executed by the victim’s browser.Here is how I break them down:1. Stored XSS (Persistent)Stored XSS is the most dangerous type because the malicious script is permanently saved on the target server—such as in a database, a comment section, a profile field, or a chat log.Mechanism: The attacker submits a malicious script into a form vector. The server saves it directly to the database. Later, whenever a clean user requests that specific page, the server retrieves the payload and serves it back to their browser, executing the script automatically.Impact: High. It requires no social engineering or convincing a user to click a link. Anyone who visits the affected page becomes a victim.2. Reflected XSS (Non-Persistent)Reflected XSS occurs when the malicious payload is part of the request sent to the server and is immediately 'reflected' back in the server's immediate HTTP response.Mechanism: The attacker crafts a malicious URL containing the script parameter (e.g., http://example.com<script>...) and tricks a victim into clicking it. The server takes that input, inserts it directly into the response page without proper validation or sanitization, and sends it back to the browser, which then executes it.Impact: Medium. It requires active social engineering (like a phishing email) to deliver the malicious link to a specific target. If a user doesn't click the link, they aren't infected.3. DOM-based XSS (Client-Side)Unlike Stored and Reflected XSS, where the payload goes to the server and comes back in the HTML source code, DOM-based XSS happens entirely on the client-side, inside the browser's Document Object Model (DOM).Mechanism: The server is completely unaware of the payload. Instead, the application's legitimate, client-side JavaScript reads data from an untrusted user-controlled 'Source' (like location.search or document.referrer) and insecurely passes it to an execution 'Sink' (like element.innerHTML, eval(), or document.write).Impact: Medium. Like Reflected XSS, it requires a user to click a link, but it can bypass many traditional server-side Web Application Firewalls (WAFs) because the payload never hits the server-side logic.", "feedback": "Well-explained differences with clear examples.", "question": "What is the difference between stored, reflected, and DOM-based XSS?"}, {"score": 70, "answer": "At its core, a SQL Injection—or SQLi—attack occurs when an application takes user-supplied data and insecurely concatenates it directly into a database query string. This breaks the bounda", "feedback": "Incomplete answer. Make sure to finish your thoughts.", "question": "How does a SQL injection attack work and how do you remediate it?"}], "recommendations": ["Practice delivering answers in a more concise manner", "Review grammar rules to minimize errors in technical documentation"]}	88	\N	\N	\N
6	1	\N	\N	completed	intermediate	5	2026-06-23 04:29:26.776+00	2026-06-23 04:32:02.415+00	2026-06-23 04:29:26.777122+00	text	[{"index": 0, "question": "Explain how you would approach a black-box web application penetration test."}, {"index": 1, "question": "What is the difference between stored, reflected, and DOM-based XSS?"}, {"index": 2, "question": "How does a SQL injection attack work and how do you remediate it?"}, {"index": 3, "question": "Walk me through privilege escalation on a Linux host you've already accessed."}, {"index": 4, "question": "How do you score a vulnerability using CVSS? What goes into the base metrics?"}]	[{"index": 0, "answer": "Velnerabillity assessment and penetration testing", "question": "Explain how you would approach a black-box web application penetration test."}, {"index": 1, "answer": "Dom is a cybersecurity", "question": "What is the difference between stored, reflected, and DOM-based XSS?"}, {"index": 2, "answer": "SQL injection run tha comment line", "question": "How does a SQL injection attack work and how do you remediate it?"}, {"index": 3, "answer": "Assess your own life", "question": "Walk me through privilege escalation on a Linux host you've already accessed."}, {"index": 4, "answer": "CVSS created in 2026", "question": "How do you score a vulnerability using CVSS? What goes into the base metrics?"}]	{"scores": {"grammar": 30, "quality": 20, "thinking": 25, "technical": 20, "confidence": 40, "communication": 25}, "overall": 25, "strengths": [], "weaknesses": ["Poor understanding of fundamental concepts", "Inadequate technical knowledge", "Weak communication skills", "Low confidence in responses", "Insufficient detail in answers"], "perQuestion": [{"score": 10, "answer": "Velnerabillity assessment and penetration testing", "feedback": "The answer lacks clarity and does not demonstrate a solid understanding of the approach to black-box testing.", "question": "Explain how you would approach a black-box web application penetration test."}, {"score": 10, "answer": "Dom is a cybersecurity", "feedback": "The response is vague and does not address the differences between the types of XSS.", "question": "What is the difference between stored, reflected, and DOM-based XSS?"}, {"score": 15, "answer": "SQL injection run tha comment line", "feedback": "The answer is unclear and does not explain how SQL injection works or how to remediate it.", "question": "How does a SQL injection attack work and how do you remediate it?"}, {"score": 5, "answer": "Assess your own life", "feedback": "The answer is completely unrelated to the question and shows a lack of understanding of privilege escalation.", "question": "Walk me through privilege escalation on a Linux host you've already accessed."}, {"score": 0, "answer": "CVSS created in 2026", "feedback": "The response is factually incorrect and does not address the scoring of vulnerabilities using CVSS.", "question": "How do you score a vulnerability using CVSS? What goes into the base metrics?"}], "recommendations": ["Enhance technical knowledge through study and practice", "Improve communication skills by engaging in discussions", "Practice explaining concepts clearly and concisely", "Participate in mock interviews for confidence building", "Focus on understanding key cybersecurity concepts and terminology"]}	25	\N	\N	\N
7	26	\N	\N	in_progress	beginner	3	2026-06-23 07:04:12.355+00	\N	2026-06-23 07:04:12.357069+00	text	[{"index": 0, "question": "Explain how you would approach a black-box web application penetration test."}, {"index": 1, "question": "What is the difference between stored, reflected, and DOM-based XSS?"}, {"index": 2, "question": "How does a SQL injection attack work and how do you remediate it?"}]	[{"index": 0, "answer": "kjopk;'e,'eepflfe", "question": "Explain how you would approach a black-box web application penetration test."}, {"index": 1, "answer": "cross site scripting", "question": "What is the difference between stored, reflected, and DOM-based XSS?"}]	\N	\N	\N	\N	\N
\.


--
-- Data for Name: ai_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_reports (id, user_id, entity_type, entity_id, report_type, content, metadata, generated_at, created_at) FROM stdin;
1	11	career	11	career_report	{"skillGap":{"current":[],"required":["SIEM (Splunk/ELK) log analysis","Incident triage & escalation","MITRE ATT&CK mapping","Network traffic analysis","Threat intelligence","Windows/Linux event forensics","Detection engineering","Playbook automation (SOAR)"],"gap":["SIEM (Splunk/ELK) log analysis","Incident triage & escalation","MITRE ATT&CK mapping","Network traffic analysis","Threat intelligence","Windows/Linux event forensics","Detection engineering","Playbook automation (SOAR)"],"summary":"You've started building 0/8 core SOC Analyst skills. Prioritise: SIEM (Splunk/ELK) log analysis, Incident triage & escalation, MITRE ATT&CK mapping."},"roadmap":[{"phase":1,"title":"Foundations","durationWeeks":4,"focus":["SIEM (Splunk/ELK) log analysis","Incident triage & escalation","MITRE ATT&CK mapping"]},{"phase":2,"title":"Hands-on depth","durationWeeks":6,"focus":["Network traffic analysis","Threat intelligence","Windows/Linux event forensics"]},{"phase":3,"title":"Specialisation & evidence","durationWeeks":4,"focus":["Detection engineering","Playbook automation (SOAR)"]},{"phase":4,"title":"Placement prep","durationWeeks":2,"focus":["Resume + portfolio","Mock interviews","Targeted applications"]}],"certifications":[{"name":"CompTIA Security+","provider":"CompTIA","level":"Foundation","why":"Baseline credential most Indian SOC hiring filters expect."},{"name":"Splunk Core Certified User","provider":"Splunk","level":"Associate","why":"SIEM proficiency is the #1 SOC L1 hiring signal."},{"name":"Microsoft SC-200","provider":"Microsoft","level":"Associate","why":"Sentinel/Defender SOC tooling is common in Indian MSSPs."},{"name":"GIAC GCIA / Blue Team Level 1","provider":"GIAC / SBT","level":"Professional","why":"Differentiator for L2/L3 detection roles."}],"targetCompanies":[{"name":"Wipro CyberSecurity (CRS)","roles":["SOC Analyst L1","Threat Monitoring"],"location":"Bengaluru / Pune","tier":"Service"},{"name":"TCS Cyber Defense","roles":["Security Analyst","SIEM Engineer"],"location":"Hyderabad / Chennai","tier":"Service"},{"name":"Accenture Security","roles":["SOC Analyst","Incident Response"],"location":"Bengaluru / Gurugram","tier":"Consulting"},{"name":"Sequretek / CloudSEK","roles":["SOC L1/L2","Threat Intel Analyst"],"location":"Mumbai / Bengaluru","tier":"Product"}],"expectedSalary":{"currency":"INR LPA","fresher":{"min":3.5,"max":6},"mid":{"min":7,"max":14},"senior":{"min":16,"max":28},"note":"Indicative India ranges for SOC Analyst roles; metros and product companies skew higher."},"placementReadiness":{"score":0,"level":"Getting started","factors":[{"label":"Foundational skill (FTS)","score":0,"max":30,"note":"FTS score 0/100."},{"label":"Hands-on labs","score":0,"max":20,"note":"0 lab(s) completed."},{"label":"Learning progress","score":0,"max":15,"note":"0 module(s) completed."},{"label":"Interview practice","score":0,"max":15,"note":"0 mock interview(s)."},{"label":"Interview quality","score":0,"max":10,"note":"No interview scored yet."},{"label":"Resume ready","score":0,"max":10,"note":"Upload & analyze your resume."}],"summary":"Begin with the learning track and your first labs to build momentum."}}	{"provider":"mock"}	2026-06-21 09:30:01.833271+00	2026-06-21 09:30:01.833271+00
2	11	career	11	career_report	{"skillGap":{"current":[],"required":["SIEM (Splunk/ELK) log analysis","Incident triage & escalation","MITRE ATT&CK mapping","Network traffic analysis","Threat intelligence","Windows/Linux event forensics","Detection engineering","Playbook automation (SOAR)"],"gap":["SIEM (Splunk/ELK) log analysis","Incident triage & escalation","MITRE ATT&CK mapping","Network traffic analysis","Threat intelligence","Windows/Linux event forensics","Detection engineering","Playbook automation (SOAR)"],"summary":"You've started building 0/8 core SOC Analyst skills. Prioritise: SIEM (Splunk/ELK) log analysis, Incident triage & escalation, MITRE ATT&CK mapping."},"roadmap":[{"phase":1,"title":"Foundations","durationWeeks":4,"focus":["SIEM (Splunk/ELK) log analysis","Incident triage & escalation","MITRE ATT&CK mapping"]},{"phase":2,"title":"Hands-on depth","durationWeeks":6,"focus":["Network traffic analysis","Threat intelligence","Windows/Linux event forensics"]},{"phase":3,"title":"Specialisation & evidence","durationWeeks":4,"focus":["Detection engineering","Playbook automation (SOAR)"]},{"phase":4,"title":"Placement prep","durationWeeks":2,"focus":["Resume + portfolio","Mock interviews","Targeted applications"]}],"certifications":[{"name":"CompTIA Security+","provider":"CompTIA","level":"Foundation","why":"Baseline credential most Indian SOC hiring filters expect."},{"name":"Splunk Core Certified User","provider":"Splunk","level":"Associate","why":"SIEM proficiency is the #1 SOC L1 hiring signal."},{"name":"Microsoft SC-200","provider":"Microsoft","level":"Associate","why":"Sentinel/Defender SOC tooling is common in Indian MSSPs."},{"name":"GIAC GCIA / Blue Team Level 1","provider":"GIAC / SBT","level":"Professional","why":"Differentiator for L2/L3 detection roles."}],"targetCompanies":[{"name":"Wipro CyberSecurity (CRS)","roles":["SOC Analyst L1","Threat Monitoring"],"location":"Bengaluru / Pune","tier":"Service"},{"name":"TCS Cyber Defense","roles":["Security Analyst","SIEM Engineer"],"location":"Hyderabad / Chennai","tier":"Service"},{"name":"Accenture Security","roles":["SOC Analyst","Incident Response"],"location":"Bengaluru / Gurugram","tier":"Consulting"},{"name":"Sequretek / CloudSEK","roles":["SOC L1/L2","Threat Intel Analyst"],"location":"Mumbai / Bengaluru","tier":"Product"}],"expectedSalary":{"currency":"INR LPA","fresher":{"min":3.5,"max":6},"mid":{"min":7,"max":14},"senior":{"min":16,"max":28},"note":"Indicative India ranges for SOC Analyst roles; metros and product companies skew higher."},"placementReadiness":{"score":0,"level":"Getting started","factors":[{"label":"Foundational skill (FTS)","score":0,"max":30,"note":"FTS score 0/100."},{"label":"Hands-on labs","score":0,"max":20,"note":"0 lab(s) completed."},{"label":"Learning progress","score":0,"max":15,"note":"0 module(s) completed."},{"label":"Interview practice","score":0,"max":15,"note":"0 mock interview(s)."},{"label":"Interview quality","score":0,"max":10,"note":"No interview scored yet."},{"label":"Resume ready","score":0,"max":10,"note":"Upload & analyze your resume."}],"summary":"Begin with the learning track and your first labs to build momentum."}}	{"provider":"mock"}	2026-06-21 09:30:30.152137+00	2026-06-21 09:30:30.152137+00
3	2	ai_interview	3	interview_evaluation	{"scores":{"technical":90,"grammar":80,"communication":85,"confidence":90,"thinking":80,"quality":85},"overall":85,"strengths":["Strong technical knowledge","Good understanding of SIEM and incident response","Confident in responses"],"weaknesses":["Repetitive answers suggesting a lack of depth in specific questions","Grammar could be improved for clarity"],"recommendations":["Provide more varied and specific examples in answers","Work on grammar and sentence structure for better clarity"],"perQuestion":[{"question":"Walk me through how you would triage a suspected phishing alert from your SIEM.","answer":"Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.","score":85,"feedback":"Good structure but could include more specific steps."},{"question":"What is the difference between an IOC and an IOA? Give an example of each.","answer":"Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.","score":80,"feedback":"Answer was too generic; examples were needed."},{"question":"How would you use the MITRE ATT&CK framework during an investigation?","answer":"Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.","score":85,"feedback":"Good understanding but could elaborate on practical application."},{"question":"A user reports their machine is slow and pops up ads. How do you investigate?","answer":"Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.","score":80,"feedback":"Need to focus more on specific investigative steps."},{"question":"Explain the difference between true positive, false positive, and benign true positive.","answer":"Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.","score":80,"feedback":"Clarification needed on definitions and examples."},{"question":"How do you reduce alert fatigue in a SOC?","answer":"Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.","score":85,"feedback":"Solid answer but could include innovative strategies."},{"question":"What Windows event IDs would you look at for failed and successful logons?","answer":"Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.","score":80,"feedback":"Specific IDs needed for a complete answer."},{"question":"Describe the incident response lifecycle and where the SOC fits in.","answer":"Detailed answer covering SIEM correlation, alert triage, MITRE ATT&CK mapping, and escalation workflow.","score":85,"feedback":"Good overall understanding but more detail on SOC integration would help."}]}	{"provider":"openai","track":"soc","name":"SOC Analyst"}	2026-06-22 03:17:27.708695+00	2026-06-22 03:17:27.708695+00
4	2	ai_interview	4	interview_evaluation	{"scores":{"technical":20,"grammar":80,"communication":30,"confidence":40,"thinking":20,"quality":25},"overall":36,"strengths":["Good grammar"],"weaknesses":["Lack of technical knowledge","Inability to differentiate between log types","Poor communication of ideas","Low confidence in responses","Inadequate depth of answers"],"recommendations":["Study log file formats and their significance in security","Practice articulating differences between log types","Develop confidence through mock interviews","Enhance communication skills by explaining concepts to peers","Engage with practical examples in security operations"],"perQuestion":[{"question":"What is a log file and why is it important in security operations?","answer":"Logs are event records used to detect and investigate security incidents.","score":20,"feedback":"The answer is too vague and lacks specific details about the importance of log files in security operations."},{"question":"Can you explain the difference between system logs and application logs?","answer":"Logs are event records used to detect and investigate security incidents.","score":10,"feedback":"The answer does not address the question at all; no differentiation is provided."},{"question":"What are some common log formats you might encounter in a security operations center?","answer":"Logs are event records used to detect and investigate security incidents.","score":10,"feedback":"The response is a repetition of previous answers and does not provide any information on log formats."}]}	{"provider":"openai","track":"soc","name":"SOC Analyst"}	2026-06-22 03:32:00.826021+00	2026-06-22 03:32:00.826021+00
5	1	ai_interview	6	interview_evaluation	{"scores":{"technical":20,"grammar":30,"communication":25,"confidence":40,"thinking":25,"quality":20},"overall":25,"strengths":[],"weaknesses":["Poor understanding of fundamental concepts","Inadequate technical knowledge","Weak communication skills","Low confidence in responses","Insufficient detail in answers"],"recommendations":["Enhance technical knowledge through study and practice","Improve communication skills by engaging in discussions","Practice explaining concepts clearly and concisely","Participate in mock interviews for confidence building","Focus on understanding key cybersecurity concepts and terminology"],"perQuestion":[{"question":"Explain how you would approach a black-box web application penetration test.","answer":"Velnerabillity assessment and penetration testing","score":10,"feedback":"The answer lacks clarity and does not demonstrate a solid understanding of the approach to black-box testing."},{"question":"What is the difference between stored, reflected, and DOM-based XSS?","answer":"Dom is a cybersecurity","score":10,"feedback":"The response is vague and does not address the differences between the types of XSS."},{"question":"How does a SQL injection attack work and how do you remediate it?","answer":"SQL injection run tha comment line","score":15,"feedback":"The answer is unclear and does not explain how SQL injection works or how to remediate it."},{"question":"Walk me through privilege escalation on a Linux host you've already accessed.","answer":"Assess your own life","score":5,"feedback":"The answer is completely unrelated to the question and shows a lack of understanding of privilege escalation."},{"question":"How do you score a vulnerability using CVSS? What goes into the base metrics?","answer":"CVSS created in 2026","score":0,"feedback":"The response is factually incorrect and does not address the scoring of vulnerabilities using CVSS."}]}	{"provider":"openai","track":"vapt","name":"VAPT Professional"}	2026-06-23 04:32:02.425494+00	2026-06-23 04:32:02.425494+00
6	26	ai_interview	8	interview_evaluation	{"scores":{"technical":95,"grammar":90,"communication":85,"confidence":80,"thinking":90,"quality":90},"overall":88,"strengths":["In-depth technical knowledge","Structured approach to penetration testing","Clear understanding of web vulnerabilities"],"weaknesses":["Could improve on concise communication","Some minor grammatical errors"],"recommendations":["Practice delivering answers in a more concise manner","Review grammar rules to minimize errors in technical documentation"],"perQuestion":[{"question":"Explain how you would approach a black-box web application penetration test.","answer":"\\"When approaching a black-box web application penetration test, I treat it as a simulation of a real-world, external attacker with zero prior knowledge of the target. To ensure the assessment is thorough, safe, and actionable for the client, I follow a strict, structured methodology aligned with frameworks like the OWASP Web Security Testing Guide (WSTG).My approach is broken down into six distinct phases:1. Pre-Engagement and Scope ValidationBefore running any technical tools, I review the Rules of Engagement (RoE). I confirm the exact scope—including domains, subdomains, and APIs—and note any explicit exclusions, rate limits, or testing windows. This ensures we stay legally compliant and avoid disrupting production environments.2. Passive and Active ReconnaissanceNext, I map out the attack surface.Passively, I use OSINT, historical DNS records, and tools like Shodan to find exposed infrastructure without touching the target directly.Actively, I fingerprinted the tech stack using tools like WhatWeb or Burp Suite to identify the web server, underlying frameworks, OS, and any CMS versions, looking for known CVEs right out of the gate.3. Enumeration and Attack Surface MappingI then map the entire application logic. I use spidering and crawling tools to find visible paths, combined with directory brute-forcing using tools like ffuf or Gobuster to discover unlinked assets, backup files, or hidden admin panels. I pay close attention to all input vectors—such as URL parameters, HTTP headers, cookies, and API endpoints.4. Vulnerability Assessment & Deep Manual TestingWhile I might use automated scanners like Burp Scanner or Nuclei to catch low-hanging fruit quickly, the core of my testing is manual. I focus heavily on the OWASP Top 10:Authentication/Session Management: I check for weak password controls, session fixation, and brute-force protections.Input Validation: I manually inject payloads to test for SQLi, XSS, and Command Injection.Access Controls: I actively test for Broken Object Level Authorization (BOLA/IDOR) by swapping user identifiers in requests to see if a low-privilege user can access unauthorized data.5. Controlled ExploitationIf I find a vulnerability, I attempt exploitation to verify its impact and eliminate false positives. However, I always do this safely. If I find a Remote Code Execution (RCE) flaw, I will stop at a benign Proof of Concept—like running whoami or hostname—rather than executing disruptive actions, unless explicitly authorized by the client to proceed further.6. Reporting and DeliverablesFinally, the most critical part of the test is translating findings into value for the client. I draft a report split into two sections:An Executive Summary explaining the overall security posture and business risk in non-technical terms.A detailed Technical Findings section providing step-by-step reproduction instructions, CVSS scoring, and specific, actionable remediation advice—such as advising developers on parameterized queries for SQLi or context-aware encoding for XSS.Ultimately, my goal isn't just to 'break' things, but to provide a clear roadmap that helps the development and security teams effectively harden their ap","score":95,"feedback":"Excellent structured approach and technical depth."},{"question":"What is the difference between stored, reflected, and DOM-based XSS?","answer":"\\"The fundamental difference between Stored, Reflected, and DOM-based Cross-Site Scripting (XSS) lies in where the malicious payload resides and how it gets executed by the victim’s browser.Here is how I break them down:1. Stored XSS (Persistent)Stored XSS is the most dangerous type because the malicious script is permanently saved on the target server—such as in a database, a comment section, a profile field, or a chat log.Mechanism: The attacker submits a malicious script into a form vector. The server saves it directly to the database. Later, whenever a clean user requests that specific page, the server retrieves the payload and serves it back to their browser, executing the script automatically.Impact: High. It requires no social engineering or convincing a user to click a link. Anyone who visits the affected page becomes a victim.2. Reflected XSS (Non-Persistent)Reflected XSS occurs when the malicious payload is part of the request sent to the server and is immediately 'reflected' back in the server's immediate HTTP response.Mechanism: The attacker crafts a malicious URL containing the script parameter (e.g., http://example.com<script>...) and tricks a victim into clicking it. The server takes that input, inserts it directly into the response page without proper validation or sanitization, and sends it back to the browser, which then executes it.Impact: Medium. It requires active social engineering (like a phishing email) to deliver the malicious link to a specific target. If a user doesn't click the link, they aren't infected.3. DOM-based XSS (Client-Side)Unlike Stored and Reflected XSS, where the payload goes to the server and comes back in the HTML source code, DOM-based XSS happens entirely on the client-side, inside the browser's Document Object Model (DOM).Mechanism: The server is completely unaware of the payload. Instead, the application's legitimate, client-side JavaScript reads data from an untrusted user-controlled 'Source' (like location.search or document.referrer) and insecurely passes it to an execution 'Sink' (like element.innerHTML, eval(), or document.write).Impact: Medium. Like Reflected XSS, it requires a user to click a link, but it can bypass many traditional server-side Web Application Firewalls (WAFs) because the payload never hits the server-side logic.","score":90,"feedback":"Well-explained differences with clear examples."},{"question":"How does a SQL injection attack work and how do you remediate it?","answer":"At its core, a SQL Injection—or SQLi—attack occurs when an application takes user-supplied data and insecurely concatenates it directly into a database query string. This breaks the bounda","score":70,"feedback":"Incomplete answer. Make sure to finish your thoughts."}]}	{"provider":"openai","track":"vapt","name":"VAPT Professional"}	2026-06-23 08:30:26.84594+00	2026-06-23 08:30:26.84594+00
\.


--
-- Data for Name: ai_resume_analysis; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_resume_analysis (id, user_id, resume_url, analysis_result, ats_score, suggestions, keywords, analyzed_at, created_at) FROM stdin;
\.


--
-- Data for Name: ai_skill_gap_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_skill_gap_reports (id, user_id, track_id, current_skills, required_skills, gap_skills, recommendations, generated_at, created_at) FROM stdin;
1	11	\N	{}	{"SIEM (Splunk/ELK) log analysis","Incident triage & escalation","MITRE ATT&CK mapping","Network traffic analysis","Threat intelligence","Windows/Linux event forensics","Detection engineering","Playbook automation (SOAR)"}	{"SIEM (Splunk/ELK) log analysis","Incident triage & escalation","MITRE ATT&CK mapping","Network traffic analysis","Threat intelligence","Windows/Linux event forensics","Detection engineering","Playbook automation (SOAR)"}	You've started building 0/8 core SOC Analyst skills. Prioritise: SIEM (Splunk/ELK) log analysis, Incident triage & escalation, MITRE ATT&CK mapping.	2026-06-21 09:30:01.667233+00	2026-06-21 09:30:01.667233+00
2	11	\N	{}	{"SIEM (Splunk/ELK) log analysis","Incident triage & escalation","MITRE ATT&CK mapping","Network traffic analysis","Threat intelligence","Windows/Linux event forensics","Detection engineering","Playbook automation (SOAR)"}	{"SIEM (Splunk/ELK) log analysis","Incident triage & escalation","MITRE ATT&CK mapping","Network traffic analysis","Threat intelligence","Windows/Linux event forensics","Detection engineering","Playbook automation (SOAR)"}	You've started building 0/8 core SOC Analyst skills. Prioritise: SIEM (Splunk/ELK) log analysis, Incident triage & escalation, MITRE ATT&CK mapping.	2026-06-21 09:30:30.143834+00	2026-06-21 09:30:30.143834+00
\.


--
-- Data for Name: application_status_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.application_status_history (id, application_id, from_status, to_status, note, changed_by, created_at) FROM stdin;
\.


--
-- Data for Name: assessment_answers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assessment_answers (id, attempt_id, question_id, selected_option_ids, is_correct, points_awarded, created_at) FROM stdin;
1	1	1	{4}	f	0	2026-06-22 07:20:50.877132+00
2	1	2	{7}	f	0	2026-06-22 07:20:50.884005+00
3	1	3	{10}	f	0	2026-06-22 07:20:50.889102+00
4	1	4	{15}	f	0	2026-06-22 07:20:50.89378+00
5	1	5	{17}	t	1	2026-06-22 07:20:50.899186+00
6	1	6	{22}	f	0	2026-06-22 07:20:50.904065+00
7	1	7	{23}	t	1	2026-06-22 07:20:50.909553+00
8	1	8	{29}	f	0	2026-06-22 07:20:50.914117+00
9	1	9	{31}	t	1	2026-06-22 07:20:50.918887+00
10	1	10	{37}	f	0	2026-06-22 07:20:50.926848+00
11	2	1	{2}	f	0	2026-06-23 04:22:03.717705+00
12	2	2	{8}	f	0	2026-06-23 04:22:03.727815+00
13	2	3	{11}	f	0	2026-06-23 04:22:03.748509+00
14	2	4	{14}	f	0	2026-06-23 04:22:03.754196+00
15	2	5	{19}	f	0	2026-06-23 04:22:03.760323+00
16	2	6	{22}	f	0	2026-06-23 04:22:03.7656+00
17	2	7	{23}	t	1	2026-06-23 04:22:03.770483+00
18	2	8	{29}	f	0	2026-06-23 04:22:03.774967+00
19	2	9	{32}	f	0	2026-06-23 04:22:03.780597+00
20	2	10	{38}	f	0	2026-06-23 04:22:03.78594+00
21	3	1	{2}	f	0	2026-06-23 04:41:26.797057+00
22	3	2	{8}	f	0	2026-06-23 04:41:26.919642+00
23	3	3	{11}	f	0	2026-06-23 04:41:26.925099+00
24	3	4	{16}	f	0	2026-06-23 04:41:26.93156+00
25	3	5	{19}	f	0	2026-06-23 04:41:26.936736+00
26	3	6	{22}	f	0	2026-06-23 04:41:26.942983+00
27	3	7	{23}	t	1	2026-06-23 04:41:26.948748+00
28	3	8	{29}	f	0	2026-06-23 04:41:26.953385+00
29	3	9	{31}	t	1	2026-06-23 04:41:26.958052+00
30	3	10	{37}	f	0	2026-06-23 04:41:26.962163+00
31	4	1	{1}	t	1	2026-06-23 06:59:44.223376+00
32	4	2	{5}	t	1	2026-06-23 06:59:44.229575+00
33	4	3	{9}	t	1	2026-06-23 06:59:44.234773+00
34	4	4	{13}	t	1	2026-06-23 06:59:44.239594+00
35	4	5	{17}	t	1	2026-06-23 06:59:44.244632+00
36	4	6	{21}	t	1	2026-06-23 06:59:44.249092+00
37	4	7	{23}	t	1	2026-06-23 06:59:44.254699+00
38	4	8	{30}	f	0	2026-06-23 06:59:44.261095+00
39	4	9	{31}	t	1	2026-06-23 06:59:44.265793+00
40	4	10	{35,36,38}	t	1	2026-06-23 06:59:44.270953+00
41	5	1	{1}	t	1	2026-06-23 07:03:33.627594+00
42	5	2	{5}	t	1	2026-06-23 07:03:33.636405+00
43	5	3	{9}	t	1	2026-06-23 07:03:33.642435+00
44	5	4	{13}	t	1	2026-06-23 07:03:33.649112+00
45	5	5	{17}	t	1	2026-06-23 07:03:33.654384+00
46	5	6	{21}	t	1	2026-06-23 07:03:33.660046+00
47	5	7	{23}	t	1	2026-06-23 07:03:33.664855+00
48	5	8	{30}	f	0	2026-06-23 07:03:33.672896+00
49	5	9	{33}	f	0	2026-06-23 07:03:33.681974+00
50	5	10	{35,36,38}	t	1	2026-06-23 07:03:33.689528+00
\.


--
-- Data for Name: assessment_attempts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assessment_attempts (id, user_id, assessment_id, started_at, submitted_at, status, created_at) FROM stdin;
1	4	1	2026-06-22 07:20:50.867087+00	2026-06-22 07:20:50.866+00	submitted	2026-06-22 07:20:50.867087+00
2	1	1	2026-06-23 04:22:03.671803+00	2026-06-23 04:22:03.671+00	submitted	2026-06-23 04:22:03.671803+00
3	4	1	2026-06-23 04:41:26.682933+00	2026-06-23 04:41:26.682+00	submitted	2026-06-23 04:41:26.682933+00
4	26	1	2026-06-23 06:59:44.216303+00	2026-06-23 06:59:44.215+00	submitted	2026-06-23 06:59:44.216303+00
5	26	1	2026-06-23 07:03:33.589032+00	2026-06-23 07:03:33.588+00	submitted	2026-06-23 07:03:33.589032+00
\.


--
-- Data for Name: assessment_options; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assessment_options (id, question_id, option_text, is_correct, "order", created_at) FROM stdin;
1	1	Confidentiality, Integrity, Availability	t	1	2026-06-19 20:47:23.072959+00
2	1	Control, Inspection, Authentication	f	2	2026-06-19 20:47:24.700003+00
3	1	Cryptography, Identity, Auditing	f	3	2026-06-19 20:47:29.43077+00
4	1	Compliance, Infrastructure, Access	f	4	2026-06-19 20:47:31.1391+00
5	2	Phishing	t	1	2026-06-19 20:47:32.790529+00
6	2	SQL Injection	f	2	2026-06-19 20:47:34.457141+00
7	2	Buffer Overflow	f	3	2026-06-19 20:47:36.263624+00
8	2	Port Scanning	f	4	2026-06-19 20:47:37.792873+00
9	3	Filter and monitor network traffic	t	1	2026-06-19 20:47:39.54189+00
10	3	Encrypt data in transit	f	2	2026-06-19 20:47:41.390997+00
11	3	Scan for malware on disk	f	3	2026-06-19 20:47:43.123511+00
12	3	Manage user passwords	f	4	2026-06-19 20:47:44.782755+00
13	4	443	t	1	2026-06-19 20:47:46.379419+00
14	4	80	f	2	2026-06-19 20:47:47.826527+00
15	4	8080	f	3	2026-06-19 20:47:49.528139+00
16	4	22	f	4	2026-06-19 20:47:51.205188+00
17	5	Cross-Site Scripting	t	1	2026-06-19 20:47:52.79595+00
18	5	Cross-Site Session	f	2	2026-06-19 20:47:54.23384+00
19	5	Cross-Server Scripting	f	3	2026-06-19 20:47:55.670758+00
20	5	Cross-System Script	f	4	2026-06-19 20:47:57.370769+00
21	6	True	t	1	2026-06-19 20:47:59.066304+00
22	6	False	f	2	2026-06-19 20:48:00.714253+00
23	7	A vulnerability with no available patch	t	1	2026-06-19 20:48:02.17027+00
24	7	An attack launched at midnight	f	2	2026-06-19 20:48:03.7186+00
25	7	A new virus released daily	f	3	2026-06-19 20:48:05.178473+00
26	7	A firewall misconfiguration	f	4	2026-06-19 20:48:06.598046+00
27	8	TLS/STARTTLS	t	1	2026-06-19 20:48:08.146656+00
28	8	FTP	f	2	2026-06-19 20:48:09.870508+00
29	8	HTTP	f	3	2026-06-19 20:48:11.422525+00
30	8	Telnet	f	4	2026-06-19 20:48:12.778705+00
31	9	Authentication verifies identity; authorization grants permissions	t	1	2026-06-19 20:48:14.470955+00
32	9	They are the same thing	f	2	2026-06-19 20:48:15.945523+00
33	9	Authorization verifies identity; authentication grants permissions	f	3	2026-06-19 20:48:19.941009+00
34	9	Authentication encrypts data; authorization decrypts it	f	4	2026-06-19 20:48:21.263984+00
35	10	Ransomware	t	1	2026-06-19 20:48:22.706282+00
36	10	Trojan	t	2	2026-06-19 20:48:24.194044+00
37	10	Router	f	3	2026-06-19 20:48:25.805567+00
38	10	Spyware	t	4	2026-06-19 20:48:27.523934+00
39	10	Switch	f	5	2026-06-19 20:48:29.360289+00
40	11	Security Information and Event Management	t	0	2026-06-22 03:07:18.336695+00
41	11	System Integrity Event Monitor	f	1	2026-06-22 03:07:18.336695+00
42	12	Security Information and Event Management	t	0	2026-06-23 13:35:55.764213+00
43	12	System Integrity Event Monitor	f	1	2026-06-23 13:35:55.764213+00
44	13	To monitor system performance	f	0	2026-06-23 13:35:55.764213+00
45	13	To detect and respond to security incidents	t	1	2026-06-23 13:35:55.764213+00
46	13	To manage IT resources effectively	f	2	2026-06-23 13:35:55.764213+00
47	13	To improve user experience	f	3	2026-06-23 13:35:55.764213+00
48	14	Wireshark	f	0	2026-06-23 13:35:55.902058+00
49	14	Splunk	t	1	2026-06-23 13:35:55.902058+00
50	14	Nmap	f	2	2026-06-23 13:35:55.902058+00
51	14	Metasploit	f	3	2026-06-23 13:35:55.902058+00
52	15	To monitor system performance	f	0	2026-06-23 13:35:55.902058+00
53	15	To detect and respond to security incidents	t	1	2026-06-23 13:35:55.902058+00
54	15	To manage IT resources effectively	f	2	2026-06-23 13:35:55.902058+00
55	15	To improve user experience	f	3	2026-06-23 13:35:55.902058+00
56	16	/var/log/syslog	f	0	2026-06-23 13:35:55.902058+00
57	16	/var/log/auth.log	t	1	2026-06-23 13:35:55.902058+00
58	16	/var/log/messages	f	2	2026-06-23 13:35:55.902058+00
59	16	/var/log/kernel.log	f	3	2026-06-23 13:35:55.902058+00
\.


--
-- Data for Name: assessment_questions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assessment_questions (id, assessment_id, question_text, question_type, explanation, points, "order", created_at, source_bank_question_id) FROM stdin;
1	1	What does CIA stand for in cybersecurity?	mcq	\N	1	1	2026-06-19 20:47:05.334019+00	\N
2	1	Which of the following is a social engineering attack?	mcq	\N	1	2	2026-06-19 20:47:07.13128+00	\N
3	1	What is the primary purpose of a firewall?	mcq	\N	1	3	2026-06-19 20:47:08.785023+00	\N
4	1	Which port is used by HTTPS by default?	mcq	\N	1	4	2026-06-19 20:47:10.350897+00	\N
5	1	What does XSS stand for?	mcq	\N	1	5	2026-06-19 20:47:11.829476+00	\N
6	1	A SQL injection attack exploits vulnerabilities in database queries.	true_false	\N	1	6	2026-06-19 20:47:13.368686+00	\N
7	1	What is a zero-day vulnerability?	mcq	\N	1	7	2026-06-19 20:47:15.100364+00	\N
8	1	Which protocol is used for secure email transmission?	mcq	\N	1	8	2026-06-19 20:47:16.737131+00	\N
9	1	What is the difference between authentication and authorization?	mcq	\N	1	9	2026-06-19 20:47:18.497052+00	\N
10	1	Which of the following are common types of malware? (Select all that apply)	multi_select	\N	1	10	2026-06-19 20:47:21.289342+00	\N
12	4	What does SIEM stand for?	mcq	\N	1	0	2026-06-23 13:35:55.764213+00	1
13	4	What is the primary purpose of log analysis in a security operations center (SOC)?	mcq	Log analysis is crucial for detecting anomalies, identifying threats, and responding to security incidents in real-time.	1	1	2026-06-23 13:35:55.764213+00	3
14	4	Which of the following tools is commonly used for analyzing large sets of log data in real-time?	mcq	Splunk is widely used for searching, monitoring, and analyzing machine-generated big data through a web-style interface.	1	2	2026-06-23 13:35:55.902058+00	6
15	4	What is the primary purpose of log analysis in a security operations center (SOC)?	mcq	Log analysis is crucial for detecting anomalies, identifying threats, and responding to security incidents in real-time.	1	3	2026-06-23 13:35:55.902058+00	3
16	4	Which log file would you analyze to investigate failed login attempts on a Linux server?	mcq	The /var/log/auth.log file contains authentication-related logs, including failed login attempts.	1	4	2026-06-23 13:35:55.902058+00	4
\.


--
-- Data for Name: assessment_results; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assessment_results (id, attempt_id, user_id, assessment_id, score, total_marks, percentage, passed, feedback, suggested_track_level, created_at) FROM stdin;
1	1	4	1	3	10	30	f	You scored 30.0%. Don't worry — this track will build your skills from the ground up.	beginner	2026-06-22 07:20:50.930225+00
2	2	1	1	1	10	10	f	You scored 10.0%. Don't worry — this track will build your skills from the ground up.	beginner	2026-06-23 04:22:03.789378+00
3	3	4	1	2	10	20	f	You scored 20.0%. Don't worry — this track will build your skills from the ground up.	beginner	2026-06-23 04:41:26.965345+00
4	4	26	1	9	10	90	t	Great job! You scored 90.0%. You have a solid foundation for this track.	advanced	2026-06-23 06:59:44.275429+00
5	5	26	1	8	10	80	t	Great job! You scored 80.0%. You have a solid foundation for this track.	advanced	2026-06-23 07:03:33.694625+00
\.


--
-- Data for Name: assessments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assessments (id, title, type, track_id, total_questions, duration_minutes, passing_score, is_active, created_at, updated_at) FROM stdin;
1	Cybersecurity Foundations Pre-Assessment	pre_assessment	\N	10	20	60	t	2026-06-19 20:46:39.155148+00	2026-06-19 20:46:39.155148+00
4	Mini Assessment	module_quiz	1	5	30	70	t	2026-06-23 05:25:32.653657+00	2026-06-23 13:35:55.912+00
5	mini	module_quiz	2	0	30	70	t	2026-06-23 13:58:02.913736+00	2026-06-23 13:58:02.913736+00
\.


--
-- Data for Name: assignment_submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assignment_submissions (id, assignment_id, student_id, submission_url, content, status, score, feedback, submitted_at, reviewed_at, reviewed_by, created_at) FROM stdin;
\.


--
-- Data for Name: assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assignments (id, module_id, track_id, title, description, due_date, max_score, is_published, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, action, entity_type, entity_id, ip_address, user_agent, metadata, created_at) FROM stdin;
1	1	user.registered	user	1	\N	\N	{"role":"student"}	2026-06-20 14:40:24.39371+00
2	2	user.registered	user	2	\N	\N	{"role":"student"}	2026-06-21 04:47:19.535427+00
3	3	user.registered	user	3	\N	\N	{"role":"tpo"}	2026-06-21 04:47:20.818545+00
4	4	user.registered	user	4	\N	\N	{"role":"student"}	2026-06-21 04:52:33.330171+00
5	5	user.registered	user	5	\N	\N	{"role":"tpo"}	2026-06-21 04:55:34.548419+00
6	6	user.registered	user	6	\N	\N	{"role":"student"}	2026-06-21 04:59:25.67378+00
7	6	consent.granted	consent	marketing	127.0.0.1	\N	{"consentType":"marketing","action":"granted"}	2026-06-21 04:59:25.996928+00
8	6	consent.granted	consent	analytics	127.0.0.1	\N	{"consentType":"analytics","action":"granted"}	2026-06-21 04:59:26.012175+00
9	6	consent.granted	consent	dataProcessing	127.0.0.1	\N	{"consentType":"dataProcessing","action":"granted"}	2026-06-21 04:59:26.014863+00
10	6	consent.granted	consent	thirdParty	127.0.0.1	\N	{"consentType":"thirdParty","action":"granted"}	2026-06-21 04:59:26.029075+00
11	2	consent.granted	consent	marketing	127.0.0.1	\N	{"consentType":"marketing","action":"granted"}	2026-06-21 04:59:40.62399+00
12	2	consent.granted	consent	analytics	127.0.0.1	\N	{"consentType":"analytics","action":"granted"}	2026-06-21 04:59:40.637689+00
13	2	consent.granted	consent	dataProcessing	127.0.0.1	\N	{"consentType":"dataProcessing","action":"granted"}	2026-06-21 04:59:40.651674+00
14	2	consent.granted	consent	thirdParty	127.0.0.1	\N	{"consentType":"thirdParty","action":"granted"}	2026-06-21 04:59:40.661395+00
15	4	consent.granted	consent	marketing	106.198.33.207	\N	{"consentType":"marketing","action":"granted"}	2026-06-21 05:04:56.651634+00
16	4	consent.granted	consent	analytics	106.198.33.207	\N	{"consentType":"analytics","action":"granted"}	2026-06-21 05:04:56.670562+00
17	4	consent.granted	consent	dataProcessing	106.198.33.207	\N	{"consentType":"dataProcessing","action":"granted"}	2026-06-21 05:04:56.675042+00
18	4	consent.granted	consent	thirdParty	106.198.33.207	\N	{"consentType":"thirdParty","action":"granted"}	2026-06-21 05:04:56.679826+00
19	4	track.selected	track	1	\N	\N	\N	2026-06-21 05:05:11.375319+00
25	9	user.registered	user	9	\N	\N	{"role":"student"}	2026-06-21 06:57:57.514264+00
26	9	track.selected	track	1	\N	\N	\N	2026-06-21 06:57:57.699674+00
27	1	consent.granted	consent	marketing	106.198.33.207	\N	{"consentType":"marketing","action":"granted"}	2026-06-21 07:03:54.068258+00
28	1	consent.granted	consent	analytics	106.198.33.207	\N	{"consentType":"analytics","action":"granted"}	2026-06-21 07:03:54.083228+00
29	1	consent.granted	consent	dataProcessing	106.198.33.207	\N	{"consentType":"dataProcessing","action":"granted"}	2026-06-21 07:03:54.088844+00
30	1	consent.granted	consent	thirdParty	106.198.33.207	\N	{"consentType":"thirdParty","action":"granted"}	2026-06-21 07:03:54.09349+00
31	1	track.selected	track	2	\N	\N	\N	2026-06-21 07:03:57.740621+00
32	10	user.registered	user	10	\N	\N	{"role":"student"}	2026-06-21 07:48:55.504411+00
33	11	user.registered	user	11	\N	\N	{"role":"student"}	2026-06-21 09:29:22.867155+00
34	11	ai.tutor.explain	ai_tutor	\N	127.0.0.1	\N	{"topic":"SQL injection","level":"beginner","provider":"mock"}	2026-06-21 09:29:54.096403+00
35	11	ai.tutor.quiz	ai_tutor	\N	127.0.0.1	\N	{"topic":"phishing","difficulty":"beginner","count":3,"provider":"mock"}	2026-06-21 09:29:56.816787+00
36	11	ai.english.evaluate	ai_english	\N	127.0.0.1	\N	{"provider":"mock","fromVoice":false,"overall":69}	2026-06-21 09:29:59.029196+00
37	11	ai.career.report	ai_career	11	127.0.0.1	\N	{"provider":"mock","readiness":0}	2026-06-21 09:30:01.83795+00
38	11	ai.tutor.quiz	ai_tutor	\N	127.0.0.1	\N	{"topic":"phishing","difficulty":"beginner","count":3,"provider":"mock"}	2026-06-21 09:30:25.763154+00
39	11	ai.english.evaluate	ai_english	\N	127.0.0.1	\N	{"provider":"mock","fromVoice":false,"overall":70}	2026-06-21 09:30:27.971063+00
40	11	ai.career.report	ai_career	11	127.0.0.1	\N	{"provider":"mock","readiness":0}	2026-06-21 09:30:30.165227+00
41	11	consent.granted	consent	analytics	127.0.0.1	\N	{"consentType":"analytics","action":"granted"}	2026-06-21 09:41:41.210026+00
42	12	user.registered	user	12	\N	\N	{"role":"student"}	2026-06-21 09:46:03.047124+00
43	12	consent.granted	consent	analytics	127.0.0.1	\N	{"consentType":"analytics","action":"granted"}	2026-06-21 09:46:13.021485+00
44	13	user.registered	user	13	\N	\N	{"role":"student"}	2026-06-21 09:49:28.717377+00
45	13	dpdp.download_requested	data_request	2	\N	\N	{"requestType":"download"}	2026-06-21 09:49:32.029519+00
46	14	user.registered	user	14	\N	\N	{"role":"student"}	2026-06-21 10:11:49.879114+00
47	14	ai.tutor.explain	ai_tutor	\N	127.0.0.1	\N	{"topic":"What is a firewall","level":"beginner","provider":"openai"}	2026-06-21 10:11:54.592112+00
48	14	ai.career.chat	ai_career	\N	127.0.0.1	\N	{"provider":"openai"}	2026-06-21 10:12:30.891495+00
49	14	ai.interview.start	ai_interview	1	127.0.0.1	\N	{"interviewType":"text","difficulty":"intermediate","total":6,"provider":"openai"}	2026-06-21 10:12:33.340868+00
50	14	ai.english.evaluate	ai_english	\N	127.0.0.1	\N	{"provider":"openai","fromVoice":false,"overall":54}	2026-06-21 10:12:40.735327+00
51	14	ai.interview.start	ai_interview	2	127.0.0.1	\N	{"interviewType":"text","difficulty":"intermediate","total":4,"provider":"openai"}	2026-06-21 10:13:04.716982+00
52	14	ai.resume.analyze	ai_resume	\N	127.0.0.1	\N	{"provider":"openai","source":"text","atsScore":85}	2026-06-21 10:13:07.970859+00
53	14	ai.tutor.explain	ai_tutor	\N	127.0.0.1	\N	{"topic":"What is a firewall","level":"beginner","provider":"mock"}	2026-06-21 10:13:36.694723+00
54	14	ai.tutor.explain	ai_tutor	\N	127.0.0.1	\N	{"topic":"What is SIEM","level":"beginner","provider":"openai"}	2026-06-21 10:14:06.317537+00
55	14	ai.resume.analyze	ai_resume	\N	127.0.0.1	\N	{"provider":"openai","source":"text","atsScore":80}	2026-06-21 10:16:45.197207+00
56	15	admin.mentor.created	user	16	127.0.0.1	curl/8.14.1	{"email":"test.mentor@futrsec.dev","careerTrack":"soc"}	2026-06-21 10:35:58.196499+00
57	15	admin.batch.created	batch	1	127.0.0.1	\N	{"name":"SOC Batch Alpha","careerTrack":"soc"}	2026-06-21 10:35:58.336842+00
58	15	admin.batch.updated	batch	1	127.0.0.1	\N	{"mentorId":16}	2026-06-21 10:36:09.77302+00
59	15	admin.mentor.students_assigned	user	16	127.0.0.1	curl/8.14.1	{"studentIds":[2,1],"batchId":1}	2026-06-21 10:36:09.846854+00
60	15	admin.batch.students_added	batch	1	127.0.0.1	\N	{"studentIds":[2,1]}	2026-06-21 10:36:09.914692+00
61	16	mentor.report.generated	user	16	127.0.0.1	\N	{"rows":2}	2026-06-21 10:36:17.54308+00
62	16	mentor.broadcast.published	broadcast_note	1	127.0.0.1	\N	{"title":"Welcome SOC"}	2026-06-21 10:36:32.370429+00
63	16	mentor.task.publish	mentor_task	1	127.0.0.1	\N	{"type":"resource","audience":"all_students","assigned":2}	2026-06-21 10:36:32.434544+00
64	16	mentor.task.archive	mentor_task	1	127.0.0.1	\N	{"assigned":0}	2026-06-21 10:36:32.532176+00
65	16	mentor.task.schedule	mentor_task	2	127.0.0.1	\N	{"type":"assignment","audience":"trial_students","assigned":0}	2026-06-21 10:36:32.593357+00
66	16	mentor.settings.updated	mentor_profile	16	127.0.0.1	\N	\N	2026-06-21 10:36:32.650901+00
67	15	admin.mentor.updated	user	16	127.0.0.1	curl/8.14.1	{"isActive":false}	2026-06-21 10:36:42.398272+00
68	15	admin.mentor.updated	user	16	127.0.0.1	curl/8.14.1	{"isActive":true}	2026-06-21 10:36:42.512656+00
69	16	mentor.task.draft	mentor_task	3	127.0.0.1	\N	{"type":"resource","audience":"specific_batches","assigned":0}	2026-06-21 10:55:09.690413+00
70	16	mentor.task.publish	mentor_task	3	127.0.0.1	\N	{"assigned":2}	2026-06-21 10:55:09.938452+00
71	5	consent.granted	consent	marketing	106.198.10.185	\N	{"consentType":"marketing","action":"granted"}	2026-06-21 12:10:07.844803+00
72	5	consent.granted	consent	analytics	106.198.10.185	\N	{"consentType":"analytics","action":"granted"}	2026-06-21 12:10:07.857428+00
73	5	consent.granted	consent	dataProcessing	106.198.10.185	\N	{"consentType":"dataProcessing","action":"granted"}	2026-06-21 12:10:07.861878+00
74	5	consent.granted	consent	thirdParty	106.198.10.185	\N	{"consentType":"thirdParty","action":"granted"}	2026-06-21 12:10:07.876714+00
75	17	user.registered	user	17	\N	\N	{"role":"employer"}	2026-06-21 12:14:50.647205+00
76	17	consent.granted	consent	marketing	106.198.10.185	\N	{"consentType":"marketing","action":"granted"}	2026-06-21 12:15:00.856344+00
77	17	consent.granted	consent	analytics	106.198.10.185	\N	{"consentType":"analytics","action":"granted"}	2026-06-21 12:15:00.875781+00
78	17	consent.granted	consent	dataProcessing	106.198.10.185	\N	{"consentType":"dataProcessing","action":"granted"}	2026-06-21 12:15:00.882767+00
79	17	consent.granted	consent	thirdParty	106.198.10.185	\N	{"consentType":"thirdParty","action":"granted"}	2026-06-21 12:15:00.889466+00
80	15	admin.course.created	learning_module	19	127.0.0.1	curl/8.14.1	{"title":"Smoke Test Course","trackId":1}	2026-06-21 12:50:19.550003+00
81	15	admin.lab.created	lab	10	127.0.0.1	curl/8.14.1	{"title":"Smoke Lab","slug":"smoke-lab-xyz","trackId":1}	2026-06-21 12:50:19.636631+00
82	15	admin.assessment.created	assessment	2	127.0.0.1	curl/8.14.1	{"title":"Smoke Pre","type":"pre_assessment","trackId":1}	2026-06-21 12:50:19.708403+00
83	15	admin.job_posting.created	job	13	127.0.0.1	\N	{"type":"internship","requiredTracks":["vapt"]}	2026-06-21 12:50:19.790925+00
84	15	admin.certificate.issued	certificate	1	127.0.0.1	curl/8.14.1	{"certificateCode":"FUTR-CERT-2026-692648","userId":1,"type":"achievement"}	2026-06-21 12:50:19.919711+00
85	15	consent.granted	consent	analytics	171.79.61.127	\N	{"consentType":"analytics","action":"granted"}	2026-06-21 13:26:46.41743+00
86	15	admin.tpo.approved	tpo	5	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	{"decision":"approved","reason":null}	2026-06-21 13:28:33.838895+00
87	15	admin.employer.approved	employer	17	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	{"decision":"approved","reason":null}	2026-06-21 13:28:49.956251+00
88	18	admin.mentor.created	user	19	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	{"email":"futrsec@bcbuzz.tech","careerTrack":"soc"}	2026-06-21 20:00:03.145666+00
89	18	admin.mentor.created	user	23	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	{"email":"futrsec@bcbuzz.org","careerTrack":"soc"}	2026-06-21 20:04:43.370118+00
90	23	mentor.report.generated	user	23	127.0.0.1	\N	{"rows":0}	2026-06-21 20:08:17.770286+00
91	16	consent.granted	consent	analytics	34.14.195.20	\N	{"consentType":"analytics","action":"granted"}	2026-06-21 21:09:03.017441+00
92	16	mentor.question.created	question_bank	1	127.0.0.1	\N	{"track":"soc","type":"mcq"}	2026-06-22 02:59:35.692911+00
93	16	mentor.question.submitted	question_bank	1	127.0.0.1	\N	\N	2026-06-22 02:59:35.940066+00
94	18	admin.question.approved	question_bank	1	127.0.0.1	\N	\N	2026-06-22 02:59:36.327569+00
95	16	mentor.question.quality_scored	question_bank	1	127.0.0.1	\N	{"previousScore":null,"newScore":95,"provider":"openai"}	2026-06-22 03:07:18.256728+00
96	16	mentor.question_paper.published	assessment	3	127.0.0.1	\N	{"title":"E2E Paper","questions":1}	2026-06-22 03:07:18.345995+00
97	16	mentor.mock_interview.create	mock_interview_template	1	127.0.0.1	\N	{"track":"soc","type":"technical"}	2026-06-22 03:15:40.220899+00
98	16	mentor.mock_interview.update	mock_interview_template	1	127.0.0.1	\N	{"fields":["interviewType","difficulty","totalQuestions","durationMin","rounds","passingScore","allowVoice","questionSource","questionBankIds","focusSkills"]}	2026-06-22 03:15:40.27967+00
99	16	mentor.mock_interview.publish	mock_interview_template	1	127.0.0.1	\N	{}	2026-06-22 03:15:40.303508+00
100	16	mentor.mock_interview.assign	mock_interview_template	1	127.0.0.1	\N	{"mode":"all","eligible":1,"created":1,"skippedTrackMismatch":1}	2026-06-22 03:16:35.830823+00
101	2	student.mock_interview.start	mock_interview_assignment	1	127.0.0.1	\N	{"templateId":1,"interviewId":3,"provider":"mock","source":"ai"}	2026-06-22 03:17:13.29438+00
102	2	ai.interview.finish	ai_interview	3	127.0.0.1	\N	{"provider":"openai","overall":85}	2026-06-22 03:17:27.714791+00
103	16	mentor.mock_interview.create	mock_interview_template	2	127.0.0.1	\N	{"track":"soc","type":"technical"}	2026-06-22 03:18:13.050209+00
104	16	mentor.mock_interview.create	mock_interview_template	3	127.0.0.1	\N	{"track":"soc","type":"technical"}	2026-06-22 03:31:51.739551+00
105	16	mentor.mock_interview.publish	mock_interview_template	3	127.0.0.1	\N	{}	2026-06-22 03:31:51.852292+00
106	16	mentor.mock_interview.assign	mock_interview_template	3	127.0.0.1	\N	{"mode":"students","eligible":1,"created":1,"skippedTrackMismatch":0}	2026-06-22 03:31:51.871227+00
107	2	student.mock_interview.start	mock_interview_assignment	2	127.0.0.1	\N	{"templateId":3,"interviewId":4,"provider":"openai","source":"ai"}	2026-06-22 03:31:53.334263+00
108	2	ai.interview.finish	ai_interview	4	127.0.0.1	\N	{"provider":"openai","overall":36}	2026-06-22 03:32:00.83018+00
109	2	community.post.create	community_post	1	127.0.0.1	curl/8.14.1	\N	2026-06-22 04:37:17.70848+00
110	2	settings.update	user_preferences	2	127.0.0.1	curl/8.14.1	{"notifications":{"push":false},"privacy":{"showLeaderboard":false}}	2026-06-22 04:37:29.704527+00
111	2	support.ticket.create	support_ticket	1	127.0.0.1	curl/8.14.1	{"category":"labs"}	2026-06-22 04:37:43.003475+00
112	3	placement_drive.created	placement_drive	1	127.0.0.1	curl/8.14.1	{"companyName":"TestCorp","role":"Security Analyst"}	2026-06-22 05:23:46.613672+00
113	3	placement_drive.round.created	drive_round	1	127.0.0.1	curl/8.14.1	{"driveId":1,"name":"Tech Round"}	2026-06-22 05:23:46.872076+00
114	3	placement_drive.created	placement_drive	2	127.0.0.1	curl/8.14.1	{"companyName":"ScopeTest","role":"Analyst"}	2026-06-22 05:28:42.657245+00
115	2	support.ticket.create	support_ticket	1	127.0.0.1	curl/8.14.1	{"subject":"Lab sandbox will not start","category":"technical","priority":"high"}	2026-06-22 05:55:33.878362+00
116	15	support.ticket.assign	support_ticket	1	127.0.0.1	curl/8.14.1	{"assignedTo":15}	2026-06-22 05:55:56.597592+00
117	15	support.ticket.reply	support_ticket	1	127.0.0.1	curl/8.14.1	{"replyId":1}	2026-06-22 05:55:56.677605+00
118	15	support.ticket.status	support_ticket	1	127.0.0.1	curl/8.14.1	{"from":"in_progress","to":"resolved"}	2026-06-22 05:55:56.783051+00
119	2	storage.file.upload	file	1	127.0.0.1	curl/8.14.1	{"name":"report.pdf","size":1234,"usageArea":"resumes","visibility":"private"}	2026-06-22 06:33:55.638452+00
120	2	storage.file.download	file	1	127.0.0.1	curl/8.14.1	\N	2026-06-22 06:34:14.808608+00
121	2	storage.file.share	file	1	127.0.0.1	curl/8.14.1	{"ttl":600}	2026-06-22 06:34:16.215613+00
122	2	storage.file.delete	file	1	127.0.0.1	curl/8.14.1	{"name":"report.pdf"}	2026-06-22 06:34:20.01344+00
123	2	storage.file.restore	file	1	127.0.0.1	curl/8.14.1	{"name":"report.pdf"}	2026-06-22 06:34:20.261866+00
124	15	admin.certificate.issued	certificate	2	127.0.0.1	curl/8.14.1	{"certificateCode":"FUTR-CERT-2026-328187","userId":2,"type":"course_completion"}	2026-06-22 06:42:01.634114+00
125	15	admin.certificate.issued	certificate	3	127.0.0.1	curl/8.14.1	{"certificateCode":"FUTR-CERT-2026-936852","userId":2,"type":"course_completion"}	2026-06-22 06:45:55.534488+00
126	15	admin.certificate.issued	certificate	4	127.0.0.1	curl/8.14.1	{"certificateCode":"FUTR-CERT-2026-770131","userId":2,"type":"course_completion"}	2026-06-22 06:45:55.765016+00
127	15	certificate.download	certificate	2	127.0.0.1	curl/8.14.1	{"certificateCode":"FUTR-CERT-2026-328187"}	2026-06-22 06:52:19.303481+00
128	2	certificate.download	certificate	2	127.0.0.1	curl/8.14.1	{"certificateCode":"FUTR-CERT-2026-328187"}	2026-06-22 06:52:34.769798+00
129	15	admin.certificate.bulk_generate	certificate	\N	127.0.0.1	curl/8.14.1	{"requested":3,"generated":3}	2026-06-22 06:52:57.848009+00
130	15	admin.certificate.bulk_download	certificate	\N	127.0.0.1	curl/8.14.1	{"count":3}	2026-06-22 06:53:06.33319+00
131	15	admin.certificate.expire_sweep	certificate	\N	127.0.0.1	curl/8.14.1	{"expired":0}	2026-06-22 06:53:06.468705+00
132	15	certificate.download	certificate	2	127.0.0.1	curl/8.14.1	{"certificateCode":"FUTR-CERT-2026-328187"}	2026-06-22 06:54:13.318133+00
133	2	certificate.download	certificate	2	127.0.0.1	curl/8.14.1	{"certificateCode":"FUTR-CERT-2026-328187"}	2026-06-22 07:03:13.024567+00
134	15	admin.certificate.bulk_generate	certificate	\N	127.0.0.1	curl/8.14.1	{"requested":2,"generated":2}	2026-06-22 07:03:34.879934+00
135	15	admin.certificate.bulk_download	certificate	\N	127.0.0.1	curl/8.14.1	{"count":3}	2026-06-22 07:03:44.381202+00
136	2	certificate.download	certificate	2	127.0.0.1	curl/8.14.1	{"certificateCode":"FUTR-CERT-2026-328187"}	2026-06-22 07:10:30.055999+00
137	2	certificate.download	certificate	2	127.0.0.1	curl/8.14.1	{"certificateCode":"FUTR-CERT-2026-328187"}	2026-06-22 07:10:33.331913+00
138	18	settings.theme.update	user_preferences	18	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	{"theme":"light"}	2026-06-22 07:19:02.03066+00
139	18	settings.theme.update	user_preferences	18	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	{"theme":"dark"}	2026-06-22 07:19:04.983926+00
140	2	storage.file.upload	file	2	127.0.0.1	node	{"name":"resume.pdf","size":4096,"usageArea":"resumes","visibility":"private"}	2026-06-22 07:19:44.170808+00
141	2	storage.file.download	file	2	127.0.0.1	node	\N	2026-06-22 07:19:46.95605+00
142	2	storage.file.upload	file	3	127.0.0.1	node	{"name":"profile.png","size":4096,"usageArea":"general","visibility":"private"}	2026-06-22 07:19:53.304175+00
143	2	storage.file.download	file	3	127.0.0.1	node	\N	2026-06-22 07:19:56.137423+00
144	2	storage.file.upload	file	4	127.0.0.1	node	{"name":"assignment.zip","size":4096,"usageArea":"assignments","visibility":"private"}	2026-06-22 07:20:02.51045+00
145	2	storage.file.download	file	4	127.0.0.1	node	\N	2026-06-22 07:20:05.242391+00
146	2	storage.file.upload	file	5	127.0.0.1	node	{"name":"capture.pcap","size":4096,"usageArea":"labs","visibility":"private"}	2026-06-22 07:20:12.992767+00
147	2	storage.file.download	file	5	127.0.0.1	node	\N	2026-06-22 07:20:15.805122+00
148	2	storage.file.upload	file	6	127.0.0.1	node	{"name":"labreport.pdf","size":4096,"usageArea":"labs","visibility":"private"}	2026-06-22 07:20:22.137999+00
149	2	storage.file.download	file	6	127.0.0.1	node	\N	2026-06-22 07:20:24.873112+00
150	16	storage.file.upload	file	7	127.0.0.1	node	{"name":"resource.pdf","size":4096,"usageArea":"mentor_resources","visibility":"private"}	2026-06-22 07:20:32.62381+00
151	16	storage.file.download	file	7	127.0.0.1	node	\N	2026-06-22 07:20:35.308326+00
152	16	storage.file.upload	file	8	127.0.0.1	node	{"name":"mentor-assignment.docx","size":4096,"usageArea":"assignments","visibility":"private"}	2026-06-22 07:20:43.059889+00
153	16	storage.file.download	file	8	127.0.0.1	node	\N	2026-06-22 07:20:45.800229+00
154	4	assessment.submitted	assessment_attempt	1	\N	\N	{"assessmentId":1,"score":3}	2026-06-22 07:20:50.954436+00
155	4	onboarding.completed	user	4	\N	\N	\N	2026-06-22 07:20:50.954439+00
156	16	storage.file.upload	file	9	127.0.0.1	node	{"name":"notes.pdf","size":4096,"usageArea":"mentor_resources","visibility":"private"}	2026-06-22 07:20:53.289473+00
157	16	storage.file.download	file	9	127.0.0.1	node	\N	2026-06-22 07:20:56.173812+00
158	24	storage.file.upload	file	10	127.0.0.1	node	{"name":"placement.pdf","size":4096,"usageArea":"tpo_files","visibility":"private"}	2026-06-22 07:21:03.719479+00
159	24	storage.file.download	file	10	127.0.0.1	node	\N	2026-06-22 07:21:06.635809+00
160	24	storage.file.upload	file	11	127.0.0.1	node	{"name":"drive-schedule.csv","size":4096,"usageArea":"tpo_files","visibility":"private"}	2026-06-22 07:21:11.710878+00
161	24	storage.file.download	file	11	127.0.0.1	node	\N	2026-06-22 07:21:12.653641+00
162	25	storage.file.upload	file	12	127.0.0.1	node	{"name":"jd.pdf","size":4096,"usageArea":"job_descriptions","visibility":"private"}	2026-06-22 07:21:15.774379+00
163	25	storage.file.download	file	12	127.0.0.1	node	\N	2026-06-22 07:21:16.731064+00
164	25	storage.file.upload	file	13	127.0.0.1	node	{"name":"company.docx","size":4096,"usageArea":"employer_documents","visibility":"private"}	2026-06-22 07:21:19.860446+00
165	25	storage.file.download	file	13	127.0.0.1	node	\N	2026-06-22 07:21:20.829494+00
166	15	storage.file.upload	file	14	127.0.0.1	node	{"name":"cert-asset.pdf","size":4096,"usageArea":"certificates","visibility":"private"}	2026-06-22 07:21:27.767101+00
167	15	storage.file.download	file	14	127.0.0.1	node	\N	2026-06-22 07:21:30.635178+00
168	15	storage.file.upload	file	15	127.0.0.1	node	{"name":"course-asset.png","size":4096,"usageArea":"courses","visibility":"private"}	2026-06-22 07:21:37.231377+00
169	15	storage.file.download	file	15	127.0.0.1	node	\N	2026-06-22 07:21:38.22651+00
170	15	storage.file.download	file	7	127.0.0.1	node	\N	2026-06-22 07:21:40.603111+00
171	2	storage.file.upload	file	16	127.0.0.1	node	{"name":"life1.pdf","size":4096,"usageArea":"resumes","visibility":"private"}	2026-06-22 07:22:36.874694+00
172	2	storage.file.upload	file	17	127.0.0.1	node	{"name":"life2.png","size":4096,"usageArea":"general","visibility":"private"}	2026-06-22 07:22:38.995114+00
173	25	storage.file.upload	file	18	127.0.0.1	node	{"name":"empjd.pdf","size":4096,"usageArea":"job_descriptions","visibility":"private"}	2026-06-22 07:22:40.805536+00
174	2	storage.file.delete	file	16	127.0.0.1	node	{"name":"life1.pdf"}	2026-06-22 07:22:40.824189+00
175	2	storage.file.restore	file	16	127.0.0.1	node	{"name":"life1.pdf"}	2026-06-22 07:22:40.920112+00
177	2	storage.file.share	file	17	127.0.0.1	node	{"ttl":60}	2026-06-22 07:22:42.797947+00
176	2	storage.file.version	file	19	127.0.0.1	node	{"headId":17,"version":2}	2026-06-22 07:22:42.751503+00
178	2	certificate.download	certificate	4	127.0.0.1	node	{"certificateCode":"FUTR-CERT-2026-770131"}	2026-06-22 07:25:15.44781+00
179	15	admin.certificate.issued	certificate	5	127.0.0.1	node	{"certificateCode":"FUTR-CERT-2026-929938","userId":2,"type":"course_completion"}	2026-06-22 07:25:15.483718+00
180	15	admin.certificate.revoked	certificate	5	127.0.0.1	node	{"certificateCode":"FUTR-CERT-2026-929938"}	2026-06-22 07:25:15.497996+00
181	15	admin.certificate.issued	certificate	6	127.0.0.1	node	{"certificateCode":"FUTR-CERT-2026-406565","userId":2,"type":"course_completion"}	2026-06-22 07:25:15.515833+00
182	15	admin.certificate.expire_sweep	certificate	\N	127.0.0.1	node	{"expired":1}	2026-06-22 07:25:15.722656+00
183	4	settings.theme.update	user_preferences	4	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	{"theme":"dark"}	2026-06-22 07:26:16.079323+00
184	4	settings.theme.update	user_preferences	4	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	{"theme":"light"}	2026-06-22 07:26:17.610223+00
185	4	settings.theme.update	user_preferences	4	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	{"theme":"system"}	2026-06-22 07:26:18.802048+00
186	18	settings.theme.update	user_preferences	18	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	{"theme":"light"}	2026-06-22 07:26:56.423724+00
187	15	admin.certificate.bulk_generate	certificate	\N	127.0.0.1	node	{"requested":100,"generated":100}	2026-06-22 07:29:59.152474+00
188	15	admin.certificate.bulk_generate	certificate	\N	127.0.0.1	node	{"requested":10,"generated":10}	2026-06-22 07:30:47.903693+00
189	15	admin.certificate.bulk_download	certificate	\N	127.0.0.1	node	{"count":10}	2026-06-22 07:31:09.05724+00
190	15	admin.certificate.bulk_generate	certificate	\N	127.0.0.1	node	{"requested":100,"generated":100}	2026-06-22 07:31:23.545511+00
191	15	certificate.download	certificate	2	127.0.0.1	node	{"certificateCode":"FUTR-CERT-2026-328187"}	2026-06-22 07:31:47.998192+00
192	15	certificate.download	certificate	2	127.0.0.1	node	{"certificateCode":"FUTR-CERT-2026-328187"}	2026-06-22 07:31:49.190531+00
193	2	storage.file.upload	file	20	127.0.0.1	node	{"name":"p1.mp4","size":1048576,"usageArea":"general","visibility":"private"}	2026-06-22 07:31:53.821202+00
194	2	storage.file.upload	file	21	127.0.0.1	node	{"name":"p10.mp4","size":10485760,"usageArea":"general","visibility":"private"}	2026-06-22 07:31:59.054695+00
195	15	admin.certificate.auto_issue_config	certificate_auto_issue_config	1	127.0.0.1	\N	{"sourceType":"course","sourceId":1,"enabled":true}	2026-06-22 08:03:01.934433+00
196	15	admin.certificate.bulk_enqueue	certificate_generation_job	1	127.0.0.1	curl/8.14.1	{"total":6,"requested":6}	2026-06-22 08:03:12.190297+00
197	15	admin.certificate.bulk_enqueue	certificate_generation_job	2	127.0.0.1	curl/8.14.1	{"total":6,"requested":6}	2026-06-22 08:03:38.021885+00
198	15	admin.certificate.job_pause	certificate_generation_job	2	127.0.0.1	\N	\N	2026-06-22 08:03:40.197832+00
199	15	admin.certificate.job_resume	certificate_generation_job	2	127.0.0.1	\N	\N	2026-06-22 08:03:43.481735+00
200	15	admin.certificate.bulk_enqueue	certificate_generation_job	3	127.0.0.1	curl/8.14.1	{"total":100,"requested":100}	2026-06-22 08:05:48.388497+00
201	15	admin.certificate.bulk_enqueue	certificate_generation_job	4	127.0.0.1	curl/8.14.1	{"total":100,"requested":100}	2026-06-22 08:07:45.198254+00
202	15	admin.certificate.bulk_enqueue	certificate_generation_job	5	127.0.0.1	curl/8.14.1	{"total":100,"requested":100}	2026-06-22 08:08:38.799215+00
203	15	admin.certificate.job_cancel	certificate_generation_job	5	127.0.0.1	\N	\N	2026-06-22 08:08:41.982193+00
204	15	admin.certificate.auto_issue_config	certificate_auto_issue_config	1	127.0.0.1	\N	{"sourceType":"course","sourceId":1,"enabled":true}	2026-06-22 08:10:26.909283+00
205	2	certificate.issued	certificate	417	\N	\N	{"certificateCode":"FUTR-CERT-2026-539371","userId":2,"sourceType":"course","sourceId":1,"auto":true}	2026-06-22 08:10:28.224254+00
206	2	certificate.download	certificate	417	127.0.0.1	curl/8.14.1	{"certificateCode":"FUTR-CERT-2026-539371"}	2026-06-22 08:12:11.79195+00
207	15	admin.certificate.auto_issue_config	certificate_auto_issue_config	2	127.0.0.1	\N	{"sourceType":"course","sourceId":1,"enabled":true}	2026-06-22 08:22:55.606058+00
208	15	admin.certificate.auto_issue_config	certificate_auto_issue_config	2	127.0.0.1	\N	{"sourceType":"course","sourceId":1,"enabled":true}	2026-06-22 08:22:55.779835+00
209	2	certificate.issued	certificate	418	\N	\N	{"certificateCode":"FUTR-CERT-2026-996822","userId":2,"sourceType":"course","sourceId":1,"auto":true}	2026-06-22 08:23:08.554201+00
210	15	admin.certificate.bulk_enqueue	certificate_generation_job	6	127.0.0.1	curl/8.14.1	{"total":80,"requested":80}	2026-06-22 08:24:46.023649+00
211	15	admin.certificate.job_pause	certificate_generation_job	6	127.0.0.1	\N	\N	2026-06-22 08:24:46.927838+00
212	15	admin.certificate.job_cancel	certificate_generation_job	6	127.0.0.1	\N	\N	2026-06-22 08:24:54.540474+00
213	15	admin.certificate.bulk_enqueue	certificate_generation_job	7	127.0.0.1	undici	{"total":100,"requested":100,"shardCount":1,"shardsEnqueued":1,"partitions":1,"shardSize":1000}	2026-06-22 14:01:36.385402+00
214	15	admin.certificate.bulk_enqueue	certificate_generation_job	9	127.0.0.1	undici	{"total":1000,"requested":1000,"shardCount":1,"shardsEnqueued":1,"partitions":1,"shardSize":1000}	2026-06-22 14:02:34.20903+00
215	15	admin.certificate.bulk_enqueue	certificate_generation_job	11	127.0.0.1	undici	{"total":5000,"requested":5000,"shardCount":5,"shardsEnqueued":5,"partitions":1,"shardSize":1000}	2026-06-22 14:06:20.466223+00
216	15	admin.certificate.bulk_enqueue	certificate_generation_job	17	127.0.0.1	undici	{"total":10000,"requested":10000,"shardCount":10,"shardsEnqueued":10,"partitions":1,"shardSize":1000}	2026-06-22 14:11:13.677602+00
217	15	admin.certificate.bulk_enqueue	certificate_generation_job	28	127.0.0.1	undici	{"total":3000,"requested":3000,"shardCount":3,"shardsEnqueued":3,"partitions":1,"shardSize":1000}	2026-06-22 14:18:28.555743+00
218	15	admin.certificate.bulk_enqueue	certificate_generation_job	32	127.0.0.1	undici	{"total":2500,"requested":2500,"shardCount":3,"shardsEnqueued":3,"partitions":1,"shardSize":1000}	2026-06-22 14:29:17.982102+00
219	18	admin.track.updated	track	1	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	{"changes":{"name":"SOC Analyst","description":"Master Security Operations Center skills: threat detection, SIEM platforms, incident response, and blue team operations. Become the defender organizations need.","isActive":true,"accentColor":"#2563EB","difficulty":"beginner"}}	2026-06-23 04:11:27.621148+00
220	18	admin.lesson.updated	lesson	57	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	{"title":"ISO 27001 Overview","slug":"iso-27001-overview","order":1,"type":"video","durationMinutes":14}	2026-06-23 04:12:09.924345+00
276	26	consent.granted	consent	analytics	103.139.35.60	\N	{"consentType":"analytics","action":"granted"}	2026-06-23 09:55:29.022289+00
221	18	certificate.download	certificate	4	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	{"certificateCode":"FUTR-CERT-2026-770131"}	2026-06-23 04:14:42.411151+00
222	1	assessment.submitted	assessment_attempt	2	\N	\N	{"assessmentId":1,"score":1}	2026-06-23 04:22:03.954192+00
223	1	onboarding.completed	user	1	\N	\N	\N	2026-06-23 04:22:03.964462+00
224	1	community.post.like	community_post	1	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	\N	2026-06-23 04:22:38.870696+00
225	1	ai.interview.start	ai_interview	5	103.139.35.62	\N	{"interviewType":"voice","difficulty":"beginner","total":5,"provider":"openai"}	2026-06-23 04:27:22.031251+00
226	1	ai.interview.start	ai_interview	6	103.139.35.62	\N	{"interviewType":"text","difficulty":"intermediate","total":5,"provider":"openai"}	2026-06-23 04:29:26.782958+00
227	1	ai.interview.finish	ai_interview	6	103.139.35.62	\N	{"provider":"openai","overall":25}	2026-06-23 04:32:02.433487+00
228	4	assessment.submitted	assessment_attempt	3	\N	\N	{"assessmentId":1,"score":2}	2026-06-23 04:41:26.981934+00
229	4	onboarding.completed	user	4	\N	\N	\N	2026-06-23 04:41:26.991754+00
230	4	ai.career.chat	ai_career	\N	103.139.35.62	\N	{"provider":"openai"}	2026-06-23 04:43:42.457227+00
231	23	mentor.question.created	question_bank	2	103.139.35.62	\N	{"track":"soc","type":"mcq"}	2026-06-23 04:53:42.879342+00
232	23	mentor.report.generated	user	23	127.0.0.1	\N	{"rows":0}	2026-06-23 04:55:54.85881+00
233	23	lab_builder.lab.created	lab	11	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	{"title":"SOC","slug":"soc","trackId":1}	2026-06-23 05:11:22.734267+00
234	23	mentor.task.draft	mentor_task	4	127.0.0.1	\N	{"type":"assessment","audience":"all_students","assigned":0}	2026-06-23 05:13:51.388342+00
235	23	mentor.task.archive	mentor_task	4	127.0.0.1	\N	{"assigned":0}	2026-06-23 05:13:59.494075+00
236	23	mentor.question.created	question_bank	3	103.139.35.62	\N	{"track":"soc","type":"mcq"}	2026-06-23 05:16:02.424796+00
237	23	mentor.question.created	question_bank	4	103.139.35.62	\N	{"track":"soc","type":"mcq"}	2026-06-23 05:16:02.888814+00
238	23	mentor.question.created	question_bank	5	103.139.35.62	\N	{"track":"soc","type":"mcq"}	2026-06-23 05:16:03.083924+00
239	23	mentor.question.created	question_bank	6	103.139.35.62	\N	{"track":"soc","type":"mcq"}	2026-06-23 05:16:03.176977+00
240	23	mentor.question.created	question_bank	7	103.139.35.62	\N	{"track":"soc","type":"mcq"}	2026-06-23 05:16:03.260327+00
241	23	mentor.question.submitted	question_bank	7	103.139.35.62	\N	\N	2026-06-23 05:16:17.119002+00
242	23	mentor.question.submitted	question_bank	6	103.139.35.62	\N	\N	2026-06-23 05:16:20.37691+00
243	23	mentor.question.submitted	question_bank	5	103.139.35.62	\N	\N	2026-06-23 05:16:22.321016+00
244	23	mentor.question.submitted	question_bank	4	103.139.35.62	\N	\N	2026-06-23 05:16:24.420153+00
245	23	mentor.question.submitted	question_bank	3	103.139.35.62	\N	\N	2026-06-23 05:16:26.4406+00
246	23	mentor.report.generated	user	23	127.0.0.1	\N	{"rows":0}	2026-06-23 05:18:44.374776+00
247	23	support.ticket.create	support_ticket	2	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	{"subject":"LK test","category":"technical","priority":"medium"}	2026-06-23 05:19:15.346481+00
248	18	admin.question.approved	question_bank	3	103.139.35.62	\N	\N	2026-06-23 05:22:52.330916+00
249	18	admin.question.approved	question_bank	4	103.139.35.62	\N	\N	2026-06-23 05:22:53.92938+00
250	18	admin.question.approved	question_bank	5	103.139.35.62	\N	\N	2026-06-23 05:22:54.512021+00
251	18	admin.question.approved	question_bank	6	103.139.35.62	\N	\N	2026-06-23 05:22:55.172969+00
252	18	admin.question.approved	question_bank	7	103.139.35.62	\N	\N	2026-06-23 05:22:55.779249+00
253	18	admin.assessment.created	assessment	4	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	{"title":"Mini Assessment","type":"module_quiz","trackId":1}	2026-06-23 05:25:32.69017+00
254	26	user.registered	user	26	\N	\N	{"role":"student"}	2026-06-23 06:57:35.075344+00
255	26	consent.granted	consent	marketing	103.139.35.60	\N	{"consentType":"marketing","action":"granted"}	2026-06-23 06:58:23.257747+00
256	26	consent.granted	consent	analytics	103.139.35.60	\N	{"consentType":"analytics","action":"granted"}	2026-06-23 06:58:23.278615+00
257	26	consent.granted	consent	dataProcessing	103.139.35.60	\N	{"consentType":"dataProcessing","action":"granted"}	2026-06-23 06:58:23.282507+00
258	26	consent.granted	consent	thirdParty	103.139.35.60	\N	{"consentType":"thirdParty","action":"granted"}	2026-06-23 06:58:23.300847+00
259	26	track.selected	track	2	\N	\N	\N	2026-06-23 06:58:31.70956+00
260	26	assessment.submitted	assessment_attempt	4	\N	\N	{"assessmentId":1,"score":9}	2026-06-23 06:59:44.296369+00
261	26	onboarding.completed	user	26	\N	\N	\N	2026-06-23 06:59:44.306019+00
262	26	consent.granted	consent	analytics	103.139.35.60	\N	{"consentType":"analytics","action":"granted"}	2026-06-23 07:00:22.013907+00
263	26	assessment.submitted	assessment_attempt	5	\N	\N	{"assessmentId":1,"score":8}	2026-06-23 07:03:33.713395+00
264	26	onboarding.completed	user	26	\N	\N	\N	2026-06-23 07:03:33.724977+00
265	26	settings.theme.update	user_preferences	26	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	{"theme":"light"}	2026-06-23 07:03:55.208577+00
266	26	settings.theme.update	user_preferences	26	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	{"theme":"dark"}	2026-06-23 07:03:57.034183+00
267	26	ai.interview.start	ai_interview	7	103.139.35.60	\N	{"interviewType":"text","difficulty":"beginner","total":3,"provider":"openai"}	2026-06-23 07:04:12.362168+00
268	26	ai.tutor.explain	ai_tutor	\N	103.139.35.60	\N	{"topic":"xss","level":"beginner","provider":"openai"}	2026-06-23 07:05:31.913029+00
269	26	ai.interview.start	ai_interview	8	103.139.35.60	\N	{"interviewType":"text","difficulty":"beginner","total":3,"provider":"openai"}	2026-06-23 08:23:36.444687+00
270	26	ai.interview.finish	ai_interview	8	103.139.35.60	\N	{"provider":"openai","overall":88}	2026-06-23 08:30:26.860868+00
271	26	profile.update	user	26	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	{"fields":["linkedinUrl","githubUrl","portfolioUrl","twitterUrl"]}	2026-06-23 09:05:55.890005+00
272	26	consent.granted	consent	analytics	103.139.35.60	\N	{"consentType":"analytics","action":"granted"}	2026-06-23 09:45:05.525124+00
273	26	profile.update	user	26	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.1.5 Chrome/142.0.7444.265 Electron/39.8.9 Safari/537.36	{"fields":["resumeUrl"]}	2026-06-23 09:47:23.263399+00
274	26	ai.resume.analyze	ai_resume	\N	103.139.35.60	\N	{"provider":"openai","source":"pdf","atsScore":90}	2026-06-23 09:47:44.012767+00
275	26	ai.resume.analyze	ai_resume	\N	103.139.35.60	\N	{"provider":"openai","source":"text","atsScore":95}	2026-06-23 09:48:18.444256+00
277	26	ai.resume.analyze	ai_resume	\N	103.139.35.60	\N	{"provider":"openai","source":"html","atsScore":0}	2026-06-23 09:56:03.558716+00
278	26	consent.granted	consent	analytics	103.139.35.60	\N	{"consentType":"analytics","action":"granted"}	2026-06-23 12:22:39.847544+00
279	15	admin.assessment.questions_from_bank	assessment	4	127.0.0.1	curl/8.14.1	{"attached":2,"skipped":[],"source":"manual_select"}	2026-06-23 13:35:55.78263+00
280	15	admin.assessment.questions_auto_generated	assessment	4	127.0.0.1	curl/8.14.1	{"attached":3,"requested":3,"poolSize":3,"filters":{"careerTrack":"soc","difficulty":"intermediate","questionType":null}}	2026-06-23 13:35:55.916071+00
281	15	admin.lesson.quiz_from_bank	lesson	1	127.0.0.1	curl/8.14.1	{"copied":3,"skipped":[]}	2026-06-23 13:43:53.976108+00
282	15	admin.lesson.quiz_from_assessment	lesson	2	127.0.0.1	curl/8.14.1	{"assessmentId":1,"copied":10,"skipped":0}	2026-06-23 13:43:54.157104+00
283	15	admin.lesson.video_saved	lesson	1	127.0.0.1	curl/8.14.1	\N	2026-06-23 13:48:03.786788+00
284	15	admin.lesson.article_saved	lesson	1	127.0.0.1	curl/8.14.1	\N	2026-06-23 13:48:03.878362+00
285	15	admin.lesson.video_saved	lesson	1	127.0.0.1	curl/8.14.1	\N	2026-06-23 13:48:23.98095+00
286	15	admin.lesson.quiz_from_assessment	lesson	2	127.0.0.1	curl/8.14.1	{"assessmentId":1,"copied":10,"skipped":0}	2026-06-23 13:52:46.313663+00
287	15	admin.lesson.quiz_from_bank	lesson	2	127.0.0.1	curl/8.14.1	{"copied":2,"skipped":[]}	2026-06-23 13:52:46.467729+00
288	15	admin.lesson.resource_deleted	lesson	1	127.0.0.1	curl/8.14.1	{"resourceId":250}	2026-06-23 13:52:56.637114+00
289	18	admin.assessment.created	assessment	5	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	{"title":"mini","type":"module_quiz","trackId":2}	2026-06-23 13:58:02.949149+00
290	27	user.registered	user	27	\N	\N	{"role":"student"}	2026-06-23 13:59:44.645588+00
291	27	consent.granted	consent	marketing	103.139.35.62	\N	{"consentType":"marketing","action":"granted"}	2026-06-23 13:59:47.829632+00
292	27	consent.granted	consent	analytics	103.139.35.62	\N	{"consentType":"analytics","action":"granted"}	2026-06-23 13:59:47.842845+00
293	27	consent.granted	consent	dataProcessing	103.139.35.62	\N	{"consentType":"dataProcessing","action":"granted"}	2026-06-23 13:59:47.849123+00
294	27	consent.granted	consent	thirdParty	103.139.35.62	\N	{"consentType":"thirdParty","action":"granted"}	2026-06-23 13:59:47.853618+00
295	27	track.selected	track	1	\N	\N	\N	2026-06-23 13:59:54.974958+00
296	18	admin.mentor.updated	user	23	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	{"isActive":false}	2026-06-23 14:03:28.504608+00
297	18	admin.mentor.updated	user	23	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	{"isActive":true}	2026-06-23 14:03:29.534729+00
298	18	admin.mentor.students_assigned	user	23	127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	{"studentIds":[27,2],"batchId":null}	2026-06-23 14:03:48.075815+00
299	23	mentor.task.publish	mentor_task	5	127.0.0.1	\N	{"type":"assessment","audience":"all_students","assigned":2}	2026-06-23 14:05:09.175781+00
300	23	mentor.report.generated	user	23	127.0.0.1	\N	{"rows":2}	2026-06-23 14:05:52.980593+00
301	23	mentor.task.deleted	mentor_task	4	127.0.0.1	\N	\N	2026-06-23 14:06:39.394307+00
\.


--
-- Data for Name: auto_apply_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auto_apply_settings (id, student_id, enabled, min_salary, preferred_location, work_mode, company_size, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: batch_students; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.batch_students (id, batch_id, student_id, assigned_by, assigned_at) FROM stdin;
1	1	2	15	2026-06-21 10:36:09.908426+00
2	1	1	15	2026-06-21 10:36:09.908426+00
\.


--
-- Data for Name: batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.batches (id, name, code, career_track, mentor_id, status, description, start_date, end_date, created_by, created_at, updated_at) FROM stdin;
1	SOC Batch Alpha	\N	soc	16	active	\N	\N	\N	15	2026-06-21 10:35:58.33217+00	2026-06-21 10:36:09.768+00
\.


--
-- Data for Name: broadcast_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.broadcast_notes (id, author_id, title, content, target_roles, target_track_ids, status, published_at, created_at, updated_at) FROM stdin;
1	16	Welcome SOC	Kickoff Monday	{student}	{}	published	2026-06-21 10:36:32.363+00	2026-06-21 10:36:32.364081+00	2026-06-21 10:36:32.364081+00
\.


--
-- Data for Name: broadcast_recipients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.broadcast_recipients (id, broadcast_id, user_id, read_at, created_at) FROM stdin;
\.


--
-- Data for Name: campus_drive_registrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.campus_drive_registrations (id, drive_id, student_id, status, attended, result, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: campus_drives; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.campus_drives (id, name, company_name, career_track, eligible_colleges, eligible_years, eligibility_criteria, package_details, mode, deadline, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: certificate_auto_issue_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.certificate_auto_issue_config (id, source_type, source_id, enabled, expiry_months, allow_reissue, template_id, certificate_type, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: certificate_generation_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.certificate_generation_jobs (id, bull_job_id, status, total, processed, succeeded, failed, certificate_ids, failed_ids, avg_ms_per_cert, duration_ms, error, created_by, started_at, completed_at, created_at, updated_at, parent_job_id, is_shard, shard_index, shard_count, partition) FROM stdin;
1	1	completed	6	6	6	0	[1, 2, 3, 4, 5, 6]	[]	1261	7568	\N	15	2026-06-22 08:03:12.192+00	2026-06-22 08:03:19.76+00	2026-06-22 08:03:12.177503+00	2026-06-22 08:03:19.76+00	\N	f	\N	1	0
3	3	completed	100	100	100	0	[217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316]	[]	268	26848	\N	15	2026-06-22 08:05:48.388+00	2026-06-22 08:06:15.236+00	2026-06-22 08:05:48.381864+00	2026-06-22 08:06:15.236+00	\N	f	\N	1	0
2	2	completed	6	6	6	0	[5, 1, 4, 2, 3, 6]	[]	1209	7253	\N	15	2026-06-22 08:03:38.022+00	2026-06-22 08:03:45.275+00	2026-06-22 08:03:37.985361+00	2026-06-22 08:03:45.276+00	\N	f	\N	1	0
5	5	cancelled	100	40	40	0	[222, 230, 229, 218, 217, 225, 226, 221, 233, 236, 231, 219, 232, 228, 220, 235, 223, 234, 227, 224, 237, 275, 245, 248, 268, 240, 250, 259, 269, 283, 251, 242, 276, 254, 239, 246, 238, 279, 249, 274]	[]	192	7674	\N	15	2026-06-22 08:08:38.799+00	2026-06-22 08:08:46.473+00	2026-06-22 08:08:38.74863+00	2026-06-22 08:08:46.473+00	\N	f	\N	1	0
4	4	completed	100	100	100	0	[232, 231, 223, 219, 226, 229, 222, 230, 227, 235, 233, 236, 234, 220, 228, 221, 217, 225, 224, 218, 239, 248, 237, 245, 255, 246, 238, 242, 250, 254, 249, 251, 252, 240, 274, 259, 275, 269, 268, 276, 271, 265, 264, 262, 272, 261, 258, 263, 279, 278, 283, 284, 282, 280, 281, 290, 288, 296, 294, 293, 295, 291, 305, 304, 298, 307, 303, 302, 297, 308, 310, 299, 300, 306, 316, 313, 315, 244, 247, 243, 256, 253, 241, 257, 270, 267, 266, 260, 273, 287, 292, 277, 286, 285, 289, 301, 309, 312, 314, 311]	[]	232	23244	\N	15	2026-06-22 08:07:45.2+00	2026-06-22 08:08:08.444+00	2026-06-22 08:07:45.188101+00	2026-06-22 08:08:08.444+00	\N	f	\N	1	0
6	8	cancelled	80	40	40	0	[419, 420, 421, 422, 423, 424, 425, 426, 427, 428, 429, 430, 431, 432, 433, 434, 435, 436, 437, 438, 439, 440, 441, 442, 443, 444, 445, 446, 447, 448, 449, 450, 451, 452, 453, 454, 455, 456, 457, 458]	[]	178	9145	\N	15	2026-06-22 08:24:46.023+00	2026-06-22 08:24:55.168+00	2026-06-22 08:24:46.005287+00	2026-06-22 08:24:55.168+00	\N	f	\N	1	0
\.


--
-- Data for Name: certificate_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.certificate_templates (id, name, type, career_track, logo_url, signature_url, signature_name, body_template, is_active, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: certificates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.certificates (id, certificate_code, user_id, template_id, type, title, career_track, course_name, internship_name, mentor_id, duration_text, achievement_label, issued_date, verify_token, status, metadata, issued_by, created_at, updated_at, expires_date, pdf_object_path, source_type, source_id) FROM stdin;
2	FUTR-CERT-2026-328187	2	\N	course_completion	SOC Analyst Fundamentals	soc	SOC Level 1	\N	\N	8 weeks	\N	2026-06-22	50ec0fa0f3057e9d1684e05a0d575a19aecf9287f98c3558	issued	\N	15	2026-06-22 06:42:01.560361+00	2026-06-22 08:03:40.734+00	\N	/objects/uploads/e6ff8701-ff08-4ce9-8d2d-d134fcd2ab5a	manual	\N
6	FUTR-CERT-2026-406565	2	\N	course_completion	Audit Expire Test	soc	\N	\N	\N	\N	\N	2026-06-22	57208045011cf2cdaa966c1a3f47256eb057894360e9e354	expired	\N	15	2026-06-22 07:25:15.512327+00	2026-06-22 08:03:40.895+00	2026-06-21	/objects/uploads/dd84e70d-5af2-4733-a0e7-237f750b4482	manual	\N
3	FUTR-CERT-2026-936852	2	\N	course_completion	VAPT Pro	vapt	\N	\N	\N	\N	\N	2026-06-22	b094d58c6b8c4f34253e9cf887609a4a1393dc219f03e55a	issued	\N	15	2026-06-22 06:45:55.529094+00	2026-06-22 08:03:40.914+00	\N	/objects/uploads/169cc69c-de89-43c2-91e3-69ca458942a9	manual	\N
1	FUTR-CERT-2026-692648	1	\N	achievement	Smoke Cert	\N	\N	\N	\N	\N	Tester	2026-06-21	df9ea06d9a0346f149a64a955e57eb5d59a049013129d6aa	issued	\N	15	2026-06-21 12:50:19.912493+00	2026-06-22 08:03:41.946+00	\N	/objects/uploads/8151a492-2497-4a50-8aed-f15c5959cb22	manual	\N
4	FUTR-CERT-2026-770131	2	\N	course_completion	GRC Specialist	grc	\N	\N	\N	\N	\N	2026-06-22	4314ab32a5feaffdd4b15debad18cbb4b80c6d6d5232c2fe	issued	\N	15	2026-06-22 06:45:55.759979+00	2026-06-22 08:03:42.163+00	\N	/objects/uploads/10da5cb7-b832-42c7-8395-08d8472c0bb5	manual	\N
5	FUTR-CERT-2026-929938	2	\N	course_completion	Audit Revoke Test	soc	\N	\N	\N	\N	\N	2026-06-22	42aae177adf8eec0d179197c5b49f6f8d3ef2e9fe3a8df56	revoked	\N	15	2026-06-22 07:25:15.471709+00	2026-06-22 08:03:43.561+00	\N	/objects/uploads/a421fa66-c0c4-49fc-8541-11e19d450bd9	manual	\N
\.


--
-- Data for Name: checkpoint_progress; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.checkpoint_progress (id, user_id, checkpoint_id, status, score, completed_at, created_at) FROM stdin;
\.


--
-- Data for Name: checkpoints; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.checkpoints (id, track_id, title, description, "order", required_score, created_at) FROM stdin;
1	1	CP1 — Foundation	Complete your first 3 modules and pass the baseline quiz.	1	10	2026-06-20 14:02:05.272213+00
2	1	CP2 — Core Skills	Complete 2 labs and submit your first assignment.	2	25	2026-06-20 14:02:05.276166+00
3	1	CP3 — Applied	Pass the mid-track assessment with 70%+ and complete 4 modules.	3	45	2026-06-20 14:02:05.278679+00
4	1	CP4 — Advanced	Complete the capstone lab and score 80% in mock interview.	4	65	2026-06-20 14:02:05.280994+00
5	1	CP5 — Job Ready	Full profile, resume uploaded, and applied to 3 jobs.	5	80	2026-06-20 14:02:05.283168+00
6	2	CP1 — Foundation	Complete your first 3 modules and pass the baseline quiz.	1	10	2026-06-20 14:02:05.287507+00
7	2	CP2 — Core Skills	Complete 2 labs and submit your first assignment.	2	25	2026-06-20 14:02:05.289714+00
8	2	CP3 — Applied	Pass the mid-track assessment with 70%+ and complete 4 modules.	3	45	2026-06-20 14:02:05.291809+00
9	2	CP4 — Advanced	Complete the capstone lab and score 80% in mock interview.	4	65	2026-06-20 14:02:05.29439+00
10	2	CP5 — Job Ready	Full profile, resume uploaded, and applied to 3 jobs.	5	80	2026-06-20 14:02:05.297606+00
11	3	CP1 — Foundation	Complete your first 3 modules and pass the baseline quiz.	1	10	2026-06-20 14:02:05.301812+00
12	3	CP2 — Core Skills	Complete 2 labs and submit your first assignment.	2	25	2026-06-20 14:02:05.304098+00
13	3	CP3 — Applied	Pass the mid-track assessment with 70%+ and complete 4 modules.	3	45	2026-06-20 14:02:05.306432+00
14	3	CP4 — Advanced	Complete the capstone lab and score 80% in mock interview.	4	65	2026-06-20 14:02:05.309795+00
15	3	CP5 — Job Ready	Full profile, resume uploaded, and applied to 3 jobs.	5	80	2026-06-20 14:02:05.317369+00
\.


--
-- Data for Name: community_post_likes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.community_post_likes (id, post_id, user_id, created_at) FROM stdin;
4	1	1	2026-06-23 04:22:38.856984+00
\.


--
-- Data for Name: community_posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.community_posts (id, author_id, content, tags, like_count, comment_count, created_at, updated_at) FROM stdin;
1	2	Testing the real community feed!	{SOC,Test}	1	0	2026-06-22 04:37:17.699612+00	2026-06-23 04:22:38.866+00
\.


--
-- Data for Name: consent_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consent_history (id, user_id, consent_type, action, ip_address, user_agent, metadata, created_at) FROM stdin;
1	6	marketing	granted	127.0.0.1	curl/8.14.1	\N	2026-06-21 04:59:25.988583+00
2	6	analytics	granted	127.0.0.1	curl/8.14.1	\N	2026-06-21 04:59:26.008213+00
3	6	dataProcessing	granted	127.0.0.1	curl/8.14.1	\N	2026-06-21 04:59:26.012278+00
4	6	thirdParty	granted	127.0.0.1	curl/8.14.1	\N	2026-06-21 04:59:26.025608+00
5	2	marketing	granted	127.0.0.1	curl/8.14.1	\N	2026-06-21 04:59:40.621683+00
6	2	analytics	granted	127.0.0.1	curl/8.14.1	\N	2026-06-21 04:59:40.633873+00
7	2	dataProcessing	granted	127.0.0.1	curl/8.14.1	\N	2026-06-21 04:59:40.637853+00
8	2	thirdParty	granted	127.0.0.1	curl/8.14.1	\N	2026-06-21 04:59:40.651906+00
9	4	marketing	granted	106.198.33.207	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	\N	2026-06-21 05:04:56.648613+00
10	4	analytics	granted	106.198.33.207	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	\N	2026-06-21 05:04:56.664981+00
11	4	dataProcessing	granted	106.198.33.207	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	\N	2026-06-21 05:04:56.670732+00
12	4	thirdParty	granted	106.198.33.207	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	\N	2026-06-21 05:04:56.675333+00
13	1	marketing	granted	106.198.33.207	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	\N	2026-06-21 07:03:54.064824+00
14	1	analytics	granted	106.198.33.207	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	\N	2026-06-21 07:03:54.078846+00
15	1	dataProcessing	granted	106.198.33.207	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	\N	2026-06-21 07:03:54.083431+00
16	1	thirdParty	granted	106.198.33.207	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	\N	2026-06-21 07:03:54.088916+00
17	11	analytics	granted	127.0.0.1	curl/8.14.1	\N	2026-06-21 09:41:41.204042+00
18	12	analytics	granted	127.0.0.1	curl/8.14.1	\N	2026-06-21 09:46:13.015929+00
19	5	marketing	granted	106.198.10.185	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	\N	2026-06-21 12:10:07.839584+00
20	5	analytics	granted	106.198.10.185	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	\N	2026-06-21 12:10:07.853028+00
21	5	dataProcessing	granted	106.198.10.185	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	\N	2026-06-21 12:10:07.85787+00
22	5	thirdParty	granted	106.198.10.185	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	\N	2026-06-21 12:10:07.87145+00
23	17	marketing	granted	106.198.10.185	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	\N	2026-06-21 12:15:00.85216+00
24	17	analytics	granted	106.198.10.185	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	\N	2026-06-21 12:15:00.870807+00
25	17	dataProcessing	granted	106.198.10.185	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	\N	2026-06-21 12:15:00.875815+00
26	17	thirdParty	granted	106.198.10.185	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	\N	2026-06-21 12:15:00.882684+00
27	15	analytics	granted	171.79.61.127	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	\N	2026-06-21 13:26:46.409387+00
28	16	analytics	granted	34.14.195.20	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	\N	2026-06-21 21:09:03.009632+00
29	26	marketing	granted	103.139.35.60	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	\N	2026-06-23 06:58:23.251795+00
30	26	analytics	granted	103.139.35.60	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	\N	2026-06-23 06:58:23.273637+00
31	26	dataProcessing	granted	103.139.35.60	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	\N	2026-06-23 06:58:23.278616+00
32	26	thirdParty	granted	103.139.35.60	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	\N	2026-06-23 06:58:23.295444+00
33	26	analytics	granted	103.139.35.60	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	\N	2026-06-23 07:00:22.008382+00
34	26	analytics	granted	103.139.35.60	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.1.5 Chrome/142.0.7444.265 Electron/39.8.9 Safari/537.36	\N	2026-06-23 09:45:05.459512+00
35	26	analytics	granted	103.139.35.60	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.1.5 Chrome/142.0.7444.265 Electron/39.8.9 Safari/537.36 ReplitDesktop	\N	2026-06-23 09:55:29.017545+00
36	26	analytics	granted	103.139.35.60	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Replit/1.1.5 Chrome/142.0.7444.265 Electron/39.8.9 Safari/537.36	\N	2026-06-23 12:22:39.838781+00
37	27	marketing	granted	103.139.35.62	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	\N	2026-06-23 13:59:47.823229+00
38	27	analytics	granted	103.139.35.62	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	\N	2026-06-23 13:59:47.829807+00
39	27	dataProcessing	granted	103.139.35.62	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	\N	2026-06-23 13:59:47.842934+00
40	27	thirdParty	granted	103.139.35.62	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15	\N	2026-06-23 13:59:47.849307+00
\.


--
-- Data for Name: consent_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consent_logs (id, user_id, marketing, analytics, data_processing, third_party, updated_at, created_at, cookie_preferences) FROM stdin;
1	6	f	t	t	f	2026-06-21 04:59:25.984647+00	2026-06-21 04:59:25.984647+00	\N
2	2	f	t	t	f	2026-06-21 04:59:40.617898+00	2026-06-21 04:59:40.617898+00	\N
3	4	t	t	t	t	2026-06-21 05:04:56.645634+00	2026-06-21 05:04:56.645634+00	\N
4	1	t	t	t	t	2026-06-21 07:03:54.059952+00	2026-06-21 07:03:54.059952+00	\N
5	11	f	f	f	f	2026-06-21 09:41:40.977721+00	2026-06-21 09:41:40.977721+00	{"analytics": true, "marketing": true, "necessary": true, "functional": true}
6	12	f	f	f	f	2026-06-21 09:46:13.010441+00	2026-06-21 09:46:13.010441+00	{"analytics": true, "marketing": false, "necessary": true, "functional": true}
7	5	t	t	t	t	2026-06-21 12:10:07.835113+00	2026-06-21 12:10:07.835113+00	\N
8	17	t	t	t	t	2026-06-21 12:15:00.846791+00	2026-06-21 12:15:00.846791+00	\N
9	15	f	f	f	f	2026-06-21 13:26:46.401943+00	2026-06-21 13:26:46.401943+00	{"analytics": true, "marketing": true, "necessary": true, "functional": true}
10	16	f	f	f	f	2026-06-21 21:09:03.000084+00	2026-06-21 21:09:03.000084+00	{"analytics": true, "marketing": true, "necessary": true, "functional": true}
11	26	f	t	t	f	2026-06-23 12:22:39.799+00	2026-06-23 06:58:23.242456+00	{"analytics": true, "marketing": true, "necessary": true, "functional": true}
12	27	f	t	t	f	2026-06-23 13:59:47.819078+00	2026-06-23 13:59:47.819078+00	\N
\.


--
-- Data for Name: coupons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.coupons (id, code, description, discount_type, discount_value, plan, max_redemptions, times_redeemed, valid_from, valid_until, is_active, created_at) FROM stdin;
1	SMOKE10	\N	percent	10	\N	\N	0	\N	\N	t	2026-06-21 12:20:28.833459+00
\.


--
-- Data for Name: data_correction_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.data_correction_requests (id, user_id, field, current_value, requested_value, supporting_note, status, completed_at, notes, created_at) FROM stdin;
\.


--
-- Data for Name: data_delete_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.data_delete_requests (id, user_id, reason, status, completed_at, notes, created_at) FROM stdin;
\.


--
-- Data for Name: data_download_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.data_download_requests (id, user_id, status, download_url, expires_at, completed_at, notes, created_at) FROM stdin;
1	12	pending	\N	\N	\N	\N	2026-06-21 09:46:13.494662+00
2	13	pending	\N	\N	\N	\N	2026-06-21 09:49:29.015383+00
\.


--
-- Data for Name: declarations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.declarations (id, title, content, is_required, version, created_at) FROM stdin;
\.


--
-- Data for Name: discussion_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.discussion_comments (id, post_id, user_id, body, is_accepted_answer, like_count, created_at) FROM stdin;
1	1	1	Great question	f	0	2026-06-21 07:25:00.405498+00
\.


--
-- Data for Name: discussion_likes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.discussion_likes (id, user_id, post_id, comment_id, created_at) FROM stdin;
1	1	1	\N	2026-06-21 07:25:00.421181+00
\.


--
-- Data for Name: discussion_posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.discussion_posts (id, lesson_id, user_id, body, is_pinned, is_solved, like_count, created_at, updated_at) FROM stdin;
1	34	1	How does SQLi work?	f	f	1	2026-06-21 07:25:00.392402+00	2026-06-21 07:25:00.424+00
\.


--
-- Data for Name: drive_invites; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.drive_invites (id, drive_id, student_id, stage, status, invited_by, invited_at, responded_at, updated_at) FROM stdin;
\.


--
-- Data for Name: drive_rounds; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.drive_rounds (id, drive_id, name, type, sequence, scheduled_at, duration_minutes, venue, meeting_url, interviewer_id, interviewer_name, capacity, status, created_at, updated_at) FROM stdin;
1	1	Tech Round	technical	1	\N	30	\N	\N	\N	\N	\N	scheduled	2026-06-22 05:23:46.865423+00	2026-06-22 05:23:46.865423+00
\.


--
-- Data for Name: email_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_logs (id, user_id, email, subject, body, status, provider, error, sent_at, created_at) FROM stdin;
1	1	kannalogan4390@gmail.com	Free trial activated	Your trial free trial is now active. Enjoy full access!	sent	smtp	\N	2026-06-21 12:20:54.556+00	2026-06-21 12:20:54.557618+00
2	1	kannalogan4390@gmail.com	Subscription updated	Your subscription is now on the premium_vapt plan.	sent	smtp	\N	2026-06-21 12:24:09.064+00	2026-06-21 12:24:09.065324+00
3	1	kannalogan4390@gmail.com	Payment received	We received your payment of ₹5898.82.	sent	smtp	\N	2026-06-21 12:24:09.101+00	2026-06-21 12:24:09.103594+00
4	2	test.student@example.com	Certificate issued	Your certificate "SOC Fundamentals — Certificate of Completion" is ready. View it on your dashboard.	sent	smtp	\N	2026-06-22 08:10:29.88+00	2026-06-22 08:10:29.88121+00
5	2	test.student@example.com	Certificate issued	Your certificate "SOC Fundamentals — Certificate of Completion" is ready. View it on your dashboard.	sent	smtp	\N	2026-06-22 08:23:10.298+00	2026-06-22 08:23:10.299369+00
\.


--
-- Data for Name: employers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employers (id, user_id, company_name, company_size, industry, website, logo_url, is_verified, created_at, updated_at, linkedin_url, designation, approval_status, reviewed_by, reviewed_at, rejection_reason) FROM stdin;
2	1	FUTRSEC Hiring Partner	\N	Cybersecurity	https://futrsec.com	\N	t	2026-06-20 14:02:05.023572+00	2026-06-20 14:02:05.023572+00	\N	\N	pending	\N	\N	\N
3	17	BCBUZZ	11–50	Cybersecurity	\N	\N	t	2026-06-21 12:14:50.62709+00	2026-06-21 13:28:49.941+00	\N	HR	approved	15	2026-06-21 13:28:49.94+00	\N
\.


--
-- Data for Name: event_registrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_registrations (id, event_id, student_id, status, registered_at) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.events (id, tpo_id, title, description, type, location, is_online, meeting_url, career_track, starts_at, ends_at, max_attendees, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: file_quotas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.file_quotas (user_id, quota_bytes, used_bytes, updated_at) FROM stdin;
18	2147483648	0	2026-06-22 07:18:25.135599+00
16	2147483648	12288	2026-06-22 07:20:53.284+00
24	2147483648	8192	2026-06-22 07:21:11.706+00
15	2147483648	8192	2026-06-22 07:21:37.226+00
25	2147483648	12288	2026-06-22 07:22:40.799+00
2	2147483648	31954	2026-06-22 07:31:59.048+00
\.


--
-- Data for Name: files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.files (id, object_path, owner_id, original_name, content_type, size, folder, usage_area, visibility, version, parent_file_id, is_latest, status, scan_status, metadata, expires_at, deleted_at, deleted_by, created_at, updated_at) FROM stdin;
12	/objects/uploads/5511dd25-3b00-4847-86ec-2f3a8c106582	25	jd.pdf	application/pdf	4096	/	job_descriptions	private	1	\N	t	active	clean	\N	\N	\N	\N	2026-06-22 07:21:15.763538+00	2026-06-22 07:21:15.779+00
1	/objects/uploads/7843fd35-db6f-49f3-8657-4415e131aabd	2	report.pdf	application/pdf	1234	/	resumes	private	1	\N	t	active	clean	\N	\N	\N	\N	2026-06-22 06:33:55.578965+00	2026-06-22 06:34:20.252+00
2	/objects/uploads/6cc5b1a5-f3d9-4107-8d37-05a62ce14013	2	resume.pdf	application/pdf	4096	/	resumes	private	1	\N	t	active	clean	\N	\N	\N	\N	2026-06-22 07:19:44.149885+00	2026-06-22 07:19:44.165+00
19	/objects/uploads/55b3950f-dd21-46cd-be38-33f92c6965fa	2	life2.png	image/png	2048	/	general	private	2	17	t	active	clean	\N	\N	\N	\N	2026-06-22 07:22:42.742346+00	2026-06-22 07:22:42.758+00
3	/objects/uploads/0c005309-a642-4951-9ba2-5f27055843f9	2	profile.png	image/png	4096	/	general	private	1	\N	t	active	clean	\N	\N	\N	\N	2026-06-22 07:19:53.266548+00	2026-06-22 07:19:53.32+00
13	/objects/uploads/5ed05dda-30fc-432f-99b0-1bc67b770039	25	company.docx	application/vnd.openxmlformats-officedocument.wordprocessingml.document	4096	/	employer_documents	private	1	\N	t	active	clean	\N	\N	\N	\N	2026-06-22 07:21:19.8506+00	2026-06-22 07:21:19.866+00
4	/objects/uploads/e7ad1beb-50ed-4172-8c67-86da9f3006e5	2	assignment.zip	application/zip	4096	/	assignments	private	1	\N	t	active	clean	\N	\N	\N	\N	2026-06-22 07:20:02.500992+00	2026-06-22 07:20:02.517+00
5	/objects/uploads/17670472-7bc5-4f58-9414-23ebd416fc06	2	capture.pcap	application/vnd.tcpdump.pcap	4096	/	labs	private	1	\N	t	active	clean	\N	\N	\N	\N	2026-06-22 07:20:12.964982+00	2026-06-22 07:20:12.989+00
6	/objects/uploads/b0430211-266a-444c-81e4-3b7c7f7458e8	2	labreport.pdf	application/pdf	4096	/	labs	private	1	\N	t	active	clean	\N	\N	\N	\N	2026-06-22 07:20:22.120255+00	2026-06-22 07:20:22.143+00
14	/objects/uploads/ecab0fa4-be82-4cb6-a12e-6c21137dc513	15	cert-asset.pdf	application/pdf	4096	/	certificates	private	1	\N	t	active	clean	\N	\N	\N	\N	2026-06-22 07:21:27.758387+00	2026-06-22 07:21:27.772+00
7	/objects/uploads/533277f8-7f4c-4fee-bee2-e218c8ae1938	16	resource.pdf	application/pdf	4096	/	mentor_resources	private	1	\N	t	active	clean	\N	\N	\N	\N	2026-06-22 07:20:32.61436+00	2026-06-22 07:20:32.628+00
8	/objects/uploads/a17accb7-7bef-4dcb-b115-26002c239798	16	mentor-assignment.docx	application/vnd.openxmlformats-officedocument.wordprocessingml.document	4096	/	assignments	private	1	\N	t	active	clean	\N	\N	\N	\N	2026-06-22 07:20:43.036386+00	2026-06-22 07:20:43.046+00
9	/objects/uploads/2ed5083e-ed27-4321-9640-c8d18144c942	16	notes.pdf	application/pdf	4096	/	mentor_resources	private	1	\N	t	active	clean	\N	\N	\N	\N	2026-06-22 07:20:53.2813+00	2026-06-22 07:20:53.294+00
15	/objects/uploads/83ea35a2-4341-464b-96ab-45b3f9e0d593	15	course-asset.png	image/png	4096	/	courses	private	1	\N	t	active	clean	\N	\N	\N	\N	2026-06-22 07:21:37.221795+00	2026-06-22 07:21:37.237+00
10	/objects/uploads/ae881ae9-ab05-4abb-989f-f1c825564271	24	placement.pdf	application/pdf	4096	/	tpo_files	private	1	\N	t	active	clean	\N	\N	\N	\N	2026-06-22 07:21:03.709608+00	2026-06-22 07:21:03.727+00
11	/objects/uploads/5c70fdde-7162-41cb-97b8-62adf9baf769	24	drive-schedule.csv	text/csv	4096	/	tpo_files	private	1	\N	t	active	clean	\N	\N	\N	\N	2026-06-22 07:21:11.702742+00	2026-06-22 07:21:11.717+00
18	/objects/uploads/dbee4fe9-e616-4879-8273-cdc67c760c4d	25	empjd.pdf	application/pdf	4096	/	job_descriptions	private	1	\N	t	active	clean	\N	\N	\N	\N	2026-06-22 07:22:40.788627+00	2026-06-22 07:22:40.811+00
16	/objects/uploads/31b33f65-d0c9-45ba-8093-c9f04bcbae5b	2	life1.pdf	application/pdf	4096	/	resumes	private	1	\N	t	active	clean	\N	\N	\N	\N	2026-06-22 07:22:36.852577+00	2026-06-22 07:22:40.913+00
17	/objects/uploads/ff6482b7-1dd8-492f-9b05-7da9fc1c3345	2	life2.png	image/png	4096	/	general	private	1	\N	f	active	clean	\N	\N	\N	\N	2026-06-22 07:22:38.985118+00	2026-06-22 07:22:42.55+00
\.


--
-- Data for Name: fts_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fts_history (id, user_id, event, score_delta, previous_score, new_score, metadata, created_at) FROM stdin;
1	4	pre_assessment_submitted	9	0	9	\N	2026-06-22 07:20:50.94659+00
2	1	pre_assessment_submitted	3	0	3	\N	2026-06-23 04:22:03.946557+00
3	4	pre_assessment_submitted	6	9	15	\N	2026-06-23 04:41:26.978032+00
4	26	pre_assessment_submitted	27	0	27	\N	2026-06-23 06:59:44.291219+00
5	26	pre_assessment_submitted	24	27	51	\N	2026-06-23 07:03:33.708751+00
\.


--
-- Data for Name: fts_scores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fts_scores (id, user_id, total_score, assessment_score, lab_score, assignment_score, attendance_score, updated_at) FROM stdin;
2	1	3	3	0	0	0	2026-06-23 04:22:03.873841+00
1	4	15	6	0	0	0	2026-06-23 04:41:26.974+00
3	26	51	24	0	0	0	2026-06-23 07:03:33.705+00
\.


--
-- Data for Name: interviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.interviews (id, application_id, type, scheduled_at, status, meeting_url, feedback, interviewer_notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, user_id, payment_id, invoice_number, amount, tax, total_amount, s3_key, issued_at, created_at, gst_number, gst_rate, place_of_supply, billing_name) FROM stdin;
1	1	1	INV-202606-001001	499900	89982	589882	\N	2026-06-21 12:24:07.583106+00	2026-06-21 12:24:07.583106+00	\N	18	Karnataka	kannalogan4390@gmail.com
\.


--
-- Data for Name: job_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.job_applications (id, job_id, student_id, cover_letter, resume_url, status, applied_at, updated_at) FROM stdin;
1	5	1	\N	\N	applied	2026-06-21 13:13:55.726027+00	2026-06-21 13:13:55.726027+00
3	13	1	\N	\N	applied	2026-06-23 04:26:44.133807+00	2026-06-23 04:26:44.133807+00
4	13	26	\N	\N	applied	2026-06-23 07:05:07.824431+00	2026-06-23 07:05:07.824431+00
5	8	26	\N	\N	applied	2026-06-23 07:05:12.746231+00	2026-06-23 07:05:12.746231+00
6	7	26	\N	\N	applied	2026-06-23 09:01:53.958512+00	2026-06-23 09:01:53.958512+00
7	6	26	\N	\N	applied	2026-06-23 09:45:32.51945+00	2026-06-23 09:45:32.51945+00
\.


--
-- Data for Name: job_matches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.job_matches (id, student_id, job_id, match_score, reasons, factors, created_at, updated_at, breakdown, missing_skills, recommendations) FROM stdin;
5	1	13	0	This role targets a different career track.	{"resumeReady": 0, "matchedSkills": [], "missingSkills": [], "skillsOverlap": 0, "trackAlignment": 0, "foundationalSkill": 0, "checkpointProgress": 0}	2026-06-21 13:08:40.266113+00	2026-06-21 13:08:40.266113+00	\N	\N	\N
4	1	5	10	No relevant skills listed • No resume provided • No checkpoint progress	{"resumeReady": 0, "matchedSkills": [], "missingSkills": ["Burp Suite", "Nmap", "Metasploit", "OWASP", "Python"], "skillsOverlap": 0, "trackAlignment": 30, "foundationalSkill": 0, "checkpointProgress": 0}	2026-06-21 12:20:52.44469+00	2026-06-21 13:08:41.988+00	\N	\N	\N
2	1	8	10	No relevant skills listed • No resume available • Checkpoint progress is 0%	{"resumeReady": 0, "matchedSkills": [], "missingSkills": ["SAST", "DAST", "OWASP", "Secure Code Review", "CI/CD Security"], "skillsOverlap": 0, "trackAlignment": 30, "foundationalSkill": 0, "checkpointProgress": 0}	2026-06-21 12:20:52.230874+00	2026-06-21 13:08:42.1+00	\N	\N	\N
1	1	6	30	Student track matches job requirements. • No relevant skills or experience listed.	{"resumeReady": 0, "matchedSkills": [], "missingSkills": ["Web Security", "Burp Suite", "API Testing", "OWASP Top 10"], "skillsOverlap": 0, "trackAlignment": 30, "foundationalSkill": 0, "checkpointProgress": 0}	2026-06-21 12:20:52.13771+00	2026-06-21 13:08:42.157+00	\N	\N	\N
3	1	7	10	No relevant skills listed • No resume provided • Checkpoint progress is 0% • Lack of experience in required areas	{"resumeReady": 0, "matchedSkills": [], "missingSkills": ["Active Directory", "C2 Frameworks", "Cobalt Strike", "PowerShell", "OPSEC"], "skillsOverlap": 0, "trackAlignment": 30, "foundationalSkill": 0, "checkpointProgress": 0}	2026-06-21 12:20:52.276373+00	2026-06-21 13:08:42.372+00	\N	\N	\N
7	4	4	23	Matches career track: soc-analyst. • Develop required skills to improve fit. • Foundational training score is low at 15%. • Assessment score is low at 6%. • No hands-on experience: 0 labs, 0% progress. • Resume not uploaded; could enhance application.	{"components": {"fts": 0.15, "track": 1, "resume": 0.03333333333333333, "skills": 0, "assessment": 0.06, "experience": 0, "certificate": 0}, "matchedSkills": [], "missingSkills": ["Incident Response", "Forensics", "Malware Analysis", "Volatility", "EnCase"]}	2026-06-22 07:25:53.564117+00	2026-06-23 04:44:29.938+00	{"fts": {"score": 0.15, "weight": 13, "contribution": 2}, "track": {"score": 1, "weight": 20, "contribution": 20}, "resume": {"score": 0.03333333333333333, "weight": 10, "contribution": 0}, "skills": {"score": 0, "weight": 22, "contribution": 0}, "assessment": {"score": 0.06, "weight": 12, "contribution": 1}, "experience": {"score": 0, "weight": 11, "contribution": 0}, "certificate": {"score": 0, "weight": 12, "contribution": 0}}	["Incident Response", "Forensics", "Malware Analysis", "Volatility", "EnCase"]	["Close your skill gap: learn Incident Response, Forensics, Malware Analysis and 2 more.", "Earn a certificate in Incident Response to prove this skill.", "Complete more SOC labs and modules to raise your FTS score.", "Retake track assessments to improve your assessment score.", "Complete the SOC labs and career checkpoints to build experience.", "Add your current role and a bio to strengthen your profile."]
6	4	3	23	Career track aligns with the job. • Develop listed skills to improve match. • Foundational training score is low at 15%. • Assessment score is low at 6%. • No hands-on experience: 0 labs completed and 0% checkpoint progress. • Upload a resume to enhance application.	{"components": {"fts": 0.15, "track": 1, "resume": 0.03333333333333333, "skills": 0, "assessment": 0.06, "experience": 0, "certificate": 0}, "matchedSkills": [], "missingSkills": ["Threat Hunting", "Kibana", "Python", "MITRE ATT&CK", "Malware Analysis"]}	2026-06-22 07:25:53.530151+00	2026-06-23 04:44:31.027+00	{"fts": {"score": 0.15, "weight": 13, "contribution": 2}, "track": {"score": 1, "weight": 20, "contribution": 20}, "resume": {"score": 0.03333333333333333, "weight": 10, "contribution": 0}, "skills": {"score": 0, "weight": 22, "contribution": 0}, "assessment": {"score": 0.06, "weight": 12, "contribution": 1}, "experience": {"score": 0, "weight": 11, "contribution": 0}, "certificate": {"score": 0, "weight": 12, "contribution": 0}}	["Threat Hunting", "Kibana", "Python", "MITRE ATT&CK", "Malware Analysis"]	["Close your skill gap: learn Threat Hunting, Kibana, Python and 2 more.", "Earn a certificate in Threat Hunting to prove this skill.", "Complete more SOC labs and modules to raise your FTS score.", "Retake track assessments to improve your assessment score.", "Complete the SOC labs and career checkpoints to build experience.", "Add your current role and a bio to strengthen your profile."]
8	4	1	23	Career track matches job requirement. • Develop skills listed in the job description. • Low foundational training score. • Low assessment score. • No hands-on experience from labs or checkpoints. • Resume upload is needed to enhance application.	{"components": {"fts": 0.15, "track": 1, "resume": 0.03333333333333333, "skills": 0, "assessment": 0.06, "experience": 0, "certificate": 0}, "matchedSkills": [], "missingSkills": ["Splunk", "QRadar", "SIEM", "Incident Response", "Log Analysis"]}	2026-06-22 07:25:54.01257+00	2026-06-23 04:44:29.461+00	{"fts": {"score": 0.15, "weight": 13, "contribution": 2}, "track": {"score": 1, "weight": 20, "contribution": 20}, "resume": {"score": 0.03333333333333333, "weight": 10, "contribution": 0}, "skills": {"score": 0, "weight": 22, "contribution": 0}, "assessment": {"score": 0.06, "weight": 12, "contribution": 1}, "experience": {"score": 0, "weight": 11, "contribution": 0}, "certificate": {"score": 0, "weight": 12, "contribution": 0}}	["Splunk", "QRadar", "SIEM", "Incident Response", "Log Analysis"]	["Close your skill gap: learn Splunk, QRadar, SIEM and 2 more.", "Earn a certificate in Splunk to prove this skill.", "Complete more SOC labs and modules to raise your FTS score.", "Retake track assessments to improve your assessment score.", "Complete the SOC labs and career checkpoints to build experience.", "Add your current role and a bio to strengthen your profile."]
9	4	2	23	Career track matches SOC Analyst. • Develop required skills to enhance match. • Foundational training score is low at 15%. • Assessment score is low at 6%. • No hands-on experience: 0 labs and 0% checkpoint progress. • Resume not uploaded; improve application with one.	{"components": {"fts": 0.15, "track": 1, "resume": 0.03333333333333333, "skills": 0, "assessment": 0.06, "experience": 0, "certificate": 0}, "matchedSkills": [], "missingSkills": ["SIEM", "Threat Hunting", "MITRE ATT&CK", "Python", "Forensics"]}	2026-06-22 07:25:54.113448+00	2026-06-23 04:44:30.804+00	{"fts": {"score": 0.15, "weight": 13, "contribution": 2}, "track": {"score": 1, "weight": 20, "contribution": 20}, "resume": {"score": 0.03333333333333333, "weight": 10, "contribution": 0}, "skills": {"score": 0, "weight": 22, "contribution": 0}, "assessment": {"score": 0.06, "weight": 12, "contribution": 1}, "experience": {"score": 0, "weight": 11, "contribution": 0}, "certificate": {"score": 0, "weight": 12, "contribution": 0}}	["SIEM", "Threat Hunting", "MITRE ATT&CK", "Python", "Forensics"]	["Close your skill gap: learn SIEM, Threat Hunting, MITRE ATT&CK and 2 more.", "Earn a certificate in SIEM to prove this skill.", "Complete more SOC labs and modules to raise your FTS score.", "Retake track assessments to improve your assessment score.", "Complete the SOC labs and career checkpoints to build experience.", "Add your current role and a bio to strengthen your profile."]
\.


--
-- Data for Name: job_shortlists; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.job_shortlists (id, job_id, student_id, shortlisted_by, reason, created_at) FROM stdin;
\.


--
-- Data for Name: job_skills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.job_skills (id, job_id, skill, level, created_at) FROM stdin;
1	1	Splunk	required	2026-06-20 14:02:05.03717+00
2	1	QRadar	required	2026-06-20 14:02:05.041437+00
3	1	SIEM	required	2026-06-20 14:02:05.044436+00
4	1	Incident Response	required	2026-06-20 14:02:05.048015+00
5	1	Log Analysis	required	2026-06-20 14:02:05.051015+00
6	2	SIEM	required	2026-06-20 14:02:05.058838+00
7	2	Threat Hunting	required	2026-06-20 14:02:05.061311+00
8	2	MITRE ATT&CK	required	2026-06-20 14:02:05.065201+00
9	2	Python	required	2026-06-20 14:02:05.067441+00
10	2	Forensics	required	2026-06-20 14:02:05.070121+00
11	3	Threat Hunting	required	2026-06-20 14:02:05.081363+00
12	3	Kibana	required	2026-06-20 14:02:05.083652+00
13	3	Python	required	2026-06-20 14:02:05.086255+00
14	3	MITRE ATT&CK	required	2026-06-20 14:02:05.090635+00
15	3	Malware Analysis	required	2026-06-20 14:02:05.093767+00
16	4	Incident Response	required	2026-06-20 14:02:05.100477+00
17	4	Forensics	required	2026-06-20 14:02:05.102567+00
18	4	Malware Analysis	required	2026-06-20 14:02:05.106402+00
19	4	Volatility	required	2026-06-20 14:02:05.113179+00
20	4	EnCase	required	2026-06-20 14:02:05.116219+00
21	5	Burp Suite	required	2026-06-20 14:02:05.122735+00
22	5	Nmap	required	2026-06-20 14:02:05.125024+00
23	5	Metasploit	required	2026-06-20 14:02:05.12798+00
24	5	OWASP	required	2026-06-20 14:02:05.131279+00
25	5	Python	required	2026-06-20 14:02:05.134648+00
26	6	Web Security	required	2026-06-20 14:02:05.141348+00
27	6	Burp Suite	required	2026-06-20 14:02:05.143722+00
28	6	API Testing	required	2026-06-20 14:02:05.146405+00
29	6	OWASP Top 10	required	2026-06-20 14:02:05.14854+00
30	7	Active Directory	required	2026-06-20 14:02:05.155583+00
31	7	C2 Frameworks	required	2026-06-20 14:02:05.158913+00
32	7	Cobalt Strike	required	2026-06-20 14:02:05.161733+00
33	7	PowerShell	required	2026-06-20 14:02:05.164216+00
34	7	OPSEC	required	2026-06-20 14:02:05.16778+00
35	8	SAST	required	2026-06-20 14:02:05.17497+00
36	8	DAST	required	2026-06-20 14:02:05.17741+00
37	8	OWASP	required	2026-06-20 14:02:05.18009+00
38	8	Secure Code Review	required	2026-06-20 14:02:05.184588+00
39	8	CI/CD Security	required	2026-06-20 14:02:05.187157+00
40	9	ISO 27001	required	2026-06-20 14:02:05.1945+00
41	9	Risk Assessment	required	2026-06-20 14:02:05.196918+00
42	9	DPDP	required	2026-06-20 14:02:05.199214+00
43	9	Audit	required	2026-06-20 14:02:05.20302+00
44	9	Compliance	required	2026-06-20 14:02:05.206831+00
45	10	DPDP	required	2026-06-20 14:02:05.214644+00
46	10	GDPR	required	2026-06-20 14:02:05.217339+00
47	10	Privacy by Design	required	2026-06-20 14:02:05.221645+00
48	10	Consent Management	required	2026-06-20 14:02:05.2247+00
49	10	Legal	required	2026-06-20 14:02:05.227364+00
50	11	ISO 27001	required	2026-06-20 14:02:05.235218+00
51	11	NIST	required	2026-06-20 14:02:05.238854+00
52	11	SOC 2	required	2026-06-20 14:02:05.241856+00
53	11	Risk Management	required	2026-06-20 14:02:05.244231+00
54	11	Vendor Risk	required	2026-06-20 14:02:05.248314+00
55	12	GRC Tools	required	2026-06-20 14:02:05.255802+00
56	12	Policy Writing	required	2026-06-20 14:02:05.258585+00
57	12	Risk Registers	required	2026-06-20 14:02:05.261646+00
58	12	ISMS	required	2026-06-20 14:02:05.264459+00
59	12	ISO 27001	required	2026-06-20 14:02:05.267244+00
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jobs (id, employer_id, title, description, type, location, is_remote, min_salary, max_salary, experience, required_tracks, status, application_deadline, created_at, updated_at, created_by_admin_id) FROM stdin;
1	2	SOC Analyst L1	Monitor and triage security alerts in a 24x7 SOC environment. Handle Tier-1 incidents, escalate as needed.	full_time	Bangalore, India	f	400000	700000	0-2 years	{soc-analyst}	active	\N	2026-06-20 14:02:05.033889+00	2026-06-20 14:02:05.033889+00	\N
2	2	SOC Analyst L2	Lead complex incident investigations, mentor L1 analysts, and develop detection use cases.	full_time	Hyderabad, India	f	700000	1200000	2-4 years	{soc-analyst}	active	\N	2026-06-20 14:02:05.055672+00	2026-06-20 14:02:05.055672+00	\N
3	2	Threat Hunter	Proactively hunt for advanced persistent threats across enterprise environments.	full_time	Remote	t	1000000	1800000	3-5 years	{soc-analyst}	active	\N	2026-06-20 14:02:05.075456+00	2026-06-20 14:02:05.075456+00	\N
4	2	Incident Response Analyst	Lead IR engagements for enterprise clients. Perform digital forensics, malware analysis, and remediation.	full_time	Mumbai, India	f	800000	1400000	2-4 years	{soc-analyst}	active	\N	2026-06-20 14:02:05.097601+00	2026-06-20 14:02:05.097601+00	\N
5	2	Penetration Tester	Conduct web, network, and mobile penetration tests for enterprise clients. Deliver detailed reports.	full_time	Bangalore, India	f	600000	1200000	1-3 years	{vapt-professional}	active	\N	2026-06-20 14:02:05.119803+00	2026-06-20 14:02:05.119803+00	\N
6	2	Bug Bounty Hunter (Contract)	Find and report security vulnerabilities in web/mobile applications. Contract role with bounty-based payments.	contract	Remote	t	200000	800000	0-2 years	{vapt-professional}	active	\N	2026-06-20 14:02:05.13845+00	2026-06-20 14:02:05.13845+00	\N
7	2	Red Team Operator	Plan and execute adversary simulation engagements for Fortune 500 clients.	full_time	Delhi, India	f	1200000	2000000	4-7 years	{vapt-professional}	active	\N	2026-06-20 14:02:05.152162+00	2026-06-20 14:02:05.152162+00	\N
8	2	Application Security Engineer	Embed security into SDLC. Conduct code reviews, DAST/SAST, and security architecture reviews.	full_time	Pune, India	t	1000000	1800000	3-5 years	{vapt-professional}	active	\N	2026-06-20 14:02:05.17245+00	2026-06-20 14:02:05.17245+00	\N
9	2	GRC Analyst	Support ISO 27001, SOC 2, and DPDP compliance programs. Conduct risk assessments and internal audits.	full_time	Chennai, India	f	500000	900000	0-2 years	{grc-specialist}	active	\N	2026-06-20 14:02:05.19087+00	2026-06-20 14:02:05.19087+00	\N
10	2	Privacy Officer	Oversee DPDP, GDPR, and data privacy compliance. Manage consent, data requests, and breach notifications.	full_time	Remote	t	1200000	2000000	4-6 years	{grc-specialist}	active	\N	2026-06-20 14:02:05.211258+00	2026-06-20 14:02:05.211258+00	\N
11	2	Compliance Manager	Lead multi-framework compliance programs (ISO 27001, NIST, SOC 2) for a fintech company.	full_time	Mumbai, India	f	1500000	2500000	5-8 years	{grc-specialist}	active	\N	2026-06-20 14:02:05.231219+00	2026-06-20 14:02:05.231219+00	\N
12	2	Information Security Analyst (GRC Focus)	Support the information security team with policy development, risk tracking, and audit coordination.	full_time	Bangalore, India	f	600000	1000000	1-3 years	{grc-specialist}	active	\N	2026-06-20 14:02:05.252977+00	2026-06-20 14:02:05.252977+00	\N
13	\N	Smoke Intern	d	internship	\N	f	\N	\N	\N	{vapt}	active	\N	2026-06-21 12:50:19.785626+00	2026-06-21 12:50:19.785626+00	15
\.


--
-- Data for Name: lab_assets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lab_assets (id, lab_id, kind, title, url, storage_key, size_bytes, uploaded_by, created_at) FROM stdin;
\.


--
-- Data for Name: lab_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lab_assignments (id, lab_id, assigned_by, audience_type, student_id, batch_id, track_id, due_at, note, created_at) FROM stdin;
\.


--
-- Data for Name: lab_attempts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lab_attempts (id, user_id, lab_id, status, started_at, completed_at, total_score, hints_used, created_at) FROM stdin;
1	9	7	in_progress	2026-06-21 06:57:57.897302+00	\N	0	0	2026-06-21 06:57:57.897302+00
2	1	1	completed	2026-06-21 07:58:47.735271+00	2026-06-21 07:58:47.837+00	70	0	2026-06-21 07:58:47.735271+00
3	26	2	in_progress	2026-06-23 07:18:08.206716+00	\N	100	0	2026-06-23 07:18:08.206716+00
\.


--
-- Data for Name: lab_hints; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lab_hints (id, lab_module_id, "order", content, penalty_points, created_at) FROM stdin;
\.


--
-- Data for Name: lab_module_completions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lab_module_completions (id, attempt_id, user_id, lab_id, lab_module_id, points_awarded, solved_at) FROM stdin;
1	2	1	1	1	40	2026-06-21 07:58:47.764201+00
2	2	1	1	2	30	2026-06-21 07:58:47.799206+00
3	3	26	2	5	40	2026-06-23 07:18:19.222843+00
4	3	26	2	7	60	2026-06-23 07:18:49.534236+00
\.


--
-- Data for Name: lab_modules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lab_modules (id, lab_id, title, "order", task_description, hint, flag_format, points, created_at, flag, solution_explanation, walkthrough) FROM stdin;
25	7	Load Alert Data	1	Import the provided log bundle into Splunk and identify the triggering event.	Look for EventID 4625 in the Windows Security log.	\N	20	2026-06-20 14:03:01.808175+00	4625	The triggering events are EventID 4625 (failed logon). Dozens fire from one source in seconds — the brute-force signature.	\N
26	7	Triage & Classify	2	Determine whether the alert is a true positive, false positive, or benign. Justify your answer.	\N	\N	30	2026-06-20 14:03:01.812072+00	true positive	47 failed 4625s followed by a successful 4624 from the same external IP confirms a successful brute-force — a true positive.	\N
27	7	Pivot Investigation	3	Use the source IP to find related events in the last 24 hours.	\N	\N	25	2026-06-20 14:03:01.816029+00	203.0.113.45	All failed and the successful logon originate from 203.0.113.45 — pivot all further hunting on this source IP.	\N
28	7	Write Incident Ticket	4	Create a concise incident ticket with summary, impact, and next steps.	\N	\N	25	2026-06-20 14:03:01.819239+00	FLAG{brute_force_confirmed}	Incident ticket: external brute-force against 'administrator' from 203.0.113.45 succeeded at 14:02, followed by privilege escalation (4672) and encoded PowerShell (4688).	\N
29	8	Find the Initial Access	1	Identify the first event indicating unauthorized access. Submit the timestamp and EventID.	Look at authentication logs around 14:00 UTC.	\N	30	2026-06-20 14:03:01.832813+00	14:03	Initial access is the 14:03 logon (EventID 4624) by svc_backup from external IP 198.51.100.22 — a service account should never log on interactively from outside.	\N
30	8	Map to MITRE ATT&CK	2	Map the attack techniques observed to MITRE ATT&CK tactics.	\N	\N	40	2026-06-20 14:03:01.836416+00	T1021.002	PsExec over SMB maps to MITRE ATT&CK T1021.002 (Remote Services: SMB/Windows Admin Shares).	\N
31	8	Identify Lateral Movement	3	Find evidence of lateral movement using Wazuh rules.	\N	\N	50	2026-06-20 14:03:01.841341+00	FIN-DB-01	The attacker pivoted from WS-FIN-07 to FIN-DB-01 over SMB (network logon at 14:07), then ran sqlcmd against payroll data.	\N
32	8	Submit Hunt Report	4	Write a 1-page threat hunt report with IOCs and recommendations.	\N	\N	30	2026-06-20 14:03:01.844856+00	FLAG{lateral_movement_via_smb}	Hunt report: compromised svc_backup, PsExec/SMB lateral movement WS-FIN-07 → FIN-DB-01, data collection via sqlcmd, exfil to 198.51.100.22:443. IOCs: 198.51.100.22, svc_backup.	\N
33	9	Static Analysis	1	Use strings, PE analysis tools to extract IOCs from the sample.	Use pestudio or FLOSS for string extraction.	\N	50	2026-06-20 14:03:01.855285+00	http://evil-c2.example.net/gate.php	`strings` / `pestudio` reveal the embedded C2 URL http://evil-c2.example.net/gate.php and WININET imports used for beaconing.	\N
34	9	Sandbox Execution	2	Run the sample in a controlled sandbox and capture network and process activity.	\N	\N	60	2026-06-20 14:03:01.868584+00	svch0st.exe	ProcMon shows the sample spawns svch0st.exe (note the zero) masquerading as svchost, and persists it via HKCU Run key.	\N
35	9	C2 Identification	3	Identify the command and control infrastructure contacted by the malware.	\N	\N	50	2026-06-20 14:03:01.8723+00	evil-c2.example.net	tcpdump confirms HTTP beaconing to the C2 host evil-c2.example.net (GET /gate.php). This is the command-and-control infrastructure.	\N
36	9	YARA Rule	4	Write a YARA rule to detect this malware family.	\N	\N	40	2026-06-20 14:03:01.875443+00	FLAG{yara_rule_written}	A YARA rule keyed on the strings 'svch0st.exe' and 'evil-c2.example.net' plus the UPX packing detects this family. Run yara-init for the template.	\N
2	1	Stored XSS	2	Execute a stored XSS payload that alerts document.cookie.	\N	\N	30	2026-06-20 14:02:04.838712+00	FLAG{st0red_xss}	A stored XSS in the guestbook (`name` field) executes <script>alert(document.cookie)</script> on every viewer. Token: FLAG{st0red_xss}.	\N
3	1	File Upload Bypass	3	Upload and execute a PHP webshell bypassing the file type restriction.	\N	\N	40	2026-06-20 14:02:04.841004+00	FLAG{w3bsh3ll_rce}	The upload filter is bypassed with a double-extension/null-byte trick; the PHP webshell then runs commands as www-data. Token: FLAG{w3bsh3ll_rce}.	\N
5	2	Port Scan & Enumeration	1	Run a full port scan and enumerate all running services on the target.	\N	\N	40	2026-06-20 14:02:04.85251+00	FLAG{p0rts_enumerated}	`nmap -sV` reveals SMBv1 on 445 (Windows 7 SP1) plus RDP — the enumeration baseline. Token: FLAG{p0rts_enumerated}.	\N
7	2	Initial Access	3	Exploit a vulnerability to gain a shell on the target system.	\N	\N	60	2026-06-20 14:02:04.857723+00	FLAG{eternalblue_shell}	Metasploit's ms17_010_eternalblue yields a Meterpreter session (initial access). Token: FLAG{eternalblue_shell}.	\N
9	3	BOLA Exploitation	1	Access another user's order data by manipulating the order ID in the API request.	\N	\N	40	2026-06-20 14:02:04.86771+00	FLAG{bola_idor}	Incrementing the order id (1002) returns another user's order — Broken Object Level Authorization (BOLA/IDOR). Token: FLAG{bola_idor}.	\N
11	3	Mass Assignment	3	Register a user with admin role using mass assignment in the registration endpoint.	\N	\N	30	2026-06-20 14:02:04.873973+00	FLAG{mass_assign_admin}	The register endpoint binds the whole body, so passing role:admin self-grants admin (mass assignment). Token: FLAG{mass_assign_admin}.	\N
13	4	Asset Inventory	1	Create a complete asset inventory including all information assets, their owners, and classification.	\N	\N	25	2026-06-20 14:02:04.889379+00	4	Customer DB, Payroll, Source Code Repo and Backup Tapes are Confidential → 4 Confidential assets.	\N
15	4	Risk Scoring	3	Score each risk using the Likelihood x Impact matrix and create the risk register.	\N	\N	25	2026-06-20 14:02:04.89497+00	20	The top risk's score is Likelihood 4 × Impact 5 = 20 on the risk matrix.	\N
17	5	Consent Mechanism Review	1	Evaluate the organization's consent collection, management, and withdrawal mechanisms.	\N	\N	40	2026-06-20 14:02:04.906318+00	withdrawal	The consent notice is bundled and provides no way to withdraw consent — a DPDP s.6 violation. The missing element is consent withdrawal.	\N
19	5	Breach Response Assessment	3	Evaluate the breach detection and notification process against DPDP requirements.	\N	\N	35	2026-06-20 14:02:04.911806+00	72 hours	The documented breach-notification SLA is 72 hours, but the runbook lacks the required Data Protection Board notification step.	\N
21	6	Inherent Risk Classification	1	Classify the vendor as Critical/High/Medium/Low based on data access and business impact.	\N	\N	25	2026-06-20 14:02:04.926823+00	Critical	CloudPay has access to PII + payment data and is in the checkout critical path → inherent risk classification is Critical.	\N
22	6	Security Questionnaire	2	Complete the CAIQ-lite (35 questions) for the vendor and identify gaps.	\N	\N	30	2026-06-20 14:02:04.929555+00	5	The CAIQ-lite shows 30 passed / 5 gaps (SOC 2, encryption-at-rest, BCP, breach SLA, sub-processor list).	\N
24	6	Risk Treatment Decision	4	Recommend Accept / Mitigate / Transfer / Avoid with business justification.	\N	\N	25	2026-06-20 14:02:05.01573+00	Mitigate	A Critical vendor with 5 open gaps should not be accepted as-is; the right treatment is Mitigate — require remediation before go-live.	\N
1	1	SQL Injection	1	Extract all usernames and password hashes from the database using SQL injection.	Try ' OR 1=1-- in the user ID field.	\N	40	2026-06-20 14:02:04.834026+00	FLAG{sql1_dump3d}	`sqlmap --dump` confirms a boolean-based blind SQLi in `id` and dumps the users table (admin md5 = 'password'). Token: FLAG{sql1_dump3d}.	\N
4	1	CSRF Attack	4	Craft a CSRF payload that changes the admin password.	\N	\N	40	2026-06-20 14:02:04.84391+00	FLAG{csrf_pwn3d}	No anti-CSRF token on the password-change form lets a forged GET change the admin password. Token: FLAG{csrf_pwn3d}.	\N
6	2	Vulnerability Identification	2	Identify at least 2 exploitable CVEs on the target using Nmap scripts or Metasploit.	Check for EternalBlue (MS17-010).	\N	50	2026-06-20 14:02:04.854862+00	MS17-010	`nmap --script vuln` flags smb-vuln-ms17-010 (EternalBlue), a critical SMBv1 RCE — the exploitable CVE family.	\N
8	2	Privilege Escalation	4	Escalate to SYSTEM/root from your initial shell.	\N	\N	50	2026-06-20 14:02:04.860301+00	FLAG{nt_authority_system}	`getsystem` escalates to NT AUTHORITY\\SYSTEM via named-pipe impersonation. Token: FLAG{nt_authority_system}.	\N
10	3	JWT Token Forgery	2	Forge a JWT token to elevate your privileges to admin.	Try the 'none' algorithm attack.	\N	50	2026-06-20 14:02:04.871508+00	FLAG{jwt_none_alg}	The API accepts alg:none, so a forged unsigned token with role:admin is trusted. Token: FLAG{jwt_none_alg}.	\N
12	3	Report	4	Write an API security assessment report with CVSS scores.	\N	\N	30	2026-06-20 14:02:04.876991+00	FLAG{api_report_done}	Report the three issues with CVSS: BOLA (8.6 High), JWT none (9.1 Critical), mass assignment (8.1 High). Completion token: FLAG{api_report_done}.	\N
14	4	Threat & Vulnerability Identification	2	Identify at least 10 threats and map them to the relevant assets.	\N	\N	25	2026-06-20 14:02:04.892397+00	Customer Database	R1 (Customer Database breach) scores 4×5 = 20, the highest inherent risk — it owns the most sensitive data.	\N
16	4	Control Selection	4	Select appropriate Annex A controls for the top 5 risks and justify your selection.	\N	\N	25	2026-06-20 14:02:04.89746+00	A.8.24	Encryption of the customer database (data at rest/in transit) maps to Annex A control A.8.24 'Use of cryptography', directly mitigating the top risk.	\N
18	5	Data Mapping	2	Map all personal data flows and identify processing activities without valid legal basis.	\N	\N	40	2026-06-20 14:02:04.908655+00	marketing analytics	Behavioural data shared with the marketing analytics vendor has no legal basis recorded — processing without a lawful ground.	\N
20	5	Audit Report	4	Write a formal audit report with findings, risk ratings, and recommendations.	\N	\N	35	2026-06-20 14:02:04.915429+00	FLAG{dpdp_audit_complete}	Audit report: bundled consent + no withdrawal (High), marketing processing without legal basis (High), incomplete breach notification (Medium). Completion token: FLAG{dpdp_audit_complete}.	\N
23	6	Residual Risk Determination	3	Calculate residual risk after applying existing controls.	\N	\N	20	2026-06-20 14:02:05.012253+00	Medium	After the DPA and network-isolation compensating controls, residual risk drops to Medium.	\N
\.


--
-- Data for Name: lab_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lab_reports (id, attempt_id, user_id, lab_id, report_content, s3_key, submitted_at, reviewed_at, reviewed_by, grade, feedback, created_at) FROM stdin;
1	2	1	1	test	\N	2026-06-21 07:58:47.841+00	\N	\N	\N	\N	2026-06-21 07:58:47.842007+00
\.


--
-- Data for Name: lab_versions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lab_versions (id, lab_id, version, snapshot, note, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: labs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.labs (id, track_id, title, slug, description, difficulty, type, tags, total_points, estimated_minutes, docker_image, is_active, created_at, updated_at, simulator, author_id, author_role, status, version, learning_objectives, walkthrough) FROM stdin;
7	1	SIEM Alert Investigation	siem-alert-investigation	Investigate a simulated SIEM alert, triage the event, and determine if it's a true positive.	beginner	guided	{SIEM,Triage,Splunk}	100	45	\N	t	2026-06-20 14:03:01.801203+00	2026-06-21 07:56:56.245+00	{"kind": "siem", "logs": [{"account": "j.rao", "eventId": "4624", "message": "An account was successfully logged on (interactive).", "severity": "info", "sourceIp": "10.0.4.21", "timestamp": "2026-06-14T13:58:02Z"}, {"account": "administrator", "eventId": "4625", "message": "An account failed to log on. Status: 0xC000006A (bad password).", "severity": "warning", "sourceIp": "203.0.113.45", "timestamp": "2026-06-14T14:01:11Z"}, {"account": "administrator", "eventId": "4625", "message": "An account failed to log on. Status: 0xC000006A (bad password).", "severity": "warning", "sourceIp": "203.0.113.45", "timestamp": "2026-06-14T14:01:13Z"}, {"account": "administrator", "eventId": "4625", "message": "An account failed to log on. Status: 0xC000006A (bad password).", "severity": "warning", "sourceIp": "203.0.113.45", "timestamp": "2026-06-14T14:01:16Z"}, {"account": "admin", "eventId": "4625", "message": "An account failed to log on. Status: 0xC000006A.", "severity": "warning", "sourceIp": "203.0.113.45", "timestamp": "2026-06-14T14:01:19Z"}, {"account": "administrator", "eventId": "4625", "message": "47 failed attempts in 90s — classic password spray/brute-force pattern.", "severity": "high", "sourceIp": "203.0.113.45", "timestamp": "2026-06-14T14:01:55Z"}, {"account": "administrator", "eventId": "4624", "message": "An account was successfully logged on (network). LogonType 3.", "severity": "critical", "sourceIp": "203.0.113.45", "timestamp": "2026-06-14T14:02:08Z"}, {"account": "administrator", "eventId": "4672", "message": "Special privileges assigned to new logon (SeDebugPrivilege).", "severity": "critical", "sourceIp": "203.0.113.45", "timestamp": "2026-06-14T14:03:30Z"}, {"account": "administrator", "eventId": "4688", "message": "New process created: powershell.exe -enc <base64>.", "severity": "critical", "sourceIp": "203.0.113.45", "timestamp": "2026-06-14T14:05:10Z"}], "title": "Splunk — Windows Security Events", "fields": ["timestamp", "eventId", "sourceIp", "account", "message", "severity"], "description": "Search and filter the Windows Security log. Use the search box to find Event IDs, source IPs and accounts. EventID 4625 = failed logon, 4624 = successful logon."}	\N	\N	published	1	{}	\N
8	1	Threat Hunting with Wazuh	threat-hunting-wazuh	Hunt for lateral movement indicators in a simulated enterprise environment.	intermediate	ctf	{Wazuh,"Threat Hunting",MITRE}	150	60	\N	t	2026-06-20 14:03:01.829253+00	2026-06-21 07:56:56.313+00	{"kind": "siem", "logs": [{"host": "WS-FIN-07", "mitre": "-", "account": "m.iyer", "eventId": "4624", "message": "Normal interactive logon.", "sourceIp": "10.0.4.50", "timestamp": "2026-06-12T09:14:00Z"}, {"host": "WS-FIN-07", "mitre": "T1078", "account": "svc_backup", "eventId": "4624", "message": "First anomalous logon — service account interactive from external IP. INITIAL ACCESS.", "sourceIp": "198.51.100.22", "timestamp": "2026-06-12T14:03:00Z"}, {"host": "WS-FIN-07", "mitre": "T1021.002", "account": "svc_backup", "eventId": "1", "message": "Sysmon ProcessCreate: psexec.exe \\\\\\\\FIN-DB-01 -u admin.", "sourceIp": "198.51.100.22", "timestamp": "2026-06-12T14:06:40Z"}, {"host": "FIN-DB-01", "mitre": "T1021.002", "account": "svc_backup", "eventId": "4624", "message": "Network logon to database server via SMB. LATERAL MOVEMENT.", "sourceIp": "10.0.4.21", "timestamp": "2026-06-12T14:07:10Z"}, {"host": "FIN-DB-01", "mitre": "T1005", "account": "svc_backup", "eventId": "1", "message": "ProcessCreate: sqlcmd.exe -Q 'SELECT * FROM payroll'.", "sourceIp": "10.0.4.21", "timestamp": "2026-06-12T14:09:55Z"}, {"host": "FIN-DB-01", "mitre": "T1041", "account": "svc_backup", "eventId": "3", "message": "Network connection to 198.51.100.22:443 — likely exfil.", "sourceIp": "10.0.4.21", "timestamp": "2026-06-12T14:12:30Z"}], "title": "Wazuh — Enterprise Hunt Dataset", "fields": ["timestamp", "eventId", "sourceIp", "account", "host", "message", "mitre"], "description": "Hunt across authentication and Sysmon telemetry for lateral movement. Rows include MITRE technique tags (rule.mitre.id) where Wazuh rules fired."}	\N	\N	published	1	{}	\N
9	1	Malware Analysis Lab	malware-analysis-basic	Perform static and dynamic analysis on a Windows malware sample.	intermediate	guided	{Malware,"Static Analysis","Dynamic Analysis"}	200	90	\N	t	2026-06-20 14:03:01.84963+00	2026-06-21 07:56:56.335+00	{"kind": "terminal", "title": "Analysis VM — sample.exe", "prompt": "analyst@remnux:~/sample$", "commands": {"ls": "sample.exe  notes.txt", "help": "Available: strings sample.exe | pestudio sample.exe | procmon | tcpdump | yara-init | ls", "procmon": "ProcMon capture:\\n  sample.exe -> CreateProcess svch0st.exe (masquerading as svchost)\\n  svch0st.exe -> RegSetValue HKCU\\\\...\\\\Run\\\\Updater\\n  svch0st.exe -> WriteFile %APPDATA%\\\\svch0st.exe", "tcpdump": "12:01:03 IP host.50212 > evil-c2.example.net.80: HTTP GET /gate.php?id=VICTIM01\\n12:01:03 IP evil-c2.example.net.80 > host: 200 OK (C2 beacon)", "yara-init": "Template written to detect.yar. Add strings + condition, then submit FLAG{yara_rule_written}.", "strings sample.exe": "kernel32.dll\\nVirtualAlloc\\nInternetOpenA\\nhttp://evil-c2.example.net/gate.php\\nsvch0st.exe\\nMZ...\\n[+] 412 strings extracted", "pestudio sample.exe": "indicators:\\n  - packed: yes (UPX)\\n  - imports: WININET.dll (InternetOpenA, HttpSendRequestA)\\n  - suspicious string: http://evil-c2.example.net\\n  - compile-time: 2026-05-30"}, "description": "Static & dynamic malware analysis toolbox. Run the tools below against sample.exe. Try: `strings sample.exe`, `pestudio sample.exe`, `procmon`, `tcpdump`, `help`."}	\N	\N	published	1	{}	\N
2	2	Network Enumeration & Exploitation	network-enum-exploit	Enumerate a target network, identify vulnerable services, and gain initial access.	intermediate	ctf	{Nmap,Metasploit,Exploitation}	200	90	\N	t	2026-06-20 14:02:04.849337+00	2026-06-21 07:56:56.375+00	{"kind": "terminal", "title": "Kali — target 10.10.10.20", "prompt": "kali@attacker:~$", "commands": {"help": "nmap -sV 10.10.10.20 | nmap --script vuln 10.10.10.20 | msfconsole | getsystem", "getsystem": "meterpreter > getsystem\\n...got system via technique 1 (Named Pipe Impersonation).\\nmeterpreter > getuid -> NT AUTHORITY\\\\SYSTEM\\nFLAG{nt_authority_system}", "msfconsole": "msf6 > use exploit/windows/smb/ms17_010_eternalblue\\nmsf6 > set RHOSTS 10.10.10.20; run\\n[*] Meterpreter session 1 opened\\nmeterpreter > FLAG{eternalblue_shell}", "nmap -sV 10.10.10.20": "PORT    STATE SERVICE      VERSION\\n135/tcp open  msrpc        Microsoft Windows RPC\\n139/tcp open  netbios-ssn\\n445/tcp open  microsoft-ds Windows 7 SP1 (SMBv1 enabled)\\n3389/tcp open ms-wbt-server\\nFLAG{p0rts_enumerated}", "nmap --script vuln 10.10.10.20": "Host script results:\\n| smb-vuln-ms17-010:\\n|   VULNERABLE: Remote Code Execution (MS17-010 / EternalBlue)\\n|   State: VULNERABLE\\n|   Risk: CRITICAL"}, "description": "Enumerate, find a CVE, exploit, and escalate. Tools: nmap, msfconsole. Type `help`."}	\N	\N	published	1	{}	\N
5	3	DPDP Compliance Audit	dpdp-compliance-audit	Audit a fictional data fiduciary for DPDP Act 2023 compliance.	intermediate	guided	{DPDP,Privacy,Compliance,India}	150	75	\N	t	2026-06-20 14:02:04.90361+00	2026-06-21 07:56:56.429+00	{"kind": "grc", "title": "DataKart Pvt Ltd — DPDP Audit Pack", "documents": [{"body": "Users tick a single 'I agree' box at signup covering ALL purposes. There is no granular choice and NO mechanism for a Data Principal to WITHDRAW consent after signup. DPDP s.6(4)-(6) requires withdrawal to be as easy as giving consent.", "title": "Consent Notice (current)"}, {"body": "Signup data → core service (legal basis: consent ✔)\\nPayment data → processor (legal basis: contract ✔)\\nBehavioural data → marketing analytics vendor (legal basis: NONE on record ✘)\\nSupport tickets → CRM (consent ✔)", "title": "Data Flow Map"}, {"body": "On detection, notify the Data Protection Board and affected Data Principals 'without delay'. Internal SLA documented = 72 hours. Current process only emails IT, no Board notification step.", "title": "Breach Runbook"}], "description": "Audit this Data Fiduciary against the DPDP Act 2023. Read the evidence and submit each finding."}	\N	\N	published	1	{}	\N
1	2	DVWA Web Exploitation	dvwa-web-exploitation	Exploit OWASP Top 10 vulnerabilities in DVWA (Damn Vulnerable Web Application).	beginner	ctf	{OWASP,SQLi,XSS,DVWA}	150	60	\N	t	2026-06-20 14:02:04.829746+00	2026-06-21 07:56:56.354+00	{"kind": "terminal", "title": "Kali — DVWA target (10.10.10.5)", "prompt": "kali@attacker:~$", "commands": {"ls": "shell.php  payloads.txt", "help": "sqlmap -u 'http://10.10.10.5/vuln?id=1' --dump | curl-xss | upload-shell | csrf-attack | ls", "curl-xss": "POST /vulnerabilities/xss_s/ name=<script>alert(document.cookie)</script>\\nStored payload executed on victim view. Reflected token: FLAG{st0red_xss}", "csrf-attack": "Crafted: GET /vulnerabilities/csrf/?password_new=pwned&password_conf=pwned\\nVictim browser auto-submitted. Admin password changed.\\nFLAG{csrf_pwn3d}", "upload-shell": "Renaming shell.php -> shell.php%00.jpg ... upload accepted (type check bypassed).\\nGET /uploads/shell.php?cmd=id -> uid=33(www-data)\\nFLAG{w3bsh3ll_rce}", "sqlmap -u 'http://10.10.10.5/vuln?id=1' --dump": "[*] testing 'id' parameter... injectable (boolean-based blind)\\nDatabase: dvwa\\nTable: users\\n+----+----------+----------------------------------+----------------------+\\n| id | user     | password (md5)                   | flag                 |\\n+----+----------+----------------------------------+----------------------+\\n| 1  | admin    | 5f4dcc3b5aa765d61d8327deb882cf99 | FLAG{sql1_dump3d}    |\\n+----+----------+----------------------------------+----------------------+"}, "description": "Exploit OWASP Top 10 bugs in DVWA. Each successful exploit prints a FLAG{...} token. Try `help` for the command list."}	\N	\N	published	1	{}	\N
3	2	API Security Testing	api-security-testing	Test a vulnerable REST API for authentication bypasses, injection, and excessive data exposure.	intermediate	guided	{API,JWT,BOLA,"Mass Assignment"}	150	60	\N	t	2026-06-20 14:02:04.864519+00	2026-06-21 07:56:56.391+00	{"kind": "terminal", "title": "API target — https://api.shopdemo.test", "prompt": "tester@kali:~$", "commands": {"ls": "report-template.md", "help": "curl /api/orders/1002 (BOLA) | jwt-forge | curl-register | ls", "jwt-forge": "Original header {\\"alg\\":\\"HS256\\"} -> tamper to {\\"alg\\":\\"none\\"}, set {\\"role\\":\\"admin\\"}, strip signature.\\nGET /api/admin/users with forged token -> 200 OK\\nFLAG{jwt_none_alg}", "curl-register": "POST /api/register {\\"email\\":\\"x@x.com\\",\\"password\\":\\"x\\",\\"role\\":\\"admin\\"}\\n201 Created {\\"id\\":1099,\\"role\\":\\"admin\\"}  # role accepted via mass assignment\\nFLAG{mass_assign_admin}", "curl /api/orders/1002": "GET /api/orders/1002 Authorization: Bearer <alice>\\n200 OK {\\"orderId\\":1002,\\"owner\\":\\"bob\\",\\"total\\":\\"₹84,990\\",\\"flag\\":\\"FLAG{bola_idor}\\"}\\n# You read another user's order — Broken Object Level Authorization."}, "description": "Test a REST API for BOLA, JWT flaws and mass assignment. You are user 'alice' (id 1001). Type `help`."}	\N	\N	published	1	{}	\N
4	3	ISO 27001 Risk Assessment	iso27001-risk-assessment	Conduct a complete information security risk assessment for a fictional organization.	beginner	guided	{"ISO 27001","Risk Assessment",Controls}	100	60	\N	t	2026-06-20 14:02:04.883045+00	2026-06-21 07:56:56.412+00	{"kind": "grc", "title": "Acme Fintech — ISMS Workpapers", "documents": [{"body": "A1 Customer Database — Confidential — Owner: DBA\\nA2 Payroll System — Confidential — Owner: HR\\nA3 Marketing Website — Public\\nA4 Source Code Repo — Confidential — Owner: CTO\\nA5 Office Wi-Fi — Internal\\nA6 Backup Tapes — Confidential — Owner: IT Ops\\n(4 assets classified Confidential)", "title": "Asset Register"}, {"body": "R1 Customer Database breach — Likelihood 4 × Impact 5 = 20 (highest)\\nR2 Ransomware on Payroll — 3 × 4 = 12\\nR3 Website defacement — 2 × 2 = 4\\nR4 Insider source-code theft — 3 × 4 = 12", "title": "Risk Matrix (Likelihood × Impact, 1–5)"}, {"body": "A.5.15 Access control\\nA.8.24 Use of cryptography\\nA.8.16 Monitoring activities\\nA.5.7 Threat intelligence", "title": "Annex A Control Reference"}], "description": "Use the asset register, risk matrix and Annex A control list to answer each task. Read the documents on the left, then submit the requested value."}	\N	\N	published	1	{}	\N
6	3	Vendor Risk Assessment	vendor-risk-assessment	Complete a third-party vendor risk assessment using industry-standard questionnaires.	beginner	guided	{VRM,"Third Party","Due Diligence"}	100	45	\N	t	2026-06-20 14:02:04.921293+00	2026-06-21 07:56:56.448+00	{"kind": "grc", "title": "Vendor: CloudPay Services — TPRM File", "documents": [{"body": "CloudPay processes customer PII AND cardholder payment data, integrated into the core checkout. Data access: PII + Payment. Business impact if down: checkout halts. → Inherent risk class: Critical.", "title": "Vendor Profile"}, {"body": "Passed: 30. Gaps identified: 5 — (1) no SOC 2 report, (2) no encryption-at-rest evidence, (3) no documented BCP, (4) no breach-notification SLA, (5) no sub-processor list.", "title": "CAIQ-lite Results (35 questions)"}, {"body": "Existing compensating controls: contractual DPA + network isolation. After controls, residual risk = Medium. Options: Accept / Mitigate / Transfer / Avoid. With 5 open gaps on a Critical vendor, the recommended decision is Mitigate (require remediation before go-live).", "title": "Residual Risk & Treatment Guide"}], "description": "Run a third-party risk assessment. Use the profile, questionnaire results and control evidence to classify and treat the risk."}	\N	\N	published	1	{}	\N
10	1	Smoke Lab	smoke-lab-xyz	d	beginner	ctf	{}	100	60	\N	t	2026-06-21 12:50:19.63067+00	2026-06-21 12:50:19.63067+00	\N	\N	\N	published	1	{}	\N
11	1	SOC	soc	VEL	beginner	ctf	{}	100	60	\N	f	2026-06-23 05:11:22.712897+00	2026-06-23 05:11:22.712897+00	\N	23	mentor	draft	1	{}	\N
\.


--
-- Data for Name: learning_modules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.learning_modules (id, track_id, title, description, "order", lesson_count, is_published, created_at, updated_at, category, difficulty, thumbnail_url, xp_reward, estimated_minutes) FROM stdin;
1	1	SOC Fundamentals	Core concepts of Security Operations Centers — roles, processes, and tools.	1	4	t	2026-06-20 14:02:04.182085+00	2026-06-21 07:17:37.729+00	SOC Foundations	beginner	\N	100	45
2	1	SIEM & Log Management	Master Splunk, QRadar, and Wazuh for log ingestion, correlation, and alerting.	2	6	t	2026-06-20 14:02:04.243985+00	2026-06-21 07:17:37.768+00	SIEM Fundamentals	beginner	\N	100	127
3	1	Threat Hunting	Proactively search for hidden threats using behavioral analytics and IOCs.	3	5	t	2026-06-20 14:02:04.278563+00	2026-06-21 07:17:37.772+00	Threat Hunting	intermediate	\N	150	109
4	1	Malware Analysis	Static and dynamic analysis of malware samples in controlled environments.	4	5	t	2026-06-20 14:02:04.310301+00	2026-06-21 07:17:37.775+00	Malware Analysis	intermediate	\N	150	116
5	1	Incident Response	End-to-end IR process — preparation, containment, eradication, and recovery.	5	5	t	2026-06-20 14:02:04.346402+00	2026-06-21 07:17:37.779+00	Incident Response	advanced	\N	200	117
6	1	Detection Engineering	Build and deploy custom detection rules using Sigma, Yara, and SIEM platforms.	6	5	t	2026-06-20 14:02:04.37783+00	2026-06-21 07:17:37.782+00	SOC Automation	advanced	\N	200	93
7	2	OWASP Top 10	Deep dive into the most critical web application security risks.	1	5	t	2026-06-20 14:02:04.405804+00	2026-06-21 07:17:37.786+00	OWASP Top 10	beginner	\N	100	106
8	2	Burp Suite Mastery	Intercept, modify and replay HTTP requests for web application testing.	2	4	t	2026-06-20 14:02:04.43762+00	2026-06-21 07:17:37.789+00	Burp Suite	beginner	\N	100	85
9	2	Network Pentesting	Enumerate and exploit network services using Nmap, Metasploit and more.	3	5	t	2026-06-20 14:02:04.461529+00	2026-06-21 07:17:37.792+00	Web Pentesting	intermediate	\N	150	130
10	2	API Security Testing	Test REST and GraphQL APIs for authentication, injection, and business logic flaws.	4	4	t	2026-06-20 14:02:04.49872+00	2026-06-21 07:17:37.797+00	API Security	intermediate	\N	150	97
11	2	Active Directory Pentesting	Attack and defend Windows Active Directory environments.	5	4	t	2026-06-20 14:02:04.591443+00	2026-06-21 07:17:37.801+00	AD Pentesting	advanced	\N	200	118
12	2	Mobile & Cloud Pentesting	Security testing for Android, iOS and AWS/GCP/Azure environments.	6	4	t	2026-06-20 14:02:04.616828+00	2026-06-21 07:17:37.803+00	Cloud Pentesting	advanced	\N	200	145
13	3	ISO 27001 Implementation	ISMS design, risk assessment, controls, and certification readiness.	1	5	t	2026-06-20 14:02:04.640347+00	2026-06-21 07:17:37.806+00	ISO 27001	beginner	\N	100	86
14	3	NIST Framework	Apply the NIST Cybersecurity Framework across Identify, Protect, Detect, Respond, Recover.	2	4	t	2026-06-20 14:02:04.668629+00	2026-06-21 07:17:37.808+00	NIST	beginner	\N	100	70
15	3	DPDP Act 2023 Compliance	India's Digital Personal Data Protection Act — obligations, consent, and breach reporting.	3	5	t	2026-06-20 14:02:04.702357+00	2026-06-21 07:17:37.814+00	DPDP	intermediate	\N	150	85
16	3	Risk Assessment & Management	Identify, assess, and treat information security risks systematically.	4	5	t	2026-06-20 14:02:04.738369+00	2026-06-21 07:17:37.816+00	Risk Assessment	intermediate	\N	150	97
17	3	Compliance & Audit	Design audit programs, conduct evidence collection, and manage non-conformities.	5	4	t	2026-06-20 14:02:04.771347+00	2026-06-21 07:17:37.821+00	Audit	advanced	\N	200	67
18	3	Vendor Risk Management	Third-party risk assessments, due diligence, and contractual controls.	6	4	t	2026-06-20 14:02:04.801229+00	2026-06-21 07:17:37.824+00	Vendor Risk	advanced	\N	200	92
19	1	Smoke Test Course	test	99	0	f	2026-06-21 12:50:19.545299+00	2026-06-21 12:50:19.545299+00	beginner	beginner	\N	100	30
\.


--
-- Data for Name: lesson_bookmarks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lesson_bookmarks (id, user_id, lesson_id, note, created_at) FROM stdin;
\.


--
-- Data for Name: lesson_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lesson_notes (id, lesson_id, content, created_at, updated_at) FROM stdin;
1	3	# Incident Lifecycle\n\n> Part of the **SOC Foundations** track in the SOC learning path.\n\n## Overview\n\nThis lesson covers **Incident Lifecycle**. By the end you will understand the core concepts,\nwhere they fit in a real SOC workflow, and how to apply them in\nhands-on scenarios.\n\n## Key Concepts\n\n- **Definition** — what incident lifecycle means and why it matters.\n- **Context** — how it connects to the wider SOC Foundations discipline.\n- **Practical use** — typical situations where you will rely on this knowledge.\n\n## Worked Example\n\n```bash\n# Example workflow relevant to SOC Foundations\n$ run-analysis --target sample --mode soc\n[+] collecting indicators...\n[+] correlating events...\n[+] report generated\n```\n\n## Quick Reference\n\n| Concept | Description | When to use |\n| --- | --- | --- |\n| Fundamentals | Baseline knowledge for SOC Foundations | Always |\n| Tooling | Common tools in this area | During execution |\n| Reporting | Communicating findings | After analysis |\n\n## Summary\n\nYou now have a working understanding of **Incident Lifecycle**. Continue to the next lesson\nto build on these concepts, or try the quiz to validate your knowledge.\n	2026-06-21 07:17:37.885279+00	2026-06-21 07:17:37.885279+00
2	9	# Writing Detection Rules\n\n> Part of the **SIEM Fundamentals** track in the SOC learning path.\n\n## Overview\n\nThis lesson covers **Writing Detection Rules**. By the end you will understand the core concepts,\nwhere they fit in a real SOC workflow, and how to apply them in\nhands-on scenarios.\n\n## Key Concepts\n\n- **Definition** — what writing detection rules means and why it matters.\n- **Context** — how it connects to the wider SIEM Fundamentals discipline.\n- **Practical use** — typical situations where you will rely on this knowledge.\n\n## Worked Example\n\n```bash\n# Example workflow relevant to SIEM Fundamentals\n$ run-analysis --target sample --mode soc\n[+] collecting indicators...\n[+] correlating events...\n[+] report generated\n```\n\n## Quick Reference\n\n| Concept | Description | When to use |\n| --- | --- | --- |\n| Fundamentals | Baseline knowledge for SIEM Fundamentals | Always |\n| Tooling | Common tools in this area | During execution |\n| Reporting | Communicating findings | After analysis |\n\n## Summary\n\nYou now have a working understanding of **Writing Detection Rules**. Continue to the next lesson\nto build on these concepts, or try the quiz to validate your knowledge.\n	2026-06-21 07:17:37.992981+00	2026-06-21 07:17:37.992981+00
3	12	# IOC vs TTP Analysis\n\n> Part of the **Threat Hunting** track in the SOC learning path.\n\n## Overview\n\nThis lesson covers **IOC vs TTP Analysis**. By the end you will understand the core concepts,\nwhere they fit in a real SOC workflow, and how to apply them in\nhands-on scenarios.\n\n## Key Concepts\n\n- **Definition** — what ioc vs ttp analysis means and why it matters.\n- **Context** — how it connects to the wider Threat Hunting discipline.\n- **Practical use** — typical situations where you will rely on this knowledge.\n\n## Worked Example\n\n```bash\n# Example workflow relevant to Threat Hunting\n$ run-analysis --target sample --mode soc\n[+] collecting indicators...\n[+] correlating events...\n[+] report generated\n```\n\n## Quick Reference\n\n| Concept | Description | When to use |\n| --- | --- | --- |\n| Fundamentals | Baseline knowledge for Threat Hunting | Always |\n| Tooling | Common tools in this area | During execution |\n| Reporting | Communicating findings | After analysis |\n\n## Summary\n\nYou now have a working understanding of **IOC vs TTP Analysis**. Continue to the next lesson\nto build on these concepts, or try the quiz to validate your knowledge.\n	2026-06-21 07:17:38.024709+00	2026-06-21 07:17:38.024709+00
4	19	# Writing Malware Reports\n\n> Part of the **Malware Analysis** track in the SOC learning path.\n\n## Overview\n\nThis lesson covers **Writing Malware Reports**. By the end you will understand the core concepts,\nwhere they fit in a real SOC workflow, and how to apply them in\nhands-on scenarios.\n\n## Key Concepts\n\n- **Definition** — what writing malware reports means and why it matters.\n- **Context** — how it connects to the wider Malware Analysis discipline.\n- **Practical use** — typical situations where you will rely on this knowledge.\n\n## Worked Example\n\n```bash\n# Example workflow relevant to Malware Analysis\n$ run-analysis --target sample --mode soc\n[+] collecting indicators...\n[+] correlating events...\n[+] report generated\n```\n\n## Quick Reference\n\n| Concept | Description | When to use |\n| --- | --- | --- |\n| Fundamentals | Baseline knowledge for Malware Analysis | Always |\n| Tooling | Common tools in this area | During execution |\n| Reporting | Communicating findings | After analysis |\n\n## Summary\n\nYou now have a working understanding of **Writing Malware Reports**. Continue to the next lesson\nto build on these concepts, or try the quiz to validate your knowledge.\n	2026-06-21 07:17:38.103277+00	2026-06-21 07:17:38.103277+00
5	22	# Playbooks & Runbooks\n\n> Part of the **Incident Response** track in the SOC learning path.\n\n## Overview\n\nThis lesson covers **Playbooks & Runbooks**. By the end you will understand the core concepts,\nwhere they fit in a real SOC workflow, and how to apply them in\nhands-on scenarios.\n\n## Key Concepts\n\n- **Definition** — what playbooks & runbooks means and why it matters.\n- **Context** — how it connects to the wider Incident Response discipline.\n- **Practical use** — typical situations where you will rely on this knowledge.\n\n## Worked Example\n\n```bash\n# Example workflow relevant to Incident Response\n$ run-analysis --target sample --mode soc\n[+] collecting indicators...\n[+] correlating events...\n[+] report generated\n```\n\n## Quick Reference\n\n| Concept | Description | When to use |\n| --- | --- | --- |\n| Fundamentals | Baseline knowledge for Incident Response | Always |\n| Tooling | Common tools in this area | During execution |\n| Reporting | Communicating findings | After analysis |\n\n## Summary\n\nYou now have a working understanding of **Playbooks & Runbooks**. Continue to the next lesson\nto build on these concepts, or try the quiz to validate your knowledge.\n	2026-06-21 07:17:38.134074+00	2026-06-21 07:17:38.134074+00
6	24	# Post-Incident Reporting\n\n> Part of the **Incident Response** track in the SOC learning path.\n\n## Overview\n\nThis lesson covers **Post-Incident Reporting**. By the end you will understand the core concepts,\nwhere they fit in a real SOC workflow, and how to apply them in\nhands-on scenarios.\n\n## Key Concepts\n\n- **Definition** — what post-incident reporting means and why it matters.\n- **Context** — how it connects to the wider Incident Response discipline.\n- **Practical use** — typical situations where you will rely on this knowledge.\n\n## Worked Example\n\n```bash\n# Example workflow relevant to Incident Response\n$ run-analysis --target sample --mode soc\n[+] collecting indicators...\n[+] correlating events...\n[+] report generated\n```\n\n## Quick Reference\n\n| Concept | Description | When to use |\n| --- | --- | --- |\n| Fundamentals | Baseline knowledge for Incident Response | Always |\n| Tooling | Common tools in this area | During execution |\n| Reporting | Communicating findings | After analysis |\n\n## Summary\n\nYou now have a working understanding of **Post-Incident Reporting**. Continue to the next lesson\nto build on these concepts, or try the quiz to validate your knowledge.\n	2026-06-21 07:17:38.157592+00	2026-06-21 07:17:38.157592+00
7	34	# SSRF & XXE\n\n> Part of the **OWASP Top 10** track in the VAPT learning path.\n\n## Overview\n\nThis lesson covers **SSRF & XXE**. By the end you will understand the core concepts,\nwhere they fit in a real VAPT workflow, and how to apply them in\nhands-on scenarios.\n\n## Key Concepts\n\n- **Definition** — what ssrf & xxe means and why it matters.\n- **Context** — how it connects to the wider OWASP Top 10 discipline.\n- **Practical use** — typical situations where you will rely on this knowledge.\n\n## Worked Example\n\n```bash\n# Example workflow relevant to OWASP Top 10\n$ run-analysis --target sample --mode vapt\n[+] collecting indicators...\n[+] correlating events...\n[+] report generated\n```\n\n## Quick Reference\n\n| Concept | Description | When to use |\n| --- | --- | --- |\n| Fundamentals | Baseline knowledge for OWASP Top 10 | Always |\n| Tooling | Common tools in this area | During execution |\n| Reporting | Communicating findings | After analysis |\n\n## Summary\n\nYou now have a working understanding of **SSRF & XXE**. Continue to the next lesson\nto build on these concepts, or try the quiz to validate your knowledge.\n	2026-06-21 07:17:38.269984+00	2026-06-21 07:17:38.269984+00
8	43	# Post-Exploitation Basics\n\n> Part of the **Web Pentesting** track in the VAPT learning path.\n\n## Overview\n\nThis lesson covers **Post-Exploitation Basics**. By the end you will understand the core concepts,\nwhere they fit in a real VAPT workflow, and how to apply them in\nhands-on scenarios.\n\n## Key Concepts\n\n- **Definition** — what post-exploitation basics means and why it matters.\n- **Context** — how it connects to the wider Web Pentesting discipline.\n- **Practical use** — typical situations where you will rely on this knowledge.\n\n## Worked Example\n\n```bash\n# Example workflow relevant to Web Pentesting\n$ run-analysis --target sample --mode vapt\n[+] collecting indicators...\n[+] correlating events...\n[+] report generated\n```\n\n## Quick Reference\n\n| Concept | Description | When to use |\n| --- | --- | --- |\n| Fundamentals | Baseline knowledge for Web Pentesting | Always |\n| Tooling | Common tools in this area | During execution |\n| Reporting | Communicating findings | After analysis |\n\n## Summary\n\nYou now have a working understanding of **Post-Exploitation Basics**. Continue to the next lesson\nto build on these concepts, or try the quiz to validate your knowledge.\n	2026-06-21 07:17:38.360759+00	2026-06-21 07:17:38.360759+00
9	59	# ISMS Scope & Context\n\n> Part of the **ISO 27001** track in the GRC learning path.\n\n## Overview\n\nThis lesson covers **ISMS Scope & Context**. By the end you will understand the core concepts,\nwhere they fit in a real GRC workflow, and how to apply them in\nhands-on scenarios.\n\n## Key Concepts\n\n- **Definition** — what isms scope & context means and why it matters.\n- **Context** — how it connects to the wider ISO 27001 discipline.\n- **Practical use** — typical situations where you will rely on this knowledge.\n\n## Worked Example\n\n```bash\n# Example workflow relevant to ISO 27001\n$ run-analysis --target sample --mode grc\n[+] collecting indicators...\n[+] correlating events...\n[+] report generated\n```\n\n## Quick Reference\n\n| Concept | Description | When to use |\n| --- | --- | --- |\n| Fundamentals | Baseline knowledge for ISO 27001 | Always |\n| Tooling | Common tools in this area | During execution |\n| Reporting | Communicating findings | After analysis |\n\n## Summary\n\nYou now have a working understanding of **ISMS Scope & Context**. Continue to the next lesson\nto build on these concepts, or try the quiz to validate your knowledge.\n	2026-06-21 07:17:38.52048+00	2026-06-21 07:17:38.52048+00
10	60	# Annex A Controls\n\n> Part of the **ISO 27001** track in the GRC learning path.\n\n## Overview\n\nThis lesson covers **Annex A Controls**. By the end you will understand the core concepts,\nwhere they fit in a real GRC workflow, and how to apply them in\nhands-on scenarios.\n\n## Key Concepts\n\n- **Definition** — what annex a controls means and why it matters.\n- **Context** — how it connects to the wider ISO 27001 discipline.\n- **Practical use** — typical situations where you will rely on this knowledge.\n\n## Worked Example\n\n```bash\n# Example workflow relevant to ISO 27001\n$ run-analysis --target sample --mode grc\n[+] collecting indicators...\n[+] correlating events...\n[+] report generated\n```\n\n## Quick Reference\n\n| Concept | Description | When to use |\n| --- | --- | --- |\n| Fundamentals | Baseline knowledge for ISO 27001 | Always |\n| Tooling | Common tools in this area | During execution |\n| Reporting | Communicating findings | After analysis |\n\n## Summary\n\nYou now have a working understanding of **Annex A Controls**. Continue to the next lesson\nto build on these concepts, or try the quiz to validate your knowledge.\n	2026-06-21 07:17:38.529945+00	2026-06-21 07:17:38.529945+00
11	64	# Implementation Tiers\n\n> Part of the **NIST** track in the GRC learning path.\n\n## Overview\n\nThis lesson covers **Implementation Tiers**. By the end you will understand the core concepts,\nwhere they fit in a real GRC workflow, and how to apply them in\nhands-on scenarios.\n\n## Key Concepts\n\n- **Definition** — what implementation tiers means and why it matters.\n- **Context** — how it connects to the wider NIST discipline.\n- **Practical use** — typical situations where you will rely on this knowledge.\n\n## Worked Example\n\n```bash\n# Example workflow relevant to NIST\n$ run-analysis --target sample --mode grc\n[+] collecting indicators...\n[+] correlating events...\n[+] report generated\n```\n\n## Quick Reference\n\n| Concept | Description | When to use |\n| --- | --- | --- |\n| Fundamentals | Baseline knowledge for NIST | Always |\n| Tooling | Common tools in this area | During execution |\n| Reporting | Communicating findings | After analysis |\n\n## Summary\n\nYou now have a working understanding of **Implementation Tiers**. Continue to the next lesson\nto build on these concepts, or try the quiz to validate your knowledge.\n	2026-06-21 07:17:38.580869+00	2026-06-21 07:17:38.580869+00
12	68	# Consent Management\n\n> Part of the **DPDP** track in the GRC learning path.\n\n## Overview\n\nThis lesson covers **Consent Management**. By the end you will understand the core concepts,\nwhere they fit in a real GRC workflow, and how to apply them in\nhands-on scenarios.\n\n## Key Concepts\n\n- **Definition** — what consent management means and why it matters.\n- **Context** — how it connects to the wider DPDP discipline.\n- **Practical use** — typical situations where you will rely on this knowledge.\n\n## Worked Example\n\n```bash\n# Example workflow relevant to DPDP\n$ run-analysis --target sample --mode grc\n[+] collecting indicators...\n[+] correlating events...\n[+] report generated\n```\n\n## Quick Reference\n\n| Concept | Description | When to use |\n| --- | --- | --- |\n| Fundamentals | Baseline knowledge for DPDP | Always |\n| Tooling | Common tools in this area | During execution |\n| Reporting | Communicating findings | After analysis |\n\n## Summary\n\nYou now have a working understanding of **Consent Management**. Continue to the next lesson\nto build on these concepts, or try the quiz to validate your knowledge.\n	2026-06-21 07:17:38.621531+00	2026-06-21 07:17:38.621531+00
13	69	# Breach Notification Requirements\n\n> Part of the **DPDP** track in the GRC learning path.\n\n## Overview\n\nThis lesson covers **Breach Notification Requirements**. By the end you will understand the core concepts,\nwhere they fit in a real GRC workflow, and how to apply them in\nhands-on scenarios.\n\n## Key Concepts\n\n- **Definition** — what breach notification requirements means and why it matters.\n- **Context** — how it connects to the wider DPDP discipline.\n- **Practical use** — typical situations where you will rely on this knowledge.\n\n## Worked Example\n\n```bash\n# Example workflow relevant to DPDP\n$ run-analysis --target sample --mode grc\n[+] collecting indicators...\n[+] correlating events...\n[+] report generated\n```\n\n## Quick Reference\n\n| Concept | Description | When to use |\n| --- | --- | --- |\n| Fundamentals | Baseline knowledge for DPDP | Always |\n| Tooling | Common tools in this area | During execution |\n| Reporting | Communicating findings | After analysis |\n\n## Summary\n\nYou now have a working understanding of **Breach Notification Requirements**. Continue to the next lesson\nto build on these concepts, or try the quiz to validate your knowledge.\n	2026-06-21 07:17:38.630392+00	2026-06-21 07:17:38.630392+00
14	73	# Risk Matrix & Scoring\n\n> Part of the **Risk Assessment** track in the GRC learning path.\n\n## Overview\n\nThis lesson covers **Risk Matrix & Scoring**. By the end you will understand the core concepts,\nwhere they fit in a real GRC workflow, and how to apply them in\nhands-on scenarios.\n\n## Key Concepts\n\n- **Definition** — what risk matrix & scoring means and why it matters.\n- **Context** — how it connects to the wider Risk Assessment discipline.\n- **Practical use** — typical situations where you will rely on this knowledge.\n\n## Worked Example\n\n```bash\n# Example workflow relevant to Risk Assessment\n$ run-analysis --target sample --mode grc\n[+] collecting indicators...\n[+] correlating events...\n[+] report generated\n```\n\n## Quick Reference\n\n| Concept | Description | When to use |\n| --- | --- | --- |\n| Fundamentals | Baseline knowledge for Risk Assessment | Always |\n| Tooling | Common tools in this area | During execution |\n| Reporting | Communicating findings | After analysis |\n\n## Summary\n\nYou now have a working understanding of **Risk Matrix & Scoring**. Continue to the next lesson\nto build on these concepts, or try the quiz to validate your knowledge.\n	2026-06-21 07:17:38.664785+00	2026-06-21 07:17:38.664785+00
15	74	# Risk Treatment Plans\n\n> Part of the **Risk Assessment** track in the GRC learning path.\n\n## Overview\n\nThis lesson covers **Risk Treatment Plans**. By the end you will understand the core concepts,\nwhere they fit in a real GRC workflow, and how to apply them in\nhands-on scenarios.\n\n## Key Concepts\n\n- **Definition** — what risk treatment plans means and why it matters.\n- **Context** — how it connects to the wider Risk Assessment discipline.\n- **Practical use** — typical situations where you will rely on this knowledge.\n\n## Worked Example\n\n```bash\n# Example workflow relevant to Risk Assessment\n$ run-analysis --target sample --mode grc\n[+] collecting indicators...\n[+] correlating events...\n[+] report generated\n```\n\n## Quick Reference\n\n| Concept | Description | When to use |\n| --- | --- | --- |\n| Fundamentals | Baseline knowledge for Risk Assessment | Always |\n| Tooling | Common tools in this area | During execution |\n| Reporting | Communicating findings | After analysis |\n\n## Summary\n\nYou now have a working understanding of **Risk Treatment Plans**. Continue to the next lesson\nto build on these concepts, or try the quiz to validate your knowledge.\n	2026-06-21 07:17:38.673808+00	2026-06-21 07:17:38.673808+00
16	78	# Non-Conformity Management\n\n> Part of the **Audit** track in the GRC learning path.\n\n## Overview\n\nThis lesson covers **Non-Conformity Management**. By the end you will understand the core concepts,\nwhere they fit in a real GRC workflow, and how to apply them in\nhands-on scenarios.\n\n## Key Concepts\n\n- **Definition** — what non-conformity management means and why it matters.\n- **Context** — how it connects to the wider Audit discipline.\n- **Practical use** — typical situations where you will rely on this knowledge.\n\n## Worked Example\n\n```bash\n# Example workflow relevant to Audit\n$ run-analysis --target sample --mode grc\n[+] collecting indicators...\n[+] correlating events...\n[+] report generated\n```\n\n## Quick Reference\n\n| Concept | Description | When to use |\n| --- | --- | --- |\n| Fundamentals | Baseline knowledge for Audit | Always |\n| Tooling | Common tools in this area | During execution |\n| Reporting | Communicating findings | After analysis |\n\n## Summary\n\nYou now have a working understanding of **Non-Conformity Management**. Continue to the next lesson\nto build on these concepts, or try the quiz to validate your knowledge.\n	2026-06-21 07:17:38.709154+00	2026-06-21 07:17:38.709154+00
17	81	# Vendor Questionnaires\n\n> Part of the **Vendor Risk** track in the GRC learning path.\n\n## Overview\n\nThis lesson covers **Vendor Questionnaires**. By the end you will understand the core concepts,\nwhere they fit in a real GRC workflow, and how to apply them in\nhands-on scenarios.\n\n## Key Concepts\n\n- **Definition** — what vendor questionnaires means and why it matters.\n- **Context** — how it connects to the wider Vendor Risk discipline.\n- **Practical use** — typical situations where you will rely on this knowledge.\n\n## Worked Example\n\n```bash\n# Example workflow relevant to Vendor Risk\n$ run-analysis --target sample --mode grc\n[+] collecting indicators...\n[+] correlating events...\n[+] report generated\n```\n\n## Quick Reference\n\n| Concept | Description | When to use |\n| --- | --- | --- |\n| Fundamentals | Baseline knowledge for Vendor Risk | Always |\n| Tooling | Common tools in this area | During execution |\n| Reporting | Communicating findings | After analysis |\n\n## Summary\n\nYou now have a working understanding of **Vendor Questionnaires**. Continue to the next lesson\nto build on these concepts, or try the quiz to validate your knowledge.\n	2026-06-21 07:17:38.73489+00	2026-06-21 07:17:38.73489+00
18	82	# Contractual Controls\n\n> Part of the **Vendor Risk** track in the GRC learning path.\n\n## Overview\n\nThis lesson covers **Contractual Controls**. By the end you will understand the core concepts,\nwhere they fit in a real GRC workflow, and how to apply them in\nhands-on scenarios.\n\n## Key Concepts\n\n- **Definition** — what contractual controls means and why it matters.\n- **Context** — how it connects to the wider Vendor Risk discipline.\n- **Practical use** — typical situations where you will rely on this knowledge.\n\n## Worked Example\n\n```bash\n# Example workflow relevant to Vendor Risk\n$ run-analysis --target sample --mode grc\n[+] collecting indicators...\n[+] correlating events...\n[+] report generated\n```\n\n## Quick Reference\n\n| Concept | Description | When to use |\n| --- | --- | --- |\n| Fundamentals | Baseline knowledge for Vendor Risk | Always |\n| Tooling | Common tools in this area | During execution |\n| Reporting | Communicating findings | After analysis |\n\n## Summary\n\nYou now have a working understanding of **Contractual Controls**. Continue to the next lesson\nto build on these concepts, or try the quiz to validate your knowledge.\n	2026-06-21 07:17:38.74477+00	2026-06-21 07:17:38.74477+00
19	1	## Overview\nA SOC monitors...	2026-06-23 13:48:03.870287+00	2026-06-23 13:48:03.870287+00
\.


--
-- Data for Name: lesson_pdfs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lesson_pdfs (id, lesson_id, title, s3_key, file_size_bytes, created_at) FROM stdin;
\.


--
-- Data for Name: lesson_progress; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lesson_progress (id, user_id, lesson_id, module_id, completed_at, time_spent_seconds) FROM stdin;
1	4	1	1	2026-06-21 06:03:45.351595+00	0
2	4	4	1	2026-06-21 07:25:35.532775+00	45
\.


--
-- Data for Name: lesson_quiz_questions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lesson_quiz_questions (id, quiz_id, question, type, options, correct_answers, explanation, points, "order") FROM stdin;
1	1	What is the primary purpose of a Security Operations Center (SOC)?	mcq	{"To develop marketing campaigns","To monitor, detect, and respond to security incidents","To manage payroll systems","To design network hardware"}	{1}	A SOC centralizes monitoring, detection, and incident response.	10	0
2	1	Which of the following are common SOC analyst tiers?	multi_select	{"Tier 1 (Triage)","Tier 2 (Investigation)","Tier 3 (Threat Hunting)","Tier 7 (Marketing)"}	{0,1,2}	SOCs are typically organized into Tier 1, 2, and 3 analysts.	15	1
3	1	A SIEM is used to aggregate and correlate log data from across the environment.	true_false	{True,False}	{0}	SIEM platforms aggregate, correlate, and alert on log data.	10	2
4	1	What does 'MTTD' stand for in SOC metrics?	mcq	{"Mean Time To Detect","Maximum Time To Deploy","Mean Total Threat Data","Managed Threat Detection"}	{0}	MTTD = Mean Time To Detect, a key SOC performance metric.	10	3
5	1	An alert fires for repeated failed logins followed by a success from a new country. What is the best first action?	scenario	{"Ignore it — failed logins are normal","Triage: verify the user, check for impossible travel, and escalate if suspicious","Immediately wipe the user's machine","Delete the alert"}	{1}	Triage and verification come first; this pattern suggests possible account compromise.	15	4
6	2	Which rule format is commonly used for SIEM-agnostic detection logic?	mcq	{Sigma,Markdown,YAML-only,CSS}	{0}	Sigma is a generic, SIEM-agnostic detection rule format.	10	0
7	2	YARA rules are primarily used for what?	mcq	{"Web styling","Identifying and classifying malware samples","Network routing","Password storage"}	{1}	YARA is used to identify and classify malware based on patterns.	10	1
8	2	Detection engineering should balance which two factors?	multi_select	{"True positive coverage","False positive noise","Office decor","Lunch menu"}	{0,1}	Good detections maximize coverage while minimizing false positives.	15	2
9	2	Detections should be tested before deployment to production SIEM.	true_false	{True,False}	{0}	Testing prevents noisy or broken rules from flooding analysts.	10	3
10	2	A new detection generates 500 alerts/hour, almost all benign. What should you do?	scenario	{"Leave it — more alerts are always better","Tune the rule to reduce false positives before it causes alert fatigue","Disable all detections","Forward all alerts to the CEO"}	{1}	Tuning reduces alert fatigue and keeps the rule actionable.	15	4
11	3	What does ISO/IEC 27001 primarily define?	mcq	{"A programming language","An Information Security Management System (ISMS)","A firewall product","A network protocol"}	{1}	ISO 27001 specifies requirements for an ISMS.	10	0
12	3	Annex A of ISO 27001 contains what?	mcq	{"A list of reference controls","Source code","Marketing plans","Hardware schematics"}	{0}	Annex A lists reference security controls.	10	1
13	3	Which are core stages of the ISO 27001 risk process?	multi_select	{"Risk identification","Risk assessment","Risk treatment","Risk celebration"}	{0,1,2}	Identify, assess, and treat are the core risk stages.	15	2
14	3	A Statement of Applicability (SoA) documents which controls apply and why.	true_false	{True,False}	{0}	The SoA records applicable controls and justifications.	10	3
15	3	During certification, the auditor finds a control is documented but never performed. This is a:	scenario	{Strength,Non-conformity,"Bonus point","Marketing opportunity"}	{1}	A control that isn't operating as documented is a non-conformity.	15	4
16	4	What does SIEM stand for?	mcq	{"Security Information and Event Management","System Integrity Event Monitor"}	{0}	\N	1	0
17	4	What is the primary purpose of log analysis in a security operations center (SOC)?	mcq	{"To monitor system performance","To detect and respond to security incidents","To manage IT resources effectively","To improve user experience"}	{1}	Log analysis is crucial for detecting anomalies, identifying threats, and responding to security incidents in real-time.	1	1
18	4	Which log file would you analyze to investigate failed login attempts on a Linux server?	mcq	{/var/log/syslog,/var/log/auth.log,/var/log/messages,/var/log/kernel.log}	{1}	The /var/log/auth.log file contains authentication-related logs, including failed login attempts.	1	2
29	5	What does CIA stand for in cybersecurity?	mcq	{"Confidentiality, Integrity, Availability","Control, Inspection, Authentication","Cryptography, Identity, Auditing","Compliance, Infrastructure, Access"}	{0}	\N	1	0
30	5	Which of the following is a social engineering attack?	mcq	{Phishing,"SQL Injection","Buffer Overflow","Port Scanning"}	{0}	\N	1	1
31	5	What is the primary purpose of a firewall?	mcq	{"Filter and monitor network traffic","Encrypt data in transit","Scan for malware on disk","Manage user passwords"}	{0}	\N	1	2
32	5	Which port is used by HTTPS by default?	mcq	{443,80,8080,22}	{0}	\N	1	3
33	5	What does XSS stand for?	mcq	{"Cross-Site Scripting","Cross-Site Session","Cross-Server Scripting","Cross-System Script"}	{0}	\N	1	4
34	5	A SQL injection attack exploits vulnerabilities in database queries.	true_false	{True,False}	{0}	\N	1	5
35	5	What is a zero-day vulnerability?	mcq	{"A vulnerability with no available patch","An attack launched at midnight","A new virus released daily","A firewall misconfiguration"}	{0}	\N	1	6
36	5	Which protocol is used for secure email transmission?	mcq	{TLS/STARTTLS,FTP,HTTP,Telnet}	{0}	\N	1	7
37	5	What is the difference between authentication and authorization?	mcq	{"Authentication verifies identity; authorization grants permissions","They are the same thing","Authorization verifies identity; authentication grants permissions","Authentication encrypts data; authorization decrypts it"}	{0}	\N	1	8
38	5	Which of the following are common types of malware? (Select all that apply)	multi_select	{Ransomware,Trojan,Router,Spyware,Switch}	{0,1,3}	\N	1	9
39	5	What does SIEM stand for?	mcq	{"Security Information and Event Management","System Integrity Event Monitor"}	{0}	\N	1	10
40	5	What is the primary purpose of log analysis in a security operations center (SOC)?	mcq	{"To monitor system performance","To detect and respond to security incidents","To manage IT resources effectively","To improve user experience"}	{1}	Log analysis is crucial for detecting anomalies, identifying threats, and responding to security incidents in real-time.	1	11
\.


--
-- Data for Name: lesson_quizzes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lesson_quizzes (id, lesson_id, title, passing_score, created_at, source_type, source_assessment_id) FROM stdin;
1	4	Quiz: SOC Basics	70	2026-06-21 07:17:37.9073+00	\N	\N
2	30	Final Assessment	70	2026-06-21 07:17:38.219022+00	\N	\N
3	61	Quiz: ISO Basics	70	2026-06-21 07:17:38.540024+00	\N	\N
4	1	What is a SOC?	60	2026-06-23 13:43:53.947209+00	question_bank	\N
5	2	Cybersecurity Foundations Pre-Assessment	70	2026-06-23 13:43:54.147209+00	question_bank	\N
\.


--
-- Data for Name: lesson_resources; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lesson_resources (id, lesson_id, title, url, type, "order", created_at) FROM stdin;
1	1	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:37.850747+00
2	1	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:37.854294+00
3	1	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:37.857004+00
4	2	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:37.86261+00
5	2	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:37.865744+00
6	2	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:37.868248+00
7	3	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:37.876832+00
8	3	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:37.879056+00
9	3	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:37.882106+00
10	4	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:37.888422+00
11	4	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:37.899662+00
12	4	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:37.903915+00
13	5	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:37.932443+00
14	5	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:37.93694+00
15	5	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:37.940883+00
16	6	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:37.946239+00
17	6	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:37.949169+00
18	6	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:37.952699+00
19	7	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:37.958861+00
20	7	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:37.961713+00
21	7	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:37.96452+00
22	8	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:37.970565+00
23	8	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:37.973449+00
24	8	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:37.977659+00
25	9	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:37.984336+00
26	9	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:37.986713+00
27	9	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:37.990616+00
28	10	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:37.996977+00
29	10	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:37.999771+00
30	10	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:38.002536+00
31	11	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:38.004875+00
32	11	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:38.007062+00
33	11	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:38.009889+00
34	12	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:38.015358+00
35	12	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:38.018112+00
36	12	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:38.020866+00
37	13	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:38.02786+00
38	13	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:38.030494+00
39	13	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:38.033104+00
40	14	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:38.039164+00
41	14	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:38.041673+00
42	14	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:38.044359+00
43	15	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:38.049829+00
44	15	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:38.053067+00
45	15	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:38.055432+00
46	16	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:38.057908+00
47	16	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:38.06+00
48	16	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:38.062187+00
49	17	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:38.069528+00
50	17	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:38.071633+00
51	17	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:38.074655+00
52	18	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:38.080377+00
53	18	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:38.08328+00
54	18	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:38.086317+00
55	19	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:38.092873+00
56	19	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:38.096436+00
57	19	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:38.09924+00
58	20	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:38.1058+00
59	20	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:38.108635+00
60	20	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:38.112076+00
61	21	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:38.114645+00
62	21	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:38.117368+00
63	21	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:38.119369+00
64	22	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:38.124778+00
65	22	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:38.128314+00
66	22	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:38.131434+00
67	23	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:38.136913+00
68	23	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:38.139536+00
69	23	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:38.141928+00
70	24	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:38.148882+00
71	24	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:38.151574+00
72	24	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:38.154988+00
73	25	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:38.161179+00
74	25	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:38.165192+00
75	25	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:38.167383+00
76	26	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:38.170076+00
77	26	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:38.172581+00
78	26	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:38.175108+00
79	27	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:38.181928+00
80	27	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:38.184344+00
81	27	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:38.186646+00
82	28	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:38.19169+00
83	28	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:38.198744+00
84	28	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:38.200971+00
85	29	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:38.205691+00
86	29	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:38.207975+00
87	29	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:38.210186+00
88	30	MITRE ATT&CK Matrix	https://attack.mitre.org/	reference	0	2026-06-21 07:17:38.212444+00
89	30	Splunk Search Reference	https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual	docs	1	2026-06-21 07:17:38.214629+00
90	30	SANS Blue Team Resources	https://www.sans.org/blog/	article	2	2026-06-21 07:17:38.216792+00
91	31	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.232692+00
92	31	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.234854+00
93	31	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.237502+00
94	32	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.242803+00
95	32	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.245052+00
96	32	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.247844+00
97	33	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.252105+00
98	33	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.254498+00
99	33	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.256818+00
100	34	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.261633+00
101	34	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.263967+00
102	34	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.266374+00
103	35	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.273163+00
104	35	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.275872+00
105	35	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.278722+00
106	36	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.281534+00
107	36	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.285245+00
108	36	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.287524+00
109	37	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.291905+00
110	37	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.295043+00
111	37	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.297443+00
112	38	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.306457+00
113	38	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.308836+00
114	38	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.310916+00
115	39	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.315947+00
116	39	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.318181+00
117	39	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.321581+00
118	40	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.323897+00
119	40	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.325986+00
120	40	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.32827+00
121	41	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.33277+00
122	41	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.335029+00
123	41	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.337691+00
124	42	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.342637+00
125	42	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.344902+00
126	42	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.347332+00
127	43	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.351932+00
128	43	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.354996+00
129	43	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.358239+00
130	44	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.363212+00
131	44	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.365423+00
132	44	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.368031+00
133	45	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.370597+00
134	45	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.373421+00
135	45	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.375641+00
136	46	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.380378+00
137	46	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.382425+00
138	46	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.384955+00
139	47	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.390004+00
140	47	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.392778+00
141	47	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.395391+00
142	48	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.401079+00
143	48	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.404073+00
144	48	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.407298+00
145	49	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.409768+00
146	49	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.412016+00
147	49	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.414556+00
148	50	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.419247+00
149	50	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.42223+00
150	50	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.424829+00
151	51	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.431743+00
152	51	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.434054+00
153	51	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.441559+00
154	52	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.447036+00
155	52	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.449542+00
156	52	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.451959+00
157	53	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.454453+00
158	53	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.457068+00
159	53	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.459528+00
160	54	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.464096+00
161	54	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.466593+00
162	54	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.469038+00
163	55	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.47355+00
164	55	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.475789+00
165	55	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.478033+00
166	56	OWASP Top 10	https://owasp.org/www-project-top-ten/	reference	0	2026-06-21 07:17:38.48363+00
167	56	PortSwigger Web Security Academy	https://portswigger.net/web-security	course	1	2026-06-21 07:17:38.486101+00
168	56	HackTricks	https://book.hacktricks.xyz/	reference	2	2026-06-21 07:17:38.488362+00
169	57	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.491318+00
170	57	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.493926+00
171	57	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.497244+00
172	58	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.50243+00
173	58	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.504702+00
174	58	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.507789+00
175	59	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.5128+00
176	59	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.51507+00
177	59	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.517912+00
178	60	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.522754+00
179	60	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.525375+00
180	60	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.527725+00
181	61	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.5324+00
182	61	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.534843+00
183	61	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.537541+00
184	62	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.555596+00
185	62	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.557809+00
186	62	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.56006+00
187	63	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.564948+00
188	63	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.567091+00
189	63	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.569286+00
190	64	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.573767+00
191	64	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.576167+00
192	64	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.578662+00
193	65	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.58322+00
194	65	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.585426+00
195	65	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.587954+00
196	66	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.591026+00
197	66	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.597416+00
198	66	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.599832+00
199	67	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.604779+00
200	67	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.606817+00
201	67	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.609176+00
202	68	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.613399+00
203	68	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.615373+00
204	68	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.619331+00
205	69	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.623865+00
206	69	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.625829+00
207	69	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.628382+00
208	70	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.632374+00
209	70	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.634316+00
210	70	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.63649+00
211	71	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.639729+00
212	71	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.641764+00
213	71	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.643668+00
214	72	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.648809+00
215	72	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.650897+00
216	72	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.653207+00
217	73	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.657911+00
218	73	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.660033+00
219	73	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.662414+00
220	74	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.666901+00
221	74	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.669089+00
222	74	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.671282+00
223	75	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.676704+00
224	75	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.678777+00
225	75	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.68088+00
226	76	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.683289+00
227	76	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.685401+00
228	76	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.687633+00
229	77	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.692168+00
230	77	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.694493+00
231	77	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.696598+00
232	78	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.701047+00
233	78	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.70339+00
234	78	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.706764+00
235	79	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.712084+00
236	79	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.714522+00
237	79	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.716656+00
238	80	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.718866+00
239	80	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.721195+00
240	80	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.723723+00
241	81	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.728556+00
242	81	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.730848+00
243	81	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.732817+00
244	82	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.737172+00
245	82	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.739357+00
246	82	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.742564+00
247	83	ISO/IEC 27001 Standard	https://www.iso.org/standard/27001	reference	0	2026-06-21 07:17:38.747709+00
248	83	NIST Cybersecurity Framework	https://www.nist.gov/cyberframework	reference	1	2026-06-21 07:17:38.750016+00
249	83	India DPDP Act 2023	https://www.meity.gov.in/data-protection-framework	reference	2	2026-06-21 07:17:38.752345+00
\.


--
-- Data for Name: lesson_video_progress; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lesson_video_progress (id, user_id, lesson_id, position_seconds, watched_percent, updated_at) FROM stdin;
1	1	31	42	30	2026-06-21 07:25:00.362181+00
\.


--
-- Data for Name: lesson_videos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lesson_videos (id, lesson_id, s3_key, video_url, duration_seconds, resolution, created_at, title, description, thumbnail_url, provider, transcript) FROM stdin;
2	2	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4	1080	1080p	2026-06-21 07:17:37.873636+00	\N	\N	\N	\N	\N
3	5	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4	900	1080p	2026-06-21 07:17:37.943815+00	\N	\N	\N	\N	\N
4	6	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4	1500	1080p	2026-06-21 07:17:37.955591+00	\N	\N	\N	\N	\N
5	7	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4	1200	1080p	2026-06-21 07:17:37.967428+00	\N	\N	\N	\N	\N
6	8	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4	1320	1080p	2026-06-21 07:17:37.981355+00	\N	\N	\N	\N	\N
7	11	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4	840	1080p	2026-06-21 07:17:38.013203+00	\N	\N	\N	\N	\N
8	13	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4	1200	1080p	2026-06-21 07:17:38.036218+00	\N	\N	\N	\N	\N
9	14	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4	1080	1080p	2026-06-21 07:17:38.047203+00	\N	\N	\N	\N	\N
10	16	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4	960	1080p	2026-06-21 07:17:38.064638+00	\N	\N	\N	\N	\N
11	17	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4	1200	1080p	2026-06-21 07:17:38.077066+00	\N	\N	\N	\N	\N
12	18	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4	1500	1080p	2026-06-21 07:17:38.089907+00	\N	\N	\N	\N	\N
13	21	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4	900	1080p	2026-06-21 07:17:38.121728+00	\N	\N	\N	\N	\N
14	23	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4	1200	1080p	2026-06-21 07:17:38.146166+00	\N	\N	\N	\N	\N
15	26	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4	720	1080p	2026-06-21 07:17:38.179804+00	\N	\N	\N	\N	\N
16	27	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4	1080	1080p	2026-06-21 07:17:38.189401+00	\N	\N	\N	\N	\N
17	28	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4	1080	1080p	2026-06-21 07:17:38.203657+00	\N	\N	\N	\N	\N
18	31	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4	720	1080p	2026-06-21 07:17:38.240393+00	\N	\N	\N	\N	\N
19	32	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4	1320	1080p	2026-06-21 07:17:38.250031+00	\N	\N	\N	\N	\N
20	33	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4	900	1080p	2026-06-21 07:17:38.259219+00	\N	\N	\N	\N	\N
21	36	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4	600	1080p	2026-06-21 07:17:38.289677+00	\N	\N	\N	\N	\N
22	37	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4	900	1080p	2026-06-21 07:17:38.304337+00	\N	\N	\N	\N	\N
23	38	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4	1200	1080p	2026-06-21 07:17:38.313672+00	\N	\N	\N	\N	\N
24	40	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4	1080	1080p	2026-06-21 07:17:38.330414+00	\N	\N	\N	\N	\N
25	41	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4	900	1080p	2026-06-21 07:17:38.339978+00	\N	\N	\N	\N	\N
26	42	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4	1500	1080p	2026-06-21 07:17:38.34959+00	\N	\N	\N	\N	\N
27	45	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4	840	1080p	2026-06-21 07:17:38.377911+00	\N	\N	\N	\N	\N
28	46	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4	1080	1080p	2026-06-21 07:17:38.387392+00	\N	\N	\N	\N	\N
29	47	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4	1200	1080p	2026-06-21 07:17:38.398389+00	\N	\N	\N	\N	\N
30	49	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4	960	1080p	2026-06-21 07:17:38.416785+00	\N	\N	\N	\N	\N
31	50	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4	1320	1080p	2026-06-21 07:17:38.427247+00	\N	\N	\N	\N	\N
32	51	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4	1200	1080p	2026-06-21 07:17:38.444808+00	\N	\N	\N	\N	\N
33	53	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4	1080	1080p	2026-06-21 07:17:38.461759+00	\N	\N	\N	\N	\N
34	54	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4	900	1080p	2026-06-21 07:17:38.471309+00	\N	\N	\N	\N	\N
35	55	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4	1320	1080p	2026-06-21 07:17:38.480683+00	\N	\N	\N	\N	\N
36	57	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4	840	1080p	2026-06-21 07:17:38.500173+00	\N	\N	\N	\N	\N
37	58	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4	1800	1080p	2026-06-21 07:17:38.51052+00	\N	\N	\N	\N	\N
38	62	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4	720	1080p	2026-06-21 07:17:38.562236+00	\N	\N	\N	\N	\N
39	63	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4	1080	1080p	2026-06-21 07:17:38.571623+00	\N	\N	\N	\N	\N
40	66	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4	900	1080p	2026-06-21 07:17:38.60196+00	\N	\N	\N	\N	\N
41	67	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4	1080	1080p	2026-06-21 07:17:38.611272+00	\N	\N	\N	\N	\N
42	71	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4	840	1080p	2026-06-21 07:17:38.645887+00	\N	\N	\N	\N	\N
43	72	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4	960	1080p	2026-06-21 07:17:38.655619+00	\N	\N	\N	\N	\N
44	76	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4	720	1080p	2026-06-21 07:17:38.689884+00	\N	\N	\N	\N	\N
45	77	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4	900	1080p	2026-06-21 07:17:38.698646+00	\N	\N	\N	\N	\N
46	80	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4	720	1080p	2026-06-21 07:17:38.726253+00	\N	\N	\N	\N	\N
1	1	\N	https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4	720	1080p	2026-06-21 07:17:37.859837+00	What is a SOC?	\N	\N	s3	\N
\.


--
-- Data for Name: lessons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lessons (id, module_id, title, slug, "order", type, duration_minutes, is_published, is_free, created_at, updated_at) FROM stdin;
1	1	What is a SOC?	what-is-a-soc-	1	video	12	t	t	2026-06-20 14:02:04.221464+00	2026-06-20 14:02:04.221464+00
2	1	SOC Analyst Roles & Tiers	soc-analyst-roles-tiers	2	video	18	t	f	2026-06-20 14:02:04.226683+00	2026-06-20 14:02:04.226683+00
3	1	Incident Lifecycle	incident-lifecycle	3	article	10	t	f	2026-06-20 14:02:04.232227+00	2026-06-20 14:02:04.232227+00
4	1	Quiz: SOC Basics	quiz-soc-basics	4	quiz	5	t	f	2026-06-20 14:02:04.237916+00	2026-06-20 14:02:04.237916+00
5	2	Introduction to SIEM	introduction-to-siem	1	video	15	t	t	2026-06-20 14:02:04.248242+00	2026-06-20 14:02:04.248242+00
6	2	Splunk Basics	splunk-basics	2	video	25	t	f	2026-06-20 14:02:04.253952+00	2026-06-20 14:02:04.253952+00
7	2	QRadar Overview	qradar-overview	3	video	20	t	f	2026-06-20 14:02:04.259245+00	2026-06-20 14:02:04.259245+00
8	2	Wazuh Setup & Rules	wazuh-setup-rules	4	video	22	t	f	2026-06-20 14:02:04.263264+00	2026-06-20 14:02:04.263264+00
9	2	Writing Detection Rules	writing-detection-rules	5	article	15	t	f	2026-06-20 14:02:04.268161+00	2026-06-20 14:02:04.268161+00
10	2	Lab: Splunk SPL Queries	lab-splunk-spl-queries	6	lab	30	t	f	2026-06-20 14:02:04.27325+00	2026-06-20 14:02:04.27325+00
11	3	Threat Hunting Fundamentals	threat-hunting-fundamentals	1	video	14	t	t	2026-06-20 14:02:04.285664+00	2026-06-20 14:02:04.285664+00
12	3	IOC vs TTP Analysis	ioc-vs-ttp-analysis	2	article	12	t	f	2026-06-20 14:02:04.290586+00	2026-06-20 14:02:04.290586+00
13	3	MITRE ATT&CK Framework	mitre-att-ck-framework	3	video	20	t	f	2026-06-20 14:02:04.298203+00	2026-06-20 14:02:04.298203+00
14	3	Hunting with Elastic	hunting-with-elastic	4	video	18	t	f	2026-06-20 14:02:04.302103+00	2026-06-20 14:02:04.302103+00
15	3	Assignment: Threat Hunt Report	assignment-threat-hunt-report	5	assignment	45	t	f	2026-06-20 14:02:04.306355+00	2026-06-20 14:02:04.306355+00
16	4	Malware Types & Behavior	malware-types-behavior	1	video	16	t	t	2026-06-20 14:02:04.316021+00	2026-06-20 14:02:04.316021+00
17	4	Static Analysis Tools	static-analysis-tools	2	video	20	t	f	2026-06-20 14:02:04.321352+00	2026-06-20 14:02:04.321352+00
18	4	Dynamic Analysis with Cuckoo	dynamic-analysis-with-cuckoo	3	video	25	t	f	2026-06-20 14:02:04.325818+00	2026-06-20 14:02:04.325818+00
19	4	Writing Malware Reports	writing-malware-reports	4	article	15	t	f	2026-06-20 14:02:04.330838+00	2026-06-20 14:02:04.330838+00
20	4	Lab: Analyze a Sample	lab-analyze-a-sample	5	lab	40	t	f	2026-06-20 14:02:04.335852+00	2026-06-20 14:02:04.335852+00
21	5	IR Lifecycle Overview	ir-lifecycle-overview	1	video	15	t	t	2026-06-20 14:02:04.35124+00	2026-06-20 14:02:04.35124+00
22	5	Playbooks & Runbooks	playbooks-runbooks	2	article	12	t	f	2026-06-20 14:02:04.358308+00	2026-06-20 14:02:04.358308+00
23	5	Digital Forensics Basics	digital-forensics-basics	3	video	20	t	f	2026-06-20 14:02:04.363829+00	2026-06-20 14:02:04.363829+00
24	5	Post-Incident Reporting	post-incident-reporting	4	article	10	t	f	2026-06-20 14:02:04.368478+00	2026-06-20 14:02:04.368478+00
25	5	Capstone: IR Simulation	capstone-ir-simulation	5	lab	60	t	f	2026-06-20 14:02:04.373757+00	2026-06-20 14:02:04.373757+00
26	6	Detection Engineering 101	detection-engineering-101	1	video	12	t	t	2026-06-20 14:02:04.383559+00	2026-06-20 14:02:04.383559+00
27	6	Sigma Rules	sigma-rules	2	video	18	t	f	2026-06-20 14:02:04.389323+00	2026-06-20 14:02:04.389323+00
28	6	YARA Rules	yara-rules	3	video	18	t	f	2026-06-20 14:02:04.39296+00	2026-06-20 14:02:04.39296+00
29	6	Deploying to Splunk	deploying-to-splunk	4	lab	30	t	f	2026-06-20 14:02:04.39642+00	2026-06-20 14:02:04.39642+00
30	6	Final Assessment	final-assessment	5	quiz	15	t	f	2026-06-20 14:02:04.40076+00	2026-06-20 14:02:04.40076+00
31	7	OWASP Overview	owasp-overview	1	video	12	t	t	2026-06-20 14:02:04.411211+00	2026-06-20 14:02:04.411211+00
32	7	Injection Attacks (SQLi, XSS)	injection-attacks-sqli-xss-	2	video	22	t	f	2026-06-20 14:02:04.415615+00	2026-06-20 14:02:04.415615+00
33	7	Broken Authentication	broken-authentication	3	video	15	t	f	2026-06-20 14:02:04.420665+00	2026-06-20 14:02:04.420665+00
34	7	SSRF & XXE	ssrf-xxe	4	article	12	t	f	2026-06-20 14:02:04.426812+00	2026-06-20 14:02:04.426812+00
35	7	Lab: DVWA Exploits	lab-dvwa-exploits	5	lab	45	t	f	2026-06-20 14:02:04.43298+00	2026-06-20 14:02:04.43298+00
36	8	Burp Suite Setup	burp-suite-setup	1	video	10	t	t	2026-06-20 14:02:04.443733+00	2026-06-20 14:02:04.443733+00
37	8	Proxy & Interceptor	proxy-interceptor	2	video	15	t	f	2026-06-20 14:02:04.447527+00	2026-06-20 14:02:04.447527+00
38	8	Scanner & Intruder	scanner-intruder	3	video	20	t	f	2026-06-20 14:02:04.452328+00	2026-06-20 14:02:04.452328+00
39	8	Lab: Bug Bounty Simulation	lab-bug-bounty-simulation	4	lab	40	t	f	2026-06-20 14:02:04.456098+00	2026-06-20 14:02:04.456098+00
40	9	Nmap Port Scanning	nmap-port-scanning	1	video	18	t	t	2026-06-20 14:02:04.471557+00	2026-06-20 14:02:04.471557+00
41	9	Service Enumeration	service-enumeration	2	video	15	t	f	2026-06-20 14:02:04.475286+00	2026-06-20 14:02:04.475286+00
42	9	Metasploit Framework	metasploit-framework	3	video	25	t	f	2026-06-20 14:02:04.481806+00	2026-06-20 14:02:04.481806+00
43	9	Post-Exploitation Basics	post-exploitation-basics	4	article	12	t	f	2026-06-20 14:02:04.488082+00	2026-06-20 14:02:04.488082+00
44	9	Lab: HackTheBox Machine	lab-hackthebox-machine	5	lab	60	t	f	2026-06-20 14:02:04.493765+00	2026-06-20 14:02:04.493765+00
45	10	API Security Fundamentals	api-security-fundamentals	1	video	14	t	t	2026-06-20 14:02:04.503022+00	2026-06-20 14:02:04.503022+00
46	10	OWASP API Top 10	owasp-api-top-10	2	video	18	t	f	2026-06-20 14:02:04.572723+00	2026-06-20 14:02:04.572723+00
47	10	Postman for Security Testing	postman-for-security-testing	3	video	20	t	f	2026-06-20 14:02:04.581042+00	2026-06-20 14:02:04.581042+00
48	10	Lab: API Exploitation	lab-api-exploitation	4	lab	45	t	f	2026-06-20 14:02:04.58599+00	2026-06-20 14:02:04.58599+00
49	11	AD Architecture	ad-architecture	1	video	16	t	t	2026-06-20 14:02:04.598268+00	2026-06-20 14:02:04.598268+00
50	11	Kerberoasting & Pass-the-Hash	kerberoasting-pass-the-hash	2	video	22	t	f	2026-06-20 14:02:04.602267+00	2026-06-20 14:02:04.602267+00
51	11	BloodHound & SharpHound	bloodhound-sharphound	3	video	20	t	f	2026-06-20 14:02:04.606989+00	2026-06-20 14:02:04.606989+00
52	11	Lab: AD Attack Chain	lab-ad-attack-chain	4	lab	60	t	f	2026-06-20 14:02:04.612059+00	2026-06-20 14:02:04.612059+00
53	12	Android APK Analysis	android-apk-analysis	1	video	18	t	t	2026-06-20 14:02:04.62161+00	2026-06-20 14:02:04.62161+00
54	12	iOS App Security	ios-app-security	2	video	15	t	f	2026-06-20 14:02:04.625706+00	2026-06-20 14:02:04.625706+00
55	12	AWS Cloud Pentesting	aws-cloud-pentesting	3	video	22	t	f	2026-06-20 14:02:04.631124+00	2026-06-20 14:02:04.631124+00
56	12	Capstone: Full Pentest Report	capstone-full-pentest-report	4	assignment	90	t	f	2026-06-20 14:02:04.635764+00	2026-06-20 14:02:04.635764+00
58	13	Clause-by-Clause Deep Dive	clause-by-clause-deep-dive	2	video	30	t	f	2026-06-20 14:02:04.649265+00	2026-06-20 14:02:04.649265+00
59	13	ISMS Scope & Context	isms-scope-context	3	article	12	t	f	2026-06-20 14:02:04.654113+00	2026-06-20 14:02:04.654113+00
60	13	Annex A Controls	annex-a-controls	4	article	20	t	f	2026-06-20 14:02:04.657679+00	2026-06-20 14:02:04.657679+00
61	13	Quiz: ISO Basics	quiz-iso-basics	5	quiz	10	t	f	2026-06-20 14:02:04.661291+00	2026-06-20 14:02:04.661291+00
62	14	NIST CSF Introduction	nist-csf-introduction	1	video	12	t	t	2026-06-20 14:02:04.675187+00	2026-06-20 14:02:04.675187+00
63	14	Framework Core Functions	framework-core-functions	2	video	18	t	f	2026-06-20 14:02:04.679987+00	2026-06-20 14:02:04.679987+00
64	14	Implementation Tiers	implementation-tiers	3	article	10	t	f	2026-06-20 14:02:04.683963+00	2026-06-20 14:02:04.683963+00
65	14	Creating a CSF Profile	creating-a-csf-profile	4	lab	30	t	f	2026-06-20 14:02:04.692846+00	2026-06-20 14:02:04.692846+00
66	15	DPDP Act Overview	dpdp-act-overview	1	video	15	t	t	2026-06-20 14:02:04.706441+00	2026-06-20 14:02:04.706441+00
67	15	Data Fiduciary Obligations	data-fiduciary-obligations	2	video	18	t	f	2026-06-20 14:02:04.710801+00	2026-06-20 14:02:04.710801+00
68	15	Consent Management	consent-management	3	article	12	t	f	2026-06-20 14:02:04.714511+00	2026-06-20 14:02:04.714511+00
69	15	Breach Notification Requirements	breach-notification-requirements	4	article	10	t	f	2026-06-20 14:02:04.723106+00	2026-06-20 14:02:04.723106+00
70	15	Lab: Build a Consent Register	lab-build-a-consent-register	5	lab	30	t	f	2026-06-20 14:02:04.733915+00	2026-06-20 14:02:04.733915+00
71	16	Risk Management Fundamentals	risk-management-fundamentals	1	video	14	t	t	2026-06-20 14:02:04.747402+00	2026-06-20 14:02:04.747402+00
72	16	Risk Identification Methods	risk-identification-methods	2	video	16	t	f	2026-06-20 14:02:04.752714+00	2026-06-20 14:02:04.752714+00
73	16	Risk Matrix & Scoring	risk-matrix-scoring	3	article	12	t	f	2026-06-20 14:02:04.758662+00	2026-06-20 14:02:04.758662+00
74	16	Risk Treatment Plans	risk-treatment-plans	4	article	10	t	f	2026-06-20 14:02:04.762348+00	2026-06-20 14:02:04.762348+00
75	16	Assignment: Risk Register	assignment-risk-register	5	assignment	45	t	f	2026-06-20 14:02:04.766698+00	2026-06-20 14:02:04.766698+00
76	17	Audit Lifecycle	audit-lifecycle	1	video	12	t	t	2026-06-20 14:02:04.775895+00	2026-06-20 14:02:04.775895+00
77	17	Evidence Collection Techniques	evidence-collection-techniques	2	video	15	t	f	2026-06-20 14:02:04.781215+00	2026-06-20 14:02:04.781215+00
78	17	Non-Conformity Management	non-conformity-management	3	article	10	t	f	2026-06-20 14:02:04.790535+00	2026-06-20 14:02:04.790535+00
79	17	Audit Report Writing	audit-report-writing	4	assignment	30	t	f	2026-06-20 14:02:04.794228+00	2026-06-20 14:02:04.794228+00
80	18	Third-Party Risk Overview	third-party-risk-overview	1	video	12	t	t	2026-06-20 14:02:04.807257+00	2026-06-20 14:02:04.807257+00
81	18	Vendor Questionnaires	vendor-questionnaires	2	article	10	t	f	2026-06-20 14:02:04.811797+00	2026-06-20 14:02:04.811797+00
82	18	Contractual Controls	contractual-controls	3	article	10	t	f	2026-06-20 14:02:04.815387+00	2026-06-20 14:02:04.815387+00
83	18	Capstone: VRM Program	capstone-vrm-program	4	assignment	60	t	f	2026-06-20 14:02:04.819865+00	2026-06-20 14:02:04.819865+00
57	13	ISO 27001 Overview	iso-27001-overview	1	video	14	t	t	2026-06-20 14:02:04.645017+00	2026-06-23 04:12:09.917+00
\.


--
-- Data for Name: mentor_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mentor_profiles (id, user_id, specialization, years_of_experience, company, designation, linkedin_url, calendly_url, bio, is_available, created_at, updated_at, career_track) FROM stdin;
1	16	SOC Ops	\N	FUTRSEC	\N	\N	\N	10y SOC lead	t	2026-06-21 10:35:58.181129+00	2026-06-21 10:36:32.647+00	\N
2	19	\N	\N	\N	\N	\N	\N	\N	t	2026-06-21 20:00:03.130351+00	2026-06-21 20:00:03.130351+00	soc
3	23	\N	\N	\N	\N	\N	\N	\N	t	2026-06-21 20:04:43.366744+00	2026-06-21 20:04:43.366744+00	soc
\.


--
-- Data for Name: mentor_students; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mentor_students (id, mentor_id, student_id, batch_id, is_trial, assigned_by, assigned_at) FROM stdin;
1	16	2	1	f	15	2026-06-21 10:36:09.840416+00
2	16	1	1	f	15	2026-06-21 10:36:09.840416+00
5	23	27	\N	f	18	2026-06-23 14:03:48.067403+00
6	23	2	\N	f	18	2026-06-23 14:03:48.067403+00
\.


--
-- Data for Name: mentor_task_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mentor_task_assignments (id, task_id, student_id, status, completed_at, created_at) FROM stdin;
1	1	2	assigned	\N	2026-06-21 10:36:32.431216+00
2	1	1	assigned	\N	2026-06-21 10:36:32.431216+00
3	3	2	assigned	\N	2026-06-21 10:55:09.934861+00
4	3	1	assigned	\N	2026-06-21 10:55:09.934861+00
5	5	27	assigned	\N	2026-06-23 14:05:09.16874+00
6	5	2	assigned	\N	2026-06-23 14:05:09.16874+00
\.


--
-- Data for Name: mentor_task_batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mentor_task_batches (id, task_id, batch_id) FROM stdin;
1	3	1
\.


--
-- Data for Name: mentor_tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mentor_tasks (id, mentor_id, type, title, description, content_url, ref_id, career_track, status, audience, start_date, end_date, scheduled_at, published_at, archived_at, created_at, updated_at) FROM stdin;
1	16	resource	Read SOC primer	\N	https://example.com	\N	soc	archived	all_students	\N	\N	\N	2026-06-21 10:36:32.424+00	2026-06-21 10:36:32.527+00	2026-06-21 10:36:32.42526+00	2026-06-21 10:36:32.527+00
2	16	assignment	Lab writeup	\N	\N	\N	soc	scheduled	trial_students	\N	\N	2026-07-01 09:00:00+00	\N	\N	2026-06-21 10:36:32.589131+00	2026-06-21 10:36:32.589131+00
3	16	resource	Draft SB task	\N	\N	\N	soc	published	specific_batches	\N	\N	\N	2026-06-21 10:55:09.927+00	\N	2026-06-21 10:55:09.678531+00	2026-06-21 10:55:09.927+00
5	23	assessment	12w2	\N	\N	\N	soc	published	all_students	\N	\N	\N	2026-06-23 14:05:09.133+00	\N	2026-06-23 14:05:09.134139+00	2026-06-23 14:05:09.134139+00
\.


--
-- Data for Name: mock_interview_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mock_interview_assignments (id, template_id, student_id, batch_id, assigned_by, status, interview_id, due_at, started_at, completed_at, score, created_at) FROM stdin;
1	1	2	\N	16	completed	3	\N	2026-06-22 03:17:13.29+00	2026-06-22 03:17:27.705+00	85	2026-06-22 03:16:35.82672+00
2	3	2	\N	16	completed	4	\N	2026-06-22 03:31:53.329+00	2026-06-22 03:32:00.821+00	36	2026-06-22 03:31:51.867781+00
\.


--
-- Data for Name: mock_interview_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mock_interview_templates (id, created_by, title, description, career_track, interview_type, difficulty, status, total_questions, duration_min, rounds, passing_score, allow_voice, question_source, question_bank_ids, custom_questions, focus_skills, instructions, scheduled_at, deadline, published_at, archived_at, created_at, updated_at) FROM stdin;
1	16	SOC L1 Technical Screen	\N	soc	technical	intermediate	published	10	45	1	60	t	ai	{}	\N	{}	\N	\N	\N	2026-06-22 03:15:40.299+00	\N	2026-06-22 03:15:40.21471+00	2026-06-22 03:15:40.299+00
2	16	TQ Test	\N	soc	technical	intermediate	draft	7	20	1	60	t	ai	{}	\N	{}	\N	\N	\N	\N	\N	2026-06-22 03:18:13.045744+00	2026-06-22 03:18:13.045744+00
3	16	Finalize Test SOC	e2e	soc	technical	beginner	published	3	30	1	60	t	ai	{}	\N	{logs}	\N	\N	\N	2026-06-22 03:31:51.849+00	\N	2026-06-22 03:31:51.733568+00	2026-06-22 03:31:51.849+00
\.


--
-- Data for Name: module_enrollments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.module_enrollments (id, user_id, module_id, track_id, started_at, completed_at, progress_percent) FROM stdin;
2	9	1	1	2026-06-21 06:57:58.159933+00	\N	0
1	4	1	1	2026-06-21 06:03:19.500162+00	\N	50
3	2	1	1	2026-06-22 04:38:00.05771+00	\N	0
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, role, title, message, type, channel, entity_type, entity_id, link, is_read, is_archived, created_at) FROM stdin;
1	15	admin	New signup	A new employer just registered on FUTRSEC.	signup	in_app	user	17	/admin/students	f	f	2026-06-21 12:14:50.660109+00
2	1	\N	Free trial activated	Your trial free trial is now active. Enjoy full access!	subscription	in_app	\N	\N	/subscription	f	f	2026-06-21 12:20:52.908416+00
3	1	\N	Subscription updated	Your subscription is now on the premium_vapt plan.	subscription	in_app	\N	\N	/subscription	f	f	2026-06-21 12:24:07.589452+00
4	1	\N	Payment received	We received your payment of ₹5898.82.	payment	in_app	payment	1	/subscription	f	f	2026-06-21 12:24:07.600285+00
5	16	mentor	Question approved	Your question "What does SIEM stand for?" was approved.	system	in_app	question_bank	1	/mentor/question-bank	f	f	2026-06-22 02:59:36.331567+00
6	18	admin	New support ticket	Lab sandbox will not start (high priority)	system	in_app	support_ticket	1	/admin/support	f	f	2026-06-22 05:55:33.884932+00
7	15	admin	New support ticket	Lab sandbox will not start (high priority)	system	in_app	support_ticket	1	/admin/support	f	f	2026-06-22 05:55:33.890161+00
8	2	\N	New reply on support ticket	Lab sandbox will not start	system	in_app	support_ticket	1	/support/b920c9d6-a3a7-41f0-9e2e-cec348be8c72	f	f	2026-06-22 05:55:56.681341+00
9	2	\N	Support ticket updated	"Lab sandbox will not start" is now resolved	system	in_app	support_ticket	1	/support/b920c9d6-a3a7-41f0-9e2e-cec348be8c72	f	f	2026-06-22 05:55:56.788477+00
12	15	admin	New support ticket	LK test (medium priority)	system	in_app	support_ticket	2	/admin/support	f	f	2026-06-23 05:19:15.351397+00
13	18	admin	New support ticket	LK test (medium priority)	system	in_app	support_ticket	2	/admin/support	f	f	2026-06-23 05:19:15.361081+00
14	23	mentor	Question approved	Your question "What is the primary purpose of log analysis in a security op" was approved.	system	in_app	question_bank	3	/mentor/question-bank	f	f	2026-06-23 05:22:52.335237+00
15	23	mentor	Question approved	Your question "Which log file would you analyze to investigate failed login" was approved.	system	in_app	question_bank	4	/mentor/question-bank	f	f	2026-06-23 05:22:53.933772+00
16	23	mentor	Question approved	Your question "When analyzing web server logs, which status code indicates " was approved.	system	in_app	question_bank	5	/mentor/question-bank	f	f	2026-06-23 05:22:54.516686+00
17	23	mentor	Question approved	Your question "Which of the following tools is commonly used for analyzing " was approved.	system	in_app	question_bank	6	/mentor/question-bank	f	f	2026-06-23 05:22:55.176589+00
18	23	mentor	Question approved	Your question "What should be the first step when investigating a potential" was approved.	system	in_app	question_bank	7	/mentor/question-bank	f	f	2026-06-23 05:22:55.783172+00
19	15	admin	New signup	A new student just registered on FUTRSEC.	signup	in_app	user	26	/admin/students	f	f	2026-06-23 06:57:35.092737+00
20	18	admin	New signup	A new student just registered on FUTRSEC.	signup	in_app	user	26	/admin/students	f	f	2026-06-23 06:57:35.105105+00
22	15	admin	New signup	A new student just registered on FUTRSEC.	signup	in_app	user	27	/admin/students	f	f	2026-06-23 13:59:44.731636+00
21	18	admin	New signup	A new student just registered on FUTRSEC.	signup	in_app	user	27	/admin/students	f	f	2026-06-23 13:59:44.7314+00
\.


--
-- Data for Name: offers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.offers (id, application_id, student_id, job_id, salary, joining_date, offer_letter_url, status, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payment_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_transactions (id, payment_id, provider, provider_txn_id, status, amount, raw_payload, created_at) FROM stdin;
1	1	manual	pay_mqnrde9qm4m1m2qz0e	success	589882	{"orderId": "order_mqnrde9qf4bxvozwl3", "provider": "manual", "paymentId": "pay_mqnrde9qm4m1m2qz0e", "verifiedAt": "2026-06-21T12:24:07.551Z"}	2026-06-21 12:24:07.572899+00
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, user_id, subscription_id, amount, currency, status, gateway, gateway_order_id, gateway_payment_id, failure_reason, paid_at, created_at) FROM stdin;
1	1	1	589882	INR	paid	manual	order_mqnrde9qf4bxvozwl3	pay_mqnrde9qm4m1m2qz0e	\N	2026-06-21 12:24:07.551+00	2026-06-21 12:24:07.565785+00
\.


--
-- Data for Name: placement_drives; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.placement_drives (id, tpo_id, company_id, company_name, role, career_track, package_details, mode, venue, meeting_url, eligibility_criteria, min_fts_score, status, drive_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: placements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.placements (id, student_id, job_id, application_id, offer_id, employer_id, company_name, career_track, package_amount, status, placed_at, created_at) FROM stdin;
\.


--
-- Data for Name: platform_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.platform_settings (id, trial_days, logo_url, banner_url, terms_content, privacy_content, refund_content, contact_email, contact_phone, contact_address, updated_by, created_at, updated_at) FROM stdin;
1	15	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-21 13:27:53.054085+00	2026-06-21 13:27:53.054085+00
\.


--
-- Data for Name: question_bank; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.question_bank (id, question_text, question_type, career_track, difficulty, status, created_by, creator_role, approved_by, approved_at, rejection_reason, is_shared, version, topic, bloom_level, estimated_time_min, marks, negative_marks, skills, keywords, explanation, code_language, code_template, expected_output, scenario_context, usage_count, ai_quality_score, ai_generated, created_at, updated_at) FROM stdin;
7	What should be the first step when investigating a potential security incident based on log analysis?	mcq	soc	intermediate	approved	23	mentor	18	2026-06-23 05:22:55.774+00	\N	f	1	log analyse	analyze	4	1	0	{"Incident investigation","Log verification"}	{"log analysis","security incident",verification}	Verifying the authenticity of the logs is crucial to ensure that the data used for investigation is reliable and accurate.	\N	\N	\N	\N	0	\N	t	2026-06-23 05:16:03.245921+00	2026-06-23 05:22:55.774+00
2	What is SOC	mcq	soc	intermediate	draft	23	mentor	\N	\N	\N	f	1	SOC	\N	\N	1	0	{}	{}	this is son	\N	\N	\N	\N	0	\N	f	2026-06-23 04:53:42.711022+00	2026-06-23 04:53:42.711022+00
6	Which of the following tools is commonly used for analyzing large sets of log data in real-time?	mcq	soc	intermediate	approved	23	mentor	18	2026-06-23 05:22:55.168+00	\N	f	1	log analyse	apply	3	1	0	{"Log management","Data analysis"}	{Splunk,"log analysis",real-time}	Splunk is widely used for searching, monitoring, and analyzing machine-generated big data through a web-style interface.	\N	\N	\N	\N	1	\N	t	2026-06-23 05:16:03.150259+00	2026-06-23 13:35:55.907+00
5	When analyzing web server logs, which status code indicates a successful request?	mcq	soc	intermediate	approved	23	mentor	18	2026-06-23 05:22:54.507+00	\N	f	1	log analyse	remember	2	1	0	{"Web server log analysis","HTTP status codes"}	{"web server",logs,"HTTP status code"}	A status code of 200 indicates that the request was successful and the server responded with the requested resource.	\N	\N	\N	\N	0	\N	t	2026-06-23 05:16:03.070556+00	2026-06-23 05:22:54.507+00
4	Which log file would you analyze to investigate failed login attempts on a Linux server?	mcq	soc	intermediate	approved	23	mentor	18	2026-06-23 05:22:53.924+00	\N	f	1	log analyse	apply	3	1	0	{"Log file identification","Linux system administration"}	{Linux,"log files",authentication}	The /var/log/auth.log file contains authentication-related logs, including failed login attempts.	\N	\N	\N	\N	2	\N	t	2026-06-23 05:16:02.872751+00	2026-06-23 13:43:53.958+00
1	What does SIEM stand for?	mcq	soc	beginner	approved	16	mentor	18	2026-06-22 02:59:36.323+00	\N	f	1	\N	\N	\N	1	0	{}	{}	\N	\N	\N	\N	\N	4	95	f	2026-06-22 02:59:35.672389+00	2026-06-23 13:52:46.462+00
3	What is the primary purpose of log analysis in a security operations center (SOC)?	mcq	soc	intermediate	approved	23	mentor	18	2026-06-23 05:22:52.323+00	\N	f	1	log analyse	understand	2	1	0	{"Incident detection","Threat response"}	{"log analysis",SOC,"security incidents"}	Log analysis is crucial for detecting anomalies, identifying threats, and responding to security incidents in real-time.	\N	\N	\N	\N	4	\N	t	2026-06-23 05:16:02.367829+00	2026-06-23 13:52:46.462+00
\.


--
-- Data for Name: question_bank_batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.question_bank_batches (id, question_id, batch_id) FROM stdin;
\.


--
-- Data for Name: question_bank_options; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.question_bank_options (id, question_id, option_text, is_correct, "order", created_at) FROM stdin;
1	1	Security Information and Event Management	t	0	2026-06-22 02:59:35.682324+00
2	1	System Integrity Event Monitor	f	1	2026-06-22 02:59:35.682324+00
3	2	A	t	0	2026-06-23 04:53:42.797581+00
4	2	B	f	1	2026-06-23 04:53:42.797581+00
5	2	C	f	2	2026-06-23 04:53:42.797581+00
6	2	D	f	3	2026-06-23 04:53:42.797581+00
7	3	To monitor system performance	f	0	2026-06-23 05:16:02.404515+00
8	3	To detect and respond to security incidents	t	1	2026-06-23 05:16:02.404515+00
9	3	To manage IT resources effectively	f	2	2026-06-23 05:16:02.404515+00
10	3	To improve user experience	f	3	2026-06-23 05:16:02.404515+00
11	4	/var/log/syslog	f	0	2026-06-23 05:16:02.878665+00
12	4	/var/log/auth.log	t	1	2026-06-23 05:16:02.878665+00
13	4	/var/log/messages	f	2	2026-06-23 05:16:02.878665+00
14	4	/var/log/kernel.log	f	3	2026-06-23 05:16:02.878665+00
15	5	404	f	0	2026-06-23 05:16:03.07522+00
16	5	500	f	1	2026-06-23 05:16:03.07522+00
17	5	200	t	2	2026-06-23 05:16:03.07522+00
18	5	301	f	3	2026-06-23 05:16:03.07522+00
19	6	Wireshark	f	0	2026-06-23 05:16:03.155621+00
20	6	Splunk	t	1	2026-06-23 05:16:03.155621+00
21	6	Nmap	f	2	2026-06-23 05:16:03.155621+00
22	6	Metasploit	f	3	2026-06-23 05:16:03.155621+00
23	7	Isolate the affected system	f	0	2026-06-23 05:16:03.250985+00
24	7	Verify the authenticity of the logs	t	1	2026-06-23 05:16:03.250985+00
25	7	Report to management	f	2	2026-06-23 05:16:03.250985+00
26	7	Communicate with the affected users	f	3	2026-06-23 05:16:03.250985+00
\.


--
-- Data for Name: question_bank_versions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.question_bank_versions (id, question_id, version, snapshot, changed_by, change_note, created_at) FROM stdin;
1	1	1	{"question": {"id": 1, "marks": 1, "topic": null, "skills": [], "status": "draft", "options": [{"id": 1, "order": 0, "isCorrect": true, "optionText": "Security Information and Event Management"}, {"id": 2, "order": 1, "isCorrect": false, "optionText": "System Integrity Event Monitor"}], "version": 1, "isShared": false, "keywords": [], "createdAt": "2026-06-22T02:59:35.672Z", "createdBy": 16, "updatedAt": "2026-06-22T02:59:35.672Z", "approvedAt": null, "approvedBy": null, "bloomLevel": null, "difficulty": "beginner", "usageCount": 0, "aiGenerated": false, "careerTrack": "soc", "creatorRole": "mentor", "explanation": null, "codeLanguage": null, "codeTemplate": null, "questionText": "What does SIEM stand for?", "questionType": "mcq", "negativeMarks": 0, "aiQualityScore": null, "expectedOutput": null, "rejectionReason": null, "scenarioContext": null, "estimatedTimeMin": null}}	16	created	2026-06-22 02:59:35.688818+00
2	2	1	{"question": {"id": 2, "marks": 1, "topic": "SOC", "skills": [], "status": "draft", "options": [{"id": 3, "order": 0, "isCorrect": true, "optionText": "A"}, {"id": 4, "order": 1, "isCorrect": false, "optionText": "B"}, {"id": 5, "order": 2, "isCorrect": false, "optionText": "C"}, {"id": 6, "order": 3, "isCorrect": false, "optionText": "D"}], "version": 1, "isShared": false, "keywords": [], "createdAt": "2026-06-23T04:53:42.711Z", "createdBy": 23, "updatedAt": "2026-06-23T04:53:42.711Z", "approvedAt": null, "approvedBy": null, "bloomLevel": null, "difficulty": "intermediate", "usageCount": 0, "aiGenerated": false, "careerTrack": "soc", "creatorRole": "mentor", "explanation": "this is son", "codeLanguage": null, "codeTemplate": null, "questionText": "What is SOC", "questionType": "mcq", "negativeMarks": 0, "aiQualityScore": null, "expectedOutput": null, "rejectionReason": null, "scenarioContext": null, "estimatedTimeMin": null}}	23	created	2026-06-23 04:53:42.864174+00
3	3	1	{"question": {"id": 3, "marks": 1, "topic": "log analyse", "skills": ["Incident detection", "Threat response"], "status": "draft", "options": [{"id": 7, "order": 0, "isCorrect": false, "optionText": "To monitor system performance"}, {"id": 8, "order": 1, "isCorrect": true, "optionText": "To detect and respond to security incidents"}, {"id": 9, "order": 2, "isCorrect": false, "optionText": "To manage IT resources effectively"}, {"id": 10, "order": 3, "isCorrect": false, "optionText": "To improve user experience"}], "version": 1, "isShared": false, "keywords": ["log analysis", "SOC", "security incidents"], "createdAt": "2026-06-23T05:16:02.367Z", "createdBy": 23, "updatedAt": "2026-06-23T05:16:02.367Z", "approvedAt": null, "approvedBy": null, "bloomLevel": "understand", "difficulty": "intermediate", "usageCount": 0, "aiGenerated": true, "careerTrack": "soc", "creatorRole": "mentor", "explanation": "Log analysis is crucial for detecting anomalies, identifying threats, and responding to security incidents in real-time.", "codeLanguage": null, "codeTemplate": null, "questionText": "What is the primary purpose of log analysis in a security operations center (SOC)?", "questionType": "mcq", "negativeMarks": 0, "aiQualityScore": null, "expectedOutput": null, "rejectionReason": null, "scenarioContext": null, "estimatedTimeMin": 2}}	23	created	2026-06-23 05:16:02.419907+00
4	4	1	{"question": {"id": 4, "marks": 1, "topic": "log analyse", "skills": ["Log file identification", "Linux system administration"], "status": "draft", "options": [{"id": 11, "order": 0, "isCorrect": false, "optionText": "/var/log/syslog"}, {"id": 12, "order": 1, "isCorrect": true, "optionText": "/var/log/auth.log"}, {"id": 13, "order": 2, "isCorrect": false, "optionText": "/var/log/messages"}, {"id": 14, "order": 3, "isCorrect": false, "optionText": "/var/log/kernel.log"}], "version": 1, "isShared": false, "keywords": ["Linux", "log files", "authentication"], "createdAt": "2026-06-23T05:16:02.872Z", "createdBy": 23, "updatedAt": "2026-06-23T05:16:02.872Z", "approvedAt": null, "approvedBy": null, "bloomLevel": "apply", "difficulty": "intermediate", "usageCount": 0, "aiGenerated": true, "careerTrack": "soc", "creatorRole": "mentor", "explanation": "The /var/log/auth.log file contains authentication-related logs, including failed login attempts.", "codeLanguage": null, "codeTemplate": null, "questionText": "Which log file would you analyze to investigate failed login attempts on a Linux server?", "questionType": "mcq", "negativeMarks": 0, "aiQualityScore": null, "expectedOutput": null, "rejectionReason": null, "scenarioContext": null, "estimatedTimeMin": 3}}	23	created	2026-06-23 05:16:02.884662+00
5	5	1	{"question": {"id": 5, "marks": 1, "topic": "log analyse", "skills": ["Web server log analysis", "HTTP status codes"], "status": "draft", "options": [{"id": 15, "order": 0, "isCorrect": false, "optionText": "404"}, {"id": 16, "order": 1, "isCorrect": false, "optionText": "500"}, {"id": 17, "order": 2, "isCorrect": true, "optionText": "200"}, {"id": 18, "order": 3, "isCorrect": false, "optionText": "301"}], "version": 1, "isShared": false, "keywords": ["web server", "logs", "HTTP status code"], "createdAt": "2026-06-23T05:16:03.070Z", "createdBy": 23, "updatedAt": "2026-06-23T05:16:03.070Z", "approvedAt": null, "approvedBy": null, "bloomLevel": "remember", "difficulty": "intermediate", "usageCount": 0, "aiGenerated": true, "careerTrack": "soc", "creatorRole": "mentor", "explanation": "A status code of 200 indicates that the request was successful and the server responded with the requested resource.", "codeLanguage": null, "codeTemplate": null, "questionText": "When analyzing web server logs, which status code indicates a successful request?", "questionType": "mcq", "negativeMarks": 0, "aiQualityScore": null, "expectedOutput": null, "rejectionReason": null, "scenarioContext": null, "estimatedTimeMin": 2}}	23	created	2026-06-23 05:16:03.080973+00
6	6	1	{"question": {"id": 6, "marks": 1, "topic": "log analyse", "skills": ["Log management", "Data analysis"], "status": "draft", "options": [{"id": 19, "order": 0, "isCorrect": false, "optionText": "Wireshark"}, {"id": 20, "order": 1, "isCorrect": true, "optionText": "Splunk"}, {"id": 21, "order": 2, "isCorrect": false, "optionText": "Nmap"}, {"id": 22, "order": 3, "isCorrect": false, "optionText": "Metasploit"}], "version": 1, "isShared": false, "keywords": ["Splunk", "log analysis", "real-time"], "createdAt": "2026-06-23T05:16:03.150Z", "createdBy": 23, "updatedAt": "2026-06-23T05:16:03.150Z", "approvedAt": null, "approvedBy": null, "bloomLevel": "apply", "difficulty": "intermediate", "usageCount": 0, "aiGenerated": true, "careerTrack": "soc", "creatorRole": "mentor", "explanation": "Splunk is widely used for searching, monitoring, and analyzing machine-generated big data through a web-style interface.", "codeLanguage": null, "codeTemplate": null, "questionText": "Which of the following tools is commonly used for analyzing large sets of log data in real-time?", "questionType": "mcq", "negativeMarks": 0, "aiQualityScore": null, "expectedOutput": null, "rejectionReason": null, "scenarioContext": null, "estimatedTimeMin": 3}}	23	created	2026-06-23 05:16:03.161521+00
7	7	1	{"question": {"id": 7, "marks": 1, "topic": "log analyse", "skills": ["Incident investigation", "Log verification"], "status": "draft", "options": [{"id": 23, "order": 0, "isCorrect": false, "optionText": "Isolate the affected system"}, {"id": 24, "order": 1, "isCorrect": true, "optionText": "Verify the authenticity of the logs"}, {"id": 25, "order": 2, "isCorrect": false, "optionText": "Report to management"}, {"id": 26, "order": 3, "isCorrect": false, "optionText": "Communicate with the affected users"}], "version": 1, "isShared": false, "keywords": ["log analysis", "security incident", "verification"], "createdAt": "2026-06-23T05:16:03.245Z", "createdBy": 23, "updatedAt": "2026-06-23T05:16:03.245Z", "approvedAt": null, "approvedBy": null, "bloomLevel": "analyze", "difficulty": "intermediate", "usageCount": 0, "aiGenerated": true, "careerTrack": "soc", "creatorRole": "mentor", "explanation": "Verifying the authenticity of the logs is crucial to ensure that the data used for investigation is reliable and accurate.", "codeLanguage": null, "codeTemplate": null, "questionText": "What should be the first step when investigating a potential security incident based on log analysis?", "questionType": "mcq", "negativeMarks": 0, "aiQualityScore": null, "expectedOutput": null, "rejectionReason": null, "scenarioContext": null, "estimatedTimeMin": 4}}	23	created	2026-06-23 05:16:03.256975+00
\.


--
-- Data for Name: quiz_attempts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quiz_attempts (id, user_id, quiz_id, lesson_id, score, max_score, passed, time_spent_seconds, completed_at) FROM stdin;
1	4	1	4	20	60	f	30	2026-06-21 07:25:35.516937+00
2	4	1	4	60	60	t	45	2026-06-21 07:25:35.529714+00
\.


--
-- Data for Name: referrals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.referrals (id, referrer_user_id, referred_user_id, code, status, reward_type, reward_value, created_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refresh_tokens (id, user_id, token_hash, expires_at, revoked_at, created_at) FROM stdin;
1	1	$2b$10$amKaXjBxEW7qLc.t5..UfO/7DOG2XKbPID8NU/k4haY41HkfvKAzS	2026-07-20 14:40:24.471+00	\N	2026-06-20 14:40:24.47213+00
2	1	$2b$10$FOSMjWV2mLlA4/ZOP4XAKu9EBmoR5Suae0JP.QGagnjfeHY6EydMq	2026-07-20 14:41:22.894+00	\N	2026-06-20 14:41:22.895141+00
3	2	$2b$10$sR8kvUhfLfDmuDlVegReGuGxNfpLVNvnn4jvKpabzUH71RVoGBxnW	2026-07-21 04:47:29.237+00	\N	2026-06-21 04:47:29.238971+00
6	6	$2b$10$qlNHfypG8eTk81EEfdJHv.PHHRta8EKXMKRyALzh84r32Ce2TGON6	2026-07-21 04:59:25.876+00	\N	2026-06-21 04:59:25.877515+00
7	2	$2b$10$B3u455CwLOoGfNxRxHPM0Ow0Yz0fBkIJTRryKQVwewdq6vqLVyeOa	2026-07-21 04:59:33.453+00	\N	2026-06-21 04:59:33.453986+00
8	2	$2b$10$r3UMEycYXCQiRr62.rs54eL.3w2Rl1pXHQOcuxrflcErQwvMi5zBi	2026-07-21 04:59:40.552+00	\N	2026-06-21 04:59:40.553162+00
11	7	$2b$10$RSccgfFOiPP1w2xQKwLs8ujE.BSfCHIJ3/Ww897Kng58Cr.UMWIR6	2026-07-21 06:49:59.553+00	\N	2026-06-21 06:49:59.554198+00
12	8	$2b$10$MKd8MzXpKPJ33gJhNCkTqeZmu08Rxs3/0ymTggxpSvGG6eVWguomq	2026-07-21 06:50:29.368+00	\N	2026-06-21 06:50:29.369327+00
13	7	$2b$10$raXaoPmZ6m8n25LXB9pm5.RM9dszwgseuq2LUQ5A.IFFOYuYOxX4y	2026-07-21 06:51:15.745+00	\N	2026-06-21 06:51:15.746509+00
14	9	$2b$10$D78iWQ7zor9zyaMArfE3QOlRwwfrC2E9iVotpixWqhipELA49g6Jy	2026-07-21 06:57:57.607+00	\N	2026-06-21 06:57:57.608389+00
15	1	$2b$10$vEZKxXBYlvu0yBeziGIpGO2w80njVIvN.0KNalR9U8xZBV3YQl95C	2026-07-21 07:03:49.599+00	\N	2026-06-21 07:03:49.600101+00
16	1	$2b$10$.RzOMrs84675xQ2fm9YSFO9Wr6PjBrK1mVPhGzQaRjhYzEjHrZfyq	2026-07-21 07:25:00.295+00	\N	2026-06-21 07:25:00.297256+00
18	1	$2b$10$92kLCr1DwqBUEB3NdzrBKOHn9yOimTbTOSIOGO8c9JdVP1WuYwZGq	2026-07-21 07:36:54.805+00	\N	2026-06-21 07:36:54.80689+00
19	1	$2b$10$MJ.6dYAd5daFksEdl9gfduFVbE8WTEuFtUza6rT3InGnlK3q3Yd7e	2026-07-21 07:43:27.887+00	\N	2026-06-21 07:43:27.888745+00
20	1	$2b$10$nUOXFJQUhF.A4/MfNZt4fu/Tekx0PgS2IMMQa10QcW9tekrx7NOI6	2026-07-21 07:43:59.901+00	\N	2026-06-21 07:43:59.902007+00
21	1	$2b$10$9qWFIqL3VSpycVmpaLIuNet6d4/PTuQfRm0Lm.V3TpJPkiVM6Faxy	2026-07-21 07:45:21.458+00	\N	2026-06-21 07:45:21.460228+00
22	10	$2b$10$D4MBOEKhm5rt5VKfHFHHtepwRAoaKuBjymmK2Vh0yMUZ9EfGlYxxa	2026-07-21 07:48:55.6+00	\N	2026-06-21 07:48:55.601402+00
23	1	$2b$10$KuVArX74w3nd30Tt3ZR7Xeao4ISlsfcljVeTJM2G.1MYhSZMBKOfK	2026-07-21 07:48:55.767+00	\N	2026-06-21 07:48:55.768293+00
25	1	$2b$10$llVzcY.butat6J6InXMUP.zYWQkmZ6qe5GTtCDjSQ/8y2sQ0pNwvy	2026-07-21 07:58:47.671+00	\N	2026-06-21 07:58:47.673073+00
27	1	$2b$10$t5.aQS.iLdJo7z8e81M46OhIm2oRfnlK7loYmyJv0b4UEvxTyKdiK	2026-07-21 08:06:44.711+00	\N	2026-06-21 08:06:44.713223+00
28	1	$2b$10$SQWVGg17B9EeRoeGj85d8u4Y5fx37ntA557h7i2WUfBQCaE3ha.uW	2026-07-21 08:09:52.75+00	\N	2026-06-21 08:09:52.752768+00
29	1	$2b$10$RYGz1lAIoJR83hv1cEtcFeZF.q8jKrYCXiVlrhWUF61wVMn5LDxee	2026-07-21 08:15:33.921+00	\N	2026-06-21 08:15:33.923059+00
30	11	$2b$10$fCwWHG3GkLTYRXky5RkotuVbpN7LAWwYQ.CgMVo9wbwVPfGSmghRC	2026-07-21 09:29:23.032+00	\N	2026-06-21 09:29:23.032932+00
31	12	$2b$10$D04g8/KAUMrFu1bRlRObPuIMOyJh2.QaCZwNBniCen2g7zHFHbhMO	2026-07-21 09:46:03.136+00	\N	2026-06-21 09:46:03.137342+00
32	13	$2b$10$APG.hnh1RZ1YTSbE0HTJwO3qus6TIat8RsvqYNPhtWHNkCW4AHMB6	2026-07-21 09:49:28.79+00	\N	2026-06-21 09:49:28.79082+00
33	14	$2b$10$hrqBEf07DZgB7J9EH7fqQuySoSMEhGqchz3Yp9PVAL4MVjaYnW1AC	2026-07-21 10:11:49.96+00	\N	2026-06-21 10:11:49.96152+00
35	16	$2b$10$cDBUsd25iyrjTDpakU.q/u324QsTTTcKghWBO9BDIqfxrCZjuDv/i	2026-07-21 10:36:10.121+00	\N	2026-06-21 10:36:10.121771+00
36	16	$2b$10$EYjV/E9EQgRGyDHx2LvhCOZhXfeFIbxQq9pbS65ZeU5VzmzsYC29O	2026-07-21 10:55:09.521+00	\N	2026-06-21 10:55:09.52239+00
43	1	$2b$10$73S0awIhrfwzhWYh1jlbhe/ZhR/4NmmLNRlMKSsDpON3V/FR/xvqq	2026-07-21 12:20:50.26+00	\N	2026-06-21 12:20:50.26089+00
44	1	$2b$10$GfC0Al9HkdKtlw5yunkV0e6A07LWezDQsuAK3P4CphtnfqGcU2c5W	2026-07-21 12:24:07.397+00	\N	2026-06-21 12:24:07.398951+00
48	1	$2b$10$8n/FVPKSH5oS8npGT1pSieL3gsF03VYiZqBtDqQwTuz95M6HydFfW	2026-07-21 13:07:48.633+00	\N	2026-06-21 13:07:48.634331+00
49	2	$2b$10$uXjDP83A7xBCjCWLObZ//./gN3grY3WvC9aBubXUq5h//aGOQgy6i	2026-07-21 13:07:49.416+00	\N	2026-06-21 13:07:49.416663+00
51	1	$2b$10$kAtcgpilQu.Jyg3KMAenoe6RX2.4hq8D2SfdaUQcCLYBvLiXqTPz6	2026-07-21 13:08:40.053+00	\N	2026-06-21 13:08:40.05389+00
52	2	$2b$10$H1QIpghyzgw9VzgkMP9LgOhcqH..2JqK.NBl//.CX946egc7TUe9q	2026-07-21 13:08:42.769+00	\N	2026-06-21 13:08:42.769587+00
53	1	$2b$10$xq1BLklIkGkGg9ZxPZlWpuRUjRnjNA1qFi6A2RJGEX1M5bnmDO5g6	2026-07-21 13:11:41.264+00	\N	2026-06-21 13:11:41.26567+00
54	1	$2b$10$7W80q89/z098XjoS//PJ3OlsZG/g/9uFw4lB9.xSDsx1IgSoh3WKq	2026-07-21 13:13:55.64+00	\N	2026-06-21 13:13:55.641217+00
34	15	$2b$10$LGLAa0Jz6wCuwz9sCPZi/u/2dPAEwLmJd2QG96jJquhnL7e/XYLgW	2026-07-21 10:35:48.851+00	2026-06-21 13:30:32.2+00	2026-06-21 10:35:48.852823+00
37	15	$2b$10$gLfhFdGgBo/YKWjR8nqNvOZ/43xZuP9omlb0MJHaUjWsYLLeqIIJS	2026-07-21 11:29:37.173+00	2026-06-21 13:30:32.2+00	2026-06-21 11:29:37.174845+00
38	15	$2b$10$bHITjR7J.pS7hNesSsLeFOr4EYcdMFiSp53/SfZNoQ6LE8ETvE0GG	2026-07-21 11:29:48.579+00	2026-06-21 13:30:32.2+00	2026-06-21 11:29:48.58063+00
39	15	$2b$10$vdYI/1iWVwF4v5tioL8//ekBSelwnNdvr4HTw9a2u647eUvY7N44q	2026-07-21 11:30:00.53+00	2026-06-21 13:30:32.2+00	2026-06-21 11:30:00.53074+00
42	15	$2b$10$DP6JtyY89sz5f9IdWcudfeG0tUICyBerwoTGq9y0anT1FZBRJ2iWa	2026-07-21 12:20:28.559+00	2026-06-21 13:30:32.2+00	2026-06-21 12:20:28.560494+00
45	15	$2b$10$v0SooBXTR1hL477/p.Xgp.Zb8UoAYM7AgKQ8ZrCBdYBvbzM10cW0u	2026-07-21 12:49:48.34+00	2026-06-21 13:30:32.2+00	2026-06-21 12:49:48.341857+00
46	15	$2b$10$7wJhQnURq0dgBds66FM1TuCD2KXVRQVI/9RSmJyG3j2UbOy.SxDYi	2026-07-21 12:49:59.871+00	2026-06-21 13:30:32.2+00	2026-06-21 12:49:59.871695+00
47	15	$2b$10$emNaw.m0fM0EObA0G2CXVuwFkBi8rNVu/RHq7txFQN.U9heqn.kFu	2026-07-21 13:04:37.245+00	2026-06-21 13:30:32.2+00	2026-06-21 13:04:37.247018+00
55	15	$2b$10$jLIg.WqG/6itO8hm2OR6..nrDPjjTE0m4U01baWY7am0gA7x39Kom	2026-07-21 13:24:43.038+00	2026-06-21 13:30:32.2+00	2026-06-21 13:24:43.038627+00
56	15	$2b$10$USn.Lg8OSBQ/0l7ysa5e5.aWpYyJ1/FR.JT2rkjNX5Ek2lCsKsgk6	2026-07-21 18:49:14.63+00	\N	2026-06-21 18:49:14.631788+00
5	5	$2b$10$NvjHxphQy/7KurGV3FG47.XiQMiPJM0oRB1699CeBEfrDRlGmpz2.	2026-07-21 04:55:38.927+00	2026-06-23 05:00:40.232+00	2026-06-21 04:55:38.928269+00
40	5	$2b$10$NvIyR.KVLQ5cuZGGhUx5ieU9G/F5e/4cEbL2ROOXkG2VUoSZpHW.O	2026-07-21 12:10:01.166+00	2026-06-23 05:00:40.232+00	2026-06-21 12:10:01.16783+00
41	17	$2b$10$bzwhMszoLuzEf3Z5tiwa9eewID0UT0vs9zGftZFcg5masR6UPcJZG	2026-07-21 12:14:56.247+00	2026-06-23 14:02:50.917+00	2026-06-21 12:14:56.248496+00
60	17	$2b$10$yZPLrQlGrhoB7ixEPKYySuL2IQV8YdB6BZpamVTAE4klHHHiLgWwK	2026-07-21 19:50:36.645+00	2026-06-23 14:02:50.917+00	2026-06-21 19:50:36.645699+00
58	18	$2b$10$VIvITpnbBZqAxSwMJmezbe9M7UcIxl2WEa.yjyKoA3MggH/gZKYqG	2026-07-21 19:42:48.307+00	2026-06-23 14:03:59.908+00	2026-06-21 19:42:48.308189+00
57	5	$2b$10$n60PLyb6WnTS69lVhd0sD.8mo95tV8gq15gwLHm/2RvRLioEeHZZS	2026-07-21 19:37:52.821+00	2026-06-23 05:00:40.232+00	2026-06-21 19:37:52.822758+00
61	5	$2b$10$0LZHLUmb3D9bOnDbPeo66eBZjgAbIZV4w7zG0T4e3RjW5XV9qQRGq	2026-07-21 19:53:25.703+00	2026-06-23 05:00:40.232+00	2026-06-21 19:53:25.70356+00
59	18	$2b$10$lawuZ2OOZa8s1wnlG9tLrOXqmfDs7Da8qELDeuj/Uz.yqDX2eQPr2	2026-07-21 19:44:00.288+00	2026-06-23 14:03:59.908+00	2026-06-21 19:44:00.289216+00
4	4	$2b$10$zVBVxVrEW/NdAOAIMOfvVOFqvofoV7/wjy0Gwo3V/nBWP/EXE6Wxu	2026-07-21 04:52:37.441+00	2026-06-23 04:45:18.665+00	2026-06-21 04:52:37.44505+00
9	4	$2b$10$hOD6OnzuNpG67gu86zUEVu8eavmAhgrgC7zU19q8JOx51tVGSYvwS	2026-07-21 05:04:48.99+00	2026-06-23 04:45:18.665+00	2026-06-21 05:04:48.990816+00
10	4	$2b$10$I960QascqJpyHShDrcMTn.uDoJ6G6simlXg.cnKDtbDnyU4fEt.92	2026-07-21 05:50:41.788+00	2026-06-23 04:45:18.665+00	2026-06-21 05:50:41.789448+00
17	4	$2b$10$rmCcp/eitMuyLcWqB.BVfeBGFJTIFgidykzhIV693mreEJCxsJ9O6	2026-07-21 07:25:35.455+00	2026-06-23 04:45:18.665+00	2026-06-21 07:25:35.455841+00
63	5	$2b$10$OoHzsDFvXyJ0S9tUGWliFOn2Z0kthKZDbQWfv293UZ2iIfYYR9pRa	2026-07-21 19:57:29.402+00	2026-06-23 05:00:40.232+00	2026-06-21 19:57:29.403377+00
62	18	$2b$10$XLI2HNeVUOJhvpnI78vbUudmRZKN9zLXMUaeeHpGrsPs7wfpzJ9IC	2026-07-21 19:54:28.404+00	2026-06-23 14:03:59.908+00	2026-06-21 19:54:28.405249+00
64	18	$2b$10$DPzAyCTkeXY.bi7UGSDEkexLSxjFfG4FHbWB6JnGo59c2ObaIQYBK	2026-07-21 19:58:09.103+00	2026-06-23 14:03:59.908+00	2026-06-21 19:58:09.104105+00
66	23	$2b$10$5I0B35SgiNNKcW06Ryuuwurs8FtBgZjzUVpzb38lIg9VOnQPer0yS	2026-07-21 20:05:26.786+00	2026-06-23 05:21:55.23+00	2026-06-21 20:05:26.786846+00
71	16	$2b$10$3XkTpbxPcxx8gJYlnttiZen33Hk8mrNUNFAeS2ly0zrnPsN8tkA2O	2026-07-21 21:07:27.522+00	\N	2026-06-21 21:07:27.524679+00
72	16	$2b$10$/7ER8S13DVAZDpuaeswGjOxBOB/dRE7l2eSJp8vCV2c6TeLj.cy4W	2026-07-22 02:59:11.447+00	\N	2026-06-22 02:59:11.448899+00
73	16	$2b$10$j.vNlxCij0bT3umyCVOmduYwcKhfDGQy/2mPqshOn84GJ4UfPvz6S	2026-07-22 02:59:19.734+00	\N	2026-06-22 02:59:19.735774+00
74	16	$2b$10$nBDgY2dKjSvmTdGA1oPn4uL2IajCNFVAMuA51hkY31BsugHYC8gHy	2026-07-22 02:59:35.585+00	\N	2026-06-22 02:59:35.586331+00
76	16	$2b$10$/U2PloEo.bAVNzlzStPgfObZDuYU3E.WiNsanSNBWz/7q3FFJpeRm	2026-07-22 02:59:46.998+00	\N	2026-06-22 02:59:46.99875+00
77	16	$2b$10$aTJjwlUtBSWoAZxjxrI.Uepdv6npeihA3.fk8IXmNVWmo64uoZnd2	2026-07-22 03:02:31.318+00	\N	2026-06-22 03:02:31.320624+00
78	16	$2b$10$KO/IuYjp6VzNC3GNJVa.hOyvbglXwaZ1KZQDNguqn9OUJ6PmDEAte	2026-07-22 03:07:16.416+00	\N	2026-06-22 03:07:16.417657+00
79	16	$2b$10$GIsVVpvkMHVEXpw06tiFDux.bRy4JNe/w6RTY/6EV3Oo.S0dZWjWm	2026-07-22 03:15:37.492+00	\N	2026-06-22 03:15:37.493928+00
80	16	$2b$10$iyG98wUZGZSt5gRsGC.S5eu6e4Yu0b.0mapLHPhkBPkFJvCABT0IK	2026-07-22 03:16:35.8+00	\N	2026-06-22 03:16:35.800957+00
81	16	$2b$10$FJHP2R6tpNGxWH0nWnyHNejwGsKb1/s71E2lfzwh5t2yEqM/CeUUu	2026-07-22 03:17:08.161+00	\N	2026-06-22 03:17:08.162763+00
82	2	$2b$10$9ZI69ZRVLO2scW6xlKsXJevgmTHW3hlWRIJOop77w.SufmgIfgoDC	2026-07-22 03:17:08.32+00	\N	2026-06-22 03:17:08.321536+00
83	16	$2b$10$cRTPbxXk0k61LvzHCoYXKeUx2BiytqTJ0O3jZrDs7Fbuq62L.Jwu6	2026-07-22 03:18:12.983+00	\N	2026-06-22 03:18:12.984442+00
84	16	$2b$10$RqJIwAtlXEThtkSSg9WXF.Lw0lLujU1YTvdMpiogsvbMsRTdSCcu2	2026-07-22 03:26:12.408+00	\N	2026-06-22 03:26:12.40918+00
85	2	$2b$10$SfFq26Kh5a1P.EG2hjbah.ZlyKp78wQcRcS0eLRgnM/VbJcQnJrVa	2026-07-22 03:26:12.615+00	\N	2026-06-22 03:26:12.616067+00
86	16	$2b$10$z.EiRBV3wQruC.nZS9QUQObBf2IYjCTZXBWDvc5zN3ePSB35VTPDm	2026-07-22 03:30:53.158+00	\N	2026-06-22 03:30:53.159807+00
87	16	$2b$10$CVTJIzQoUCSGNR/bD3V6mu7TrvRMI9PRRhLrmr1K0Qkr8faSnHCEC	2026-07-22 03:31:29.83+00	\N	2026-06-22 03:31:29.830867+00
88	2	$2b$10$/IxPwKgzRY04KHLXw3VW9.hFf32vnLHmIo5YIfeAty70tPRrGG9pS	2026-07-22 03:31:29.99+00	\N	2026-06-22 03:31:29.991212+00
89	16	$2b$10$fHVPn2ugrh/MmP61JASkTu.jPvw1uw7D4/HmuEwLRzDLjG5SVjabG	2026-07-22 03:31:51.528+00	\N	2026-06-22 03:31:51.529467+00
90	2	$2b$10$WqaRqeuW4XAUDCdIFpbZueXMvCS/TjRhhfpMgche4AsODckIKhwy.	2026-07-22 03:31:51.716+00	\N	2026-06-22 03:31:51.716803+00
95	2	$2b$10$9kWTHvsRfPYNRMoQEAmQg.fpovHcVkWILmK3mMLWNA0aZ.Sb0iudC	2026-07-22 04:37:17.524+00	\N	2026-06-22 04:37:17.526355+00
96	2	$2b$10$Kfy50HJN9Ct/eifFCUbgzu2tYNGp7/XZXslyIxta8eA2siyxa4I.K	2026-07-22 04:37:29.381+00	\N	2026-06-22 04:37:29.38203+00
97	2	$2b$10$RBl8.RiRlahmheNFxHSkluMl23avFYd6WDUo8qQQofLLjN92eDqi.	2026-07-22 04:37:42.903+00	\N	2026-06-22 04:37:42.90462+00
98	2	$2b$10$tHWnec9AlJsONzqpRnCVfOs2r9TN36kdpL7KDaldlPCEKZ/y023WW	2026-07-22 04:37:59.247+00	\N	2026-06-22 04:37:59.248317+00
100	2	$2b$10$mnHmTl97FfqxAq11vJyrRuwzyfq6WjSh6Pv9v9IpjAyj/jF9tDcRW	2026-07-22 04:40:02.361+00	\N	2026-06-22 04:40:02.363324+00
101	2	$2b$10$RhXyAfEcELTkhWMjRgQwLehSX/n4yCao4ia0/x0UiLmXjm6vi33.2	2026-07-22 04:46:08.792+00	\N	2026-06-22 04:46:08.793974+00
102	2	$2b$10$WYh9r51yERPqk7KZjUBekOCGI6HWmQguAVYPrMrpZx4lbmGIL1T1.	2026-07-22 05:21:21.266+00	\N	2026-06-22 05:21:21.267501+00
103	2	$2b$10$tIdwcwVrt.s6j8b6h8GX1ux1DOzrAxupb2bdRTmNLhUjT1BAhWbm2	2026-07-22 05:21:31.398+00	\N	2026-06-22 05:21:31.399881+00
104	16	$2b$10$X4G0T3XgtFx418E6wbysrO.RFnqwz9pBbZIlHkseEjPOAVLgmb6ti	2026-07-22 05:23:05.166+00	\N	2026-06-22 05:23:05.167503+00
105	3	$2b$10$Ovo8ObMKWOS/Zu9gIjQE7.i87EAfhU7Cxkkr1H8cLHHIXxp1PuWem	2026-07-22 05:23:05.495+00	\N	2026-06-22 05:23:05.49868+00
106	15	$2b$10$NCvv1TxFoWutWN9fG16X/u96zjes6tbf8EJTOf4r9JbXLu9UXkvxq	2026-07-22 05:23:05.953+00	\N	2026-06-22 05:23:05.954033+00
107	2	$2b$10$OAp4RsjUxvQI9SzxZU7hd.qb7Svz7Nh3ZrWibcQxQ/Cpf/PtyzKv6	2026-07-22 05:23:06.33+00	\N	2026-06-22 05:23:06.330842+00
108	3	$2b$10$cDuiooMUt.9Zw8RCkXXSQeNhvTJsKF1Pv2xIBHyBq6MY2zXv1RkhW	2026-07-22 05:23:46.297+00	\N	2026-06-22 05:23:46.297979+00
109	3	$2b$10$bp46g9zAAaNwF6BAzUjdMe9Z7ltM2W6ZChae8uv2EH7J63fyVHFFK	2026-07-22 05:28:42.34+00	\N	2026-06-22 05:28:42.341635+00
110	3	$2b$10$oqjeEr8RM1L4HJFJ0wSESuc1vnFyvPfCe0mX5LNRnXK50GpndKd9S	2026-07-22 05:29:07.473+00	\N	2026-06-22 05:29:07.474529+00
111	2	$2b$10$OtaMH/BllK1R8qflPk6jIOGGMEIfBOceXyOiQud.4xbwW2aJMt822	2026-07-22 05:54:37.466+00	\N	2026-06-22 05:54:37.467829+00
112	2	$2b$10$OXKI1mnBLW6mWBkvcq7bhuOPL41R4eZaU.q9iwWbRKna7Qath86ie	2026-07-22 05:55:10.732+00	\N	2026-06-22 05:55:10.733172+00
113	16	$2b$10$ZvCxgvZsYX6fy0sByogtVeezs08yEE90/BIvK5R3U6nz2Drd7M2Am	2026-07-22 05:55:11.333+00	\N	2026-06-22 05:55:11.333842+00
114	15	$2b$10$jEZfOhn80dYjdCb6fe50iur90W8vON.Nwv1FmfWuf44zsDAxCvDiS	2026-07-22 05:55:12.079+00	\N	2026-06-22 05:55:12.08092+00
115	3	$2b$10$EVqRRMmpjAhtwGbci7qaHeXwe2YmCsJsLPBR/oXCdqp2SjGfghbVi	2026-07-22 05:55:12.765+00	\N	2026-06-22 05:55:12.772549+00
116	2	$2b$10$SJXFg41pXGZQpieVuTesxOe6Og8S5b.ualmcM1N0/WgXeTZU1GwFm	2026-07-22 05:55:33.541+00	\N	2026-06-22 05:55:33.542287+00
117	15	$2b$10$3gM35OmAyuFjF623G.sELeS/Dh1ur1RbgjbdgYjUgZ8KC/.qzltOq	2026-07-22 05:55:33.792+00	\N	2026-06-22 05:55:33.793595+00
118	2	$2b$10$846APcJPxNpreQ7lmj3nneNXWMVEsXHrHTdddtPsC3RRk5AzPHUPy	2026-07-22 05:55:56.096+00	\N	2026-06-22 05:55:56.097727+00
119	15	$2b$10$PFjD/dtb0XYLh8VELKmdceYz95w0MHiK0LW1miJ8xrTiEiTA77ieS	2026-07-22 05:55:56.411+00	\N	2026-06-22 05:55:56.412132+00
120	2	$2b$10$yyQoxOw/mfKbKeZ0o0NcGeZfgAEOLu0yBt4NrhE5rlZ7Dd1Wp2P2W	2026-07-22 05:56:11.368+00	\N	2026-06-22 05:56:11.369006+00
121	15	$2b$10$ym2Cgi2DaUaa.EBQonp0Eu6vS0yMT3meTp8sslXAwGR.EUF5nE2q2	2026-07-22 05:56:11.626+00	\N	2026-06-22 05:56:11.627532+00
122	2	$2b$10$kmEtuHTwAxAc2Xof1HswN.fbs.Gh8h0a5NjX6G1p/ZooKJVKzcFsy	2026-07-22 06:02:19.625+00	\N	2026-06-22 06:02:19.627344+00
123	2	$2b$10$dAsBG6z4gg..APgWOTso8eJfMQeeRgU2mVIQEI4ck5AQ..EHc4MEi	2026-07-22 06:02:35.117+00	\N	2026-06-22 06:02:35.118494+00
124	2	$2b$10$u7nqZ/s7YFa3YiDzwZFn/elkAv1BJ8nNTXNKvTomc/1hc4ig/cEk.	2026-07-22 06:33:48.484+00	\N	2026-06-22 06:33:48.485848+00
125	2	$2b$10$kp4Q4gVgBQvWs4EWHXUX8OjWm/CpBXHz8cahlvGpvrtWyXfBbLgJm	2026-07-22 06:34:12.64+00	\N	2026-06-22 06:34:12.640785+00
126	15	$2b$10$dlJToPDV/65cCluS08YMTu3U7kGWAWNcCysSneLsvgolTpyFcyZbu	2026-07-22 06:34:19.887+00	\N	2026-06-22 06:34:19.888448+00
127	15	$2b$10$X4O662puIeyF1igzjg74O.DdQxJNkOpU4wnT/DCPkrIl1UTNoWOtO	2026-07-22 06:42:01.371+00	\N	2026-06-22 06:42:01.374789+00
128	2	$2b$10$LWOr7oh8SYLUT8BhKMwVZOK7Ey2D9owPEF10oZa1WNPpsr4YoamWO	2026-07-22 06:42:02.139+00	\N	2026-06-22 06:42:02.143519+00
129	16	$2b$10$GSzGx81vNS5h8kPCAZ4ExeKILd5shrQWolwkTY8VjT4xKYQMAomJi	2026-07-22 06:42:02.433+00	\N	2026-06-22 06:42:02.434786+00
130	15	$2b$10$nDh.ll4wbJb6/YUpxvk0he/SthyQlcrBwSnbCmsYbidwC76170LTW	2026-07-22 06:42:47.578+00	\N	2026-06-22 06:42:47.578888+00
131	15	$2b$10$5MQWdrY.YNaj5okoAqorP.07WRBpo9nqf4gNXagVbcjjkidtT0Pp2	2026-07-22 06:43:23.411+00	\N	2026-06-22 06:43:23.413883+00
132	15	$2b$10$BjYyiLOdXU0RzBgjVQVNw.91iG5g3gAYxlDamVOCXHgwEf8ko1sRC	2026-07-22 06:45:53.732+00	\N	2026-06-22 06:45:53.735506+00
133	2	$2b$10$gKPNWZe5bfKIN8baitP/UOQsCyDrmxeXBmvrX7Y4nGW3OpXTx3JoG	2026-07-22 06:45:54.029+00	\N	2026-06-22 06:45:54.031564+00
70	5	$2b$10$5Grg25zZ0b5VurmQ7PgGGe65foUS3q6AnPIq7dB2uxdqOFZlKAEpK	2026-07-21 20:48:57.581+00	2026-06-23 05:00:40.232+00	2026-06-21 20:48:57.582888+00
65	18	$2b$10$Rsz/0XeXENJIAGaEpqMNcOoLy5cknMi8aZQBic6XknKiISN1SK2Fm	2026-07-21 20:01:55.139+00	2026-06-23 14:03:59.908+00	2026-06-21 20:01:55.140165+00
91	5	$2b$10$vagSeOeAMLSicG1uafYsv.knuL1zoYg7td4vhyMkCDruphAcD5VRW	2026-07-22 03:43:56.325+00	2026-06-23 05:00:40.232+00	2026-06-22 03:43:56.326463+00
92	5	$2b$10$qGHaA4AvynASfLtVQKtX2.GwTJbANaSA7.PvNM9lGdG7t48Xc4xqq	2026-07-22 03:47:47.642+00	2026-06-23 05:00:40.232+00	2026-06-22 03:47:47.643848+00
93	5	$2b$10$y2D..1OjqIyg6xLF8J2PM.lnPlxQrPWVmM.6aQkvut8iM/VFmEWki	2026-07-22 03:53:57.654+00	2026-06-23 05:00:40.232+00	2026-06-22 03:53:57.655443+00
134	15	$2b$10$uqssDepDwOFy8eMSjyiWCu4AtvLrLo9YqvZ5mnpZaYwNmpk1cflTa	2026-07-22 06:47:16.566+00	\N	2026-06-22 06:47:16.568737+00
135	15	$2b$10$7xLgi5hbO/LDuAyeVOeteOl3rSefcae1e0/X23npdY5seNNJhR9eG	2026-07-22 06:48:27.127+00	\N	2026-06-22 06:48:27.128495+00
136	15	$2b$10$o9r7Ofk/UnUIYUrpA1xVpeR42cAJzMBImCZny1wFvEVP1JWT4kQXi	2026-07-22 06:49:27.566+00	\N	2026-06-22 06:49:27.568222+00
137	15	$2b$10$pzHzuj8hLx/AlzfCjiWGmuffLyIoKaWJ6H36fitK5jFdfnFFCdrcy	2026-07-22 06:50:11.809+00	\N	2026-06-22 06:50:11.80995+00
138	15	$2b$10$m7F4LC6ne/iJDpJce793bubCdB23eSZVW79uTVas1TZCmtkFk2tqe	2026-07-22 06:52:12.842+00	\N	2026-06-22 06:52:12.844852+00
139	15	$2b$10$g41/vn3nVXFGnlXIopwNleRvvFOoLbMxI0/hCTaVNMYPZoMdcAW6.	2026-07-22 06:52:30.418+00	\N	2026-06-22 06:52:30.419335+00
140	2	$2b$10$iRIKb6vWLi88IV7epQ3tK.uTDtQzPGhVwVjeYqUdhUVD.AzdRDtyi	2026-07-22 06:52:30.631+00	\N	2026-06-22 06:52:30.632543+00
141	16	$2b$10$8BRKQ08P9oiyXNNJW57DU.kpvJxM.6J1B/zgPey9uJ1u0iPhdr1re	2026-07-22 06:52:30.844+00	\N	2026-06-22 06:52:30.845352+00
142	15	$2b$10$LgkB2cqZGLtbeVJyGQsfr.tBXq4dYqGWHQ/C7yIdlBWAiz.y.SnwG	2026-07-22 06:52:48.407+00	\N	2026-06-22 06:52:48.408654+00
143	16	$2b$10$o6Bg9ZSWCARnP2bdex5ObeWEZkjhoN3N0vA9qnMKM5feRZrk33KiC	2026-07-22 06:53:06.665+00	\N	2026-06-22 06:53:06.666369+00
144	15	$2b$10$s8Oksi58oBySYQCPw2MlLO02xhEEdedYssz2CGfxpSCBfuyN6OULW	2026-07-22 06:54:07.574+00	\N	2026-06-22 06:54:07.575735+00
145	2	$2b$10$EqpZEGxZc2ZFjvaENptXzeTykG4/.KYWjvMSiOOHOLjz8CgISKv8y	2026-07-22 07:02:57.054+00	\N	2026-06-22 07:02:57.056206+00
146	2	$2b$10$H3dOwG1Uhz/dm/XFcKzCruVL7CbwUPV/Qt/nzW2LvdqRNwAbKs2Nm	2026-07-22 07:03:07.471+00	\N	2026-06-22 07:03:07.472567+00
147	15	$2b$10$ig6JXhWMOs3yPgUd02IkmupBlZz1kfx9FbNIQcwPdNe/vjWV6ImRa	2026-07-22 07:03:27.847+00	\N	2026-06-22 07:03:27.848517+00
148	15	$2b$10$vcANSTRNEB5Yeavq2/Hw9ebKb3G3GzCaYDn2nuCUO3pYyp8EvoN1m	2026-07-22 07:03:57.07+00	\N	2026-06-22 07:03:57.071267+00
149	2	$2b$10$N.u5bz/1.KLs20h3mr8SpOmfy07uSKX.0mNw.xSrRaJPBsU9r3Q.K	2026-07-22 07:10:25.746+00	\N	2026-06-22 07:10:25.748116+00
150	2	$2b$10$/IcM14U0Xgze.AXBFxw6y.2Oi0V7uhrbLbolaUYP.SArFuaDyFC62	2026-07-22 07:10:48.141+00	\N	2026-06-22 07:10:48.142534+00
152	2	$2b$10$fjzKHqMeIDaALkFEdTCgVuMuqs0Q4zOJ.60VhiVqrjYVtv.r9agqa	2026-07-22 07:19:40.907+00	\N	2026-06-22 07:19:40.908015+00
154	16	$2b$10$jz7b8.60iQxrDV9PriscfuKVFJsTgehR/RGsVWXXBRU63OyiyM.8q	2026-07-22 07:20:28.733+00	\N	2026-06-22 07:20:28.734106+00
155	24	$2b$10$5fn/n0qk8Pt.FS3gK28mjem4em0gPWitabOFW9UzrwCpz1piDwnaS	2026-07-22 07:20:59.854+00	\N	2026-06-22 07:20:59.855347+00
156	25	$2b$10$oiW9Div0xLv0.B/2llHI8udCqizqnKUQ6l8YD8mP1tMBIizm.Povm	2026-07-22 07:21:14.221+00	\N	2026-06-22 07:21:14.221815+00
157	15	$2b$10$LgpDiWYOiwlGwW0gyBtQfeIHvIN7Mm.ed9OJsdNk9rV9PmgNgBS6.	2026-07-22 07:21:23.804+00	\N	2026-06-22 07:21:23.805494+00
158	2	$2b$10$ilaZO3widN183Fbeyg9SIO4cwKLmmF3G2w.3Y2jnIeYC8WyX/o8lm	2026-07-22 07:22:32.399+00	\N	2026-06-22 07:22:32.399756+00
159	25	$2b$10$RgiGptRpvHVBNdPZ5pnpMedYMDwspaRBjrtKL5gL9dni5UH4rwj1y	2026-07-22 07:22:32.567+00	\N	2026-06-22 07:22:32.568315+00
160	2	$2b$10$vjqKCTxpI8hl/Wi92T0xluTsgrEX.HIZb0VI0V1N/TtYOCj.O2bFa	2026-07-22 07:23:01.33+00	\N	2026-06-22 07:23:01.330967+00
161	15	$2b$10$ZLdjiuk1/Xp1amRSX3hWkuevLbEYgN44NbscL4LdkOYceUgMl4lBS	2026-07-22 07:25:13.969+00	\N	2026-06-22 07:25:13.970234+00
162	2	$2b$10$aSU.ri7.HsmMmlmvjSCqq.BGKQ7lYhFIi/puARggU.37eVNVRiP5a	2026-07-22 07:25:14.145+00	\N	2026-06-22 07:25:14.146471+00
163	15	$2b$10$AcENuk9RCz9eRr.zxQpKeeZ93D1NJQdiNaiGqo6zRfePRE42QP4oa	2026-07-22 07:25:55.625+00	\N	2026-06-22 07:25:55.625974+00
164	2	$2b$10$kRMGb4WErDSMlP2KOb5CeenGnM84AI2aBAXrIcHonh.5hPC41vTnW	2026-07-22 07:25:55.792+00	\N	2026-06-22 07:25:55.792536+00
67	18	$2b$10$SLU3oMnRuVtrpEBxlCcy6OJ20wwFiBoJzxwszezCKEm0OzclBgYQ.	2026-07-21 20:39:04.88+00	2026-06-23 14:03:59.908+00	2026-06-21 20:39:04.881686+00
166	15	$2b$10$IB3V6xu3lEHzbkamyzhNteohu2Ve6krakZaqp29eyyUHeZ6gA3daK	2026-07-22 07:28:09.16+00	\N	2026-06-22 07:28:09.161569+00
167	15	$2b$10$892P.N7cFIcXL2tgMLyfQ.MyqazkBTG71w8zBhHWTj2rdXR/5SkE6	2026-07-22 07:30:25.021+00	\N	2026-06-22 07:30:25.022066+00
168	15	$2b$10$BsMNyc6qNT2jWrpHPtFfW.f0y/ycr08q1PDlqwwjp1eR3R93ZlaKy	2026-07-22 07:31:44.216+00	\N	2026-06-22 07:31:44.217567+00
169	2	$2b$10$b0JPMOWuD76MSElGfOwdTOxkNomgV89keal4VTv54/dXu8hCp70wi	2026-07-22 07:31:44.436+00	\N	2026-06-22 07:31:44.436726+00
170	15	$2b$10$f50npQv1dpaBZqPvYsaRPuM2/4ZahJ3NsfLnHyxVVKRq7RnlFZH02	2026-07-22 08:02:26.351+00	\N	2026-06-22 08:02:26.352316+00
171	15	$2b$10$WgfBRytzHi8Xs0J8xhY8GuZmWMYnIS/aKP6KENjO0CAISkxyr7iNK	2026-07-22 08:02:38.272+00	\N	2026-06-22 08:02:38.272672+00
172	15	$2b$10$eUaxx4r1yhv9IlzINi9/tOzjOinahr83HQXzb3traiQ9Zco5UDUTG	2026-07-22 08:02:50.088+00	\N	2026-06-22 08:02:50.089673+00
173	2	$2b$10$w/qr0dBX1z/g3vEeH4UgYebKr4LE23jESsuVZmog7UHI3oV4FBtP6	2026-07-22 08:02:50.865+00	\N	2026-06-22 08:02:50.866569+00
174	15	$2b$10$Ei4QHX/bvK.LZcpG2FmvTu7dyxX.wT4oLc13LEPx.NrAnn48fbxUW	2026-07-22 08:07:44.693+00	\N	2026-06-22 08:07:44.694774+00
175	2	$2b$10$6nfvtqUlTUJitFLkEdi/BOqgzCcGBKqXIqdaDOAsJ.E4J5Qn2E8R2	2026-07-22 08:10:27.121+00	\N	2026-06-22 08:10:27.122173+00
176	2	$2b$10$G0fSEq1yRlMfVo4rsAqvoua1gsfX8DTm6sT/U/1ldLLIKrR/0ApbS	2026-07-22 08:12:08.334+00	\N	2026-06-22 08:12:08.335587+00
177	15	$2b$10$aG1d9Nc3bXorgJrS36D8Xehalwsx1UInaLGlcdm1zrh/OSAK/ppAG	2026-07-22 08:22:55.477+00	\N	2026-06-22 08:22:55.478331+00
178	2	$2b$10$t9kgs5tS1yMP0IlqpDqe.ect9tst1xtwXHhUwcUoCzqDpECYYBte6	2026-07-22 08:23:08.104+00	\N	2026-06-22 08:23:08.10584+00
179	15	$2b$10$ycG7ESiCaErKQ6pkm5i/Z.bHK.hmIPVLnuleCJEStKD65m.WjaI92	2026-07-22 13:53:59.346+00	\N	2026-06-22 13:53:59.347562+00
180	15	$2b$10$7zexF74tNIkvsdNICKP.LOR1cpdZkDvNx7HO/AUls3EZ8ObeZqnuO	2026-07-22 14:00:32.207+00	\N	2026-06-22 14:00:32.2088+00
181	15	$2b$10$oAE9ZzvMvJwyclb5kX7k7.b3SrJPmCTbbqUqF2X7vcLhCC1GBK95C	2026-07-22 14:16:06.964+00	\N	2026-06-22 14:16:06.965121+00
182	15	$2b$10$mzC0d4ceXkZSKZOexLf9t.J0LCpsdSAtpPdbKEXrk6lNDBEp69W9e	2026-07-22 14:19:14.218+00	\N	2026-06-22 14:19:14.219575+00
183	15	$2b$10$HUqdlUIOWTvRxurl9aEmdOY4qdnOGAT528ucHwWWuYHLSSqVfoqEq	2026-07-22 14:29:12.136+00	\N	2026-06-22 14:29:12.14257+00
185	1	$2b$10$avVKtSQgWYQnzY8Y8cLtgOIUDuCzUWJu32iXn4YhUsu5YbAsp7fYS	2026-07-23 04:17:27.553+00	\N	2026-06-23 04:17:27.554432+00
24	4	$2b$10$p5WJBRx9zbuVaLugN3Iuy.K6NYuCeuiKwvj8OklAAGcoraPAXrnQO	2026-07-21 07:48:55.907+00	2026-06-23 04:45:18.665+00	2026-06-21 07:48:55.908368+00
26	4	$2b$10$dqewsbvDac5yT9nWXhuSLO9/2iLtLPVRrRnX.HLxbYmPF1besD1EW	2026-07-21 07:58:47.942+00	2026-06-23 04:45:18.665+00	2026-06-21 07:58:47.943723+00
50	4	$2b$10$Dy38Vt.uuxy7FbJPeZCML.J4X5zROutm1BxSQdJwErCANJt6JFgIy	2026-07-21 13:07:50.146+00	2026-06-23 04:45:18.665+00	2026-06-21 13:07:50.146994+00
153	4	$2b$10$uKHP5FxgbAm7vV2QmiK9geyPLQX35NLR2NYJSGybBJ/dmag.U7W2.	2026-07-22 07:20:22.933+00	2026-06-23 04:45:18.665+00	2026-06-22 07:20:22.934093+00
186	4	$2b$10$qJPxz371h31TvRQ06GUwVeAkIz6M64XrZn/jReDxOf8nSZ0tEPcbq	2026-07-23 04:40:12.999+00	2026-06-23 04:45:18.665+00	2026-06-23 04:40:12.999686+00
68	18	$2b$10$MSOCnd8CKrJL5LjiNOuv2e4H7N2NQoMcqUo/7LOvbUlcYfeQX2HHW	2026-07-21 20:39:13.584+00	2026-06-23 14:03:59.908+00	2026-06-21 20:39:13.585319+00
69	18	$2b$10$UNNP3kPrtSYuwzXV6csb.uZXtc.qoVyJ1/jBvpRO4251cyMvxGdTu	2026-07-21 20:39:21.867+00	2026-06-23 14:03:59.908+00	2026-06-21 20:39:21.868639+00
75	18	$2b$10$2uJ8j9LCRy2C5Km0KBA96ee6tVUNSz9kL0MYFfQDeObV9cfQFvm7W	2026-07-22 02:59:36.162+00	2026-06-23 14:03:59.908+00	2026-06-22 02:59:36.162949+00
151	18	$2b$10$8AXVf5amqEkPopKxDWb7Wue6VEo357LvbZrdNnHJ8aJOHPx1FHfne	2026-07-22 07:16:29.847+00	2026-06-23 14:03:59.908+00	2026-06-22 07:16:29.847954+00
165	18	$2b$10$RFNOixG39xpU/JuQRn2cKu6l58xUfYark0y7FRRUNZg7t512qVN1u	2026-07-22 07:26:46.864+00	2026-06-23 14:03:59.908+00	2026-06-22 07:26:46.865946+00
184	18	$2b$10$ZVSDMEM45NtNMW235tvPKegDHmLqg5JKcBaeSUKO/qR7Bk.HrdnbW	2026-07-23 04:09:55.848+00	2026-06-23 14:03:59.908+00	2026-06-23 04:09:55.849825+00
94	5	$2b$10$/7eejEikVr44h5mHMjC1TemIemWZR4ErDTYVEzYPD8OZFliyGK0G6	2026-07-22 03:54:36.659+00	2026-06-23 05:00:40.232+00	2026-06-22 03:54:36.660354+00
99	5	$2b$10$9glnXQ3bZJuYoTGEeBebleOwXr51a.P3O.Gr2amWo2HHV2GFWKLKW	2026-07-22 04:37:59.866+00	2026-06-23 05:00:40.232+00	2026-06-22 04:37:59.867005+00
190	5	$2b$10$/Der0s20pc6aUcagVI2uHebDbLNjq5fIfI6XeUIve07dHRcnB4jR.	2026-07-23 04:59:35.328+00	2026-06-23 05:00:40.232+00	2026-06-23 04:59:35.328576+00
188	23	$2b$10$X7NpY5l6SYpbd3eEATmn9uQBOdzhwhFOgDle.9dATn4pRhFOgHl.u	2026-07-23 04:49:09.317+00	2026-06-23 05:21:55.23+00	2026-06-23 04:49:09.318481+00
189	23	$2b$10$zGxtH0TW.BB94DQogOx2Bum7o091o4biDTRncia5wcXz3XYdavXeG	2026-07-23 04:57:38.765+00	2026-06-23 05:21:55.23+00	2026-06-23 04:57:38.765981+00
193	23	$2b$10$UrxKKUZ22iOqWpe8JuwFWeqSZW8EoRfI/apE6SI2JjxLTfaF3blzu	2026-07-23 05:10:55.674+00	2026-06-23 05:21:55.23+00	2026-06-23 05:10:55.67503+00
195	23	$2b$10$boiFhOcEkCkghdULZx6jw.O4vJ0nCdesnlHqAlaz5EYgT.1BdEE7y	2026-07-23 05:34:28.289+00	\N	2026-06-23 05:34:28.289487+00
196	26	$2b$10$5lHQz4iSLFH8U7y.sR4TieGg3CbQ4mHv0sIL6.IXvLiqHABYRX.4q	2026-07-23 06:58:16.273+00	\N	2026-06-23 06:58:16.273811+00
197	26	$2b$10$H6nCSBeyggFD43/EuO2Zb.zDfHlxKozSBIK/nQfJfXL0FZ0GNkBby	2026-07-23 07:14:15.487+00	\N	2026-06-23 07:14:15.488279+00
198	26	$2b$10$c355sNNBcyfw.hbb9bSvGOy/KBJh9NTrTpchr/y4xju9H4j9P5hHm	2026-07-23 08:20:21.045+00	\N	2026-06-23 08:20:21.046568+00
199	26	$2b$10$a8sxELBzfvlJoyOL7uYN1OKjIlEb8nBtyXY16ANAKXVbg0dnmnDoq	2026-07-23 08:43:52.282+00	\N	2026-06-23 08:43:52.282915+00
200	26	$2b$10$G9kx9jAz2UIeWgqkiAKbAu26KYuqOSati1Bn3a//Z69ZagzdoZD32	2026-07-23 08:59:26.739+00	\N	2026-06-23 08:59:26.739644+00
201	26	$2b$10$cZvH3bS963xNgv2agycvJuyrxmMpt3d6dcWskscBabWQiSUg6Afyu	2026-07-23 09:42:45.119+00	\N	2026-06-23 09:42:45.120364+00
202	26	$2b$10$G8V9GFZgFm38/a0m6PKLlOMNlvSLgUQiPx64OWDk6qhCC7fEKPa92	2026-07-23 09:55:24.368+00	\N	2026-06-23 09:55:24.368794+00
203	26	$2b$10$mx/YujeGYkkzvalpD1dhVugNcLo04gZFgX98AzdrsykJ.63U4zhbq	2026-07-23 11:48:38.897+00	\N	2026-06-23 11:48:38.898122+00
204	26	$2b$10$UEXojif4Yol3MILGFy1CE.TIdevi0m1dFhSPjqFs1x58aJeZB9Qou	2026-07-23 12:16:28.852+00	\N	2026-06-23 12:16:28.853229+00
205	15	$2b$10$QR.TgsIHp4vDMstApOwFCenbTFTRZOsvjxhvzxuhg7OA52YkuWnGu	2026-07-23 13:35:33.371+00	\N	2026-06-23 13:35:33.372251+00
206	15	$2b$10$pjNUyJUhBFievW0wP/w9zOETKsU27ODGFX6M5AkLW1dJR6doik1GW	2026-07-23 13:35:43.833+00	\N	2026-06-23 13:35:43.834097+00
207	15	$2b$10$FPxD6SeAwTToc0bIabl6O.kKau2BIic5h8OMOvkPvLK0dG8BXO/mK	2026-07-23 13:43:43.125+00	\N	2026-06-23 13:43:43.126504+00
208	15	$2b$10$Xi5oGazfGVF6HWt.RMAxNOJtMbBRu5cNbc5OHC45rdoHTEpuVv.um	2026-07-23 13:43:53.854+00	\N	2026-06-23 13:43:53.855487+00
209	15	$2b$10$PpknsZdSVTMxeM11gIe.CO4sj0Yj6q.9DNnKAXhVuyCv707J3pUoa	2026-07-23 13:48:03.575+00	\N	2026-06-23 13:48:03.576714+00
210	2	$2b$10$1wBh2tCrh7IouW2GQACs6.4grGZnGwV4WEpevSjROybnaaZjpJJGe	2026-07-23 13:48:13.748+00	\N	2026-06-23 13:48:13.749686+00
211	15	$2b$10$WuFGmpS7xgVXwjFcADq6u.O2FlzbBvc0svtmkmx.HhrNo3lKFQJe.	2026-07-23 13:48:23.883+00	\N	2026-06-23 13:48:23.883751+00
212	15	$2b$10$Kc/MSUDbDANg/Z1cC8LLYOd1KhJVfcFvy87dPv6e6zuM4caXReZhK	2026-07-23 13:52:46.2+00	\N	2026-06-23 13:52:46.201245+00
213	15	$2b$10$B.YZL3VA08h985dTgLeNruCYzEQz3jEaBYfNuaHLVl3COiSDxAt.S	2026-07-23 13:52:56.474+00	\N	2026-06-23 13:52:56.475517+00
215	27	$2b$10$3o48rfvgcWVX9wYxuMnaUuft2o1JH4HmElkKZyf3hI1V91AVN/84e	2026-07-23 13:59:44.717+00	2026-06-23 14:00:14.7+00	2026-06-23 13:59:44.71776+00
192	17	$2b$10$NgEBfHjUZgmsDfQM3ZKAh.e8MW5D0S/tVZ1pvraVcCoULPyXH9YyS	2026-07-23 05:05:42.697+00	2026-06-23 14:02:50.917+00	2026-06-23 05:05:42.698004+00
216	17	$2b$10$o28Xk.Odv.jkLdds./f1CeFuajSty6DobN6HGtHOq039SoMud3Ovi	2026-07-23 14:00:34.318+00	2026-06-23 14:02:50.917+00	2026-06-23 14:00:34.319461+00
217	17	$2b$10$/jH7rvAVQXcqOAEwe3/Oa.tdGVszC1Ewm0Jp.VNF638br5Hl0VhfG	2026-07-23 14:02:23.778+00	2026-06-23 14:02:50.917+00	2026-06-23 14:02:23.779245+00
187	18	$2b$10$0a6jRUPcU0xOEJ7fCPraZeVr1kAD5r8rUasCV2kqsG8gxi0ixv5Ru	2026-07-23 04:47:33.434+00	2026-06-23 14:03:59.908+00	2026-06-23 04:47:33.435156+00
191	18	$2b$10$7Su5N6.BbbjCt.F7Tg/bkegG69icyAfKM2bXakT7IAgZf0mA2RobS	2026-07-23 05:02:49.305+00	2026-06-23 14:03:59.908+00	2026-06-23 05:02:49.306144+00
194	18	$2b$10$f08bD0t493pVyAuzc2oAGOsnyNfByNzprzRKypHTyXsAB2vZMOnFm	2026-07-23 05:22:18.013+00	2026-06-23 14:03:59.908+00	2026-06-23 05:22:18.01414+00
214	18	$2b$10$xqFhf4M7K.OR57XGSRl6XulX/3jeta.W3pqQCnZcVO7udm3BW.DHi	2026-07-23 13:56:45.008+00	2026-06-23 14:03:59.908+00	2026-06-23 13:56:45.009205+00
218	18	$2b$10$M7j5eC3R3AZPIquOJIp4QurOuCm90tZhQKjHogLIjq/h4eq.lL4MO	2026-07-23 14:03:12.899+00	2026-06-23 14:03:59.908+00	2026-06-23 14:03:12.900299+00
219	23	$2b$10$D6ZJ5b.fbu6Saao5fYpti.Ap..x5nYb94if3bTTfRUNnFlngst3QG	2026-07-23 14:04:34.756+00	\N	2026-06-23 14:04:34.757136+00
220	18	$2b$10$.ps/YeGd3S3j8dkpTGa/r.XqXsPVY9bGloGl/YReqYleekkdSE3S6	2026-07-23 14:23:48.63+00	\N	2026-06-23 14:23:48.631231+00
221	26	$2b$10$aVoMF56IzxPQmbhjVyxD8.0t0K/pQv7KMYIsehBwG8Az697645ZLa	2026-07-24 03:23:54.559+00	\N	2026-06-24 03:23:54.560339+00
\.


--
-- Data for Name: retention_policies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.retention_policies (id, entity_type, retention_days, legal_basis, description, created_at, updated_at) FROM stdin;
1	audit_logs	1095	DPDP Act 2023 — accountability	Security & compliance audit trail (DPDP Act 2023 accountability)	2026-06-22 07:55:30.501157+00	2026-06-22 07:55:30.501157+00
2	consent_history	2555	DPDP Act 2023 §6 — proof of consent	Consent records retention (DPDP Act 2023 §6 proof of consent)	2026-06-22 07:55:30.501157+00	2026-06-22 07:55:30.501157+00
3	data_download_requests	90	DPDP Act 2023 — data minimisation	Fulfilled data-access request cleanup	2026-06-22 07:55:30.501157+00	2026-06-22 07:55:30.501157+00
4	notifications	180	DPDP Act 2023 — data minimisation	Operational notification cleanup	2026-06-22 07:55:30.501157+00	2026-06-22 07:55:30.501157+00
5	refresh_tokens	30	DPDP Act 2023 — storage limitation	Expired session token cleanup	2026-06-22 07:55:30.501157+00	2026-06-22 07:55:30.501157+00
6	inactive_accounts	1095	DPDP Act 2023 §8(7) — storage limitation	Account dormancy review (preview only)	2026-06-22 07:55:30.501157+00	2026-06-22 07:55:30.501157+00
\.


--
-- Data for Name: retention_purge_runs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.retention_purge_runs (id, trigger, triggered_by, dry_run, status, summary, total_deleted, error, started_at, completed_at) FROM stdin;
\.


--
-- Data for Name: round_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.round_schedules (id, round_id, drive_id, student_id, slot_start, slot_end, venue, meeting_url, status, result, attendance, score, feedback, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sandbox_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sandbox_sessions (id, user_id, lab_id, session_token, container_name, status, ip_address, port, expires_at, terminated_at, created_at) FROM stdin;
\.


--
-- Data for Name: saved_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.saved_jobs (id, student_id, job_id, created_at) FROM stdin;
2	1	5	2026-06-21 13:11:41.471598+00
\.


--
-- Data for Name: student_declarations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_declarations (id, student_id, declaration_id, signed_at, ip_address, created_at) FROM stdin;
\.


--
-- Data for Name: student_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_profiles (id, user_id, college, graduation_year, city, linkedin_url, github_url, resume_url, "current_role", bio, created_at, updated_at, portfolio_url, twitter_url) FROM stdin;
1	1	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-20 14:40:24.383218+00	2026-06-20 14:40:24.383218+00	\N	\N
2	2	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-21 04:47:19.516548+00	2026-06-21 04:47:19.516548+00	\N	\N
3	4	Nehru College of Management	2027	\N	\N	\N	\N	\N	\N	2026-06-21 04:52:33.323166+00	2026-06-21 04:52:33.323166+00	\N	\N
4	6	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-21 04:59:25.660209+00	2026-06-21 04:59:25.660209+00	\N	\N
5	7	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-21 06:49:59.440287+00	2026-06-21 06:49:59.440287+00	\N	\N
6	8	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-21 06:50:29.273969+00	2026-06-21 06:50:29.273969+00	\N	\N
7	9	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-21 06:57:57.49545+00	2026-06-21 06:57:57.49545+00	\N	\N
8	10	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-21 07:48:55.4859+00	2026-06-21 07:48:55.4859+00	\N	\N
9	11	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-21 09:29:22.674521+00	2026-06-21 09:29:22.674521+00	\N	\N
10	12	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-21 09:46:02.979135+00	2026-06-21 09:46:02.979135+00	\N	\N
11	13	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-21 09:49:28.612437+00	2026-06-21 09:49:28.612437+00	\N	\N
12	14	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-21 10:11:49.794512+00	2026-06-21 10:11:49.794512+00	\N	\N
13	26	Anna University	2026	\N	www.linkedin.com/in/logeshwaran-b-9a9610256	https://github.com/logeshwaranb74	https://drive.google.com/file/d/1GEbC8mHszxNlEmS2knrZlVLSStRzhsPa/view?usp=sharing	\N	\N	2026-06-23 06:57:34.963162+00	2026-06-23 09:47:23.245+00		
14	27	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-23 13:59:44.636738+00	2026-06-23 13:59:44.636738+00	\N	\N
\.


--
-- Data for Name: student_tpo_map; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_tpo_map (id, tpo_id, student_id, institution, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscriptions (id, user_id, plan, status, start_date, end_date, payment_gateway, external_sub_id, created_at, updated_at, trial_ends_at, auto_renew, coupon_code, referral_code, canceled_at) FROM stdin;
1	1	premium_vapt	active	2026-06-21 12:24:07.551+00	2027-06-21 12:24:07.551+00	manual	\N	2026-06-21 12:20:52.902662+00	2026-06-21 12:24:07.555+00	2026-07-06 12:20:52.901+00	f	\N	\N	\N
\.


--
-- Data for Name: support_ticket_replies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_ticket_replies (id, ticket_id, author_id, message, attachments, created_at) FROM stdin;
1	1	15	Looking into it now, please try restarting the session.	[]	2026-06-22 05:55:56.669164+00
\.


--
-- Data for Name: support_tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_tickets (id, ticket_uid, category, priority, subject, description, status, attachments, created_by, assigned_to, created_at, updated_at, closed_at) FROM stdin;
1	b920c9d6-a3a7-41f0-9e2e-cec348be8c72	technical	high	Lab sandbox will not start	My VAPT lab sandbox is stuck on starting for 10 minutes.	resolved	[]	2	15	2026-06-22 05:55:33.86884+00	2026-06-22 05:55:56.776+00	2026-06-22 05:55:56.776+00
2	2789b8a6-3343-4db8-aa3f-fc800c7f08d3	technical	medium	LK test	No issues	open	[]	23	\N	2026-06-23 05:19:15.235539+00	2026-06-23 05:19:15.235539+00	\N
\.


--
-- Data for Name: tpo_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tpo_profiles (id, user_id, institution, institution_code, designation, created_at, updated_at, approval_status, reviewed_by, reviewed_at, rejection_reason) FROM stdin;
2	5	Nuhru college	\N	Wordpress developer 	2026-06-21 04:55:34.543596+00	2026-06-21 13:28:33.805+00	approved	15	2026-06-21 13:28:33.805+00	\N
1	3	IIT Delhi	\N	TPO Head	2026-06-21 04:47:20.811802+00	2026-06-21 04:47:20.811802+00	approved	\N	\N	\N
\.


--
-- Data for Name: tracks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tracks (id, name, slug, domain, description, difficulty, duration_weeks, total_modules, enrolled_count, icon_url, accent_color, is_active, created_at, updated_at) FROM stdin;
3	GRC Specialist	grc-specialist	grc	Governance, Risk and Compliance: ISO 27001, NIST frameworks, risk assessments, audit management, and regulatory compliance for enterprise cybersecurity.	beginner	12	6	987	\N	#10B981	t	2026-06-19 20:46:18.149941+00	2026-06-19 20:46:18.149941+00
4	AI Security Engineer	ai-security	ai_security	Secure AI/ML systems: adversarial attacks, model poisoning, LLM security, prompt injection defense, and AI governance frameworks.	advanced	18	9	643	\N	#8B5CF6	t	2026-06-19 20:46:19.852405+00	2026-06-19 20:46:19.852405+00
5	Cloud Security Architect	cloud-security	cloud_security	Secure cloud infrastructure across AWS, Azure, and GCP: IAM hardening, container security, DevSecOps pipelines, and cloud-native threat detection.	intermediate	14	7	1156	\N	#0EA5E9	t	2026-06-19 20:46:21.762695+00	2026-06-19 20:46:21.762695+00
6	Digital Forensics	digital-forensics	forensics	Digital forensics and incident response: evidence collection, memory forensics, malware analysis, disk imaging, and chain of custody procedures.	intermediate	16	8	712	\N	#EC4899	t	2026-06-19 20:46:23.646577+00	2026-06-19 20:46:23.646577+00
2	VAPT Professional	vapt-professional	vapt	Learn Vulnerability Assessment and Penetration Testing: web app hacking, network pentesting, exploit development, and red team methodologies.	intermediate	20	10	1927	\N	#F97316	t	2026-06-19 20:46:16.448916+00	2026-06-23 06:58:31.702+00
1	SOC Analyst	soc-analyst	soc	Master Security Operations Center skills: threat detection, SIEM platforms, incident response, and blue team operations. Become the defender organizations need.	beginner	16	8	2845	\N	#2563EB	t	2026-06-19 20:46:14.640116+00	2026-06-23 13:59:54.971+00
\.


--
-- Data for Name: user_lesson_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_lesson_notes (id, user_id, lesson_id, content, created_at, updated_at) FROM stdin;
1	1	34	my note	2026-06-21 07:25:00.376872+00	2026-06-21 07:25:00.376872+00
\.


--
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_preferences (id, user_id, theme, created_at, updated_at, email_notifications, push_notifications, marketing_emails, weekly_digest, profile_visible, show_on_leaderboard) FROM stdin;
4	16	dark	2026-06-21 21:09:11.31162+00	2026-06-21 21:09:12.166+00	t	t	f	t	t	t
6	2	system	2026-06-22 04:37:29.692665+00	2026-06-22 04:37:29.692665+00	t	f	f	t	t	f
9	4	system	2026-06-22 07:26:16.07467+00	2026-06-22 07:26:18.784+00	t	t	f	t	t	t
1	18	light	2026-06-21 19:47:14.664703+00	2026-06-22 07:26:56.417+00	t	t	f	t	t	t
13	26	dark	2026-06-23 07:03:55.198873+00	2026-06-23 07:03:57.028+00	t	t	f	t	t	t
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, phone, full_name, role, onboarding_step, selected_track_id, avatar_url, is_active, last_login_at, created_at, updated_at, password_hash, career_track) FROM stdin;
6	flowtest@example.com	\N	Flow Test	student	track_selection	\N	\N	t	2026-06-21 04:59:25.786+00	2026-06-21 04:59:25.653317+00	2026-06-21 04:59:26.029+00	$2b$10$ZhoNRqjv7OnPMbS4TdF3geFbe.MJjjgGou4GiadjxFlGHJyhgR40u	\N
16	test.mentor@futrsec.dev	\N	Test Mentor	mentor	complete	\N	\N	t	2026-06-22 07:20:28.737+00	2026-06-21 10:35:58.175175+00	2026-06-22 07:20:28.737+00	$2b$10$4blGQ1hhbED.dbsCZZngpuShPTj4gXNpaIIZwhT4/4iS4Qvwtxg7K	soc
27	futrsec@.bcbuzz.org	\N	\N	student	pre_assessment	1	\N	t	\N	2026-06-23 13:59:44.628809+00	2026-06-23 13:59:54.966+00	\N	soc
24	test.tpo@futrsec.dev	\N	Test TPO	tpo	consent	\N	\N	t	2026-06-22 07:20:59.873+00	2026-06-22 07:17:02.426803+00	2026-06-22 07:20:59.873+00	$2b$10$X2Jvoo2yqzuNQSOKOQ1c1ugzyl1T23Hkg0381ftPBJWzTz7MFTgRm	\N
17	futrsec@bcbuzz.io	6378786976	Kannan  l	employer	complete	\N	\N	t	2026-06-23 14:02:23.792+00	2026-06-21 12:14:50.472448+00	2026-06-23 14:02:23.792+00	$2b$10$DSOwBY2ejwz3XMu8ygCwz.YU941aW5Rv4VRvoqgVMFiRtMZVsK9au	\N
25	test.employer@futrsec.dev	\N	Test Employer	employer	consent	\N	\N	t	2026-06-22 07:22:32.577+00	2026-06-22 07:17:02.426803+00	2026-06-22 07:22:32.577+00	$2b$10$X2Jvoo2yqzuNQSOKOQ1c1ugzyl1T23Hkg0381ftPBJWzTz7MFTgRm	\N
23	futrsec@bcbuzz.org	8789367482	Kannan Loganathan	mentor	complete	\N	\N	t	2026-06-23 14:04:34.677+00	2026-06-21 20:04:43.359708+00	2026-06-23 14:04:34.677+00	\N	soc
18	kannan.dev@bcbuzz.tech	\N	Kannan (Admin)	admin	complete	\N	\N	t	2026-06-23 14:23:48.716+00	2026-06-21 19:42:35.702331+00	2026-06-23 14:23:48.716+00	$2b$10$81..JEnhu1xAne9eRVVvy.6gABNs/StVWWHJWQ4m97q7BD80psuHO	\N
26	logeshwaranb74@gmail.com	+916381954503	logesh B	student	complete	2	\N	t	2026-06-24 03:23:54.6+00	2026-06-23 06:57:34.606901+00	2026-06-24 03:23:54.601+00	$2b$10$mGIrYA8cf98uLZyNTyLRfegCzF3.Ba3Wv5O8SeLoDCPJJVV0/NcJ2	vapt
3	priya@iit.ac.in	+919876543210	Priya Sharma	tpo	consent	\N	\N	t	2026-06-22 05:55:12.795+00	2026-06-21 04:47:20.808192+00	2026-06-22 05:55:12.795+00	$2b$10$4blGQ1hhbED.dbsCZZngpuShPTj4gXNpaIIZwhT4/4iS4Qvwtxg7K	\N
1	kannalogan4390@gmail.com	\N	\N	student	complete	2	\N	t	2026-06-23 04:17:27.39+00	2026-06-20 14:40:24.373786+00	2026-06-23 04:22:03.795+00	\N	vapt
10	rbactest_1782028135274@example.com	\N	\N	student	consent	\N	\N	t	\N	2026-06-21 07:48:55.448226+00	2026-06-21 07:48:55.448226+00	\N	\N
4	kannalogan4390@icloud.com	+919790640591	kannan l	student	complete	1	\N	t	2026-06-23 04:40:13.027+00	2026-06-21 04:52:33.284939+00	2026-06-23 04:41:26.969+00	$2b$10$a7bo2cec4UEWhxUqfTbvOu.xaoxkihKaZKbNWTnA./DoehuBP2VIK	\N
2	test.student@example.com	\N	Test Student	student	track_selection	\N	\N	t	2026-06-23 13:48:13.755+00	2026-06-21 04:47:19.50544+00	2026-06-23 13:48:13.755+00	$2b$10$X2Jvoo2yqzuNQSOKOQ1c1ugzyl1T23Hkg0381ftPBJWzTz7MFTgRm	soc
11	aitest1782034161@futrsec.dev	\N	AI Test	student	consent	\N	\N	t	2026-06-21 09:29:22.952+00	2026-06-21 09:29:22.356787+00	2026-06-21 09:29:22.953+00	$2b$10$2GM3WDhbhvL2m4kmTQTs1OUCqfc7ZLwxjNmh2jzCdR7OCpUQ0bcXi	\N
12	pt4_1782035162@futrsec.test	\N	\N	student	consent	\N	\N	t	\N	2026-06-21 09:46:02.816399+00	2026-06-21 09:46:02.816399+00	\N	\N
13	pt4b_1782035368@futrsec.test	\N	\N	student	consent	\N	\N	t	\N	2026-06-21 09:49:28.50714+00	2026-06-21 09:49:28.50714+00	\N	\N
14	pt4test_1782036708@futrsec.test	\N	\N	student	consent	\N	\N	t	\N	2026-06-21 10:11:49.533327+00	2026-06-21 10:11:49.533327+00	\N	\N
5	kannan@cyberxpertz.org	6379703524	kannan lk	tpo	complete	\N	\N	t	2026-06-23 04:59:35.364+00	2026-06-21 04:55:34.510167+00	2026-06-23 04:59:35.364+00	$2b$10$U9LGGq6M5OPl5tJzm8vqNe6PY1jClcP/AHYr9AOsduiiDqgKQZxEK	\N
15	test.admin@futrsec.dev	\N	Test Admin	admin	complete	\N	\N	t	2026-06-23 13:52:56.479+00	2026-06-21 10:35:04.896277+00	2026-06-23 13:52:56.479+00	$2b$10$4blGQ1hhbED.dbsCZZngpuShPTj4gXNpaIIZwhT4/4iS4Qvwtxg7K	\N
19	futrsec@bcbuzz.tech	8879102756	Kannan Mentor	mentor	complete	\N	\N	t	\N	2026-06-21 20:00:03.095943+00	2026-06-21 20:00:03.095943+00	\N	soc
\.


--
-- Name: ai_career_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_career_reports_id_seq', 2, true);


--
-- Name: ai_feature_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_feature_config_id_seq', 1, false);


--
-- Name: ai_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_history_id_seq', 14, true);


--
-- Name: ai_interviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_interviews_id_seq', 8, true);


--
-- Name: ai_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_reports_id_seq', 6, true);


--
-- Name: ai_resume_analysis_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_resume_analysis_id_seq', 1, false);


--
-- Name: ai_skill_gap_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_skill_gap_reports_id_seq', 2, true);


--
-- Name: application_status_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.application_status_history_id_seq', 1, false);


--
-- Name: assessment_answers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.assessment_answers_id_seq', 50, true);


--
-- Name: assessment_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.assessment_attempts_id_seq', 5, true);


--
-- Name: assessment_options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.assessment_options_id_seq', 59, true);


--
-- Name: assessment_questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.assessment_questions_id_seq', 16, true);


--
-- Name: assessment_results_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.assessment_results_id_seq', 5, true);


--
-- Name: assessments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.assessments_id_seq', 5, true);


--
-- Name: assignment_submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.assignment_submissions_id_seq', 1, false);


--
-- Name: assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.assignments_id_seq', 1, false);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 301, true);


--
-- Name: auto_apply_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auto_apply_settings_id_seq', 1, false);


--
-- Name: batch_students_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.batch_students_id_seq', 2, true);


--
-- Name: batches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.batches_id_seq', 1, true);


--
-- Name: broadcast_notes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.broadcast_notes_id_seq', 1, true);


--
-- Name: broadcast_recipients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.broadcast_recipients_id_seq', 1, false);


--
-- Name: campus_drive_registrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.campus_drive_registrations_id_seq', 1, false);


--
-- Name: campus_drives_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.campus_drives_id_seq', 1, false);


--
-- Name: certificate_auto_issue_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.certificate_auto_issue_config_id_seq', 3, true);


--
-- Name: certificate_generation_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.certificate_generation_jobs_id_seq', 35, true);


--
-- Name: certificate_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.certificate_templates_id_seq', 1, false);


--
-- Name: certificates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.certificates_id_seq', 22198, true);


--
-- Name: checkpoint_progress_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.checkpoint_progress_id_seq', 1, false);


--
-- Name: checkpoints_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.checkpoints_id_seq', 15, true);


--
-- Name: community_post_likes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.community_post_likes_id_seq', 4, true);


--
-- Name: community_posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.community_posts_id_seq', 1, true);


--
-- Name: consent_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.consent_history_id_seq', 40, true);


--
-- Name: consent_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.consent_logs_id_seq', 12, true);


--
-- Name: coupons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.coupons_id_seq', 1, true);


--
-- Name: data_correction_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.data_correction_requests_id_seq', 1, false);


--
-- Name: data_delete_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.data_delete_requests_id_seq', 1, false);


--
-- Name: data_download_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.data_download_requests_id_seq', 2, true);


--
-- Name: declarations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.declarations_id_seq', 1, false);


--
-- Name: discussion_comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.discussion_comments_id_seq', 1, true);


--
-- Name: discussion_likes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.discussion_likes_id_seq', 1, true);


--
-- Name: discussion_posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.discussion_posts_id_seq', 1, true);


--
-- Name: drive_invites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.drive_invites_id_seq', 1, false);


--
-- Name: drive_rounds_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.drive_rounds_id_seq', 1, true);


--
-- Name: email_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.email_logs_id_seq', 5, true);


--
-- Name: employers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.employers_id_seq', 3, true);


--
-- Name: event_registrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.event_registrations_id_seq', 1, false);


--
-- Name: events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.events_id_seq', 1, false);


--
-- Name: files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.files_id_seq', 21, true);


--
-- Name: fts_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fts_history_id_seq', 5, true);


--
-- Name: fts_scores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fts_scores_id_seq', 3, true);


--
-- Name: interviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.interviews_id_seq', 1, false);


--
-- Name: invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.invoices_id_seq', 1, true);


--
-- Name: job_applications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.job_applications_id_seq', 7, true);


--
-- Name: job_matches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.job_matches_id_seq', 9, true);


--
-- Name: job_shortlists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.job_shortlists_id_seq', 1, false);


--
-- Name: job_skills_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.job_skills_id_seq', 59, true);


--
-- Name: jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.jobs_id_seq', 13, true);


--
-- Name: lab_assets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lab_assets_id_seq', 1, false);


--
-- Name: lab_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lab_assignments_id_seq', 1, false);


--
-- Name: lab_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lab_attempts_id_seq', 3, true);


--
-- Name: lab_hints_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lab_hints_id_seq', 1, false);


--
-- Name: lab_module_completions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lab_module_completions_id_seq', 4, true);


--
-- Name: lab_modules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lab_modules_id_seq', 36, true);


--
-- Name: lab_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lab_reports_id_seq', 1, true);


--
-- Name: lab_versions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lab_versions_id_seq', 1, false);


--
-- Name: labs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.labs_id_seq', 11, true);


--
-- Name: learning_modules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.learning_modules_id_seq', 19, true);


--
-- Name: lesson_bookmarks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lesson_bookmarks_id_seq', 1, false);


--
-- Name: lesson_notes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lesson_notes_id_seq', 19, true);


--
-- Name: lesson_pdfs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lesson_pdfs_id_seq', 1, false);


--
-- Name: lesson_progress_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lesson_progress_id_seq', 10, true);


--
-- Name: lesson_quiz_questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lesson_quiz_questions_id_seq', 40, true);


--
-- Name: lesson_quizzes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lesson_quizzes_id_seq', 5, true);


--
-- Name: lesson_resources_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lesson_resources_id_seq', 250, true);


--
-- Name: lesson_video_progress_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lesson_video_progress_id_seq', 1, true);


--
-- Name: lesson_videos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lesson_videos_id_seq', 46, true);


--
-- Name: lessons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lessons_id_seq', 83, true);


--
-- Name: mentor_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mentor_profiles_id_seq', 3, true);


--
-- Name: mentor_students_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mentor_students_id_seq', 6, true);


--
-- Name: mentor_task_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mentor_task_assignments_id_seq', 6, true);


--
-- Name: mentor_task_batches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mentor_task_batches_id_seq', 1, true);


--
-- Name: mentor_tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mentor_tasks_id_seq', 5, true);


--
-- Name: mock_interview_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mock_interview_assignments_id_seq', 2, true);


--
-- Name: mock_interview_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mock_interview_templates_id_seq', 3, true);


--
-- Name: module_enrollments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.module_enrollments_id_seq', 3, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 22, true);


--
-- Name: offers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.offers_id_seq', 1, false);


--
-- Name: payment_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_transactions_id_seq', 1, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 1, true);


--
-- Name: placement_drives_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.placement_drives_id_seq', 2, true);


--
-- Name: placements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.placements_id_seq', 1, false);


--
-- Name: platform_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.platform_settings_id_seq', 1, false);


--
-- Name: question_bank_batches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.question_bank_batches_id_seq', 1, false);


--
-- Name: question_bank_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.question_bank_id_seq', 7, true);


--
-- Name: question_bank_options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.question_bank_options_id_seq', 26, true);


--
-- Name: question_bank_versions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.question_bank_versions_id_seq', 7, true);


--
-- Name: quiz_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.quiz_attempts_id_seq', 2, true);


--
-- Name: referrals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.referrals_id_seq', 1, false);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 221, true);


--
-- Name: retention_policies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.retention_policies_id_seq', 108, true);


--
-- Name: retention_purge_runs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.retention_purge_runs_id_seq', 1, false);


--
-- Name: round_schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.round_schedules_id_seq', 1, false);


--
-- Name: sandbox_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sandbox_sessions_id_seq', 1, false);


--
-- Name: saved_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.saved_jobs_id_seq', 2, true);


--
-- Name: student_declarations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_declarations_id_seq', 1, false);


--
-- Name: student_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_profiles_id_seq', 14, true);


--
-- Name: student_tpo_map_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_tpo_map_id_seq', 1, false);


--
-- Name: subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subscriptions_id_seq', 1, true);


--
-- Name: support_ticket_replies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.support_ticket_replies_id_seq', 1, true);


--
-- Name: support_tickets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.support_tickets_id_seq', 2, true);


--
-- Name: tpo_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tpo_profiles_id_seq', 2, true);


--
-- Name: tracks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tracks_id_seq', 6, true);


--
-- Name: user_lesson_notes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_lesson_notes_id_seq', 1, true);


--
-- Name: user_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_preferences_id_seq', 14, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 27, true);


--
-- Name: ai_career_reports ai_career_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_career_reports
    ADD CONSTRAINT ai_career_reports_pkey PRIMARY KEY (id);


--
-- Name: ai_feature_config ai_feature_config_feature_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_feature_config
    ADD CONSTRAINT ai_feature_config_feature_unique UNIQUE (feature);


--
-- Name: ai_feature_config ai_feature_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_feature_config
    ADD CONSTRAINT ai_feature_config_pkey PRIMARY KEY (id);


--
-- Name: ai_history ai_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_history
    ADD CONSTRAINT ai_history_pkey PRIMARY KEY (id);


--
-- Name: ai_interviews ai_interviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_interviews
    ADD CONSTRAINT ai_interviews_pkey PRIMARY KEY (id);


--
-- Name: ai_reports ai_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_reports
    ADD CONSTRAINT ai_reports_pkey PRIMARY KEY (id);


--
-- Name: ai_resume_analysis ai_resume_analysis_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_resume_analysis
    ADD CONSTRAINT ai_resume_analysis_pkey PRIMARY KEY (id);


--
-- Name: ai_skill_gap_reports ai_skill_gap_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_skill_gap_reports
    ADD CONSTRAINT ai_skill_gap_reports_pkey PRIMARY KEY (id);


--
-- Name: application_status_history application_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_status_history
    ADD CONSTRAINT application_status_history_pkey PRIMARY KEY (id);


--
-- Name: assessment_answers assessment_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_answers
    ADD CONSTRAINT assessment_answers_pkey PRIMARY KEY (id);


--
-- Name: assessment_attempts assessment_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_attempts
    ADD CONSTRAINT assessment_attempts_pkey PRIMARY KEY (id);


--
-- Name: assessment_options assessment_options_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_options
    ADD CONSTRAINT assessment_options_pkey PRIMARY KEY (id);


--
-- Name: assessment_questions assessment_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_questions
    ADD CONSTRAINT assessment_questions_pkey PRIMARY KEY (id);


--
-- Name: assessment_results assessment_results_attempt_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_results
    ADD CONSTRAINT assessment_results_attempt_id_unique UNIQUE (attempt_id);


--
-- Name: assessment_results assessment_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_results
    ADD CONSTRAINT assessment_results_pkey PRIMARY KEY (id);


--
-- Name: assessments assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);


--
-- Name: assignment_submissions assignment_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_pkey PRIMARY KEY (id);


--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: auto_apply_settings auto_apply_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auto_apply_settings
    ADD CONSTRAINT auto_apply_settings_pkey PRIMARY KEY (id);


--
-- Name: batch_students batch_students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batch_students
    ADD CONSTRAINT batch_students_pkey PRIMARY KEY (id);


--
-- Name: batches batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_pkey PRIMARY KEY (id);


--
-- Name: broadcast_notes broadcast_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_notes
    ADD CONSTRAINT broadcast_notes_pkey PRIMARY KEY (id);


--
-- Name: broadcast_recipients broadcast_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_recipients
    ADD CONSTRAINT broadcast_recipients_pkey PRIMARY KEY (id);


--
-- Name: campus_drive_registrations campus_drive_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campus_drive_registrations
    ADD CONSTRAINT campus_drive_registrations_pkey PRIMARY KEY (id);


--
-- Name: campus_drives campus_drives_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campus_drives
    ADD CONSTRAINT campus_drives_pkey PRIMARY KEY (id);


--
-- Name: certificate_auto_issue_config certificate_auto_issue_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificate_auto_issue_config
    ADD CONSTRAINT certificate_auto_issue_config_pkey PRIMARY KEY (id);


--
-- Name: certificate_generation_jobs certificate_generation_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificate_generation_jobs
    ADD CONSTRAINT certificate_generation_jobs_pkey PRIMARY KEY (id);


--
-- Name: certificate_templates certificate_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificate_templates
    ADD CONSTRAINT certificate_templates_pkey PRIMARY KEY (id);


--
-- Name: certificates certificates_certificate_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_certificate_code_unique UNIQUE (certificate_code);


--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);


--
-- Name: certificates certificates_verify_token_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_verify_token_unique UNIQUE (verify_token);


--
-- Name: checkpoint_progress checkpoint_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checkpoint_progress
    ADD CONSTRAINT checkpoint_progress_pkey PRIMARY KEY (id);


--
-- Name: checkpoints checkpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checkpoints
    ADD CONSTRAINT checkpoints_pkey PRIMARY KEY (id);


--
-- Name: community_post_likes community_post_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_post_likes
    ADD CONSTRAINT community_post_likes_pkey PRIMARY KEY (id);


--
-- Name: community_posts community_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_pkey PRIMARY KEY (id);


--
-- Name: consent_history consent_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consent_history
    ADD CONSTRAINT consent_history_pkey PRIMARY KEY (id);


--
-- Name: consent_logs consent_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consent_logs
    ADD CONSTRAINT consent_logs_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_unique UNIQUE (code);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: data_correction_requests data_correction_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_correction_requests
    ADD CONSTRAINT data_correction_requests_pkey PRIMARY KEY (id);


--
-- Name: data_delete_requests data_delete_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_delete_requests
    ADD CONSTRAINT data_delete_requests_pkey PRIMARY KEY (id);


--
-- Name: data_download_requests data_download_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_download_requests
    ADD CONSTRAINT data_download_requests_pkey PRIMARY KEY (id);


--
-- Name: declarations declarations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.declarations
    ADD CONSTRAINT declarations_pkey PRIMARY KEY (id);


--
-- Name: discussion_comments discussion_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discussion_comments
    ADD CONSTRAINT discussion_comments_pkey PRIMARY KEY (id);


--
-- Name: discussion_likes discussion_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discussion_likes
    ADD CONSTRAINT discussion_likes_pkey PRIMARY KEY (id);


--
-- Name: discussion_posts discussion_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discussion_posts
    ADD CONSTRAINT discussion_posts_pkey PRIMARY KEY (id);


--
-- Name: drive_invites drive_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drive_invites
    ADD CONSTRAINT drive_invites_pkey PRIMARY KEY (id);


--
-- Name: drive_rounds drive_rounds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drive_rounds
    ADD CONSTRAINT drive_rounds_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: employers employers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employers
    ADD CONSTRAINT employers_pkey PRIMARY KEY (id);


--
-- Name: employers employers_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employers
    ADD CONSTRAINT employers_user_id_unique UNIQUE (user_id);


--
-- Name: event_registrations event_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: file_quotas file_quotas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_quotas
    ADD CONSTRAINT file_quotas_pkey PRIMARY KEY (user_id);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: fts_history fts_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fts_history
    ADD CONSTRAINT fts_history_pkey PRIMARY KEY (id);


--
-- Name: fts_scores fts_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fts_scores
    ADD CONSTRAINT fts_scores_pkey PRIMARY KEY (id);


--
-- Name: fts_scores fts_scores_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fts_scores
    ADD CONSTRAINT fts_scores_user_id_unique UNIQUE (user_id);


--
-- Name: interviews interviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: job_applications job_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_applications
    ADD CONSTRAINT job_applications_pkey PRIMARY KEY (id);


--
-- Name: job_matches job_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_matches
    ADD CONSTRAINT job_matches_pkey PRIMARY KEY (id);


--
-- Name: job_shortlists job_shortlists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_shortlists
    ADD CONSTRAINT job_shortlists_pkey PRIMARY KEY (id);


--
-- Name: job_skills job_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_skills
    ADD CONSTRAINT job_skills_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: lab_assets lab_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_assets
    ADD CONSTRAINT lab_assets_pkey PRIMARY KEY (id);


--
-- Name: lab_assignments lab_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_assignments
    ADD CONSTRAINT lab_assignments_pkey PRIMARY KEY (id);


--
-- Name: lab_attempts lab_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_attempts
    ADD CONSTRAINT lab_attempts_pkey PRIMARY KEY (id);


--
-- Name: lab_hints lab_hints_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_hints
    ADD CONSTRAINT lab_hints_pkey PRIMARY KEY (id);


--
-- Name: lab_module_completions lab_module_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_module_completions
    ADD CONSTRAINT lab_module_completions_pkey PRIMARY KEY (id);


--
-- Name: lab_modules lab_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_modules
    ADD CONSTRAINT lab_modules_pkey PRIMARY KEY (id);


--
-- Name: lab_reports lab_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_reports
    ADD CONSTRAINT lab_reports_pkey PRIMARY KEY (id);


--
-- Name: lab_versions lab_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_versions
    ADD CONSTRAINT lab_versions_pkey PRIMARY KEY (id);


--
-- Name: labs labs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.labs
    ADD CONSTRAINT labs_pkey PRIMARY KEY (id);


--
-- Name: labs labs_slug_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.labs
    ADD CONSTRAINT labs_slug_unique UNIQUE (slug);


--
-- Name: learning_modules learning_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.learning_modules
    ADD CONSTRAINT learning_modules_pkey PRIMARY KEY (id);


--
-- Name: lesson_bookmarks lesson_bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_bookmarks
    ADD CONSTRAINT lesson_bookmarks_pkey PRIMARY KEY (id);


--
-- Name: lesson_notes lesson_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_notes
    ADD CONSTRAINT lesson_notes_pkey PRIMARY KEY (id);


--
-- Name: lesson_pdfs lesson_pdfs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_pdfs
    ADD CONSTRAINT lesson_pdfs_pkey PRIMARY KEY (id);


--
-- Name: lesson_progress lesson_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_pkey PRIMARY KEY (id);


--
-- Name: lesson_quiz_questions lesson_quiz_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_quiz_questions
    ADD CONSTRAINT lesson_quiz_questions_pkey PRIMARY KEY (id);


--
-- Name: lesson_quizzes lesson_quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_quizzes
    ADD CONSTRAINT lesson_quizzes_pkey PRIMARY KEY (id);


--
-- Name: lesson_resources lesson_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_resources
    ADD CONSTRAINT lesson_resources_pkey PRIMARY KEY (id);


--
-- Name: lesson_video_progress lesson_video_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_video_progress
    ADD CONSTRAINT lesson_video_progress_pkey PRIMARY KEY (id);


--
-- Name: lesson_videos lesson_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_videos
    ADD CONSTRAINT lesson_videos_pkey PRIMARY KEY (id);


--
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- Name: mentor_profiles mentor_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_profiles
    ADD CONSTRAINT mentor_profiles_pkey PRIMARY KEY (id);


--
-- Name: mentor_profiles mentor_profiles_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_profiles
    ADD CONSTRAINT mentor_profiles_user_id_unique UNIQUE (user_id);


--
-- Name: mentor_students mentor_students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_students
    ADD CONSTRAINT mentor_students_pkey PRIMARY KEY (id);


--
-- Name: mentor_task_assignments mentor_task_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_task_assignments
    ADD CONSTRAINT mentor_task_assignments_pkey PRIMARY KEY (id);


--
-- Name: mentor_task_batches mentor_task_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_task_batches
    ADD CONSTRAINT mentor_task_batches_pkey PRIMARY KEY (id);


--
-- Name: mentor_tasks mentor_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_tasks
    ADD CONSTRAINT mentor_tasks_pkey PRIMARY KEY (id);


--
-- Name: mock_interview_assignments mock_interview_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mock_interview_assignments
    ADD CONSTRAINT mock_interview_assignments_pkey PRIMARY KEY (id);


--
-- Name: mock_interview_templates mock_interview_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mock_interview_templates
    ADD CONSTRAINT mock_interview_templates_pkey PRIMARY KEY (id);


--
-- Name: module_enrollments module_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_enrollments
    ADD CONSTRAINT module_enrollments_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: offers offers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: placement_drives placement_drives_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.placement_drives
    ADD CONSTRAINT placement_drives_pkey PRIMARY KEY (id);


--
-- Name: placements placements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.placements
    ADD CONSTRAINT placements_pkey PRIMARY KEY (id);


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);


--
-- Name: question_bank_batches question_bank_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank_batches
    ADD CONSTRAINT question_bank_batches_pkey PRIMARY KEY (id);


--
-- Name: question_bank_options question_bank_options_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank_options
    ADD CONSTRAINT question_bank_options_pkey PRIMARY KEY (id);


--
-- Name: question_bank question_bank_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_pkey PRIMARY KEY (id);


--
-- Name: question_bank_versions question_bank_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank_versions
    ADD CONSTRAINT question_bank_versions_pkey PRIMARY KEY (id);


--
-- Name: quiz_attempts quiz_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_hash_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_unique UNIQUE (token_hash);


--
-- Name: retention_policies retention_policies_entity_type_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retention_policies
    ADD CONSTRAINT retention_policies_entity_type_unique UNIQUE (entity_type);


--
-- Name: retention_policies retention_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retention_policies
    ADD CONSTRAINT retention_policies_pkey PRIMARY KEY (id);


--
-- Name: retention_purge_runs retention_purge_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retention_purge_runs
    ADD CONSTRAINT retention_purge_runs_pkey PRIMARY KEY (id);


--
-- Name: round_schedules round_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.round_schedules
    ADD CONSTRAINT round_schedules_pkey PRIMARY KEY (id);


--
-- Name: sandbox_sessions sandbox_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sandbox_sessions
    ADD CONSTRAINT sandbox_sessions_pkey PRIMARY KEY (id);


--
-- Name: sandbox_sessions sandbox_sessions_session_token_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sandbox_sessions
    ADD CONSTRAINT sandbox_sessions_session_token_unique UNIQUE (session_token);


--
-- Name: saved_jobs saved_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_jobs
    ADD CONSTRAINT saved_jobs_pkey PRIMARY KEY (id);


--
-- Name: student_declarations student_declarations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_declarations
    ADD CONSTRAINT student_declarations_pkey PRIMARY KEY (id);


--
-- Name: student_profiles student_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_pkey PRIMARY KEY (id);


--
-- Name: student_profiles student_profiles_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_user_id_unique UNIQUE (user_id);


--
-- Name: student_tpo_map student_tpo_map_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_tpo_map
    ADD CONSTRAINT student_tpo_map_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: support_ticket_replies support_ticket_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_ticket_replies
    ADD CONSTRAINT support_ticket_replies_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_ticket_uid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_ticket_uid_unique UNIQUE (ticket_uid);


--
-- Name: tpo_profiles tpo_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tpo_profiles
    ADD CONSTRAINT tpo_profiles_pkey PRIMARY KEY (id);


--
-- Name: tpo_profiles tpo_profiles_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tpo_profiles
    ADD CONSTRAINT tpo_profiles_user_id_unique UNIQUE (user_id);


--
-- Name: tracks tracks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT tracks_pkey PRIMARY KEY (id);


--
-- Name: tracks tracks_slug_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tracks
    ADD CONSTRAINT tracks_slug_unique UNIQUE (slug);


--
-- Name: user_lesson_notes user_lesson_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_lesson_notes
    ADD CONSTRAINT user_lesson_notes_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_unique UNIQUE (user_id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_phone_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_unique UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: cert_auto_issue_source_uq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX cert_auto_issue_source_uq ON public.certificate_auto_issue_config USING btree (source_type, source_id);


--
-- Name: cert_gen_jobs_parent_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cert_gen_jobs_parent_idx ON public.certificate_generation_jobs USING btree (parent_job_id);


--
-- Name: certificates_user_source_uq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX certificates_user_source_uq ON public.certificates USING btree (user_id, source_type, source_id) WHERE ((source_type <> 'manual'::text) AND (source_id IS NOT NULL));


--
-- Name: community_post_likes_post_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX community_post_likes_post_user ON public.community_post_likes USING btree (post_id, user_id);


--
-- Name: drive_invites_drive_student_uq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX drive_invites_drive_student_uq ON public.drive_invites USING btree (drive_id, student_id);


--
-- Name: drive_rounds_drive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX drive_rounds_drive_idx ON public.drive_rounds USING btree (drive_id);


--
-- Name: files_owner_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX files_owner_idx ON public.files USING btree (owner_id);


--
-- Name: files_parent_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX files_parent_idx ON public.files USING btree (parent_file_id);


--
-- Name: files_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX files_status_idx ON public.files USING btree (status);


--
-- Name: files_usage_area_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX files_usage_area_idx ON public.files USING btree (usage_area);


--
-- Name: lab_assets_lab_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lab_assets_lab_idx ON public.lab_assets USING btree (lab_id);


--
-- Name: lab_assignments_batch_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lab_assignments_batch_idx ON public.lab_assignments USING btree (batch_id);


--
-- Name: lab_assignments_lab_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lab_assignments_lab_idx ON public.lab_assignments USING btree (lab_id);


--
-- Name: lab_assignments_student_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lab_assignments_student_idx ON public.lab_assignments USING btree (student_id);


--
-- Name: lab_hints_module_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lab_hints_module_idx ON public.lab_hints USING btree (lab_module_id);


--
-- Name: lab_module_completions_user_module_uq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX lab_module_completions_user_module_uq ON public.lab_module_completions USING btree (user_id, lab_module_id);


--
-- Name: lab_versions_lab_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lab_versions_lab_idx ON public.lab_versions USING btree (lab_id);


--
-- Name: placement_drives_tpo_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX placement_drives_tpo_idx ON public.placement_drives USING btree (tpo_id);


--
-- Name: round_schedules_drive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX round_schedules_drive_idx ON public.round_schedules USING btree (drive_id);


--
-- Name: round_schedules_round_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX round_schedules_round_idx ON public.round_schedules USING btree (round_id);


--
-- Name: round_schedules_student_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX round_schedules_student_idx ON public.round_schedules USING btree (student_id);


--
-- Name: uniq_batch_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uniq_batch_student ON public.batch_students USING btree (batch_id, student_id);


--
-- Name: uniq_mentor_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uniq_mentor_student ON public.mentor_students USING btree (mentor_id, student_id);


--
-- Name: uniq_mock_interview_template_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uniq_mock_interview_template_student ON public.mock_interview_assignments USING btree (template_id, student_id);


--
-- Name: uniq_question_batch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uniq_question_batch ON public.question_bank_batches USING btree (question_id, batch_id);


--
-- Name: uniq_task_batch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uniq_task_batch ON public.mentor_task_batches USING btree (task_id, batch_id);


--
-- Name: uniq_task_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uniq_task_student ON public.mentor_task_assignments USING btree (task_id, student_id);


--
-- Name: community_post_likes community_post_likes_post_id_community_posts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_post_likes
    ADD CONSTRAINT community_post_likes_post_id_community_posts_id_fk FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE;


--
-- Name: community_post_likes community_post_likes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_post_likes
    ADD CONSTRAINT community_post_likes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: community_posts community_posts_author_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: support_ticket_replies support_ticket_replies_author_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_ticket_replies
    ADD CONSTRAINT support_ticket_replies_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: support_ticket_replies support_ticket_replies_ticket_id_support_tickets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_ticket_replies
    ADD CONSTRAINT support_ticket_replies_ticket_id_support_tickets_id_fk FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_assigned_to_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_assigned_to_users_id_fk FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_preferences user_preferences_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict fJdTxVZHwrAs6wwU1VfycnyuJUg5aSMFhfyd2vyDNp9iJYi4s2zgG8GmQqxPReR

