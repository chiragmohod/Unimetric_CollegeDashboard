import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileCheck2, Lock, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Toast, type ToastData } from '@/components/ui/toast';
import { getStoredUser } from '@/lib/auth';
import {
  listFaculty,
  listResultMarks,
  listResultSemesterStatus,
  listResultSubjects,
  listStudents,
  publishResultSubject,
  saveResultMark,
  scheduleResultSemesterPublish,
  type Faculty,
  type ResultMark,
  type ResultSemesterStatus,
  type ResultSubject,
  type Student,
} from '@/lib/api';
import {
  buildResultSummary,
  calculateCgpa,
  calculateSgpi,
  getStudentsForClassSemester,
  isSemesterPublished,
} from '@/lib/results';

type DraftRow = {
  internalMarks: number;
  externalMarks: number;
};

export default function ResultsPage() {
  const user = getStoredUser();
  const [students, setStudents] = useState<Student[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<ResultSubject[]>([]);
  const [marks, setMarks] = useState<ResultMark[]>([]);
  const [statuses, setStatuses] = useState<ResultSemesterStatus[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [scheduledPublishAt, setScheduledPublishAt] = useState('');
  const [draftRows, setDraftRows] = useState<Record<string, DraftRow>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    async function load() {
      const [studentData, facultyData, subjectData, markData, statusData] = await Promise.all([
        listStudents(),
        listFaculty(),
        listResultSubjects(),
        listResultMarks(),
        listResultSemesterStatus(),
      ]);

      setStudents(studentData);
      setFaculty(facultyData);
      setSubjects(subjectData);
      setMarks(markData);
      setStatuses(statusData);
    }

    void load();
  }, []);

  const facultySubjects = useMemo(() => subjects.filter((subject) => subject.facultyId === user?.id), [subjects, user?.id]);

  useEffect(() => {
    if (user?.role === 'faculty' && facultySubjects[0] && !selectedSubjectId) {
      setSelectedSubjectId(facultySubjects[0].id);
    }
  }, [facultySubjects, selectedSubjectId, user?.role]);

  const selectedFacultySubject = facultySubjects.find((subject) => subject.id === selectedSubjectId) ?? facultySubjects[0];

  useEffect(() => {
    if (user?.role === 'student') {
      setSelectedSemester(user.subjects.length > 0 ? selectedSemester : students.find((student) => student.id === user.id)?.semester ?? 1);
    }
  }, [selectedSemester, students, user]);

  useEffect(() => {
    if (!selectedFacultySubject) return;

    const classStudents = getStudentsForClassSemester(students, selectedFacultySubject.className, selectedFacultySubject.semester);
    const nextDraft: Record<string, DraftRow> = {};

    for (const student of classStudents) {
      const existingMark = marks.find((mark) => mark.studentId === student.id && mark.subjectId === selectedFacultySubject.id);
      nextDraft[student.id] = {
        internalMarks: existingMark?.internalMarks ?? 0,
        externalMarks: existingMark?.externalMarks ?? 0,
      };
    }

    setDraftRows(nextDraft);
  }, [marks, selectedFacultySubject, students]);

  const allClasses = useMemo(() => Array.from(new Set(subjects.map((subject) => subject.className))).sort(), [subjects]);

  useEffect(() => {
    if ((user?.role === 'admin' || user?.role === 'student') && allClasses[0] && !selectedClass) {
      setSelectedClass(user?.role === 'student' ? user.classes[0] ?? allClasses[0] : allClasses[0]);
    }
  }, [allClasses, selectedClass, user?.classes, user?.role]);

  const classForView = user?.role === 'student' ? user.classes[0] ?? '' : selectedClass;

  const availableSemesters = useMemo(
    () =>
      (Array.from(
        new Set(subjects.filter((subject) => subject.className === classForView).map((subject) => subject.semester))
      ) as number[]).sort((first, second) => first - second),
    [classForView, subjects]
  );

  useEffect(() => {
    const preferredSemester =
      user?.role === 'student' ? students.find((student) => student.id === user.id)?.semester ?? availableSemesters[0] : availableSemesters[0];

    if (preferredSemester && !availableSemesters.includes(selectedSemester)) {
      setSelectedSemester(preferredSemester);
    }
  }, [availableSemesters, selectedSemester, students, user]);

  const semesterSubjects = useMemo(
    () => subjects.filter((subject) => subject.className === classForView && subject.semester === selectedSemester),
    [classForView, selectedSemester, subjects]
  );

  const semesterStudents = useMemo(
    () => getStudentsForClassSemester(students, classForView, selectedSemester),
    [classForView, selectedSemester, students]
  );

  const marksForSemester = useMemo(
    () => marks.filter((mark) => mark.className === classForView && mark.semester === selectedSemester),
    [classForView, marks, selectedSemester]
  );

  const studentSemesterMarks = useMemo(
    () => marksForSemester.filter((mark) => mark.studentId === user?.id),
    [marksForSemester, user?.id]
  );

  const semesterIsPublished = isSemesterPublished(semesterSubjects);
  const selectedSemesterStatus = useMemo(
    () => statuses.find((item) => item.className === classForView && item.semester === selectedSemester),
    [classForView, selectedSemester, statuses]
  );

  useEffect(() => {
    setScheduledPublishAt(selectedSemesterStatus?.publishAt ? selectedSemesterStatus.publishAt.slice(0, 16) : '');
  }, [selectedSemesterStatus?.publishAt]);

  const handleDraftChange = (studentId: string, field: keyof DraftRow, value: string) => {
    setDraftRows((current) => ({
      ...current,
      [studentId]: {
        ...current[studentId],
        [field]: Number(value),
      },
    }));
  };

  const refreshStatus = async () => {
    const [subjectData, markData, statusData] = await Promise.all([
      listResultSubjects(),
      listResultMarks(),
      listResultSemesterStatus(),
    ]);

    setSubjects(subjectData);
    setMarks(markData);
    setStatuses(statusData);
  };

  const handleSaveFacultyMarks = async () => {
    if (!selectedFacultySubject) return;
    setSaving(true);

    try {
      const classStudents = getStudentsForClassSemester(students, selectedFacultySubject.className, selectedFacultySubject.semester);
      const savedMarks = await Promise.all(
        classStudents.map((student) =>
          saveResultMark({
            studentId: student.id,
            subjectId: selectedFacultySubject.id,
            internalMax: 20,
            internalMarks: draftRows[student.id]?.internalMarks ?? 0,
            externalMax: 80,
            externalMarks: draftRows[student.id]?.externalMarks ?? 0,
            facultyId: selectedFacultySubject.facultyId,
            semester: selectedFacultySubject.semester,
            className: selectedFacultySubject.className,
          })
        )
      );

      setMarks((current) => {
        const untouched = current.filter((mark) => mark.subjectId !== selectedFacultySubject.id);
        return [...untouched, ...savedMarks];
      });
      await refreshStatus();
      setToast({ id: Date.now(), message: 'Marks saved successfully.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedFacultySubject) return;
    await handleSaveFacultyMarks();
    const publishedSubject = await publishResultSubject(selectedFacultySubject.id);
    setSubjects((current) => current.map((subject) => (subject.id === publishedSubject.id ? publishedSubject : subject)));
    setMarks((current) => current.map((mark) => (mark.subjectId === publishedSubject.id ? { ...mark, published: true } : mark)));
    await refreshStatus();
    setToast({ id: Date.now(), message: 'Subject result published successfully.' });
  };

  const handleSchedulePublish = async () => {
    if (!classForView || !selectedSemester) return;

    const scheduled = await scheduleResultSemesterPublish(
      classForView,
      selectedSemester,
      scheduledPublishAt ? new Date(scheduledPublishAt).toISOString() : null
    );

    setStatuses((current) => {
      const rest = current.filter((item) => !(item.className === scheduled.className && item.semester === scheduled.semester));
      return [...rest, scheduled];
    });
    await refreshStatus();
    setToast({ id: Date.now(), message: scheduledPublishAt ? 'Result publish scheduled.' : 'Result publish schedule cleared.' });
  };

  const renderFacultyView = () => {
    if (!selectedFacultySubject) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-sm text-gray-500">
            No result subjects are assigned to this faculty account yet.
          </CardContent>
        </Card>
      );
    }

    const classStudents = getStudentsForClassSemester(students, selectedFacultySubject.className, selectedFacultySubject.semester);
    const isPublished = selectedFacultySubject.published;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Marks Entry</CardTitle>
              <CardDescription>
                Enter internal and external marks for every student in your assigned semester subject. Publishing locks all edits.
              </CardDescription>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => void handleSaveFacultyMarks()} disabled={saving || isPublished}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button onClick={() => void handlePublish()} disabled={saving || isPublished}>
                <FileCheck2 className="mr-2 h-4 w-4" />
                {isPublished ? 'Published' : 'Publish Subject'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <select
                value={selectedFacultySubject.id}
                onChange={(event) => setSelectedSubjectId(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {facultySubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.courseCode} - {subject.courseTitle}
                  </option>
                ))}
              </select>
              <Input value={selectedFacultySubject.className} readOnly />
              <Input value={`Semester ${selectedFacultySubject.semester}`} readOnly />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Internal (20)</TableHead>
                  <TableHead>External (80)</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classStudents.map((student) => {
                  const summary = buildResultSummary({
                    internalMarks: draftRows[student.id]?.internalMarks ?? 0,
                    externalMarks: draftRows[student.id]?.externalMarks ?? 0,
                    credits: selectedFacultySubject.credits,
                  });

                  return (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-xs text-gray-500">Roll {student.rollNo}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={20}
                          value={draftRows[student.id]?.internalMarks ?? 0}
                          onChange={(event) => handleDraftChange(student.id, 'internalMarks', event.target.value)}
                          disabled={isPublished}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={80}
                          value={draftRows[student.id]?.externalMarks ?? 0}
                          onChange={(event) => handleDraftChange(student.id, 'externalMarks', event.target.value)}
                          disabled={isPublished}
                        />
                      </TableCell>
                      <TableCell>{summary.totalMarks}</TableCell>
                      <TableCell>{summary.grade}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderStudentView = () => {
    const studentMarksBySubject = semesterSubjects.map((subject) => ({
      subject,
      mark: studentSemesterMarks.find((mark) => mark.subjectId === subject.id),
    }));

    const sgpiData = calculateSgpi(studentSemesterMarks);
    const cgpa = calculateCgpa(marks.filter((mark) => mark.studentId === user?.id && mark.published));

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Semester Result</CardTitle>
              <CardDescription>
                Grade card for {classForView} semester {selectedSemester}
              </CardDescription>
            </div>
            <div className="flex gap-3">
              <select
                value={selectedSemester}
                onChange={(event) => setSelectedSemester(Number(event.target.value))}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {availableSemesters.map((semester) => (
                  <option key={semester} value={semester}>
                    Semester {semester}
                  </option>
                ))}
              </select>
              <Button variant="outline" onClick={() => window.print()} disabled={!semesterIsPublished}>
                <Download className="mr-2 h-4 w-4" />
                Download Grade Card
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!semesterIsPublished ? (
              <div className="flex items-center rounded-lg border border-dashed p-6 text-sm text-gray-600">
                <Lock className="mr-3 h-4 w-4 text-amber-600" />
                Result not published yet for this semester.
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course Code</TableHead>
                      <TableHead>Course Title</TableHead>
                      <TableHead>I</TableHead>
                      <TableHead>E</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>GP</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>C x GP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentMarksBySubject.map(({ subject, mark }) => (
                      <TableRow key={subject.id}>
                        <TableCell>{subject.courseCode}</TableCell>
                        <TableCell>{subject.courseTitle}</TableCell>
                        <TableCell>{mark?.internalMarks ?? '-'}</TableCell>
                        <TableCell>{mark?.externalMarks ?? '-'}</TableCell>
                        <TableCell>{mark?.totalMarks ?? '-'}</TableCell>
                        <TableCell>{mark?.grade ?? '-'}</TableCell>
                        <TableCell>{mark?.gradePoints ?? '-'}</TableCell>
                        <TableCell>{subject.credits}</TableCell>
                        <TableCell>{mark?.creditGradePoints ?? '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{sgpiData.totalCredits}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Grade Points</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{sgpiData.totalGradePoints}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">SGPI</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-indigo-600">{sgpiData.sgpi}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">CGPA</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-emerald-600">{cgpa}</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderAdminView = () => {
    const adminStudentSummaries = semesterStudents.map((student) => {
      const studentMarks = marksForSemester.filter((mark) => mark.studentId === student.id);
      return {
        student,
        ...calculateSgpi(studentMarks),
        cgpa: calculateCgpa(marks.filter((mark) => mark.studentId === student.id && mark.published)),
        publishedSubjects: studentMarks.filter((mark) => mark.published).length,
      };
    });

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Results Overview</CardTitle>
            <CardDescription>View semester-wise readiness, faculty completion, scheduled publication, and student SGPI/CGPA.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <select
                value={selectedClass}
                onChange={(event) => setSelectedClass(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {allClasses.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
              <select
                value={selectedSemester}
                onChange={(event) => setSelectedSemester(Number(event.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {availableSemesters.map((semester) => (
                  <option key={semester} value={semester}>
                    Semester {semester}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Subjects</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{semesterSubjects.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{semesterStudents.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Result Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${semesterIsPublished ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {semesterIsPublished ? 'Published' : selectedSemesterStatus?.allSubjectsReady ? 'Ready' : 'Pending'}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border border-indigo-100 bg-indigo-50/40 shadow-none">
              <CardHeader>
                <CardTitle>Principal Publish Control</CardTitle>
                <CardDescription>
                  Schedule semester publishing and monitor which faculty members are still left to complete marks entry.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-[1fr,auto]">
                  <Input
                    type="datetime-local"
                    value={scheduledPublishAt}
                    onChange={(event) => setScheduledPublishAt(event.target.value)}
                  />
                  <Button onClick={() => void handleSchedulePublish()}>
                    {scheduledPublishAt ? 'Schedule Publish' : 'Clear Schedule'}
                  </Button>
                </div>
                <div className="rounded-lg border bg-white p-4 text-sm text-gray-600">
                  <p className="font-medium text-gray-900">
                    {selectedSemesterStatus?.publishAt
                      ? `Scheduled publish: ${new Date(selectedSemesterStatus.publishAt).toLocaleString()}`
                      : 'No publish schedule set'}
                  </p>
                  <p className="mt-1">
                    {selectedSemesterStatus?.allSubjectsReady
                      ? 'All faculty are ready for publication.'
                      : `Pending faculty: ${selectedSemesterStatus?.pendingFacultyNames.join(', ') || 'Unknown'}`}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Published Subjects</TableHead>
                  <TableHead>Total Credits</TableHead>
                  <TableHead>SGPI</TableHead>
                  <TableHead>CGPA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminStudentSummaries.map((item) => (
                  <TableRow key={item.student.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{item.student.name}</p>
                        <p className="text-xs text-gray-500">Roll {item.student.rollNo}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.publishedSubjects}/{semesterSubjects.length}
                    </TableCell>
                    <TableCell>{item.totalCredits}</TableCell>
                    <TableCell>{item.sgpi}</TableCell>
                    <TableCell>{item.cgpa}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Code</TableHead>
                  <TableHead>Course Title</TableHead>
                  <TableHead>Faculty</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Marks Filled</TableHead>
                  <TableHead>Ready</TableHead>
                  <TableHead>Publish At</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(selectedSemesterStatus?.subjects ?? []).map((item) => (
                  <TableRow key={item.subject.id}>
                    <TableCell>{item.subject.courseCode}</TableCell>
                    <TableCell>{item.subject.courseTitle}</TableCell>
                    <TableCell>{item.facultyName}</TableCell>
                    <TableCell>{item.subject.credits}</TableCell>
                    <TableCell>
                      {item.marksEntered}/{item.expectedStudents}
                    </TableCell>
                    <TableCell className={item.readyToPublish ? 'text-emerald-600' : 'text-amber-600'}>
                      {item.readyToPublish ? 'Ready' : `${item.pendingStudentCount} pending`}
                    </TableCell>
                    <TableCell>{item.subject.publishAt ? new Date(item.subject.publishAt).toLocaleString() : '-'}</TableCell>
                    <TableCell className={item.subject.published ? 'text-emerald-600' : 'text-amber-600'}>
                      {item.subject.published ? 'Published' : 'Pending'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {user?.role === 'faculty' ? 'Marks & Results' : user?.role === 'student' ? 'Results' : 'Results & Marks'}
        </h1>
        <p className="text-gray-500">
          {user?.role === 'faculty'
            ? 'Enter internal and external marks for semester-aware subjects and publish them when they are final.'
            : user?.role === 'student'
              ? 'View your semester result with SGPI and overall CGPA after publication.'
              : 'Monitor marks entry, faculty completion, semester readiness, and scheduled publishing across classrooms.'}
        </p>
      </div>

      {user?.role === 'faculty' && renderFacultyView()}
      {user?.role === 'student' && renderStudentView()}
      {user?.role === 'admin' && renderAdminView()}
    </div>
  );
}
