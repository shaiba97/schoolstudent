import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StudentTimetableSubject } from "@/lib/api/types";

/**
 * Subject–teacher list for the student's class, rendered under the timetable
 * grid on both the timetable page and the dashboard. Unassigned subjects stay
 * visible with a "To be announced" teacher rather than vanishing.
 */
export function SubjectTeachers({ subjects }: { subjects: StudentTimetableSubject[] }) {
  if (subjects.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Subjects & teachers</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-lg border">
        {subjects.map((subject) => (
          <li
            key={subject.subjectId}
            className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2 text-sm"
          >
            <span className="min-w-0 flex-1 truncate font-medium">{subject.subjectName}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {subject.teacherName ?? "To be announced"}
            </span>
          </li>
        ))}
        </ul>
      </CardContent>
    </Card>
  );
}
