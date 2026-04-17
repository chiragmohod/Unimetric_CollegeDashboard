import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import multer from 'multer';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  readDB,
  writeDB,
  type DB,
  type Faculty,
  type Student,
  type AcademicYear,
  type AcademicClass,
  type Location,
  type TimetableEntry,
  type AttendanceSession,
  type AttendanceRecord,
  type FinanceExpense,
  type Notice,
  type DoubtFeedback,
  type ResultSubject,
  type ResultMark,
  type StudyMaterial,
  type OperationLog,
  type DataArchive,
} from './db.js';
import { createSignedStorageUrl, getStorageBucketName, removeFileFromStorage, uploadFileToStorage } from './supabase.js';

const app = express();
app.use(cors());
app.use(express.json());
const __dirname = dirname(fileURLToPath(import.meta.url));
const archiveDirectory = join(__dirname, 'archives');
const PRINCIPAL_KILL_SWITCH_PASSWORD = 'MeowMeow@123';
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

let db: DB = await readDB();

async function persist() {
  await writeDB(db);
}

function getGradeMeta(totalMarks: number) {
  if (totalMarks >= 90) return { grade: 'O', gradePoints: 10 };
  if (totalMarks >= 80) return { grade: 'A+', gradePoints: 9 };
  if (totalMarks >= 70) return { grade: 'A', gradePoints: 8 };
  if (totalMarks >= 60) return { grade: 'B+', gradePoints: 7 };
  if (totalMarks >= 50) return { grade: 'B', gradePoints: 6 };
  if (totalMarks >= 45) return { grade: 'C', gradePoints: 5 };
  if (totalMarks >= 40) return { grade: 'D', gradePoints: 4 };
  return { grade: 'F', gradePoints: 0 };
}

const ADMIN_CREDENTIALS = {
  id: 'admin-1',
  name: 'Admin User',
  username: 'admin',
  password: '12345678',
  role: 'admin' as const,
};

function sanitizeFaculty(faculty: Faculty) {
  const { password, ...rest } = faculty;
  return rest;
}

function sanitizeStudent(student: Student) {
  const { password, ...rest } = student;
  return rest;
}

function findAuthUser(role: 'admin' | 'faculty' | 'student', userId: string) {
  if (role === 'admin') {
    return userId === ADMIN_CREDENTIALS.id
      ? {
          id: ADMIN_CREDENTIALS.id,
          name: ADMIN_CREDENTIALS.name,
          role: ADMIN_CREDENTIALS.role,
          classes: [] as string[],
          subjects: [] as string[],
        }
      : null;
  }

  if (role === 'faculty') {
    const faculty = db.faculty.find((item) => item.id === userId);
    return faculty
      ? {
          id: faculty.id,
          name: faculty.name,
          role: 'faculty' as const,
          classes: faculty.classes,
          subjects: faculty.subjects,
        }
      : null;
  }

  const student = db.students.find((item) => item.id === userId);
  return student
    ? {
        id: student.id,
        name: student.name,
        role: 'student' as const,
        classes: [student.class],
        subjects: [] as string[],
      }
    : null;
}

function canAccessMaterial(material: StudyMaterial, role: 'admin' | 'faculty' | 'student', userId: string) {
  const user = findAuthUser(role, userId);
  if (!user) {
    return false;
  }

  if (role === 'admin') {
    return true;
  }

  if (role === 'faculty') {
    return material.uploadedById === user.id || (user.classes.includes(material.className) && user.subjects.includes(material.subject));
  }

  return user.classes.includes(material.className);
}

function buildMaterialStoragePath(materialId: string, className: string, subject: string, fileName: string) {
  const safeSegment = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const extension = fileName.includes('.') ? fileName.split('.').pop() : 'bin';
  const baseName = fileName.replace(/\.[^/.]+$/, '');

  return `materials/${safeSegment(className)}/${safeSegment(subject)}/${materialId}-${safeSegment(baseName)}.${extension}`;
}

function appendLog(input: Omit<OperationLog, 'id' | 'createdAt'>) {
  const entry: OperationLog = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };

  db.logs.unshift(entry);
  db.logs = db.logs.slice(0, 500);
}

function getStudentsForClassSemester(className: string, semester: number) {
  return db.students.filter((student) => student.class === className && student.semester === semester);
}

function buildResultSubjectStatus(subject: ResultSubject) {
  const expectedStudents = getStudentsForClassSemester(subject.className, subject.semester);
  const marksEntered = db.resultMarks.filter((mark) => mark.subjectId === subject.id).length;
  const completionRate =
    expectedStudents.length === 0 ? 0 : Number(((marksEntered / expectedStudents.length) * 100).toFixed(2));
  const facultyName = db.faculty.find((item) => item.id === subject.facultyId)?.name ?? 'Unknown faculty';

  return {
    subject,
    expectedStudents: expectedStudents.length,
    marksEntered,
    completionRate,
    readyToPublish: expectedStudents.length > 0 && marksEntered >= expectedStudents.length,
    pendingStudentCount: Math.max(expectedStudents.length - marksEntered, 0),
    facultyName,
  };
}

function buildResultSemesterStatus(className: string, semester: number) {
  const semesterSubjects = db.resultSubjects.filter(
    (subject) => subject.className === className && subject.semester === semester
  );
  const subjectStatuses = semesterSubjects.map(buildResultSubjectStatus);
  const pendingFacultyNames = Array.from(
    new Set(subjectStatuses.filter((item) => !item.readyToPublish).map((item) => item.facultyName))
  );
  const pendingFacultyIds = Array.from(
    new Set(subjectStatuses.filter((item) => !item.readyToPublish).map((item) => item.subject.facultyId))
  );

  return {
    className,
    semester,
    publishAt: semesterSubjects[0]?.publishAt ?? null,
    allSubjectsReady: subjectStatuses.length > 0 && subjectStatuses.every((item) => item.readyToPublish),
    allSubjectsPublished: subjectStatuses.length > 0 && subjectStatuses.every((item) => item.subject.published),
    pendingFacultyIds,
    pendingFacultyNames,
    subjects: subjectStatuses,
  };
}

async function processScheduledResultPublications() {
  const now = new Date().toISOString();
  let changed = false;

  db.resultSubjects = db.resultSubjects.map((subject) => {
    if (!subject.publishAt || subject.published || subject.publishAt > now) {
      return subject;
    }

    changed = true;
    return {
      ...subject,
      published: true,
    };
  });

  if (!changed) {
    return;
  }

  const publishedSubjectIds = new Set(
    db.resultSubjects.filter((subject) => subject.published).map((subject) => subject.id)
  );

  db.resultMarks = db.resultMarks.map((mark) =>
    publishedSubjectIds.has(mark.subjectId)
      ? {
          ...mark,
          published: true,
        }
      : mark
  );

  await persist();
}

function buildArchiveSummary(snapshot: DB): DataArchive['summary'] {
  return {
    classes: snapshot.academicYear.classes.length,
    faculty: snapshot.faculty.length,
    students: snapshot.students.length,
    locations: snapshot.locations.length,
    timetableEntries: snapshot.timetable.length,
    attendanceSessions: snapshot.attendance.length,
    notices: snapshot.notices.length,
    doubts: snapshot.doubts.length,
    resultSubjects: snapshot.resultSubjects.length,
    resultMarks: snapshot.resultMarks.length,
    studyMaterials: snapshot.studyMaterials.length,
    financeExpenses: snapshot.finance.expenses.length,
    financeRevenues: snapshot.finance.revenues.length,
  };
}

async function archiveCurrentDatabase(): Promise<DataArchive> {
  const archiveId = randomUUID();
  const createdAt = new Date().toISOString();
  const safeYear = db.academicYear.year.trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'academic-year';
  const fileName = `${safeYear}-${createdAt.replace(/[:.]/g, '-')}-${archiveId}.json`;
  const filePath = join(archiveDirectory, fileName);

  await fs.mkdir(archiveDirectory, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(db, null, 2), 'utf-8');

  const archive: DataArchive = {
    id: archiveId,
    format: 'json-snapshot',
    fileName,
    filePath,
    createdAt,
    createdById: ADMIN_CREDENTIALS.id,
    createdByName: ADMIN_CREDENTIALS.name,
    createdByRole: 'admin',
    academicYearLabel: db.academicYear.year,
    summary: buildArchiveSummary(db),
  };

  return archive;
}

async function deleteStoredStudyMaterials(materials: StudyMaterial[]) {
  for (const material of materials) {
    await removeFileFromStorage(material.filePath);
  }
}

function createResetDatabase(previous: DB, archive: DataArchive): DB {
  const resetLog: OperationLog = {
    id: randomUUID(),
    action: 'kill-switch',
    entity: 'academic-year',
    message: `Kill switch executed. Live data wiped after archive ${archive.fileName} was created.`,
    actorId: ADMIN_CREDENTIALS.id,
    actorName: ADMIN_CREDENTIALS.name,
    actorRole: 'admin',
    createdAt: new Date().toISOString(),
    metadata: {
      archiveId: archive.id,
      archiveFile: archive.fileName,
    },
  };

  return {
    academicYear: {
      ...previous.academicYear,
      isActive: false,
      classes: [],
    },
    faculty: [],
    students: [],
    locations: [],
    timetable: [],
    attendance: [],
    finance: {
      revenues: [],
      expenses: [],
    },
    notices: [],
    doubts: [],
    resultSubjects: [],
    resultMarks: [],
    studyMaterials: [],
    logs: [resetLog],
    archives: [archive, ...previous.archives].slice(0, 50),
  };
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/logs', (req, res) => {
  res.json(db.logs);
});

app.get('/api/archives', (req, res) => {
  res.json(db.archives);
});

app.get('/api/archives/:id/download', async (req, res) => {
  const archive = db.archives.find((item) => item.id === req.params.id);

  if (!archive) {
    return res.status(404).json({ error: 'Archive not found' });
  }

  try {
    await fs.access(archive.filePath);
    res.download(archive.filePath, archive.fileName);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Archive file is unavailable';
    res.status(404).json({ error: message });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    appendLog({
      action: 'login',
      entity: 'auth',
      message: 'Admin signed in successfully.',
      actorId: ADMIN_CREDENTIALS.id,
      actorName: ADMIN_CREDENTIALS.name,
      actorRole: ADMIN_CREDENTIALS.role,
      metadata: {
        username: ADMIN_CREDENTIALS.username,
      },
    });
    return res.json({
      user: {
        id: ADMIN_CREDENTIALS.id,
        name: ADMIN_CREDENTIALS.name,
        username: ADMIN_CREDENTIALS.username,
        role: ADMIN_CREDENTIALS.role,
        classes: [],
        subjects: [],
      },
    });
  }

  const faculty = db.faculty.find((item) => item.username === username && item.password === password);
  if (faculty) {
    appendLog({
      action: 'login',
      entity: 'auth',
      message: `${faculty.name} signed in successfully.`,
      actorId: faculty.id,
      actorName: faculty.name,
      actorRole: 'faculty',
      metadata: {
        username: faculty.username,
      },
    });
    return res.json({
      user: {
        id: faculty.id,
        name: faculty.name,
        username: faculty.username,
        role: 'faculty' as const,
        classes: faculty.classes,
        subjects: faculty.subjects,
      },
    });
  }

  const student = db.students.find((item) => item.username === username && item.password === password);
  if (student) {
    appendLog({
      action: 'login',
      entity: 'auth',
      message: `${student.name} signed in successfully.`,
      actorId: student.id,
      actorName: student.name,
      actorRole: 'student',
      metadata: {
        username: student.username,
      },
    });
    return res.json({
      user: {
        id: student.id,
        name: student.name,
        username: student.username,
        role: 'student' as const,
        classes: [student.class],
        subjects: student.subjects,
      },
    });
  }

  return res.status(401).json({ error: 'Invalid username or password' });
});

// Academic year
app.get('/api/academic-year', (req, res) => {
  res.json(db.academicYear);
});

app.post('/api/academic-year/start', async (req, res) => {
  const { year } = req.body as { year: string };
  if (!year) {
    return res.status(400).json({ error: 'Missing year' });
  }
  db.academicYear = {
    ...db.academicYear,
    year,
    isActive: true,
  };
  appendLog({
    action: 'start',
    entity: 'academic-year',
    message: `Academic cycle ${year} started.`,
    actorId: ADMIN_CREDENTIALS.id,
    actorName: ADMIN_CREDENTIALS.name,
    actorRole: 'admin',
    metadata: { year },
  });
  await persist();
  res.json(db.academicYear);
});

app.post('/api/academic-year/stop', async (req, res) => {
  db.academicYear.isActive = false;
  appendLog({
    action: 'stop',
    entity: 'academic-year',
    message: `Academic cycle ${db.academicYear.year} stopped.`,
    actorId: ADMIN_CREDENTIALS.id,
    actorName: ADMIN_CREDENTIALS.name,
    actorRole: 'admin',
    metadata: { year: db.academicYear.year },
  });
  await persist();
  res.json(db.academicYear);
});

app.post('/api/academic-year/kill-switch', async (req, res) => {
  const { password } = req.body as { password?: string };

  if (!password) {
    return res.status(400).json({ error: 'Principal password is required' });
  }

  if (password !== PRINCIPAL_KILL_SWITCH_PASSWORD) {
    return res.status(403).json({ error: 'Invalid principal password' });
  }

  try {
    const archive = await archiveCurrentDatabase();
    await deleteStoredStudyMaterials(db.studyMaterials);
    db = createResetDatabase(db, archive);
    await persist();
    res.json({
      academicYear: db.academicYear,
      archive: {
        id: archive.id,
        format: archive.format,
        fileName: archive.fileName,
        filePath: archive.filePath,
        createdAt: archive.createdAt,
        academicYearLabel: archive.academicYearLabel,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run kill switch';
    res.status(500).json({ error: message });
  }
});

app.post('/api/academic-year/classes', async (req, res) => {
  const { name, divisions, totalStudents } = req.body as {
    name: string;
    divisions: string[];
    totalStudents: number;
    subjects?: string[];
    facultyId?: string | null;
  };

  if (!name) {
    return res.status(400).json({ error: 'Missing class name' });
  }

  if (req.body.facultyId && !db.faculty.some((item) => item.id === req.body.facultyId)) {
    return res.status(400).json({ error: 'Assigned faculty not found' });
  }

  const next: AcademicClass = {
    id: randomUUID(),
    name,
    divisions: Array.isArray(divisions) ? divisions : [],
    totalStudents: totalStudents ?? 0,
    subjects: Array.isArray(req.body.subjects) ? req.body.subjects : [],
    facultyId: req.body.facultyId ?? null,
  };

  db.academicYear.classes.push(next);
  appendLog({
    action: 'create',
    entity: 'academic-class',
    message: `Class ${next.name} created with ${next.subjects.length} subjects.`,
    actorId: ADMIN_CREDENTIALS.id,
    actorName: ADMIN_CREDENTIALS.name,
    actorRole: 'admin',
    metadata: { className: next.name, subjectCount: next.subjects.length },
  });
  await persist();
  res.status(201).json(next);
});

app.put('/api/academic-year/classes/:id', async (req, res) => {
  const id = req.params.id;
  const body = req.body as Partial<AcademicClass>;
  const index = db.academicYear.classes.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Class not found' });
  }

  if (body.facultyId && !db.faculty.some((item) => item.id === body.facultyId)) {
    return res.status(400).json({ error: 'Assigned faculty not found' });
  }

  const updated: AcademicClass = {
    ...db.academicYear.classes[index],
    ...body,
    divisions: Array.isArray(body.divisions)
      ? body.divisions
      : db.academicYear.classes[index].divisions,
    subjects: Array.isArray(body.subjects) ? body.subjects : db.academicYear.classes[index].subjects,
    facultyId: body.facultyId === undefined ? db.academicYear.classes[index].facultyId : body.facultyId,
  };

  db.academicYear.classes[index] = updated;
  appendLog({
    action: 'update',
    entity: 'academic-class',
    message: `Class ${updated.name} updated.`,
    actorId: ADMIN_CREDENTIALS.id,
    actorName: ADMIN_CREDENTIALS.name,
    actorRole: 'admin',
    metadata: { className: updated.name, subjectCount: updated.subjects.length },
  });
  await persist();
  res.json(updated);
});

// Faculty
app.get('/api/faculty', (req, res) => {
  res.json(db.faculty.map(sanitizeFaculty));
});

app.post('/api/faculty', async (req, res) => {
  const body = req.body as Partial<Faculty>;
  if (!body.name || !body.username || !body.password) {
    return res.status(400).json({ error: 'name, username, and password are required' });
  }
  const newFaculty: Faculty = {
    id: randomUUID(),
    name: body.name,
    username: body.username,
    password: body.password,
    dob: body.dob ?? '',
    subjects: Array.isArray(body.subjects) ? body.subjects : [],
    classes: Array.isArray(body.classes) ? body.classes : [],
  };
  db.faculty.push(newFaculty);
  appendLog({
    action: 'create',
    entity: 'faculty',
    message: `Faculty ${newFaculty.name} created.`,
    actorId: ADMIN_CREDENTIALS.id,
    actorName: ADMIN_CREDENTIALS.name,
    actorRole: 'admin',
    metadata: { facultyId: newFaculty.id, classCount: newFaculty.classes.length },
  });
  await persist();
  res.status(201).json(sanitizeFaculty(newFaculty));
});

app.put('/api/faculty/:id', async (req, res) => {
  const id = req.params.id;
  const body = req.body as Partial<Faculty>;
  const index = db.faculty.findIndex((f) => f.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Faculty not found' });
  }
  const updated: Faculty = {
    ...db.faculty[index],
    ...body,
    password: body.password ?? db.faculty[index].password,
    subjects: Array.isArray(body.subjects) ? body.subjects : db.faculty[index].subjects,
    classes: Array.isArray(body.classes) ? body.classes : db.faculty[index].classes,
  };
  db.faculty[index] = updated;
  appendLog({
    action: 'update',
    entity: 'faculty',
    message: `Faculty ${updated.name} updated.`,
    actorId: ADMIN_CREDENTIALS.id,
    actorName: ADMIN_CREDENTIALS.name,
    actorRole: 'admin',
    metadata: { facultyId: updated.id, classCount: updated.classes.length },
  });
  await persist();
  res.json(sanitizeFaculty(updated));
});

app.delete('/api/faculty/:id', async (req, res) => {
  const id = req.params.id;
  const before = db.faculty.length;
  db.faculty = db.faculty.filter((f) => f.id !== id);
  if (db.faculty.length === before) {
    return res.status(404).json({ error: 'Faculty not found' });
  }
  appendLog({
    action: 'delete',
    entity: 'faculty',
    message: `Faculty ${id} deleted.`,
    actorId: ADMIN_CREDENTIALS.id,
    actorName: ADMIN_CREDENTIALS.name,
    actorRole: 'admin',
    metadata: { facultyId: id },
  });
  await persist();
  res.status(204).send();
});

// Students
app.get('/api/students', (req, res) => {
  res.json(db.students.map(sanitizeStudent));
});

app.post('/api/students', async (req, res) => {
  const body = req.body as Partial<Student>;
  if (!body.name || !body.username || !body.password || !body.class || !body.rollNo) {
    return res.status(400).json({ error: 'name, username, password, class, and rollNo are required' });
  }
  const newStudent: Student = {
    id: randomUUID(),
    name: body.name,
    username: body.username,
    password: body.password,
    class: body.class,
    rollNo: body.rollNo,
    semester: body.semester ?? 1,
    subjects: Array.isArray(body.subjects) ? body.subjects : [],
    cgpa: body.cgpa ?? 0,
  };
  db.students.push(newStudent);
  appendLog({
    action: 'create',
    entity: 'student',
    message: `Student ${newStudent.name} created.`,
    actorId: body.class ?? 'system',
    actorName: 'System',
    actorRole: 'system',
    metadata: { studentId: newStudent.id, className: newStudent.class },
  });
  await persist();
  res.status(201).json(sanitizeStudent(newStudent));
});

app.put('/api/students/:id', async (req, res) => {
  const id = req.params.id;
  const body = req.body as Partial<Student>;
  const index = db.students.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Student not found' });
  }
  const updated: Student = {
    ...db.students[index],
    ...body,
    password: body.password ?? db.students[index].password,
    semester: body.semester ?? db.students[index].semester,
    subjects: Array.isArray(body.subjects) ? body.subjects : db.students[index].subjects,
    cgpa: body.cgpa ?? db.students[index].cgpa,
  };
  db.students[index] = updated;
  appendLog({
    action: 'update',
    entity: 'student',
    message: `Student ${updated.name} updated.`,
    actorId: updated.id,
    actorName: updated.name,
    actorRole: 'system',
    metadata: { studentId: updated.id, className: updated.class },
  });
  await persist();
  res.json(sanitizeStudent(updated));
});

app.delete('/api/students/:id', async (req, res) => {
  const id = req.params.id;
  const before = db.students.length;
  db.students = db.students.filter((s) => s.id !== id);
  if (db.students.length === before) {
    return res.status(404).json({ error: 'Student not found' });
  }
  appendLog({
    action: 'delete',
    entity: 'student',
    message: `Student ${id} deleted.`,
    actorId: 'system',
    actorName: 'System',
    actorRole: 'system',
    metadata: { studentId: id },
  });
  await persist();
  res.status(204).send();
});

// Locations
app.get('/api/locations', (req, res) => {
  res.json(db.locations);
});

app.post('/api/locations', async (req, res) => {
  const body = req.body as Partial<Location>;

  if (!body.name || !body.type) {
    return res.status(400).json({ error: 'name and type are required' });
  }

  if (body.type !== 'classroom' && body.type !== 'lab') {
    return res.status(400).json({ error: 'type must be classroom or lab' });
  }

  const location: Location = {
    id: randomUUID(),
    name: body.name,
    type: body.type,
  };

  db.locations.push(location);
  appendLog({
    action: 'create',
    entity: 'location',
    message: `Location ${location.name} created.`,
    actorId: ADMIN_CREDENTIALS.id,
    actorName: ADMIN_CREDENTIALS.name,
    actorRole: 'admin',
    metadata: { locationId: location.id, type: location.type },
  });
  await persist();
  res.status(201).json(location);
});

app.put('/api/locations/:id', async (req, res) => {
  const id = req.params.id;
  const body = req.body as Partial<Location>;
  const index = db.locations.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Location not found' });
  }

  if (body.type && body.type !== 'classroom' && body.type !== 'lab') {
    return res.status(400).json({ error: 'type must be classroom or lab' });
  }

  const updated: Location = {
    ...db.locations[index],
    ...body,
  };

  db.locations[index] = updated;
  appendLog({
    action: 'update',
    entity: 'location',
    message: `Location ${updated.name} updated.`,
    actorId: ADMIN_CREDENTIALS.id,
    actorName: ADMIN_CREDENTIALS.name,
    actorRole: 'admin',
    metadata: { locationId: updated.id, type: updated.type },
  });
  await persist();
  res.json(updated);
});

app.delete('/api/locations/:id', async (req, res) => {
  const id = req.params.id;
  const isInUse = db.timetable.some((item) => item.locationId === id);

  if (isInUse) {
    return res.status(400).json({ error: 'Location is assigned to timetable entries' });
  }

  const before = db.locations.length;
  db.locations = db.locations.filter((item) => item.id !== id);

  if (db.locations.length === before) {
    return res.status(404).json({ error: 'Location not found' });
  }

  appendLog({
    action: 'delete',
    entity: 'location',
    message: `Location ${id} deleted.`,
    actorId: ADMIN_CREDENTIALS.id,
    actorName: ADMIN_CREDENTIALS.name,
    actorRole: 'admin',
    metadata: { locationId: id },
  });
  await persist();
  res.status(204).send();
});

// Timetable
app.get('/api/timetable', (req, res) => {
  res.json(db.timetable);
});

app.post('/api/timetable', async (req, res) => {
  const body = req.body as Partial<TimetableEntry>;

  if (
    !body.className ||
    !body.subject ||
    !body.facultyId ||
    !body.locationId ||
    !body.date ||
    !body.startTime ||
    !body.endTime
  ) {
    return res.status(400).json({
      error: 'className, subject, facultyId, locationId, date, startTime, and endTime are required',
    });
  }

  if (!db.faculty.some((item) => item.id === body.facultyId)) {
    return res.status(400).json({ error: 'Faculty not found' });
  }

  if (!db.locations.some((item) => item.id === body.locationId)) {
    return res.status(400).json({ error: 'Location not found' });
  }

  const entry: TimetableEntry = {
    id: randomUUID(),
    className: body.className,
    subject: body.subject,
    facultyId: body.facultyId,
    locationId: body.locationId,
    date: body.date,
    startTime: body.startTime,
    endTime: body.endTime,
  };

  db.timetable.push(entry);
  appendLog({
    action: 'create',
    entity: 'timetable',
    message: `Lecture ${entry.subject} scheduled for ${entry.className}.`,
    actorId: body.facultyId,
    actorName: db.faculty.find((item) => item.id === body.facultyId)?.name ?? 'Faculty',
    actorRole: 'faculty',
    metadata: {
      timetableEntryId: entry.id,
      className: entry.className,
      locationId: entry.locationId,
      date: entry.date,
      startTime: entry.startTime,
      endTime: entry.endTime,
    },
  });
  await persist();
  res.status(201).json(entry);
});

app.put('/api/timetable/:id', async (req, res) => {
  const id = req.params.id;
  const body = req.body as Partial<TimetableEntry>;
  const index = db.timetable.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Timetable entry not found' });
  }

  if (body.facultyId && !db.faculty.some((item) => item.id === body.facultyId)) {
    return res.status(400).json({ error: 'Faculty not found' });
  }

  if (body.locationId && !db.locations.some((item) => item.id === body.locationId)) {
    return res.status(400).json({ error: 'Location not found' });
  }

  const updated: TimetableEntry = {
    ...db.timetable[index],
    ...body,
  };

  db.timetable[index] = updated;
  appendLog({
    action: 'update',
    entity: 'timetable',
    message: `Lecture ${updated.subject} updated for ${updated.className}.`,
    actorId: updated.facultyId,
    actorName: db.faculty.find((item) => item.id === updated.facultyId)?.name ?? 'Faculty',
    actorRole: 'faculty',
    metadata: {
      timetableEntryId: updated.id,
      locationId: updated.locationId,
      date: updated.date,
      startTime: updated.startTime,
      endTime: updated.endTime,
    },
  });
  await persist();
  res.json(updated);
});

app.delete('/api/timetable/:id', async (req, res) => {
  const id = req.params.id;
  const before = db.timetable.length;
  db.timetable = db.timetable.filter((item) => item.id !== id);

  if (db.timetable.length === before) {
    return res.status(404).json({ error: 'Timetable entry not found' });
  }

  db.attendance = db.attendance.filter((item) => item.timetableEntryId !== id);

  appendLog({
    action: 'delete',
    entity: 'timetable',
    message: `Lecture ${id} deleted from timetable.`,
    actorId: 'system',
    actorName: 'System',
    actorRole: 'system',
    metadata: { timetableEntryId: id },
  });
  await persist();
  res.status(204).send();
});

// Attendance
app.get('/api/attendance', (req, res) => {
  res.json(db.attendance);
});

app.post('/api/attendance', async (req, res) => {
  const body = req.body as Partial<AttendanceSession>;

  if (!body.timetableEntryId || !body.className || !body.subject || !body.facultyId || !body.date) {
    return res.status(400).json({
      error: 'timetableEntryId, className, subject, facultyId, and date are required',
    });
  }

  if (!db.timetable.some((item) => item.id === body.timetableEntryId)) {
    return res.status(400).json({ error: 'Timetable entry not found' });
  }

  if (!db.faculty.some((item) => item.id === body.facultyId)) {
    return res.status(400).json({ error: 'Faculty not found' });
  }

  const records = Array.isArray(body.records)
    ? body.records.filter(
        (item): item is AttendanceRecord =>
          Boolean(
            item &&
              item.studentId &&
              (item.status === 'present' || item.status === 'absent' || item.status === 'late')
          )
      )
    : [];

  const session: AttendanceSession = {
    id: randomUUID(),
    timetableEntryId: body.timetableEntryId,
    className: body.className,
    subject: body.subject,
    facultyId: body.facultyId,
    date: body.date,
    punchInEnabled: body.punchInEnabled ?? false,
    records,
  };

  db.attendance.push(session);
  appendLog({
    action: 'create',
    entity: 'attendance',
    message: `Attendance session created for ${session.subject} in ${session.className}.`,
    actorId: session.facultyId,
    actorName: db.faculty.find((item) => item.id === session.facultyId)?.name ?? 'Faculty',
    actorRole: 'faculty',
    metadata: { attendanceSessionId: session.id, timetableEntryId: session.timetableEntryId, punchInEnabled: session.punchInEnabled },
  });
  await persist();
  res.status(201).json(session);
});

app.put('/api/attendance/:id', async (req, res) => {
  const id = req.params.id;
  const body = req.body as Partial<AttendanceSession>;
  const index = db.attendance.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Attendance session not found' });
  }

  const nextRecords = Array.isArray(body.records)
    ? body.records.filter(
        (item): item is AttendanceRecord =>
          Boolean(
            item &&
              item.studentId &&
              (item.status === 'present' || item.status === 'absent' || item.status === 'late')
          )
      )
    : db.attendance[index].records;

  const updated: AttendanceSession = {
    ...db.attendance[index],
    ...body,
    records: nextRecords,
    punchInEnabled: body.punchInEnabled ?? db.attendance[index].punchInEnabled,
  };

  db.attendance[index] = updated;
  appendLog({
    action: 'update',
    entity: 'attendance',
    message: `Attendance session updated for ${updated.subject} in ${updated.className}.`,
    actorId: updated.facultyId,
    actorName: db.faculty.find((item) => item.id === updated.facultyId)?.name ?? 'Faculty',
    actorRole: 'faculty',
    metadata: { attendanceSessionId: updated.id, punchInEnabled: updated.punchInEnabled },
  });
  await persist();
  res.json(updated);
});

// Finance
app.get('/api/finance', (req, res) => {
  res.json(db.finance);
});

app.post('/api/finance/expenses', async (req, res) => {
  const body = req.body as Partial<FinanceExpense>;

  if (!body.title || !body.category || !body.amount || !body.paidTo || !body.dueDate || !body.frequency) {
    return res.status(400).json({
      error: 'title, category, amount, paidTo, dueDate, and frequency are required',
    });
  }

  const expense: FinanceExpense = {
    id: randomUUID(),
    title: body.title,
    category: body.category,
    amount: Number(body.amount),
    paidTo: body.paidTo,
    dueDate: body.dueDate,
    frequency: body.frequency,
    note: body.note ?? '',
  };

  db.finance.expenses.push(expense);
  appendLog({
    action: 'create',
    entity: 'finance-expense',
    message: `Expense ${expense.title} added.`,
    actorId: ADMIN_CREDENTIALS.id,
    actorName: ADMIN_CREDENTIALS.name,
    actorRole: 'admin',
    metadata: { expenseId: expense.id, amount: expense.amount, category: expense.category },
  });
  await persist();
  res.status(201).json(expense);
});

app.put('/api/finance/expenses/:id', async (req, res) => {
  const id = req.params.id;
  const body = req.body as Partial<FinanceExpense>;
  const index = db.finance.expenses.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Expense not found' });
  }

  const updated: FinanceExpense = {
    ...db.finance.expenses[index],
    ...body,
    amount: body.amount === undefined ? db.finance.expenses[index].amount : Number(body.amount),
  };

  db.finance.expenses[index] = updated;
  appendLog({
    action: 'update',
    entity: 'finance-expense',
    message: `Expense ${updated.title} updated.`,
    actorId: ADMIN_CREDENTIALS.id,
    actorName: ADMIN_CREDENTIALS.name,
    actorRole: 'admin',
    metadata: { expenseId: updated.id, amount: updated.amount, category: updated.category },
  });
  await persist();
  res.json(updated);
});

app.delete('/api/finance/expenses/:id', async (req, res) => {
  const id = req.params.id;
  const before = db.finance.expenses.length;
  db.finance.expenses = db.finance.expenses.filter((item) => item.id !== id);

  if (db.finance.expenses.length === before) {
    return res.status(404).json({ error: 'Expense not found' });
  }

  appendLog({
    action: 'delete',
    entity: 'finance-expense',
    message: `Expense ${id} deleted.`,
    actorId: ADMIN_CREDENTIALS.id,
    actorName: ADMIN_CREDENTIALS.name,
    actorRole: 'admin',
    metadata: { expenseId: id },
  });
  await persist();
  res.status(204).send();
});

// Notices
app.get('/api/notices', (req, res) => {
  res.json(db.notices);
});

app.post('/api/notices', async (req, res) => {
  const body = req.body as Partial<Notice>;

  if (!body.title || !body.message || !body.authorId || !body.authorName || !body.authorRole || !body.targetScope) {
    return res.status(400).json({
      error: 'title, message, authorId, authorName, authorRole, and targetScope are required',
    });
  }

  if (body.authorRole !== 'admin' && body.authorRole !== 'faculty') {
    return res.status(400).json({ error: 'authorRole must be admin or faculty' });
  }

  if (body.targetScope === 'class' && (!Array.isArray(body.classNames) || body.classNames.length === 0)) {
    return res.status(400).json({ error: 'At least one class is required for class-targeted notices' });
  }

  const now = new Date().toISOString();
  const notice: Notice = {
    id: randomUUID(),
    title: body.title,
    message: body.message,
    authorId: body.authorId,
    authorName: body.authorName,
    authorRole: body.authorRole,
    targetScope: body.targetScope,
    classNames: Array.isArray(body.classNames) ? body.classNames : [],
    subject: body.subject ?? '',
    createdAt: now,
    updatedAt: now,
  };

  db.notices.push(notice);
  appendLog({
    action: 'create',
    entity: 'notice',
    message: `Notice "${notice.title}" published.`,
    actorId: notice.authorId,
    actorName: notice.authorName,
    actorRole: notice.authorRole,
    metadata: { noticeId: notice.id, targetScope: notice.targetScope },
  });
  await persist();
  res.status(201).json(notice);
});

app.put('/api/notices/:id', async (req, res) => {
  const id = req.params.id;
  const body = req.body as Partial<Notice>;
  const index = db.notices.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Notice not found' });
  }

  const updated: Notice = {
    ...db.notices[index],
    ...body,
    classNames: Array.isArray(body.classNames) ? body.classNames : db.notices[index].classNames,
    updatedAt: new Date().toISOString(),
  };

  db.notices[index] = updated;
  appendLog({
    action: 'update',
    entity: 'notice',
    message: `Notice "${updated.title}" updated.`,
    actorId: updated.authorId,
    actorName: updated.authorName,
    actorRole: updated.authorRole,
    metadata: { noticeId: updated.id, targetScope: updated.targetScope },
  });
  await persist();
  res.json(updated);
});

app.delete('/api/notices/:id', async (req, res) => {
  const id = req.params.id;
  const before = db.notices.length;
  db.notices = db.notices.filter((item) => item.id !== id);

  if (db.notices.length === before) {
    return res.status(404).json({ error: 'Notice not found' });
  }

  appendLog({
    action: 'delete',
    entity: 'notice',
    message: `Notice ${id} deleted.`,
    actorId: 'system',
    actorName: 'System',
    actorRole: 'system',
    metadata: { noticeId: id },
  });
  await persist();
  res.status(204).send();
});

// Doubts & feedback
app.get('/api/doubts', (req, res) => {
  res.json(db.doubts);
});

app.post('/api/doubts', async (req, res) => {
  const body = req.body as Partial<DoubtFeedback>;

  if (
    !body.type ||
    !body.title ||
    !body.message ||
    !body.studentId ||
    !body.studentName ||
    !body.className ||
    !body.teacherId ||
    !body.teacherName
  ) {
    return res.status(400).json({
      error: 'type, title, message, studentId, studentName, className, teacherId, and teacherName are required',
    });
  }

  if (body.type !== 'doubt' && body.type !== 'feedback') {
    return res.status(400).json({ error: 'type must be doubt or feedback' });
  }

  const entry: DoubtFeedback = {
    id: randomUUID(),
    type: body.type,
    title: body.title,
    message: body.message,
    studentId: body.studentId,
    studentName: body.studentName,
    className: body.className,
    teacherId: body.teacherId,
    teacherName: body.teacherName,
    subject: body.subject ?? '',
    createdAt: new Date().toISOString(),
  };

  db.doubts.push(entry);
  appendLog({
    action: 'create',
    entity: body.type,
    message: `${body.type === 'doubt' ? 'Doubt' : 'Feedback'} "${entry.title}" submitted.`,
    actorId: entry.studentId,
    actorName: entry.studentName,
    actorRole: 'student',
    metadata: { entryId: entry.id, teacherId: entry.teacherId, className: entry.className },
  });
  await persist();
  res.status(201).json(entry);
});

// Study materials
app.get('/api/materials', (req, res) => {
  const role = req.query.role;
  const userId = req.query.userId;

  if (role !== 'admin' && role !== 'faculty' && role !== 'student') {
    return res.status(400).json({ error: 'role must be admin, faculty, or student' });
  }

  if (typeof userId !== 'string' || !userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const user = findAuthUser(role, userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const materials = db.studyMaterials
    .filter((material) => {
      if (role === 'admin') {
        return true;
      }

      if (role === 'faculty') {
        return material.uploadedById === user.id;
      }

      return user.classes.includes(material.className);
    })
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));

  res.json(materials);
});

app.post('/api/materials', upload.single('file'), async (req, res) => {
  const { title, description, className, subject, uploadedById, uploadedByRole } = req.body as Record<string, string>;
  const file = req.file;

  if (!title || !className || !subject || !uploadedById || !uploadedByRole) {
    return res.status(400).json({ error: 'title, className, subject, uploadedById, and uploadedByRole are required' });
  }

  if (uploadedByRole !== 'admin' && uploadedByRole !== 'faculty') {
    return res.status(400).json({ error: 'uploadedByRole must be admin or faculty' });
  }

  if (!file) {
    return res.status(400).json({ error: 'A file is required' });
  }

  const uploader = findAuthUser(uploadedByRole, uploadedById);
  if (!uploader || (uploader.role !== 'admin' && uploader.role !== 'faculty')) {
    return res.status(404).json({ error: 'Uploader not found' });
  }

  if (
    uploader.role === 'faculty' &&
    (!uploader.classes.includes(className) || !uploader.subjects.includes(subject))
  ) {
    return res.status(403).json({ error: 'Faculty can upload only for their assigned class and subject' });
  }

  const allowedMimeTypes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
  ]);

  if (!allowedMimeTypes.has(file.mimetype)) {
    return res.status(400).json({ error: 'Unsupported file type' });
  }

  try {
    const materialId = randomUUID();
    const filePath = buildMaterialStoragePath(materialId, className, subject, file.originalname);

    await uploadFileToStorage(filePath, file.buffer, file.mimetype);

    const material: StudyMaterial = {
      id: materialId,
      title,
      description: description ?? '',
      className,
      subject,
      uploadedById,
      uploadedByName: uploader.name,
      uploadedByRole,
      fileName: file.originalname,
      filePath,
      mimeType: file.mimetype,
      fileSize: file.size,
      createdAt: new Date().toISOString(),
    };

    db.studyMaterials.push(material);
    appendLog({
      action: 'upload',
      entity: 'study-material',
      message: `Material "${material.title}" uploaded for ${material.className}.`,
      actorId: material.uploadedById,
      actorName: material.uploadedByName,
      actorRole: material.uploadedByRole,
      metadata: { materialId: material.id, subject: material.subject, fileName: material.fileName },
    });
    await persist();
    res.status(201).json(material);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload file';
    res.status(500).json({ error: message });
  }
});

app.get('/api/materials/:id/access-url', async (req, res) => {
  const role = req.query.role;
  const userId = req.query.userId;
  const material = db.studyMaterials.find((item) => item.id === req.params.id);

  if (role !== 'admin' && role !== 'faculty' && role !== 'student') {
    return res.status(400).json({ error: 'role must be admin, faculty, or student' });
  }

  if (typeof userId !== 'string' || !userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  if (!material) {
    return res.status(404).json({ error: 'Material not found' });
  }

  if (!canAccessMaterial(material, role, userId)) {
    return res.status(403).json({ error: 'You do not have access to this material' });
  }

  try {
    const signedUrl = await createSignedStorageUrl(material.filePath);
    res.json({ signedUrl, bucket: getStorageBucketName() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create access URL';
    res.status(500).json({ error: message });
  }
});

app.delete('/api/materials/:id', async (req, res) => {
  const { userId, role } = req.body as { userId?: string; role?: 'admin' | 'faculty' };
  const index = db.studyMaterials.findIndex((item) => item.id === req.params.id);

  if (!userId || (role !== 'admin' && role !== 'faculty')) {
    return res.status(400).json({ error: 'userId and role are required' });
  }

  if (index === -1) {
    return res.status(404).json({ error: 'Material not found' });
  }

  const material = db.studyMaterials[index];
  const requester = findAuthUser(role, userId);
  if (!requester) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (role === 'faculty' && material.uploadedById !== requester.id) {
    return res.status(403).json({ error: 'Faculty can delete only their own materials' });
  }

  try {
    await removeFileFromStorage(material.filePath);
    db.studyMaterials.splice(index, 1);
    appendLog({
      action: 'delete',
      entity: 'study-material',
      message: `Material "${material.title}" deleted.`,
      actorId: requester.id,
      actorName: requester.name,
      actorRole: role,
      metadata: { materialId: material.id, subject: material.subject },
    });
    await persist();
    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete material';
    res.status(500).json({ error: message });
  }
});

// Results & marks
app.get('/api/results/subjects', async (req, res) => {
  await processScheduledResultPublications();
  res.json(db.resultSubjects);
});

app.get('/api/results/marks', async (req, res) => {
  await processScheduledResultPublications();
  res.json(db.resultMarks);
});

app.get('/api/results/status', async (req, res) => {
  await processScheduledResultPublications();
  const keys = Array.from(new Set(db.resultSubjects.map((subject) => `${subject.className}::${subject.semester}`)));
  const statuses = keys.map((key) => {
    const [className, semesterValue] = key.split('::');
    return buildResultSemesterStatus(className, Number(semesterValue));
  });
  res.json(statuses);
});

app.post('/api/results/schedule-publish', async (req, res) => {
  const { className, semester, publishAt } = req.body as { className?: string; semester?: number; publishAt?: string | null };

  if (!className || semester === undefined) {
    return res.status(400).json({ error: 'className and semester are required' });
  }

  const matchingSubjects = db.resultSubjects.filter(
    (subject) => subject.className === className && subject.semester === Number(semester)
  );

  if (matchingSubjects.length === 0) {
    return res.status(404).json({ error: 'No result subjects found for this class and semester' });
  }

  db.resultSubjects = db.resultSubjects.map((subject) =>
    subject.className === className && subject.semester === Number(semester)
      ? {
          ...subject,
          publishAt: publishAt ?? null,
        }
      : subject
  );

  appendLog({
    action: 'schedule',
    entity: 'result-publish',
    message: `Result publish ${publishAt ? `scheduled for ${className} semester ${semester}` : `cleared for ${className} semester ${semester}`}.`,
    actorId: ADMIN_CREDENTIALS.id,
    actorName: ADMIN_CREDENTIALS.name,
    actorRole: 'admin',
    metadata: { className, semester: Number(semester), publishAt: publishAt ?? null },
  });

  await processScheduledResultPublications();
  await persist();
  res.json(buildResultSemesterStatus(className, Number(semester)));
});

app.post('/api/results/marks', async (req, res) => {
  const body = req.body as Partial<ResultMark>;

  if (
    !body.studentId ||
    !body.subjectId ||
    body.internalMarks === undefined ||
    body.externalMarks === undefined ||
    body.internalMax === undefined ||
    body.externalMax === undefined ||
    !body.facultyId ||
    body.semester === undefined ||
    !body.className
  ) {
    return res.status(400).json({
      error: 'studentId, subjectId, internal marks, external marks, maximum marks, facultyId, semester, and className are required',
    });
  }

  const subject = db.resultSubjects.find((item) => item.id === body.subjectId);
  if (!subject) {
    return res.status(404).json({ error: 'Result subject not found' });
  }

  if (subject.published) {
    return res.status(400).json({ error: 'Published subject marks cannot be edited' });
  }

  const totalMarks = Number(body.internalMarks) + Number(body.externalMarks);
  const gradeMeta = getGradeMeta(totalMarks);
  const existingIndex = db.resultMarks.findIndex(
    (item) => item.studentId === body.studentId && item.subjectId === body.subjectId
  );

  const nextMark: ResultMark = {
    id: existingIndex >= 0 ? db.resultMarks[existingIndex].id : randomUUID(),
    studentId: body.studentId,
    subjectId: body.subjectId,
    internalMax: Number(body.internalMax),
    internalMarks: Number(body.internalMarks),
    externalMax: Number(body.externalMax),
    externalMarks: Number(body.externalMarks),
    totalMarks,
    grade: gradeMeta.grade,
    gradePoints: gradeMeta.gradePoints,
    credits: subject.credits,
    creditGradePoints: subject.credits * gradeMeta.gradePoints,
    published: false,
    facultyId: body.facultyId,
    semester: Number(body.semester),
    className: body.className,
  };

  if (existingIndex >= 0) {
    db.resultMarks[existingIndex] = nextMark;
  } else {
    db.resultMarks.push(nextMark);
  }

  appendLog({
    action: existingIndex >= 0 ? 'update' : 'create',
    entity: 'result-mark',
    message: `Result mark ${existingIndex >= 0 ? 'updated' : 'created'} for student ${body.studentId}.`,
    actorId: body.facultyId,
    actorName: db.faculty.find((item) => item.id === body.facultyId)?.name ?? 'Faculty',
    actorRole: 'faculty',
    metadata: { markId: nextMark.id, subjectId: body.subjectId, studentId: body.studentId },
  });
  await persist();
  res.status(existingIndex >= 0 ? 200 : 201).json(nextMark);
});

app.post('/api/results/subjects/:id/publish', async (req, res) => {
  const id = req.params.id;
  const subjectIndex = db.resultSubjects.findIndex((item) => item.id === id);

  if (subjectIndex === -1) {
    return res.status(404).json({ error: 'Result subject not found' });
  }

  db.resultSubjects[subjectIndex] = {
    ...db.resultSubjects[subjectIndex],
    published: true,
  };

  db.resultMarks = db.resultMarks.map((mark) =>
    mark.subjectId === id
      ? {
          ...mark,
          published: true,
        }
      : mark
  );

  appendLog({
    action: 'publish',
    entity: 'result-subject',
    message: `Results published for subject ${id}.`,
    actorId: db.resultSubjects[subjectIndex].facultyId,
    actorName: db.faculty.find((item) => item.id === db.resultSubjects[subjectIndex].facultyId)?.name ?? 'Faculty',
    actorRole: 'faculty',
    metadata: { subjectId: id, className: db.resultSubjects[subjectIndex].className },
  });
  await persist();
  res.json(db.resultSubjects[subjectIndex]);
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
