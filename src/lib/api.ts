// CompetenceTrack — API Client
// All API calls go through these helpers

/* ── Generic helpers ──────────────────────────────────────────────── */

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Handle 429 Too Many Requests (rate limiting)
    if (res.status === 429) {
      const retryAfter = body.retryAfter || parseInt(res.headers.get('Retry-After') || '60', 10);
      const rateLimitError = new Error(body.error || 'Too many requests');
      (rateLimitError as RateLimitError).isRateLimit = true;
      (rateLimitError as RateLimitError).retryAfter = retryAfter;
      (rateLimitError as RateLimitError).limit = body.limit || 0;
      throw rateLimitError;
    }
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res.json();
}

// Rate limit error type
export interface RateLimitError extends Error {
  isRateLimit: boolean;
  retryAfter: number;
  limit: number;
}

export function apiGet<T>(url: string): Promise<T> {
  return apiRequest<T>(url);
}

export function apiPost<T>(url: string, data?: unknown): Promise<T> {
  return apiRequest<T>(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export function apiPut<T>(url: string, data: unknown): Promise<T> {
  return apiRequest<T>(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function apiDelete<T>(url: string): Promise<T> {
  return apiRequest<T>(url, { method: 'DELETE' });
}

/* ── Auth ─────────────────────────────────────────────────────────── */

export async function login(email: string, password: string) {
  return apiPost<{ id: string; email: string; firstName: string; lastName: string; role: string; schoolId: string | null; locale: string; isDemo?: boolean }>('/api/auth', {
    action: 'login',
    email,
    password,
  });
}

export async function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  schoolId?: string;
  role?: string;
}) {
  return apiPost<{ id: string; email: string; firstName: string; lastName: string; role: string; schoolId: string | null; locale: string }>('/api/auth', {
    action: 'register',
    ...data,
  });
}

export async function fetchCurrentUser() {
  try {
    const res = await fetch('/api/auth');
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/* ── Dashboard ────────────────────────────────────────────────────── */

export interface DashboardData {
  classesOverview: Array<{
    id: string;
    name: string;
    gradeLevel: number;
    schoolType: string;
    schoolYear: { id: string; label: string };
    studentCount: number;
    assessmentCount: number;
    teachers: Array<{ id: string; firstName: string; lastName: string; teacherRole: string }>;
  }>;
  recentEntries: Array<{
    id: string;
    date: string;
    masteryLevelValue: number;
    note: string | null;
    student: { id: string; firstName: string; lastName: string };
    competency: { id: string; code: string; title: string; category: { id: string; name: string; color: string | null } };
    teacher: { id: string; firstName: string; lastName: string };
    classGroup: { id: string; name: string };
  }>;
  recentAssessments: Array<{
    id: string;
    title: string;
    date: string;
    type: string;
    maxScore: number | null;
    weight: number;
    classGroup: { id: string; name: string };
    subject: { id: string; name: string };
    _count: { assessmentResults: number };
  }>;
  studentsNeedingAttention: Array<{
    id: string;
    firstName: string;
    lastName: string;
    averageMastery: number;
    enrollments: Array<{ classGroup: { id: string; name: string; gradeLevel: number } }>;
  }>;
  stats: {
    totalStudents: number;
    totalClasses: number;
    totalAssessments: number;
    totalProgressEntries: number;
    totalReports: number;
  };
}

export function fetchDashboard(schoolId?: string, schoolYearId?: string): Promise<DashboardData> {
  const params = new URLSearchParams();
  if (schoolId) params.set('schoolId', schoolId);
  if (schoolYearId) params.set('schoolYearId', schoolYearId);
  return apiGet<DashboardData>(`/api/dashboard?${params.toString()}`);
}

/* ── Classes ──────────────────────────────────────────────────────── */

export interface ClassGroup {
  id: string;
  schoolId: string;
  schoolYearId: string;
  name: string;
  gradeLevel: number;
  schoolType: string;
  school: { id: string; name: string };
  schoolYear: { id: string; label: string };
  teachers: Array<{ id: string; userId: string; role: string; user: { id: string; firstName: string; lastName: string; email: string } }>;
  studentCount?: number;
  teacherList?: Array<{ id: string; firstName: string; lastName: string; teacherRole: string }>;
  _count?: { enrollments?: number; competencyAssignments?: number; [key: string]: unknown };
}

export function fetchClasses(schoolId?: string, schoolYearId?: string): Promise<ClassGroup[]> {
  const params = new URLSearchParams();
  if (schoolId) params.set('schoolId', schoolId);
  if (schoolYearId) params.set('schoolYearId', schoolYearId);
  return apiGet<ClassGroup[]>(`/api/classes?${params.toString()}`);
}

export function createClass(data: {
  schoolId: string;
  schoolYearId: string;
  name: string;
  gradeLevel: number;
  schoolType?: string;
  teacherIds?: string[];
}) {
  return apiPost<ClassGroup>('/api/classes', data);
}

/* ── Students ─────────────────────────────────────────────────────── */

export interface Student {
  id: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  externalId: string | null;
  school: { id: string; name: string };
  enrollments: Array<{ classGroup: { id: string; name: string; gradeLevel: number } }>;
  _count?: { learningProgressEntries: number; assessmentResults: number };
}

export function fetchStudents(schoolId?: string, classGroupId?: string, search?: string): Promise<Student[]> {
  const params = new URLSearchParams();
  if (schoolId) params.set('schoolId', schoolId);
  if (classGroupId) params.set('classGroupId', classGroupId);
  if (search) params.set('search', search);
  return apiGet<Student[]>(`/api/students?${params.toString()}`);
}

export function createStudent(data: {
  schoolId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  externalId?: string;
}) {
  return apiPost<Student>('/api/students', data);
}

export function fetchClassStudents(classGroupId: string): Promise<Student[]> {
  return apiGet<Student[]>(`/api/classes/${classGroupId}/students`);
}

export function enrollStudent(classGroupId: string, data: { studentId: string; schoolYearId: string; startDate?: string }) {
  return apiPost(`/api/classes/${classGroupId}/students`, data);
}

/* ── Subjects ─────────────────────────────────────────────────────── */

export interface Subject {
  id: string;
  schoolId: string | null;
  name: string;
  gradeLevelMin: number;
  gradeLevelMax: number;
}

export function fetchSubjects(schoolId?: string): Promise<Subject[]> {
  const params = new URLSearchParams();
  if (schoolId) params.set('schoolId', schoolId);
  return apiGet<Subject[]>(`/api/subjects?${params.toString()}`);
}

/* ── Competency Templates ─────────────────────────────────────────── */

export interface MasteryLevelDef {
  id: string;
  competencyId: string;
  levelValue: number;
  label: string;
  description: string | null;
}

export interface CompetencyItem {
  id: string;
  categoryId: string;
  code: string;
  title: string;
  description: string | null;
  order: number;
  masteryLevelDefinitions: MasteryLevelDef[];
}

export interface CompetencyCategory {
  id: string;
  competencyTemplateId: string;
  name: string;
  order: number;
  color: string | null;
  competencies: CompetencyItem[];
}

export interface CompetencyTemplate {
  id: string;
  name: string;
  description: string | null;
  subjectId: string | null;
  schoolType: string;
  gradeLevelMin: number;
  gradeLevelMax: number;
  isGlobalTemplate: boolean;
  version: number;
  schoolId: string | null;
  subject: { id: string; name: string } | null;
  school: { id: string; name: string } | null;
  categories: CompetencyCategory[];
  _count: { classCompetencyAssignments: number };
}

export function fetchCompetencyTemplates(params?: {
  schoolType?: string;
  subjectId?: string;
  gradeLevel?: string;
  schoolId?: string;
}): Promise<CompetencyTemplate[]> {
  const sp = new URLSearchParams();
  if (params?.schoolType) sp.set('schoolType', params.schoolType);
  if (params?.subjectId) sp.set('subjectId', params.subjectId);
  if (params?.gradeLevel) sp.set('gradeLevel', params.gradeLevel);
  if (params?.schoolId) sp.set('schoolId', params.schoolId);
  return apiGet<CompetencyTemplate[]>(`/api/competency-templates?${sp.toString()}`);
}

export function fetchCompetencyTemplate(id: string): Promise<CompetencyTemplate> {
  return apiGet<CompetencyTemplate>(`/api/competency-templates/${id}`);
}

/* ── Class Competency Assignments ─────────────────────────────────── */

export interface ClassCompetencyAssignment {
  id: string;
  classGroupId: string;
  subjectId: string;
  competencyTemplateId: string;
  schoolYearId: string;
  clonedTemplateId: string | null;
  classGroup: { id: string; name: string; gradeLevel: number };
  subject: { id: string; name: string };
  competencyTemplate: { id: string; name: string; schoolType: string; gradeLevelMin: number; gradeLevelMax: number };
}

export function fetchClassCompetencyAssignments(params?: {
  classGroupId?: string;
  subjectId?: string;
  schoolYearId?: string;
}): Promise<ClassCompetencyAssignment[]> {
  const sp = new URLSearchParams();
  if (params?.classGroupId) sp.set('classGroupId', params.classGroupId);
  if (params?.subjectId) sp.set('subjectId', params.subjectId);
  if (params?.schoolYearId) sp.set('schoolYearId', params.schoolYearId);
  return apiGet<ClassCompetencyAssignment[]>(`/api/class-competency-assignments?${sp.toString()}`);
}

export function createClassCompetencyAssignment(data: {
  classGroupId: string;
  subjectId: string;
  competencyTemplateId: string;
  schoolYearId: string;
  clonedTemplateId?: string;
}) {
  return apiPost<ClassCompetencyAssignment>('/api/class-competency-assignments', data);
}

/* ── Learning Progress ────────────────────────────────────────────── */

export interface LearningProgressEntry {
  id: string;
  studentId: string;
  competencyId: string;
  teacherId: string;
  classGroupId: string;
  date: string;
  masteryLevelValue: number;
  note: string | null;
  createdAt: string;
  student: { id: string; firstName: string; lastName: string };
  competency: { id: string; code: string; title: string; category: { id: string; name: string; color: string | null } };
  teacher: { id: string; firstName: string; lastName: string };
  classGroup: { id: string; name: string };
}

export function fetchLearningProgress(params?: {
  studentId?: string;
  classGroupId?: string;
  competencyId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<LearningProgressEntry[]> {
  const sp = new URLSearchParams();
  if (params?.studentId) sp.set('studentId', params.studentId);
  if (params?.classGroupId) sp.set('classGroupId', params.classGroupId);
  if (params?.competencyId) sp.set('competencyId', params.competencyId);
  if (params?.startDate) sp.set('startDate', params.startDate);
  if (params?.endDate) sp.set('endDate', params.endDate);
  return apiGet<LearningProgressEntry[]>(`/api/learning-progress?${sp.toString()}`);
}

export function createLearningProgressEntry(data: {
  studentId: string;
  competencyId: string;
  teacherId: string;
  classGroupId: string;
  date: string;
  masteryLevelValue: number;
  note?: string;
}) {
  return apiPost<LearningProgressEntry>('/api/learning-progress', data);
}

export function createBulkLearningProgress(data: Array<{
  studentId: string;
  competencyId: string;
  teacherId: string;
  classGroupId: string;
  date: string;
  masteryLevelValue: number;
  note?: string;
}>) {
  return apiPost<{ created: number }>('/api/learning-progress', data);
}

/* ── Competence Flower ────────────────────────────────────────────── */

export interface FlowerCategory {
  categoryId: string;
  categoryName: string;
  color: string | null;
  averageMasteryLevel: number;
  competencyCount: number;
  assessedCompetencyCount: number;
}

export interface FlowerData {
  studentId: string;
  studentName: string;
  categories: FlowerCategory[];
}

export function fetchCompetenceFlower(params: {
  studentId?: string;
  classGroupId: string;
  subjectId: string;
}): Promise<FlowerData[]> {
  const sp = new URLSearchParams();
  if (params.studentId) sp.set('studentId', params.studentId);
  sp.set('classGroupId', params.classGroupId);
  sp.set('subjectId', params.subjectId);
  return apiGet<FlowerData[]>(`/api/competence-flower?${sp.toString()}`);
}

/* ── Assessments ──────────────────────────────────────────────────── */

export interface AssessmentCompetencyLink {
  id: string;
  assessmentId: string;
  competencyId: string;
  weight: number;
  competency: { id: string; code: string; title: string };
}

export interface Assessment {
  id: string;
  classGroupId: string;
  subjectId: string;
  teacherId: string;
  title: string;
  date: string;
  type: string;
  maxScore: number | null;
  weight: number;
  classGroup: { id: string; name: string };
  subject: { id: string; name: string };
  teacher: { id: string; firstName: string; lastName: string };
  assessmentCompetencyLinks: AssessmentCompetencyLink[];
  _count: { assessmentResults: number };
}

export function fetchAssessments(params?: {
  classGroupId?: string;
  subjectId?: string;
}): Promise<Assessment[]> {
  const sp = new URLSearchParams();
  if (params?.classGroupId) sp.set('classGroupId', params.classGroupId);
  if (params?.subjectId) sp.set('subjectId', params.subjectId);
  return apiGet<Assessment[]>(`/api/assessments?${sp.toString()}`);
}

export function createAssessment(data: {
  classGroupId: string;
  subjectId: string;
  teacherId: string;
  title: string;
  date: string;
  type?: string;
  maxScore?: number | null;
  weight?: number;
  competencyLinks?: Array<{ competencyId: string; weight: number }>;
}) {
  return apiPost<Assessment>('/api/assessments', data);
}

/* ── Assessment Results ───────────────────────────────────────────── */

export interface AssessmentResult {
  id: string;
  assessmentId: string;
  studentId: string;
  score: number | null;
  masteryLevelValue: number | null;
  note: string | null;
  student: { id: string; firstName: string; lastName: string };
  assessment: { id: string; title: string; maxScore: number | null };
}

export function fetchAssessmentResults(assessmentId: string): Promise<AssessmentResult[]> {
  return apiGet<AssessmentResult[]>(`/api/assessments/${assessmentId}/results`);
}

export function createAssessmentResults(assessmentId: string, data: Array<{
  studentId: string;
  score?: number | null;
  masteryLevelValue?: number | null;
  note?: string;
}>) {
  return apiPost(`/api/assessments/${assessmentId}/results`, data);
}

/* ── Grading ──────────────────────────────────────────────────────── */

export interface GradingWeightRule {
  id: string;
  gradingSchemeId: string;
  sourceType: string;
  targetRef: string | null;
  weightPercent: number;
}

export interface GradingScheme {
  id: string;
  classGroupId: string | null;
  subjectId: string | null;
  schoolId: string | null;
  name: string;
  type: string;
  scaleDefinition: string;
  gradingWeightRules: GradingWeightRule[];
  classGroup: { id: string; name: string } | null;
  subject: { id: string; name: string } | null;
  school: { id: string; name: string } | null;
}

export interface ComputedGradeResult {
  studentId: string;
  computedValue: number;
  breakdown: Array<{ source: string; weight: number; value: number }>;
}

export function fetchGradingSchemes(params?: {
  classGroupId?: string;
  subjectId?: string;
  schoolId?: string;
  computeGrades?: boolean;
  schoolYearId?: string;
}): Promise<GradingScheme[] | { schemes: GradingScheme[]; computedGrades: ComputedGradeResult[] }> {
  const sp = new URLSearchParams();
  if (params?.classGroupId) sp.set('classGroupId', params.classGroupId);
  if (params?.subjectId) sp.set('subjectId', params.subjectId);
  if (params?.schoolId) sp.set('schoolId', params.schoolId);
  if (params?.computeGrades) sp.set('computeGrades', 'true');
  if (params?.schoolYearId) sp.set('schoolYearId', params.schoolYearId);
  return apiGet(`/api/grading?${sp.toString()}`);
}

export function createGradingScheme(data: {
  classGroupId?: string;
  subjectId?: string;
  schoolId?: string;
  name: string;
  type?: string;
  scaleDefinition: string;
  weightRules?: Array<{ sourceType: string; targetRef?: string; weightPercent: number }>;
}) {
  return apiPost<GradingScheme>('/api/grading', data);
}

/* ── Reports ──────────────────────────────────────────────────────── */

export interface ReportSection {
  id: string;
  reportId: string;
  competencyCategoryId: string | null;
  generatedText: string;
  order: number;
  competencyCategory: { id: string; name: string; color: string | null } | null;
}

export interface Report {
  id: string;
  studentId: string;
  classGroupId: string;
  schoolYearId: string;
  period: string;
  generatedByUserId: string;
  generatedAt: string;
  status: string;
  pdfFilePath: string | null;
  includesGrades: boolean;
  student: { id: string; firstName: string; lastName: string };
  classGroup: { id: string; name: string; gradeLevel: number };
  schoolYear: { id: string; label: string };
  generatedByUser: { id: string; firstName: string; lastName: string };
  sections: ReportSection[];
}

export function fetchReports(params?: {
  studentId?: string;
  classGroupId?: string;
  schoolYearId?: string;
  status?: string;
}): Promise<Report[]> {
  const sp = new URLSearchParams();
  if (params?.studentId) sp.set('studentId', params.studentId);
  if (params?.classGroupId) sp.set('classGroupId', params.classGroupId);
  if (params?.schoolYearId) sp.set('schoolYearId', params.schoolYearId);
  if (params?.status) sp.set('status', params.status);
  return apiGet<Report[]>(`/api/reports?${sp.toString()}`);
}

export function createReport(data: {
  studentId: string;
  classGroupId: string;
  schoolYearId: string;
  period: string;
  includesGrades?: boolean;
  sections?: Array<{ competencyCategoryId?: string; generatedText: string; order: number }>;
}) {
  return apiPost<Report>('/api/reports', data);
}

export function updateReport(data: {
  id: string;
  status?: string;
  includesGrades?: boolean;
  pdfFilePath?: string;
  sections?: Array<{ id: string; generatedText: string }>;
}) {
  return apiPut<Report>('/api/reports', data);
}

/* ── Grade Override ──────────────────────────────────────────────── */

export function overrideGrade(data: {
  studentId: string;
  subjectId: string;
  classGroupId: string;
  schoolYearId: string;
  overriddenValue: number;
  overrideReason: string;
}) {
  return apiPut<{ success: boolean }>('/api/grading', data);
}

/* ── Schools ──────────────────────────────────────────────────────── */

export interface School {
  id: string;
  name: string;
  schoolType: string;
  country: string;
  timezone: string;
  _count: { users: number; classGroups: number; students: number };
}

export function fetchSchools(schoolType?: string): Promise<School[]> {
  const sp = new URLSearchParams();
  if (schoolType) sp.set('schoolType', schoolType);
  return apiGet<School[]>(`/api/schools?${sp.toString()}`);
}

/* ── School Years ─────────────────────────────────────────────────── */

export interface SchoolYear {
  id: string;
  schoolId: string;
  label: string;
  startDate: string;
  endDate: string;
}

export function fetchSchoolYears(schoolId: string): Promise<SchoolYear[]> {
  return apiGet<SchoolYear[]>(`/api/school-years?schoolId=${schoolId}`);
}

export function createSchoolYear(data: {
  schoolId: string;
  label: string;
  startDate: string;
  endDate: string;
}) {
  return apiPost<SchoolYear>('/api/school-years', data);
}

/* ── School Update ────────────────────────────────────────────────── */

export function updateSchool(data: {
  id: string;
  name?: string;
  schoolType?: string;
  country?: string;
  timezone?: string;
}) {
  return apiPut<School>('/api/schools', data);
}

/* ── Subject CRUD ─────────────────────────────────────────────────── */

export function createSubject(data: {
  schoolId?: string | null;
  name: string;
  gradeLevelMin?: number;
  gradeLevelMax?: number;
}) {
  return apiPost<Subject>('/api/subjects', data);
}

export function updateSubject(data: {
  id: string;
  name?: string;
  gradeLevelMin?: number;
  gradeLevelMax?: number;
}) {
  return apiPut<Subject>('/api/subjects', data);
}

export function deleteSubject(id: string) {
  return apiDelete<{ success: boolean }>(`/api/subjects?id=${id}`);
}

/* ── Audit Log ────────────────────────────────────────────────────── */

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  schoolId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
  metadata: string | null;
  user: { id: string; firstName: string; lastName: string } | null;
}

export interface AuditLogPaginatedResponse {
  entries: AuditLogEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function fetchAuditLog(params?: {
  schoolId?: string;
  action?: string;
  entityType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<AuditLogPaginatedResponse> {
  const sp = new URLSearchParams();
  if (params?.schoolId) sp.set('schoolId', params.schoolId);
  if (params?.action) sp.set('action', params.action);
  if (params?.entityType) sp.set('entityType', params.entityType);
  if (params?.userId) sp.set('userId', params.userId);
  if (params?.startDate) sp.set('startDate', params.startDate);
  if (params?.endDate) sp.set('endDate', params.endDate);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
  return apiGet<AuditLogPaginatedResponse>(`/api/audit-log?${sp.toString()}`);
}

export function exportAuditLogCsv(params?: {
  schoolId?: string;
  action?: string;
  entityType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}): void {
  const sp = new URLSearchParams();
  sp.set('export', 'csv');
  if (params?.schoolId) sp.set('schoolId', params.schoolId);
  if (params?.action) sp.set('action', params.action);
  if (params?.entityType) sp.set('entityType', params.entityType);
  if (params?.userId) sp.set('userId', params.userId);
  if (params?.startDate) sp.set('startDate', params.startDate);
  if (params?.endDate) sp.set('endDate', params.endDate);
  const url = `/api/audit-log?${sp.toString()}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = 'audit-log.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ── Behavior Interventions ─────────────────────────────────────────── */

export interface BehaviorInterventionType {
  id: string;
  schoolId: string;
  studentId: string;
  incidentId: string | null;
  type: string;
  description: string;
  status: string;
  assignedTo: string | null;
  startDate: string | null;
  endDate: string | null;
  outcome: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  student: { id: string; firstName: string; lastName: string };
  incident: { id: string; description: string; date: string; severity: string } | null;
  assignedUser: { id: string; firstName: string; lastName: string } | null;
}

export function fetchBehaviorInterventions(params: {
  schoolId: string;
  studentId?: string;
  incidentId?: string;
  type?: string;
  status?: string;
}): Promise<BehaviorInterventionType[]> {
  const sp = new URLSearchParams();
  sp.set('schoolId', params.schoolId);
  if (params.studentId) sp.set('studentId', params.studentId);
  if (params.incidentId) sp.set('incidentId', params.incidentId);
  if (params.type) sp.set('type', params.type);
  if (params.status) sp.set('status', params.status);
  return apiGet<BehaviorInterventionType[]>(`/api/behavior-interventions?${sp.toString()}`);
}

export function createBehaviorIntervention(data: {
  schoolId: string;
  studentId: string;
  incidentId?: string;
  type: string;
  description: string;
  status?: string;
  assignedTo?: string;
  startDate?: string;
  endDate?: string;
  outcome?: string;
  isDemo?: boolean;
}): Promise<BehaviorInterventionType> {
  return apiPost<BehaviorInterventionType>('/api/behavior-interventions', data);
}

export function updateBehaviorIntervention(
  id: string,
  data: {
    type?: string;
    description?: string;
    status?: string;
    assignedTo?: string;
    startDate?: string;
    endDate?: string;
    outcome?: string;
    incidentId?: string;
  }
): Promise<BehaviorInterventionType> {
  return apiPut<BehaviorInterventionType>(`/api/behavior-interventions/${id}`, data);
}

export function deleteBehaviorIntervention(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/behavior-interventions/${id}`);
}

/* ── Data Export (CSV) ────────────────────────────────────────────── */

export function downloadCsvExport(params: {
  type: 'students' | 'progress' | 'assessments' | 'grades' | 'attendance';
  classGroupId?: string;
  schoolYearId?: string;
  schoolId?: string;
}): void {
  const sp = new URLSearchParams();
  sp.set('type', params.type);
  if (params.classGroupId) sp.set('classGroupId', params.classGroupId);
  if (params.schoolYearId) sp.set('schoolYearId', params.schoolYearId);
  if (params.schoolId) sp.set('schoolId', params.schoolId);
  // Direct download — triggers browser download
  const url = `/api/data-export/csv?${sp.toString()}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = `${params.type}_export.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ── Data Erasure (GDPR) ──────────────────────────────────────────── */

export function requestDataErasure(data: {
  scope: string;
  scopeId?: string;
}) {
  return apiPost<{ id: string; status: string }>('/api/data-export', {
    scope: data.scope,
    scopeId: data.scopeId,
    format: 'JSON',
  });
}

/* ── Report PDF ───────────────────────────────────────────────────── */

export function getReportPdfUrl(reportId: string): string {
  return `/api/reports/pdf?reportId=${reportId}`;
}

/* ── Notification helpers ─────────────────────────────────────────── */

export interface AppNotification {
  id: string;
  type: 'progress' | 'assessment' | 'grade' | 'report';
  message: string;
  timestamp: string;
  read: boolean;
}

export function getStoredNotifications(): AppNotification[] {
  try {
    const stored = localStorage.getItem('ct_notifications');
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return [];
}

export function addNotification(notification: Omit<AppNotification, 'id' | 'read'>): void {
  try {
    const stored = getStoredNotifications();
    const newNotification: AppNotification = {
      ...notification,
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      read: false,
    };
    stored.unshift(newNotification);
    // Keep only last 50
    if (stored.length > 50) stored.splice(50);
    localStorage.setItem('ct_notifications', JSON.stringify(stored));
  } catch {
    // ignore
  }
}

export function markNotificationsRead(): void {
  try {
    const stored = getStoredNotifications();
    stored.forEach((n) => { n.read = true; });
    localStorage.setItem('ct_notifications', JSON.stringify(stored));
  } catch {
    // ignore
  }
}

/* ── User Management ──────────────────────────────────────────────── */

export interface UserAccount {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  schoolId: string | null;
  locale: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  school?: { id: string; name: string } | null;
  classGroupTeachers?: Array<{
    id: string;
    role: string;
    classGroup: { id: string; name: string; gradeLevel: number };
  }>;
  _count?: { classGroupTeachers: number; learningProgressEntries: number; assessments: number };
}

export function fetchUsers(schoolId?: string): Promise<UserAccount[]> {
  const sp = new URLSearchParams();
  if (schoolId) sp.set('schoolId', schoolId);
  return apiGet<UserAccount[]>(`/api/users?${sp.toString()}`);
}

export function createUser(data: {
  schoolId?: string | null;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
  locale?: string;
}) {
  return apiPost<UserAccount>('/api/users', data);
}

export function updateUser(data: {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  locale?: string;
}) {
  return apiPut<UserAccount>(`/api/users/${data.id}`, data);
}

export function deleteUser(id: string) {
  return apiDelete<{ success: boolean }>(`/api/users/${id}`);
}

export function assignTeacherClasses(userId: string, classGroupIds: string[]) {
  return apiPost<{ success: boolean; assigned: number }>(`/api/users/${userId}/classes`, { classGroupIds });
}

/* ── Bulk Student Import ──────────────────────────────────────────── */

export function bulkCreateStudents(data: {
  schoolId: string;
  classGroupId?: string;
  schoolYearId?: string;
  students: Array<{
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    externalId?: string;
  }>;
}) {
  return apiPost<{ created: number; enrolled: number; errors: Array<{ row: number; error: string }> }>(
    '/api/students/bulk',
    data
  );
}

/* ── Student Detail ───────────────────────────────────────────────── */

export interface StudentDetailData {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    externalId: string | null;
    createdAt: string;
    school: { id: string; name: string };
    enrollments: Array<{
      classGroup: { id: string; name: string; gradeLevel: number; schoolType: string };
      schoolYear: { id: string; label: string };
    }>;
  };
  progressEntries: Array<{
    id: string;
    date: string;
    masteryLevelValue: number;
    note: string | null;
    competency: { id: string; code: string; title: string; category: { id: string; name: string; color: string | null } };
    teacher: { id: string; firstName: string; lastName: string };
    classGroup: { id: string; name: string };
  }>;
  assessmentResults: Array<{
    id: string;
    score: number | null;
    masteryLevelValue: number | null;
    note: string | null;
    assessment: {
      id: string;
      title: string;
      date: string;
      type: string;
      maxScore: number | null;
      subject: { id: string; name: string };
    };
  }>;
  computedGrades: Array<{
    id: string;
    computedValue: number;
    overriddenValue: number | null;
    period: string;
    isFinalized: boolean;
    computedAt: string;
    subject: { id: string; name: string };
    classGroup: { id: string; name: string };
    schoolYear: { id: string; label: string };
  }>;
  reports: Array<{
    id: string;
    period: string;
    status: string;
    generatedAt: string;
    includesGrades: boolean;
    classGroup: { id: string; name: string };
    schoolYear: { id: string; label: string };
    generatedByUser: { id: string; firstName: string; lastName: string };
    sections: Array<{ id: string; generatedText: string; order: number }>;
  }>;
  flowers: Array<{
    studentId: string;
    studentName: string;
    categories: Array<{
      categoryId: string;
      categoryName: string;
      color: string | null;
      averageMasteryLevel: number;
      competencyCount: number;
      assessedCompetencyCount: number;
    }>;
    subjectId: string;
    subjectName: string;
  }>;
  stats: {
    totalProgressEntries: number;
    averageMastery: number;
    latestGrade: { value: number; period: string; subjectName: string } | null;
    totalReports: number;
    totalAssessments: number;
  };
}

export function fetchStudentDetail(studentId: string): Promise<StudentDetailData> {
  return apiGet<StudentDetailData>(`/api/students/${studentId}/details`);
}

/* ─── Progress Analytics ──────────────────────────────────────────── */

export interface AnalyticsMasteryTrendPoint {
  date: string;
  avgMastery: number;
  count: number;
}

export interface AnalyticsClassComparisonPoint {
  classId: string;
  className: string;
  avgMastery: number;
  studentCount: number;
}

export interface AnalyticsMasteryDistributionPoint {
  level: number;
  count: number;
  percentage: number;
}

export interface AnalyticsCompetencyPoint {
  competencyId: string;
  code: string;
  title: string;
  avgMastery: number;
  entryCount: number;
}

export interface AnalyticsHeatmapPoint {
  date: string;
  count: number;
}

export interface AnalyticsGradeTrendPoint {
  week: string; // e.g. "2026-W28"
  weekLabel: string; // e.g. "KW28"
  avgMastery: number;
  entryCount: number;
  uniqueStudents: number;
  classAvg: number;
}

export type AnalyticsRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type AnalyticsRiskSignal =
  | 'low_mastery'
  | 'no_recent_progress'
  | 'low_attendance'
  | 'declining';

export interface AnalyticsAtRiskStudent {
  studentId: string;
  studentName: string;
  className: string;
  riskScore: number;
  riskLevel: AnalyticsRiskLevel;
  signals: AnalyticsRiskSignal[];
  latestMastery: number;
  latestEntryDate: string;
}

export interface AnalyticsSubjectMasteryPoint {
  categoryId: string;
  categoryName: string;
  avgMastery: number;
  entryCount: number;
}

export interface AnalyticsTeacherPerformancePoint {
  teacherId: string;
  teacherName: string;
  assessmentCount: number;
  progressCount: number;
  improvementRate: number;
  notebookCount: number;
}

export interface AnalyticsSelfVsTeacherAgg {
  avgSelfLevel: number;
  avgTeacherLevel: number;
  avgGap: number;
  totalComparisons: number;
}

export interface AnalyticsGapAnalysisPoint {
  studentId: string;
  studentName: string;
  competencyId: string;
  selfLevel: number;
  teacherLevel: number;
  gap: number;
}

export interface AnalyticsExcellingStudent {
  studentId: string;
  studentName: string;
  className: string;
  latestMastery: number;
  improvement: number;
}

export interface AnalyticsClassRadarPoint {
  classId: string;
  className: string;
  mastery: number;
  attendance: number;
  engagement: number;
  progress: number;
  behavior: number;
}

export interface AnalyticsData {
  masteryTrend: AnalyticsMasteryTrendPoint[];
  classComparison: AnalyticsClassComparisonPoint[];
  masteryDistribution: AnalyticsMasteryDistributionPoint[];
  topCompetencies: AnalyticsCompetencyPoint[];
  bottomCompetencies: AnalyticsCompetencyPoint[];
  activityHeatmap: AnalyticsHeatmapPoint[];
  gradeTrend: AnalyticsGradeTrendPoint[];
  atRiskStudents: AnalyticsAtRiskStudent[];
  totalEntries: number;
  totalStudents: number;
  overallAvgMastery: number;
  // New fields
  totalClasses: number;
  totalTeachers: number;
  totalCompetencies: number;
  competencyCoveragePct: number;
  subjectMasteryAvg: AnalyticsSubjectMasteryPoint[];
  teacherPerformance: AnalyticsTeacherPerformancePoint[];
  selfVsTeacherAgg: AnalyticsSelfVsTeacherAgg | null;
  gapAnalysis: AnalyticsGapAnalysisPoint[];
  excellingStudents: AnalyticsExcellingStudent[];
  classRadarData: AnalyticsClassRadarPoint[];
}

export function fetchAnalytics(params: {
  classGroupId?: string;
  subjectId?: string;
  schoolYearId?: string;
  schoolId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<AnalyticsData> {
  const sp = new URLSearchParams();
  if (params.classGroupId) sp.set('classGroupId', params.classGroupId);
  if (params.subjectId) sp.set('subjectId', params.subjectId);
  if (params.schoolYearId) sp.set('schoolYearId', params.schoolYearId);
  if (params.schoolId) sp.set('schoolId', params.schoolId);
  if (params.startDate) sp.set('startDate', params.startDate);
  if (params.endDate) sp.set('endDate', params.endDate);
  return apiGet<AnalyticsData>(`/api/analytics?${sp.toString()}`);
}

/* ─── Mastery Matrix ──────────────────────────────────────────────── */

export interface MasteryMatrixStudent {
  id: string;
  firstName: string;
  lastName: string;
}

export interface MasteryMatrixCompetency {
  id: string;
  code: string;
  title: string;
  category: { id: string; name: string; color: string | null };
}

export interface MasteryMatrixCell {
  studentId: string;
  competencyId: string;
  latestMasteryLevel: number | null;
  entryCount: number;
  lastEntryDate: string | null;
}

export interface MasteryMatrixData {
  students: MasteryMatrixStudent[];
  competencies: MasteryMatrixCompetency[];
  matrix: MasteryMatrixCell[];
}

export function fetchMasteryMatrix(params: {
  classGroupId: string;
  subjectId: string;
}): Promise<MasteryMatrixData> {
  const sp = new URLSearchParams();
  sp.set('classGroupId', params.classGroupId);
  sp.set('subjectId', params.subjectId);
  return apiGet<MasteryMatrixData>(`/api/mastery-matrix?${sp.toString()}`);
}

/* ─── Curriculum Coverage ─────────────────────────────────────────── */

export interface CurriculumCoverageByCategory {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  total: number;
  assessed: number;
  notAssessed: number;
  coveragePercent: number;
}

export interface CurriculumCoverageCompetency {
  competencyId: string;
  code: string;
  title: string;
  categoryName: string;
  categoryColor: string;
  assessmentCount: number;
  progressCount: number;
  studentsAssessed: number;
  lastAssessedDate: string | null;
  lastMasteryLevel: number | null;
  status: 'covered' | 'partial' | 'untouched';
}

export interface CurriculumCoverageNotAssessed {
  competencyId: string;
  code: string;
  title: string;
  categoryName: string;
  categoryColor: string;
  status: 'covered' | 'partial' | 'untouched';
  studentsAssessed: number;
  studentsCount: number;
}

export interface CurriculumCoverageRecent {
  competencyId: string;
  code: string;
  title: string;
  categoryName: string;
  date: string;
  masteryLevelValue: number | null;
}

export interface CurriculumCoverage {
  classGroup: { id: string; name: string; gradeLevel: number; schoolType: string };
  subject: { id: string; name: string } | null;
  totals: {
    competencies: number;
    assessed: number;
    notAssessed: number;
    coveragePercent: number;
    studentsCount: number;
    assessmentsCount: number;
    progressEntriesCount: number;
  };
  byCategory: CurriculumCoverageByCategory[];
  byCompetency: CurriculumCoverageCompetency[];
  notAssessedList: CurriculumCoverageNotAssessed[];
  recentAssessed: CurriculumCoverageRecent[];
  hasAssignments: boolean;
}

export function fetchCurriculumCoverage(params: {
  classGroupId: string;
  subjectId?: string;
}): Promise<CurriculumCoverage> {
  const sp = new URLSearchParams();
  sp.set('classGroupId', params.classGroupId);
  if (params.subjectId) sp.set('subjectId', params.subjectId);
  return apiGet<CurriculumCoverage>(`/api/curriculum-coverage?${sp.toString()}`);
}

/* ─── Teacher Notes ───────────────────────────────────────────────── */

export type TeacherNoteCategory =
  | 'GENERAL'
  | 'BEHAVIOR'
  | 'ACADEMIC'
  | 'INTERVENTION'
  | 'PARENT_CONTACT';

export interface TeacherNote {
  id: string;
  studentId: string;
  teacherId: string;
  category: TeacherNoteCategory;
  content: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  teacher: { id: string; firstName: string; lastName: string };
}

export function fetchTeacherNotes(studentId: string): Promise<TeacherNote[]> {
  const sp = new URLSearchParams();
  sp.set('studentId', studentId);
  return apiGet<TeacherNote[]>(`/api/teacher-notes?${sp.toString()}`);
}

export function createTeacherNote(data: {
  studentId: string;
  category: TeacherNoteCategory;
  content: string;
  isPrivate?: boolean;
}): Promise<TeacherNote> {
  return apiPost<TeacherNote>('/api/teacher-notes', data);
}

export function updateTeacherNote(id: string, data: {
  category?: TeacherNoteCategory;
  content?: string;
  isPrivate?: boolean;
}): Promise<TeacherNote> {
  return apiPut<TeacherNote>(`/api/teacher-notes/${id}`, data);
}

export function deleteTeacherNote(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/teacher-notes/${id}`);
}

/* ─── Attendance ─────────────────────────────────────────────────── */

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE';

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  arrivalTime: string | null;
  comment: string | null;
  student: { id: string; firstName: string; lastName: string };
}

export interface AttendanceSession {
  id: string;
  classGroupId: string;
  teacherId: string;
  date: string;
  subjectId: string | null;
  period: string | null;
  status: 'OPEN' | 'COMPLETED';
  note: string | null;
  createdAt: string;
  updatedAt: string;
  subject: { id: string; name: string } | null;
  teacher: { id: string; firstName: string; lastName: string };
  records: AttendanceRecord[];
}

export function fetchAttendanceSessions(
  classGroupId: string,
  dateFrom?: string,
  dateTo?: string,
  status?: string
): Promise<AttendanceSession[]> {
  const sp = new URLSearchParams();
  sp.set('classGroupId', classGroupId);
  if (dateFrom) sp.set('dateFrom', dateFrom);
  if (dateTo) sp.set('dateTo', dateTo);
  if (status) sp.set('status', status);
  return apiGet<AttendanceSession[]>(`/api/attendance?${sp.toString()}`);
}

export function createAttendanceSession(data: {
  classGroupId: string;
  date: string;
  subjectId?: string;
  period?: string;
}): Promise<AttendanceSession> {
  return apiPost<AttendanceSession>('/api/attendance', data);
}

export function updateAttendanceSession(
  id: string,
  data: {
    status?: 'OPEN' | 'COMPLETED';
    records?: Array<{
      id: string;
      status?: AttendanceStatus;
      arrivalTime?: string;
      comment?: string;
    }>;
  }
): Promise<AttendanceSession> {
  return apiPut<AttendanceSession>(`/api/attendance`, { id, ...data });
}

export function updateAttendanceRecord(
  id: string,
  data: {
    status?: AttendanceStatus;
    arrivalTime?: string;
    comment?: string;
  }
): Promise<AttendanceRecord> {
  return apiPut<AttendanceRecord>(`/api/attendance/${id}`, data);
}

export function deleteAttendanceSession(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/attendance/${id}`);
}

/* ── Calendar ────────────────────────────────────────────────────── */

export type CalendarEventType = 'assessment' | 'attendance' | 'progress' | 'report' | 'lesson';

export interface CalendarEvent {
  date: string; // YYYY-MM-DD
  type: CalendarEventType;
  id: string;
  title: string;
  meta: Record<string, unknown>;
}

export interface CalendarResponse {
  events: CalendarEvent[];
  month: string; // YYYY-MM
}

export function fetchCalendarEvents(schoolId: string, month: string): Promise<CalendarResponse> {
  const sp = new URLSearchParams();
  sp.set('schoolId', schoolId);
  sp.set('month', month);
  return apiGet<CalendarResponse>(`/api/calendar?${sp.toString()}`);
}

/* ── Calendar Events (Custom) ──────────────────────────────────── */

export type CalendarEventItemType = 'assessment' | 'lesson' | 'reminder';

export interface RecurrencePattern {
  type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: string;
  daysOfWeek?: number[];
}

export interface CalendarEventItem {
  id: string;
  schoolId: string;
  teacherId: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  eventType: CalendarEventItemType;
  subjectId: string | null;
  classGroupId: string | null;
  notes: string | null;
  allDay: boolean;
  recurrencePattern: string | null;
  recurrenceEnd: string | null;
  parentEventId: string | null;
  createdAt: string;
  updatedAt: string;
  subject: { id: string; name: string } | null;
  classGroup: { id: string; name: string } | null;
  childEvents?: { id: string; date: string }[];
  childCount?: number;
}

export function fetchCalendarEventItems(schoolId: string, month: string): Promise<CalendarEventItem[]> {
  const sp = new URLSearchParams();
  sp.set('schoolId', schoolId);
  sp.set('month', month);
  return apiGet<CalendarEventItem[]>(`/api/calendar-events?${sp.toString()}`);
}

export function createCalendarEventItem(data: {
  schoolId: string;
  title: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  eventType: CalendarEventItemType;
  subjectId?: string | null;
  classGroupId?: string | null;
  notes?: string | null;
  allDay?: boolean;
  recurrencePattern?: RecurrencePattern | null;
  recurrenceEnd?: string | null;
}): Promise<CalendarEventItem> {
  return apiPost<CalendarEventItem>('/api/calendar-events', data);
}

export function updateCalendarEventItem(id: string, data: {
  title?: string;
  date?: string;
  startTime?: string | null;
  endTime?: string | null;
  eventType?: CalendarEventItemType;
  subjectId?: string | null;
  classGroupId?: string | null;
  notes?: string | null;
  allDay?: boolean;
  recurrencePattern?: RecurrencePattern | null;
  recurrenceEnd?: string | null;
  editMode?: 'series' | 'instance';
}): Promise<CalendarEventItem> {
  return apiPut<CalendarEventItem>(`/api/calendar-events/${id}`, data);
}

export function deleteCalendarEventItem(id: string, mode?: 'series' | 'instance'): Promise<{ success: boolean }> {
  const query = mode ? `?mode=${mode}` : '';
  return apiDelete<{ success: boolean }>(`/api/calendar-events/${id}${query}`);
}

/* ── Lesson Plans ────────────────────────────────────────────────── */

export type LessonPlanStatus = 'draft' | 'scheduled' | 'completed' | 'cancelled';

export interface LessonPlan {
  id: string;
  teacherId: string;
  classGroupId: string;
  subjectId: string | null;
  title: string;
  description: string | null;
  date: string;
  durationMin: number;
  status: LessonPlanStatus;
  objectives: string | null;
  materials: string | null;
  homework: string | null;
  reflection: string | null;
  linkedCompetencyIds: string | null;
  createdAt: string;
  updatedAt: string;
  teacher: { id: string; firstName: string; lastName: string };
  classGroup: { id: string; name: string; gradeLevel: number };
  subject: { id: string; name: string } | null;
}

export interface LessonPlanInput {
  title: string;
  description?: string;
  classGroupId: string;
  subjectId?: string | null;
  date: string;
  durationMin?: number;
  status?: LessonPlanStatus;
  objectives?: string[];
  materials?: string[];
  homework?: string;
  reflection?: string;
  linkedCompetencyIds?: string[];
}

export function listLessonPlans(params?: {
  classGroupId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}): Promise<LessonPlan[]> {
  const sp = new URLSearchParams();
  if (params?.classGroupId) sp.set('classGroupId', params.classGroupId);
  if (params?.dateFrom) sp.set('dateFrom', params.dateFrom);
  if (params?.dateTo) sp.set('dateTo', params.dateTo);
  if (params?.status) sp.set('status', params.status);
  return apiGet<LessonPlan[]>(`/api/lesson-plans?${sp.toString()}`);
}

export function getLessonPlan(id: string): Promise<LessonPlan> {
  return apiGet<LessonPlan>(`/api/lesson-plans/${id}`);
}

export function createLessonPlan(data: LessonPlanInput): Promise<LessonPlan> {
  return apiPost<LessonPlan>('/api/lesson-plans', data);
}

export function updateLessonPlan(id: string, data: Partial<LessonPlanInput>): Promise<LessonPlan> {
  return apiPut<LessonPlan>(`/api/lesson-plans/${id}`, data);
}

export function deleteLessonPlan(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/lesson-plans/${id}`);
}

/* ── Parent Communication ────────────────────────────────────────── */

export type ParentRelationship = 'parent' | 'guardian' | 'emergency';
export type ParentPreferredContact = 'email' | 'phone' | 'both';
export type ParentMessageCategory = 'general' | 'progress' | 'assessment' | 'behavior' | 'attendance' | 'event';
export type ParentMessagePriority = 'low' | 'normal' | 'high' | 'urgent';
export type ParentMessageStatus = 'draft' | 'sent' | 'delivered' | 'read' | 'replied';

export interface ParentContact {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  relationship: string;
  preferredContact: string;
  preferredLanguage: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    enrollments: Array<{
      classGroup: { id: string; name: string; gradeLevel: number };
    }>;
  };
}

export interface ParentContactInput {
  studentId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  relationship?: ParentRelationship;
  preferredContact?: ParentPreferredContact;
  preferredLanguage?: string;
  notes?: string | null;
}

export interface ParentMessage {
  id: string;
  parentId: string;
  teacherId: string;
  studentId: string;
  subject: string;
  body: string;
  category: string;
  priority: string;
  status: string;
  readAt: string | null;
  reply: string | null;
  replyAt: string | null;
  createdAt: string;
  updatedAt: string;
  parent: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    relationship: string;
    preferredContact: string;
    preferredLanguage: string;
    notes: string | null;
  };
  teacher: { id: string; firstName: string; lastName: string };
  student: {
    id: string;
    firstName: string;
    lastName: string;
    enrollments: Array<{
      classGroup: { id: string; name: string; gradeLevel: number };
    }>;
  };
}

export interface ParentMessageInput {
  parentId: string;
  studentId: string;
  subject: string;
  body: string;
  category?: ParentMessageCategory;
  priority?: ParentMessagePriority;
  status?: ParentMessageStatus;
}

export interface ParentMessageUpdate {
  subject?: string;
  body?: string;
  category?: ParentMessageCategory;
  priority?: ParentMessagePriority;
  status?: ParentMessageStatus;
  readAt?: string | null;
  reply?: string | null;
  replyAt?: string | null;
}

export interface ParentMessageListResponse {
  items: ParentMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function listParentContacts(params?: {
  studentId?: string;
  search?: string;
}): Promise<ParentContact[]> {
  const sp = new URLSearchParams();
  if (params?.studentId) sp.set('studentId', params.studentId);
  if (params?.search) sp.set('search', params.search);
  return apiGet<ParentContact[]>(`/api/parents?${sp.toString()}`);
}

export function createParentContact(data: ParentContactInput): Promise<ParentContact> {
  return apiPost<ParentContact>('/api/parents', data);
}

export function updateParentContact(id: string, data: Partial<ParentContactInput>): Promise<ParentContact> {
  return apiPut<ParentContact>(`/api/parents/${id}`, data);
}

export function deleteParentContact(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/parents/${id}`);
}

export function listParentMessages(params?: {
  teacherId?: string;
  parentId?: string;
  studentId?: string;
  category?: string;
  status?: string;
  cursor?: string;
  limit?: number;
}): Promise<ParentMessageListResponse> {
  const sp = new URLSearchParams();
  if (params?.teacherId) sp.set('teacherId', params.teacherId);
  if (params?.parentId) sp.set('parentId', params.parentId);
  if (params?.studentId) sp.set('studentId', params.studentId);
  if (params?.category) sp.set('category', params.category);
  if (params?.status) sp.set('status', params.status);
  if (params?.cursor) sp.set('cursor', params.cursor);
  if (params?.limit) sp.set('limit', String(params.limit));
  return apiGet<ParentMessageListResponse>(`/api/parent-messages?${sp.toString()}`);
}

export function createParentMessage(data: ParentMessageInput): Promise<ParentMessage> {
  return apiPost<ParentMessage>('/api/parent-messages', data);
}

export function updateParentMessage(id: string, data: ParentMessageUpdate): Promise<ParentMessage> {
  return apiPut<ParentMessage>(`/api/parent-messages/${id}`, data);
}

export function deleteParentMessage(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/parent-messages/${id}`);
}

/* ── Behavior Tracking ───────────────────────────────────────────── */

export type BehaviorValence = 'positive' | 'negative' | 'neutral';
export type BehaviorSeverity = 'minor' | 'moderate' | 'major';

export interface BehaviorCategory {
  id: string;
  schoolId: string;
  name: string;
  color: string;
  valence: BehaviorValence;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { incidents: number };
}

export interface BehaviorCategoryInput {
  schoolId: string;
  name: string;
  color: string;
  valence: BehaviorValence;
  icon?: string | null;
}

export interface BehaviorIncident {
  id: string;
  studentId: string;
  teacherId: string;
  classGroupId: string | null;
  schoolId: string;
  categoryId: string;
  date: string;
  severity: BehaviorSeverity;
  description: string;
  location: string | null;
  followUpAction: string | null;
  resolved: boolean;
  resolvedAt: string | null;
  resolvedById: string | null;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    deletedAt: string | null;
  };
  teacher: { id: string; firstName: string; lastName: string };
  classGroup: { id: string; name: string; gradeLevel: number } | null;
  category: {
    id: string;
    name: string;
    color: string;
    valence: BehaviorValence;
    icon: string | null;
  };
  resolvedBy: { id: string; firstName: string; lastName: string } | null;
}

export interface BehaviorIncidentInput {
  studentId: string;
  classGroupId?: string | null;
  schoolId: string;
  categoryId: string;
  date: string;
  severity: BehaviorSeverity;
  description: string;
  location?: string | null;
  followUpAction?: string | null;
  resolved?: boolean;
}

export interface BehaviorIncidentUpdate {
  studentId?: string;
  classGroupId?: string | null;
  categoryId?: string;
  date?: string;
  severity?: BehaviorSeverity;
  description?: string;
  location?: string | null;
  followUpAction?: string | null;
  resolved?: boolean;
}

export function fetchBehaviorCategories(schoolId: string): Promise<BehaviorCategory[]> {
  const sp = new URLSearchParams();
  sp.set('schoolId', schoolId);
  return apiGet<BehaviorCategory[]>(`/api/behavior-categories?${sp.toString()}`);
}

export function createBehaviorCategory(data: BehaviorCategoryInput): Promise<BehaviorCategory> {
  return apiPost<BehaviorCategory>('/api/behavior-categories', data);
}

export function updateBehaviorCategory(
  id: string,
  data: Partial<BehaviorCategoryInput>
): Promise<BehaviorCategory> {
  return apiPut<BehaviorCategory>(`/api/behavior-categories/${id}`, data);
}

export function deleteBehaviorCategory(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/behavior-categories/${id}`);
}

export function fetchBehaviorIncidents(filters?: {
  schoolId?: string;
  studentId?: string;
  classGroupId?: string;
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  severity?: string;
  resolved?: string;
  teacherId?: string;
}): Promise<BehaviorIncident[]> {
  const sp = new URLSearchParams();
  if (filters?.schoolId) sp.set('schoolId', filters.schoolId);
  if (filters?.studentId) sp.set('studentId', filters.studentId);
  if (filters?.classGroupId) sp.set('classGroupId', filters.classGroupId);
  if (filters?.dateFrom) sp.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) sp.set('dateTo', filters.dateTo);
  if (filters?.categoryId) sp.set('categoryId', filters.categoryId);
  if (filters?.severity) sp.set('severity', filters.severity);
  if (filters?.resolved) sp.set('resolved', filters.resolved);
  if (filters?.teacherId) sp.set('teacherId', filters.teacherId);
  return apiGet<BehaviorIncident[]>(`/api/behavior-incidents?${sp.toString()}`);
}

export function createBehaviorIncident(data: BehaviorIncidentInput): Promise<BehaviorIncident> {
  return apiPost<BehaviorIncident>('/api/behavior-incidents', data);
}

export function updateBehaviorIncident(
  id: string,
  data: BehaviorIncidentUpdate
): Promise<BehaviorIncident> {
  return apiPut<BehaviorIncident>(`/api/behavior-incidents/${id}`, data);
}

export function deleteBehaviorIncident(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/behavior-incidents/${id}`);
}

/* ── Rubric Library ───────────────────────────────────────────────── */

export interface RubricLevel {
  id: string;
  criterionId: string;
  label: string;
  description: string;
  points: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface RubricCriterion {
  id: string;
  rubricId: string;
  name: string;
  description: string | null;
  weight: number;
  maxPoints: number;
  order: number;
  createdAt: string;
  updatedAt: string;
  levels: RubricLevel[];
}

export interface Rubric {
  id: string;
  schoolId: string;
  teacherId: string;
  subjectId: string | null;
  title: string;
  description: string | null;
  type: string; // ANALYTIC | HOLISTIC
  maxPoints: number;
  isPublic: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  criteria: RubricCriterion[];
  teacher?: { id: string; firstName: string; lastName: string };
  subject?: { id: string; name: string } | null;
}

export interface RubricLevelInput {
  id?: string;
  label: string;
  description: string;
  points: number;
  order?: number;
}

export interface RubricCriterionInput {
  id?: string;
  name: string;
  description?: string | null;
  weight?: number;
  maxPoints: number;
  order?: number;
  levels: RubricLevelInput[];
}

export interface RubricInput {
  schoolId: string;
  title: string;
  description?: string | null;
  type?: 'ANALYTIC' | 'HOLISTIC';
  subjectId?: string | null;
  maxPoints?: number;
  isPublic?: boolean;
  criteria: RubricCriterionInput[];
}

export interface RubricUpdateInput {
  title?: string;
  description?: string | null;
  type?: 'ANALYTIC' | 'HOLISTIC';
  subjectId?: string | null;
  maxPoints?: number;
  isPublic?: boolean;
  criteria?: RubricCriterionInput[];
}

export function fetchRubrics(schoolId: string, teacherId?: string, subjectId?: string): Promise<Rubric[]> {
  const sp = new URLSearchParams();
  sp.set('schoolId', schoolId);
  if (teacherId) sp.set('teacherId', teacherId);
  if (subjectId) sp.set('subjectId', subjectId);
  return apiGet<Rubric[]>(`/api/rubrics?${sp.toString()}`);
}

export function fetchRubric(id: string): Promise<Rubric> {
  return apiGet<Rubric>(`/api/rubrics/${id}`);
}

export function createRubric(data: RubricInput): Promise<Rubric> {
  return apiPost<Rubric>('/api/rubrics', data);
}

export function updateRubric(id: string, data: RubricUpdateInput): Promise<Rubric> {
  return apiPut<Rubric>(`/api/rubrics/${id}`, data);
}

export function deleteRubric(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/rubrics/${id}`);
}

export function duplicateRubric(id: string): Promise<Rubric> {
  return apiPost<Rubric>(`/api/rubrics/${id}/duplicate`);
}

/* ── Rubric Templates & Grading ───────────────────────────────────── */

export interface RubricTemplate {
  id: string;
  title: string;
  description: string;
  subject: string;
  type: 'ANALYTIC' | 'HOLISTIC';
  maxPoints: number;
  criteria: Array<{
    name: string;
    description: string;
    weight: number;
    maxPoints: number;
    levels: Array<{ label: string; description: string; points: number }>;
  }>;
}

export function fetchRubricTemplates(subject?: string): Promise<RubricTemplate[]> {
  const sp = new URLSearchParams();
  if (subject && subject !== 'all') sp.set('subject', subject);
  return apiGet<RubricTemplate[]>(`/api/rubrics/templates?${sp.toString()}`);
}

export interface RubricGradeResult {
  rubricId: string;
  studentId: string;
  finalScore: number;
  maxPoints: number;
  overallPercentage: number;
  grade: number;
  gradeLabel: string;
  criterionBreakdown: Array<{
    criterionId: string;
    criterionName: string;
    maxPoints: number;
    earnedPoints: number;
    selectedLevel: { id: string; label: string; description: string } | null;
    percentage: number;
  }>;
}

export function gradeWithRubric(rubricId: string, data: {
  studentId: string;
  scores: Array<{ criterionId: string; levelId: string; points: number }>;
  note?: string;
}): Promise<RubricGradeResult> {
  return apiPost<RubricGradeResult>(`/api/rubrics/${rubricId}/grade`, data);
}

export interface RubricAnalytics {
  rubricId: string;
  rubricTitle: string;
  criteriaAnalytics: Array<{
    criterionId: string;
    criterionName: string;
    maxPoints: number;
    weight: number;
    classAverage: number;
    classMedian: number;
    highestScore: number;
    lowestScore: number;
    levelDistribution: Array<{
      levelId: string;
      label: string;
      points: number;
      description: string;
      percentage: number;
    }>;
  }>;
  gradeDistribution: Array<{
    grade: string;
    range: string;
    count: number;
    color: string;
  }>;
  overallStats: {
    averagePercentage: number;
    totalAssessments: number;
    totalStudents: number;
    totalMaxPoints: number;
    averageScore: number;
  };
}

export function fetchRubricAnalytics(rubricId: string): Promise<RubricAnalytics> {
  return apiGet<RubricAnalytics>(`/api/rubrics/${rubricId}/analytics`);
}

/* ── Curriculum Standards ─────────────────────────────────────────── */

export interface CurriculumStandard {
  id: string;
  schoolId: string;
  subjectId: string | null;
  code: string;
  title: string;
  description: string | null;
  gradeLevel: number | null;
  category: string | null;
  source: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  subject: { id: string; name: string } | null;
  competencyLinks: CurriculumStandardLink[];
}

export interface CurriculumStandardLink {
  id: string;
  standardId: string;
  competencyId: string;
  coverageLevel: string | null;
  notes: string | null;
  createdAt: string;
  competency: {
    id: string;
    code: string;
    title: string;
    category: { id: string; name: string; color: string | null } | null;
  };
}

export function fetchCurriculumStandards(schoolId: string, subjectId?: string, gradeLevel?: number): Promise<CurriculumStandard[]> {
  const sp = new URLSearchParams();
  sp.set('schoolId', schoolId);
  if (subjectId && subjectId !== 'all') sp.set('subjectId', subjectId);
  if (gradeLevel) sp.set('gradeLevel', String(gradeLevel));
  return apiGet<CurriculumStandard[]>(`/api/curriculum-standards?${sp.toString()}`);
}

export function fetchCurriculumStandard(id: string): Promise<CurriculumStandard> {
  return apiGet<CurriculumStandard>(`/api/curriculum-standards/${id}`);
}

export function createCurriculumStandard(data: {
  schoolId: string;
  subjectId?: string | null;
  code: string;
  title: string;
  description?: string | null;
  gradeLevel?: number | null;
  category?: string | null;
  source?: string | null;
  isDemo?: boolean;
}): Promise<CurriculumStandard> {
  return apiPost<CurriculumStandard>('/api/curriculum-standards', data);
}

export function updateCurriculumStandard(id: string, data: {
  subjectId?: string | null;
  code?: string;
  title?: string;
  description?: string | null;
  gradeLevel?: number | null;
  category?: string | null;
  source?: string | null;
}): Promise<CurriculumStandard> {
  return apiPut<CurriculumStandard>(`/api/curriculum-standards/${id}`, data);
}

export function deleteCurriculumStandard(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/curriculum-standards/${id}`);
}

export function linkCurriculumStandard(standardId: string, data: {
  competencyId: string;
  coverageLevel?: 'full' | 'partial' | 'related' | null;
  notes?: string | null;
}): Promise<CurriculumStandardLink> {
  return apiPost<CurriculumStandardLink>(`/api/curriculum-standards/${standardId}/links`, data);
}

export function unlinkCurriculumStandard(standardId: string, competencyId: string): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>(`/api/curriculum-standards/${standardId}/links`, {
    action: 'unlink',
    competencyId,
  });
}

export function fetchCurriculumStandardLinks(standardId: string): Promise<CurriculumStandardLink[]> {
  return apiGet<CurriculumStandardLink[]>(`/api/curriculum-standards/${standardId}/links`);
}

/* ── Attendance Analytics ─────────────────────────────────────────── */

export interface AttendanceAnalyticsData {
  trendData: Array<{
    week: string;
    attendanceRate: number;
    absentRate: number;
    present: number;
    absent: number;
    excused: number;
    late: number;
    total: number;
  }>;
  dayOfWeekAnalysis: Array<{
    day: number;
    dayName: string;
    dayNameDe: string;
    attendanceRate: number;
    absentCount: number;
    totalRecords: number;
  }>;
  absencePatterns: Array<{
    studentId: string;
    firstName: string;
    lastName: string;
    present: number;
    absent: number;
    excused: number;
    late: number;
    total: number;
    absenceRate: number;
    attendanceRate: number;
  }>;
  riskIndicators: Array<{
    studentId: string;
    firstName: string;
    lastName: string;
    absenceRate: number;
    totalAbsences: number;
    totalSessions: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }>;
  classComparison: Array<{
    classGroupId: string;
    className: string;
    gradeLevel: number;
    present: number;
    absent: number;
    excused: number;
    late: number;
    total: number;
    attendanceRate: number;
    absenceRate: number;
  }>;
  statusDistribution: {
    present: number;
    absent: number;
    excused: number;
    late: number;
  };
  totalSessions: number;
  totalRecords: number;
}

export function fetchAttendanceAnalytics(schoolId: string, classGroupId?: string): Promise<AttendanceAnalyticsData> {
  const sp = new URLSearchParams();
  sp.set('schoolId', schoolId);
  if (classGroupId) sp.set('classGroupId', classGroupId);
  return apiGet<AttendanceAnalyticsData>(`/api/attendance/analytics?${sp.toString()}`);
}

/* ── Comment Bank ────────────────────────────────────────────────── */

export interface CommentCategory {
  id: string;
  schoolId: string;
  name: string;
  color: string;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { comments: number };
}

export interface CommentCategoryInput {
  schoolId: string;
  name: string;
  color: string;
  icon?: string | null;
}

export interface CommentBankEntry {
  id: string;
  schoolId: string;
  teacherId: string;
  categoryId: string;
  subjectId: string | null;
  title: string;
  text: string;
  gradeLevel: string | null;
  schoolType: string | null;
  isPublic: boolean;
  usageCount: number;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
  teacher: { id: string; firstName: string; lastName: string };
  category: { id: string; name: string; color: string; icon: string | null };
  subject: { id: string; name: string } | null;
}

export interface CommentBankEntryInput {
  schoolId: string;
  categoryId: string;
  subjectId?: string | null;
  title: string;
  text: string;
  gradeLevel?: string | null;
  schoolType?: string | null;
  isPublic?: boolean;
  tags?: string | null;
}

export interface CommentBankEntryUpdate {
  categoryId?: string;
  subjectId?: string | null;
  title?: string;
  text?: string;
  gradeLevel?: string | null;
  schoolType?: string | null;
  isPublic?: boolean;
  tags?: string | null;
  incrementUsage?: boolean;
}

export function fetchCommentCategories(schoolId: string): Promise<CommentCategory[]> {
  const sp = new URLSearchParams();
  sp.set('schoolId', schoolId);
  return apiGet<CommentCategory[]>(`/api/comment-categories?${sp.toString()}`);
}

export function createCommentCategory(data: CommentCategoryInput): Promise<CommentCategory> {
  return apiPost<CommentCategory>('/api/comment-categories', data);
}

export function updateCommentCategory(
  id: string,
  data: Partial<CommentCategoryInput>
): Promise<CommentCategory> {
  return apiPut<CommentCategory>(`/api/comment-categories/${id}`, data);
}

export function deleteCommentCategory(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/comment-categories/${id}`);
}

export function fetchCommentBank(filters?: {
  schoolId?: string;
  teacherId?: string;
  subjectId?: string;
  categoryId?: string;
  search?: string;
  gradeLevel?: string;
  isPublic?: string;
}): Promise<CommentBankEntry[]> {
  const sp = new URLSearchParams();
  if (filters?.schoolId) sp.set('schoolId', filters.schoolId);
  if (filters?.teacherId) sp.set('teacherId', filters.teacherId);
  if (filters?.subjectId) sp.set('subjectId', filters.subjectId);
  if (filters?.categoryId) sp.set('categoryId', filters.categoryId);
  if (filters?.search) sp.set('search', filters.search);
  if (filters?.gradeLevel) sp.set('gradeLevel', filters.gradeLevel);
  if (filters?.isPublic) sp.set('isPublic', filters.isPublic);
  return apiGet<CommentBankEntry[]>(`/api/comment-bank?${sp.toString()}`);
}

export function createCommentBankEntry(data: CommentBankEntryInput): Promise<CommentBankEntry> {
  return apiPost<CommentBankEntry>('/api/comment-bank', data);
}

export function updateCommentBankEntry(
  id: string,
  data: CommentBankEntryUpdate
): Promise<CommentBankEntry> {
  return apiPut<CommentBankEntry>(`/api/comment-bank/${id}`, data);
}

export function deleteCommentBankEntry(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/comment-bank/${id}`);
}

/* ── Notifications ─────────────────────────────────────────────────── */

export interface AssessmentNotification {
  id: string;
  type: 'assessment';
  title: string;
  description: string;
  daysUntil: number;
  timestamp: string;
  classGroupId: string;
  subjectId: string;
  assessmentId: string;
  isRead: boolean;
}

export interface MissingObservationNotification {
  id: string;
  type: 'missing_observation';
  title: string;
  description: string;
  daysSince: number;
  timestamp: string;
  studentId: string;
  classGroupId: string;
  isRead: boolean;
}

/** @deprecated Use DBNotification instead */
export interface NotificationData {
  upcomingAssessments: AssessmentNotification[];
  missingObservations: MissingObservationNotification[];
  unreadCount: number;
}

/** New DB-backed notification type */
export interface DBNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl: string | null;
  relatedId: string | null;
  createdAt: string;
}

export interface DBNotificationData {
  notifications: DBNotification[];
  unreadCount: number;
}

export function fetchNotifications(): Promise<NotificationData> {
  return apiGet<NotificationData>('/api/notifications');
}

export function fetchDBNotifications(): Promise<DBNotificationData> {
  return apiGet<DBNotificationData>('/api/notifications');
}

export function markServerNotificationsRead(ids: string[]): Promise<{ success: boolean }> {
  return apiPut<{ success: boolean }>('/api/notifications', { ids });
}

export function markAllNotificationsRead(): Promise<{ success: boolean }> {
  return apiPut<{ success: boolean }>('/api/notifications', { markAll: true });
}

export function markSingleNotificationRead(id: string): Promise<{ success: boolean }> {
  return apiPut<{ success: boolean }>('/api/notifications', { ids: [id] });
}

export function createNotification(data: {
  schoolId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  relatedId?: string;
}): Promise<{ notification: DBNotification }> {
  return apiPost<{ notification: DBNotification }>('/api/notifications', data);
}

export function deleteNotifications(ids?: string[]): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/notifications${ids ? `?ids=${ids.join(',')}` : ''}`);
}

/* ── Batch Delete & Reorder ─────────────────────────────────────────── */

export async function deleteBatchProgressEntries(ids: string[]): Promise<void> {
  await apiRequest<{ deleted: number }>('/api/learning-progress/batch', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  });
}

export async function reorderStudents(classGroupId: string, studentIds: string[]): Promise<void> {
  await apiPut<{ success: boolean }>('/api/students/reorder', { classGroupId, studentIds });
}

/* ── Parent Links ────────────────────────────────────────────────────── */

export interface ParentStudentLinkData {
  id: string;
  parentId: string;
  studentId: string;
  schoolId: string;
  relationship: string | null;
  createdAt: string;
  updatedAt: string;
  parent: { id: string; firstName: string; lastName: string; email: string; role: string };
  student: { id: string; firstName: string; lastName: string; dateOfBirth?: string | null; externalId?: string | null; schoolId: string; enrollments?: Array<{ classGroup: { id: string; name: string; gradeLevel: number } }> };
  school: { id: string; name: string };
}

export function fetchParentLinks(parentId?: string): Promise<ParentStudentLinkData[]> {
  const params = new URLSearchParams();
  if (parentId) params.set('parentId', parentId);
  return apiGet<ParentStudentLinkData[]>(`/api/parent-links?${params.toString()}`);
}

export function createParentLink(data: {
  parentId: string;
  studentId: string;
  schoolId: string;
  relationship?: string;
}): Promise<ParentStudentLinkData> {
  return apiPost<ParentStudentLinkData>('/api/parent-links', data);
}

export function updateParentLink(id: string, data: { relationship?: string }): Promise<ParentStudentLinkData> {
  return apiPut<ParentStudentLinkData>(`/api/parent-links/${id}`, data);
}

export function deleteParentLink(id: string): Promise<{ message: string }> {
  return apiDelete<{ message: string }>(`/api/parent-links/${id}`);
}

/* ── Student Account Creation ────────────────────────────────────────── */

export function createStudentUserAccount(data: {
  schoolId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  studentId?: string;
  locale?: string;
}): Promise<Record<string, unknown>> {
  return apiPost<Record<string, unknown>>('/api/users', data);
}

export function bulkCreateStudentAccounts(data: {
  schoolId: string;
  defaultPassword: string;
  studentIds: string[];
  emailDomain?: string;
  locale?: string;
}): Promise<{ created: Array<Record<string, unknown>>; count: number }> {
  return apiPost<{ created: Array<Record<string, unknown>>; count: number }>('/api/users', { ...data, action: 'bulkCreateStudents' });
}

/* ── Report Schedules ──────────────────────────────────────────────── */

export interface ReportScheduleData {
  id: string;
  schoolId: string;
  classGroupId: string | null;
  template: string;
  frequency: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  monthOfYear: number | null;
  recipients: string | null;
  includeStudents: boolean;
  includeGrades: boolean;
  includeAttendance: boolean;
  includeBehavior: boolean;
  includeCompetencies: boolean;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  classGroup?: { id: string; name: string; gradeLevel: number } | null;
}

export function fetchReportSchedules(schoolId: string): Promise<ReportScheduleData[]> {
  return apiGet<ReportScheduleData[]>(`/api/report-schedules?schoolId=${schoolId}`);
}

export function createReportSchedule(data: {
  schoolId: string;
  classGroupId?: string;
  template: string;
  frequency: string;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  monthOfYear?: number | null;
  recipients?: string[];
  includeStudents?: boolean;
  includeGrades?: boolean;
  includeAttendance?: boolean;
  includeBehavior?: boolean;
  includeCompetencies?: boolean;
}): Promise<ReportScheduleData> {
  return apiPost<ReportScheduleData>('/api/report-schedules', data);
}

export function updateReportSchedule(id: string, data: {
  classGroupId?: string;
  template?: string;
  frequency?: string;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  monthOfYear?: number | null;
  recipients?: string[];
  includeStudents?: boolean;
  includeGrades?: boolean;
  includeAttendance?: boolean;
  includeBehavior?: boolean;
  includeCompetencies?: boolean;
  isActive?: boolean;
}): Promise<ReportScheduleData> {
  return apiPut<ReportScheduleData>(`/api/report-schedules/${id}`, data);
}

export function deleteReportSchedule(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/report-schedules/${id}`);
}

export function runReportSchedule(id: string): Promise<{
  success: boolean;
  lastRunAt: string;
  nextRunAt: string;
  recipientsNotified: number;
}> {
  return apiPost(`/api/report-schedules/${id}/run`, {});
}

/* ── School Districts ──────────────────────────────────────────────── */

export interface SchoolDistrictData {
  id: string;
  name: string;
  code: string | null;
  region: string | null;
  country: string;
  adminEmail: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  schools: Array<{ id: string; name: string; schoolType: string; country: string }>;
  schoolCount?: number;
  totalStudents?: number;
}

export function fetchDistricts(): Promise<SchoolDistrictData[]> {
  return apiGet<SchoolDistrictData[]>('/api/districts');
}

export function createDistrict(data: {
  name: string;
  code?: string;
  region?: string;
  country?: string;
  adminEmail?: string;
}): Promise<SchoolDistrictData> {
  return apiPost<SchoolDistrictData>('/api/districts', data);
}

export function updateDistrict(id: string, data: {
  name?: string;
  code?: string;
  region?: string;
  country?: string;
  adminEmail?: string;
  isActive?: boolean;
}): Promise<SchoolDistrictData> {
  return apiPut<SchoolDistrictData>(`/api/districts/${id}`, data);
}

export function deleteDistrict(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/districts/${id}`);
}

export function fetchDistrictSchools(districtId: string): Promise<Array<{
  id: string;
  name: string;
  schoolType: string;
  country: string;
  _count: { students: number; classGroups: number; users: number };
}>> {
  return apiGet(`/api/districts/${districtId}/schools`);
}

export function assignSchoolToDistrict(districtId: string, schoolId: string): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>(`/api/districts/${districtId}/schools`, { schoolId });
}
