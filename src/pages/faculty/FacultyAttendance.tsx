import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock, PieChart as PieChartIcon, Save } from 'lucide-react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getStoredUser } from '@/lib/auth';
import {
  createAttendanceSession,
  listAttendance,
  listStudents,
  listTimetable,
  updateAttendanceSession,
  type AttendanceSession,
  type AttendanceStatus,
  type Student,
  type TimetableEntry,
} from '@/lib/api';
import { BLACKLIST_THRESHOLD, summarizeSession, summarizeStudents } from '@/lib/attendance';
import { formatLocalDate, isCurrentTimeInRange } from '@/lib/utils';

const statusMeta: Record<AttendanceStatus, string> = {
  present: 'bg-emerald-100 text-emerald-800',
  absent: 'bg-rose-100 text-rose-800',
  late: 'bg-amber-100 text-amber-800',
};

const chartColors = ['#10b981', '#f59e0b', '#ef4444'];

function formatLectureLabel(entry: TimetableEntry) {
  return `${entry.date} - ${entry.subject} - ${entry.className} - ${entry.startTime}-${entry.endTime}`;
}

function getCurrentTimeValue() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export default function FacultyAttendance() {
  const user = getStoredUser();
  const [students, setStudents] = useState<Student[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSession[]>([]);
  const [selectedTimetableId, setSelectedTimetableId] = useState('');
  const [draftStatuses, setDraftStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    async function load() {
      const [studentData, timetableData, attendanceData] = await Promise.all([
        listStudents(),
        listTimetable(),
        listAttendance(),
      ]);

      setStudents(studentData);
      setTimetable(timetableData);
      setAttendance(attendanceData);
    }

    void load();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const facultyLectures = useMemo(
    () =>
      timetable
        .filter((entry) => entry.facultyId === user?.id)
        .sort((first, second) => `${second.date}${second.startTime}`.localeCompare(`${first.date}${first.startTime}`)),
    [timetable, user?.id]
  );

  const today = formatLocalDate(now);
  const currentTime = getCurrentTimeValue();

  const currentLectures = useMemo(
    () =>
      facultyLectures
        .filter((entry) => entry.date === today && isCurrentTimeInRange(currentTime, entry.startTime, entry.endTime))
        .sort((first, second) => first.startTime.localeCompare(second.startTime)),
    [currentTime, facultyLectures, today]
  );

  const nextLecture = useMemo(
    () =>
      facultyLectures
        .filter((entry) => entry.date > today || (entry.date === today && entry.startTime > currentTime))
        .sort((first, second) => `${first.date}${first.startTime}`.localeCompare(`${second.date}${second.startTime}`))[0],
    [currentTime, facultyLectures, today]
  );

  useEffect(() => {
    if (currentLectures.length === 1 && selectedTimetableId !== currentLectures[0].id) {
      setSelectedTimetableId(currentLectures[0].id);
      return;
    }

    if (currentLectures.length > 1 && !currentLectures.some((entry) => entry.id === selectedTimetableId)) {
      setSelectedTimetableId(currentLectures[0].id);
      return;
    }

    if (currentLectures.length === 0 && selectedTimetableId) {
      setSelectedTimetableId('');
    }
  }, [currentLectures, selectedTimetableId]);

  const selectedLecture = currentLectures.find((entry) => entry.id === selectedTimetableId) ?? currentLectures[0];
  const selectedSession = attendance.find((session) => session.timetableEntryId === selectedLecture?.id);
  const classStudents = useMemo(
    () => students.filter((student) => student.class === selectedLecture?.className),
    [selectedLecture?.className, students]
  );

  useEffect(() => {
    const nextDraft: Record<string, AttendanceStatus> = {};
    for (const student of classStudents) {
      const existing = selectedSession?.records.find((record) => record.studentId === student.id)?.status;
      nextDraft[student.id] = existing ?? 'absent';
    }
    setDraftStatuses(nextDraft);
  }, [classStudents, selectedSession]);

  const facultyStudents = useMemo(
    () => students.filter((student) => user?.classes.includes(student.class)),
    [students, user?.classes]
  );

  const facultyAttendanceSessions = useMemo(
    () => attendance.filter((session) => session.facultyId === user?.id),
    [attendance, user?.id]
  );

  const studentSummaries = useMemo(
    () => summarizeStudents(facultyStudents, facultyAttendanceSessions),
    [facultyAttendanceSessions, facultyStudents]
  );

  const blacklistedStudents = useMemo(
    () =>
      facultyStudents
        .map((student) => ({
          student,
          summary: studentSummaries.get(student.id),
        }))
        .filter((item) => item.summary?.isBlacklisted)
        .sort((first, second) => (first.summary?.attendanceRate ?? 0) - (second.summary?.attendanceRate ?? 0)),
    [facultyStudents, studentSummaries]
  );

  const selectedSessionSummary = selectedLecture
    ? summarizeSession({
        id: selectedSession?.id ?? selectedLecture.id,
        timetableEntryId: selectedLecture.id,
        className: selectedLecture.className,
        subject: selectedLecture.subject,
        facultyId: selectedLecture.facultyId,
        date: selectedLecture.date,
        punchInEnabled: selectedSession?.punchInEnabled ?? false,
        records: classStudents.map((student) => ({
          studentId: student.id,
          status: draftStatuses[student.id] ?? 'absent',
        })),
      })
    : null;

  const chartData = selectedSessionSummary
    ? [
        { name: 'Present', value: selectedSessionSummary.presentCount },
        { name: 'Late', value: selectedSessionSummary.lateCount },
        { name: 'Absent', value: selectedSessionSummary.absentCount },
      ]
    : [];

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setDraftStatuses((current) => ({ ...current, [studentId]: status }));
  };

  const handleTogglePunchIn = async () => {
    if (!selectedLecture) return;

    const payload = {
      timetableEntryId: selectedLecture.id,
      className: selectedLecture.className,
      subject: selectedLecture.subject,
      facultyId: selectedLecture.facultyId,
      date: selectedLecture.date,
      punchInEnabled: !(selectedSession?.punchInEnabled ?? false),
      records: classStudents.map((student) => ({
        studentId: student.id,
        status: draftStatuses[student.id] ?? 'absent',
      })),
    };

    if (selectedSession) {
      const updated = await updateAttendanceSession(selectedSession.id, payload);
      setAttendance((current) => current.map((item) => (item.id === selectedSession.id ? updated : item)));
      return;
    }

    const created = await createAttendanceSession(payload);
    setAttendance((current) => [...current, created]);
  };

  const handleSave = async () => {
    if (!selectedLecture) return;
    setSaving(true);

    const payload = {
      timetableEntryId: selectedLecture.id,
      className: selectedLecture.className,
      subject: selectedLecture.subject,
      facultyId: selectedLecture.facultyId,
      date: selectedLecture.date,
      punchInEnabled: selectedSession?.punchInEnabled ?? false,
      records: classStudents.map((student) => ({
        studentId: student.id,
        status: draftStatuses[student.id] ?? 'absent',
      })),
    };

    try {
      if (selectedSession) {
        const updated = await updateAttendanceSession(selectedSession.id, payload);
        setAttendance((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await createAttendanceSession(payload);
        setAttendance((current) => [...current, created]);
      }
    } finally {
      setSaving(false);
    }
  };

  const activeStudents = facultyStudents.filter((student) => {
    const summary = studentSummaries.get(student.id);
    return summary && summary.attendanceRate >= BLACKLIST_THRESHOLD;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Attendance Center</h1>
          <p className="text-gray-500">Track the live lecture in progress, manage punch-in, and update attendance without scanning your whole timetable.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedSession?.punchInEnabled ? 'destructive' : 'outline'}
            onClick={() => void handleTogglePunchIn()}
            disabled={!selectedLecture}
          >
            <Clock className="mr-2 h-4 w-4" />
            {selectedSession?.punchInEnabled ? 'Stop Punch-in' : 'Activate Punch-in'}
          </Button>
          <Button onClick={() => void handleSave()} disabled={!selectedLecture || saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Attendance'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lectures Tracked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facultyAttendanceSessions.length}</div>
            <p className="mt-1 text-xs text-gray-500">Saved sessions for your classes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{activeStudents}</div>
            <p className="mt-1 text-xs text-gray-500">At or above {BLACKLIST_THRESHOLD}% attendance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Blacklist Watch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{blacklistedStudents.length}</div>
            <p className="mt-1 text-xs text-gray-500">Students below the attendance threshold</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Selected Lecture Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{selectedSessionSummary?.attendanceRate ?? 0}%</div>
            <p className="mt-1 text-xs text-gray-500">Present + late for the chosen lecture</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Current Lecture Attendance</CardTitle>
            <CardDescription>
              {currentLectures.length > 0
                ? 'Only lectures active at the current time are shown here.'
                : 'No lecture is active right now. The next scheduled lecture is shown below for context.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentLectures.length > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Current lecture</label>
                <select
                  value={selectedLecture?.id ?? ''}
                  onChange={(event) => setSelectedTimetableId(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {currentLectures.map((lecture) => (
                    <option key={lecture.id} value={lecture.id}>
                      {formatLectureLabel(lecture)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-600">
              <p className="font-medium text-gray-900">{selectedLecture?.subject ?? 'No lecture active right now'}</p>
              <p className="mt-1">{selectedLecture?.className ?? nextLecture?.className ?? '-'}</p>
              <p>
                {selectedLecture
                  ? `${selectedLecture.date} - ${selectedLecture.startTime}-${selectedLecture.endTime}`
                  : nextLecture
                    ? `Next lecture: ${nextLecture.date} - ${nextLecture.startTime}-${nextLecture.endTime}`
                    : 'No upcoming lecture found'}
              </p>
            </div>

            {selectedLecture ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Overall</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classStudents.map((student) => {
                    const summary = studentSummaries.get(student.id);
                    const status = draftStatuses[student.id] ?? 'absent';

                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.rollNo}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{student.name}</p>
                            {summary?.isBlacklisted && (
                              <p className="text-xs text-rose-600">Blacklist watch: {summary.attendanceRate}%</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{summary?.attendanceRate ?? 0}%</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {(['present', 'late', 'absent'] as AttendanceStatus[]).map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => handleStatusChange(student.id, option)}
                                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                  status === option
                                    ? statusMeta[option]
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                              >
                                {option.charAt(0).toUpperCase() + option.slice(1)}
                              </button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-500">
                Attendance can be marked only during the active lecture window. Come back when the lecture timing is live.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-indigo-600" />
                Live Lecture Snapshot
              </CardTitle>
              <CardDescription>Quick visual overview of who is actively present in the selected lecture.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                      {chartData.map((entry, index) => (
                        <Cell key={entry.name} fill={chartColors[index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                Blacklist Watch
              </CardTitle>
              <CardDescription>Students below {BLACKLIST_THRESHOLD}% attendance across your tracked lectures.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {blacklistedStudents.length === 0 && (
                <div className="rounded-lg border border-dashed p-4 text-sm text-gray-500">
                  No students are currently in the blacklist range.
                </div>
              )}
              {blacklistedStudents.map(({ student, summary }) => (
                <div key={student.id} className="rounded-lg border border-rose-100 bg-rose-50 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-rose-900">{student.name}</p>
                      <p className="text-sm text-rose-700">{student.class} - Roll {student.rollNo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-rose-700">{summary?.attendanceRate ?? 0}%</p>
                      <p className="text-xs text-rose-600">
                        {summary?.attendedLectures ?? 0}/{summary?.totalLectures ?? 0} attended
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
