// Mock data for TutorSpace demo — All amounts in UZS (Uzbek Som)

export const mockTeacher = {
  name: 'Sarah Chen',
  username: 'sarahchen',
  plan: 'Basic',
  totalStudents: 124,
  totalGroups: 12,
  todayLessons: 5,
  coTeachers: [{ name: 'Sarah Connor', id: 1 }],
}

export const mockGroups = [
  {
    id: 1,
    name: 'Advanced Mechanics 101',
    subject: 'FIZIKA',
    students: 8,
    nextLesson: 'Bugun 15:30',
    paidPercent: 75,
    color: 'purple',
  },
  {
    id: 2,
    name: 'Calculus Prep Cohort',
    subject: 'MATEMATIKA',
    students: 12,
    nextLesson: 'Ertaga 10:00',
    paidPercent: 100,
    color: 'orange',
  },
  {
    id: 3,
    name: 'English Literature',
    subject: 'ADABIYOT',
    students: 6,
    nextLesson: 'Payshanba 14:00',
    paidPercent: 50,
    color: 'teal',
  },
]

export const mockStudents = [
  { id: 1, name: 'Alex Mercer', subject: 'Fizika 101', amount: 120_000, status: 'paid', groupId: 1 },
  { id: 2, name: 'Sarah Jenkins', subject: 'Calculus IV', amount: 200_000, status: 'unpaid', groupId: 2 },
  { id: 3, name: 'Marcus Thorne', subject: 'Kimyo', amount: 150_000, status: 'partial', groupId: 1 },
  { id: 4, name: 'Emily Chen', subject: 'Fizika 101', amount: 120_000, status: 'paid', groupId: 1 },
  { id: 5, name: 'David Kim', subject: 'Calculus IV', amount: 200_000, status: 'unpaid', groupId: 2 },
  { id: 6, name: 'Mia Torres', subject: 'Ingliz adabiyoti', amount: 90_000, status: 'paid', groupId: 3 },
]

export const mockTodaySessions = [
  { id: 1, student: 'Alex K.', time: '10:00', subject: 'Matematika', status: 'paid' },
  { id: 2, student: 'Maria J.', time: '11:30', subject: 'Fizika', status: 'debt' },
]

export const mockUnpaidWeek = [
  { id: 1, student: 'David Chen', amount: 80_000 },
]

export const mockSchedule = [
  {
    id: 1, time: '09:00', subject: 'FIZIKA 101', name: 'Ertalgi guruh Alpha',
    students: 12, duration: '1s 30d', status: 'done', dayOffset: 0,
  },
  {
    id: 2, time: '14:00', subject: 'OLIY MATEMATIKA', name: 'Muhandislik tayyorgarligi',
    students: 8, duration: '2s', status: 'upcoming', dayOffset: 0,
  },
  {
    id: 3, time: '17:30', subject: 'GEOMETRIYA', name: 'Kechki takrorlash',
    students: 25, duration: '1s', status: 'upcoming', dayOffset: 0,
  },
  {
    id: 4, time: '10:00', subject: 'MATEMATIKA', name: 'Calculus tayyorgarligi',
    students: 12, duration: '2s', status: 'upcoming', dayOffset: 1,
  },
]

export const mockFinanceStudents = [
  { id: 1, name: 'Sarah Jenkins', group: 'Oliy Matematika', amount: 120_000, status: 'unpaid' },
  { id: 2, name: 'Michael Ross', group: 'Fizika 101', amount: 85_000, status: 'paid' },
  { id: 3, name: 'Emma Lin', group: 'Ispan Adabiyoti', amount: 150_000, status: 'partial', remaining: 50_000 },
  { id: 4, name: 'David Bowles', group: 'Organik Kimyo', amount: 200_000, status: 'paid' },
  { id: 5, name: 'Alex Mercer', group: 'Fizika 101', amount: 120_000, status: 'unpaid' },
]

export const mockStudentUser = {
  name: 'Alex Johnson',
  attendance: 92,
  homeworkCount: 2,
  homeworkOverdue: 1,
  balance: -145_000,
  nextLesson: {
    subject: 'Oliy Matematika',
    teacher: 'Prof. Sarah Jenkins',
    time: 'Bugun 15:30',
    inTime: '2 soatdan keyin',
  },
}

export const mockHomework = [
  { id: 1, subject: 'FIZIKA', title: '4-bobning mashqlarini bajaring: Termodinamika', due: 'Kecha', overdue: true, done: false },
  { id: 2, subject: 'ADABIYOT', title: '"1984" 2-qism va xulosa yozing', due: 'Ertaga', overdue: false, done: false },
  { id: 3, subject: 'MATEMATIKA', title: 'Algebra varag\'i', due: 'Bugun', overdue: false, done: true },
]

export const mockStudentSchedule = [
  { id: 1, subject: 'Oliy Matematika', teacher: 'Dr. Emily Chen', time: '10:00', duration: '1s 30d', status: 'upcoming', hwDue: true },
  { id: 2, subject: 'Fizika II', teacher: 'Prof. James Miller', time: '13:00', duration: '2s', status: 'upcoming', hwDue: false },
  { id: 3, subject: 'Chiziqli Algebra', teacher: 'Sarah Jenkins', time: '8:00', duration: '1s', status: 'attended', hwDue: false },
]

export const mockStudentGroups = [
  {
    id: 1,
    subject: 'Oliy Matematika',
    teacher: 'Dr. Emily Chen',
    teacherSubject: 'Matematika',
    studentsCount: 24,
    nextLesson: 'Ertaga, soat 10:00',
    members: [
      { name: 'Dr. Emily Chen', role: 'teacher' },
      { name: 'Alex Mercer' },
      { name: 'Sarah Jenkins' },
      { name: 'David Kim' },
      { name: 'Mia Torres' },
    ],
  },
  {
    id: 2,
    subject: 'Fizika II',
    teacher: 'Prof. James Miller',
    teacherSubject: 'Fizika',
    studentsCount: 18,
    nextLesson: 'Bugun, soat 13:00',
    members: [
      { name: 'Prof. James Miller', role: 'teacher' },
      { name: 'Alex Mercer' },
      { name: 'Emma Lin' },
    ],
  },
]

export const mockStudentPayments = [
  { id: 1, subject: 'Oliy Matematika', date: '12-okt', hours: '2 soat', amount: 80_000, status: 'pending' },
  { id: 2, subject: 'Fizika 101', date: '5-okt', hours: '4 soat', amount: 160_000, status: 'pending' },
  { id: 3, subject: 'Calculus Tayyorgarligi', date: '28-sen', hours: '3 soat', amount: 120_000, status: 'paid', month: "Sentabr 2025" },
  { id: 4, subject: 'Tarix Insho Tahlili', date: '15-sen', hours: '1 soat', amount: 40_000, status: 'paid', month: "Sentabr 2025" },
]
