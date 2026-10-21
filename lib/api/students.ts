import { ApiError, studentApiFetch } from "./client";
import type {
  AttendanceRecord,
  PerformanceTrend,
  StudentAttendance,
  StudentCases,
  StudentNotification,
  StudentProfile,
  StudentResults,
  StudentTimetable,
} from "./types";

export function getStudentProfile() {
  return studentApiFetch<StudentProfile>("/students/me/profile");
}

export function getStudentTimetable() {
  return studentApiFetch<StudentTimetable>("/students/me/timetable");
}

export function getStudentResults() {
  return studentApiFetch<StudentResults>("/students/me/results");
}

export function getStudentAttendance() {
  return studentApiFetch<StudentAttendance>("/students/me/attendance");
}

export type TrendWindow = "week" | "month" | "3m" | "6m" | "1y";

export function getPerformanceTrend(metric: "results" | "attendance", window: TrendWindow) {
  const params = new URLSearchParams({ metric, window });
  return studentApiFetch<PerformanceTrend>(`/students/me/performance-trend?${params.toString()}`);
}

export function getStudentCases() {
  return studentApiFetch<StudentCases>("/students/me/cases");
}

export function listMyNotifications() {
  return studentApiFetch<StudentNotification[]>("/notifications/me");
}

export function markNotificationRead(notificationId: string) {
  return studentApiFetch<{ id: string }>(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "PUT",
  });
}

export function markAllNotificationsRead() {
  return studentApiFetch<{ marked: number }>("/notifications/read-all", { method: "PUT" });
}

/**
 * Binary download: bypasses studentApiFetch (JSON-only) and fetches the PDF
 * through the proxy with the session cookies.
 */
export async function downloadResultPdf(examId: string): Promise<Blob> {
  const response = await fetch(`/api/backend/students/me/results/${encodeURIComponent(examId)}/pdf`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new ApiError(body || `Download failed with status ${response.status}`, response.status);
  }
  const blob = await response.blob();
  if (blob.size === 0) throw new ApiError("Downloaded file is empty", response.status);
  return blob;
}

// Re-exported for callers that need the row shapes without importing types.ts.
export type { AttendanceRecord };
