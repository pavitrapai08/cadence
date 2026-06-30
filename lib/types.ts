// ── Database row shapes ───────────────────────────────────────────────────────

export interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string;
  date: string; // "YYYY-MM-DD"
  hours: number;
  raw_notes: string | null;
  ai_description: string | null;
  tag_ids: string[];
  status: "draft" | "submitted";
  timesheet_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  tag_group_id: string;
  name: string;
  is_billable: boolean;
  is_required: boolean;
  sort_order: number;
}

export interface TagGroup {
  id: string;
  name: string;
  tags: Tag[];
}

export interface Project {
  id: string;
  name: string;
  colour: string;
  external_id: string | null;
  tag_group_id: string | null;
  tag_group: TagGroup | null;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "employee" | "manager" | "admin";
  manager_id: string | null;
  capacity_hours: number;
  timezone: string;
  dismissed_welcome: boolean;
  is_active: boolean;
}

export interface MonthLockRow {
  year: number;
  month: number;
  is_locked: boolean;
}

// ── Projects tab ──────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  is_active: boolean;
}

/** Full project row — used in the Projects tab and admin forms. */
export interface ProjectFull {
  id: string;
  name: string;
  colour: string;
  external_id: string | null;
  description: string | null;
  budget_hours: number | null;
  is_active: boolean;
  client_id: string | null;
  client: Client | null;
  tag_group_id: string | null;
  tag_group: { id: string; name: string } | null;
}

export interface ProjectStats {
  totalHours: number;
  thisWeekHours: number;
  thisMonthHours: number;
  billableHours: number;
  nonBillableHours: number;
  lastFiveWeeks: { weekStart: string; hours: number }[];
  tagUsage: { tagId: string; tagName: string; hours: number }[];
}

/** Minimal user shape used in member assignment lists. */
export interface UserBasic {
  id: string;
  email: string;
  full_name: string | null;
  role: "employee" | "manager" | "admin";
}

// ── People tab ────────────────────────────────────────────────────────────────

export interface PersonWeeklyData {
  weekStart: string;
  hours: number;
  billable: number;
}

export interface PersonUtilisation {
  userId: string;
  fullName: string | null;
  email: string;
  role: "employee" | "manager" | "admin";
  capacityHours: number;
  weeklyData: PersonWeeklyData[];
  totalLogged: number;
  totalBillable: number;
  submittedThisWeek: boolean;
  hasLoggedToday: boolean;
}

// ── Reports: Clients ──────────────────────────────────────────────────────────

export interface ProjectWeeklyHours {
  projectId: string;
  projectName: string;
  colour: string;
  externalId: string | null;
  totalHours: number;
  weeklyHours: Record<string, number>; // weekStart ISO → hours
}

export interface ClientReportRow {
  clientId: string;
  clientName: string;
  totalHours: number;
  projects: ProjectWeeklyHours[];
}

// ── Reports: Timesheets ───────────────────────────────────────────────────────

export interface TimesheetEntryRow {
  id: string;
  date: string;
  userId: string;
  userFullName: string | null;
  userEmail: string;
  projectId: string;
  projectName: string;
  projectColour: string;
  hours: number;
  note: string | null;
  tagNames: string[];
  status: "draft" | "submitted";
}

export interface TimesheetReportSummary {
  entryCount: number;
  peopleCount: number;
  projectCount: number;
  totalHours: number;
}

// ── Reports: Summary / Dashboard ─────────────────────────────────────────────

export interface ReportChartItem {
  id: string;
  name: string;
  colour: string;
  hours: number;
  percentage: number;
}

export interface ReportsSummaryData {
  totalHours: number;
  byClient: ReportChartItem[];
  byProject: ReportChartItem[];
  availableProjects: { id: string; name: string }[];
  availableTags: { id: string; name: string }[];
  availableUsers: { id: string; email: string; full_name: string | null }[];
  role: string;
}

// ── API response envelope ─────────────────────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
}

export type ApiResponse<T> = { data: T } | { error: ApiError };
