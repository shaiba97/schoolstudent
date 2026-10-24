export type StudentGuardianSummary = {
  id: string;
  guardianNumber?: string | null;
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  relationship: string;
  isPrimary: boolean;
  canPickup: boolean;
  emergencyContact: boolean;
};

export type StudentProfile = {
  student: {
    id: string;
    roleNumber: string;
    firstName: string;
    middleName?: string | null;
    lastName?: string | null;
    fullName: string;
    gender?: string | null;
    dateOfBirth?: string | null;
    phone?: string | null;
    email?: string | null;
    photoUrl?: string | null;
    educationLevel?: string | null;
    grade?: number | null;
    status: string;
    admissionDate?: string | null;
  };
  year: { id: string; name: string };
  class: { id: string; className: string; grade?: string | null };
  field?: string | null;
  guardians: StudentGuardianSummary[];
};

export type StudentTimetableEntry = {
  id: string;
  dayOfWeek: string;
  periodNo: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  room?: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
  teacherName?: string | null;
};

export type StudentTimetableSubject = {
  subjectId: string;
  subjectName: string;
  teacherName?: string | null;
};

export type StudentTimetable = {
  year: { id: string; name: string };
  class: { id: string; className: string };
  subjects: StudentTimetableSubject[];
  entries: StudentTimetableEntry[];
};

export type StudentResult = {
  id: string;
  examId: string;
  examName: string;
  examType?: string | null;
  examDate?: string | null;
  subjectId: string;
  subjectName: string;
  className: string;
  marks?: number | null;
  maxMarks: number;
  percentage?: number | null;
  grade?: string | null;
  status: string;
};

export type StudentResults = {
  results: StudentResult[];
  averagePercentage?: number | null;
  count: number;
};

export type AttendanceSummary = {
  present: number;
  absent: number;
  late: number;
  excused: number;
  other: number;
  total: number;
  attended: number;
  percentage?: number | null;
};

export type AttendanceRecord = {
  id: string;
  date: string;
  status: string;
  subjectName?: string | null;
  className?: string | null;
};

export type StudentAttendance = {
  summary: AttendanceSummary;
  records: AttendanceRecord[];
};

export type TrendPoint = { at: string; value?: number | null };

export type PerformanceTrend = {
  metric: "results" | "attendance";
  window: "week" | "month" | "3m" | "6m" | "1y";
  windowDays: number;
  current: { from: string; to: string; average?: number | null; samples: number };
  previous: { from: string; to: string; average?: number | null; samples: number };
  delta?: number | null;
  verdict?: "improving" | "declining" | "stable" | null;
  byType: {
    test: { average?: number | null; samples: number };
    exam: { average?: number | null; samples: number };
  };
  series: TrendPoint[];
};

export type StudentCase = {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  filedAt: string;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
  filedByName: string;
};

export type StudentCases = { cases: StudentCase[] };

export type StudentNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  channel: string;
  status: string;
  readAt?: string | null;
  createdAt: string;
};

export type AuthMe = {
  user: { id: string; email?: string | null; status: string };
  memberships: Array<{
    tenantId: string;
    status: string;
    roles: Array<{ slug: string }>;
  }>;
};

// The shared finance-portal ledger (GET /students/me/finance).
// Shapes mirror backend/src/finance/finance-portal.service.ts getStudentLedger.
export type LedgerFeeRow = { label: string; amount: number; discount: number; net: number };

export type LedgerFee = {
  templateName: string;
  currency: string;
  rows: LedgerFeeRow[];
  total: number;
  totalDiscount: number;
  netTotal: number;
};

export type LedgerInstallment = {
  no: number;
  name: string;
  dueDate?: string | null;
  amount: number;
  discounted: number;
  paid: number;
  remaining: number;
  status: "PAID" | "OVERDUE" | "PARTIAL" | "PENDING";
  overdue: boolean;
};

export type LedgerPayment = {
  id: string;
  ref: string;
  at?: string | null;
  target: string;
  method: string;
  amount: number;
  currencyCode: string;
  by: string;
};

export type StudentFinance = {
  profile: { id: string; name: string; roleNumber: string };
  fee: LedgerFee;
  installments: LedgerInstallment[];
  payments: LedgerPayment[];
  totals: {
    assigned: number;
    paid: number;
    balance: number;
    status: "FULLY_PAID" | "PARTIALLY_PAID" | "OVERDUE";
    currency: string;
  };
};
