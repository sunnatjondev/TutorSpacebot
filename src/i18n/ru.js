const ru = {
  // Navigation
  nav: {
    home: 'Главная',
    groups: 'Группы',
    schedule: 'Расписание',
    finance: 'Финансы',
    settings: 'Настройки',
  },

  // Common
  common: {
    continue: 'Продолжить',
    save: 'Сохранить',
    cancel: 'Отмена',
    edit: 'Изменить',
    delete: 'Удалить',
    add: 'Добавить',
    close: 'Закрыть',
    viewAll: 'Все',
    remind: 'Напомнить',
    details: 'Детали',
    confirm: 'Подтвердить',
    logout: 'Выйти',
    share: 'Поделиться',
    upgrade: 'Перейти на Pro',
    today: 'Сегодня',
    tomorrow: 'Завтра',
    yesterday: 'Вчера',
    paid: 'Оплачено',
    unpaid: 'Не оплачено',
    partial: 'Частично',
    debt: 'Долг',
    pending: 'Ожидает',
    attended: 'Присутствовал',
    upcoming: 'Предстоит',
    overdue: 'Просрочено',
    total: 'Итого',
    loading: 'Загрузка...',
  },

  // Role Selection
  role: {
    greeting: 'Привет, {name}!',
    question: 'Кто вы?',
    subtitle: 'Выберите, как вы будете использовать TutorSpace, чтобы настроить опыт.',
    teacher: 'Преподаватель',
    teacherDesc: 'Управление группами и студентами',
    student: 'Студент',
    studentDesc: 'Отслеживание занятий и оплат',
  },

  // Teacher Dashboard
  teacherHome: {
    greeting: '{greeting}, {name} 👋',
    subtitle: 'Ваша сводка на сегодня.',
    students: 'Студентов',
    groups: 'Группы',
    lessons: 'Занятий',
    today: 'СЕГОДНЯ',
    unpaidWeek: 'НЕ ОПЛАЧЕНО НА ЭТОЙ НЕДЕЛЕ',
    fabTooltip: 'Добавить новое',
  },

  // Teacher Groups
  teacherGroups: {
    title: 'Группы',
    nextLesson: 'Следующее занятие',
    paymentProgress: 'Статус оплаты',
    students: 'студентов',
    paidPercent: '% оплачено',
    createGroup: 'Создать группу',
  },

  // Group Detail
  groupDetail: {
    attendance: 'ПОСЕЩАЕМОСТЬ — СЕГОДНЯ',
    paymentStatus: 'СТАТУС ОПЛАТЫ',
    addStudent: 'Добавить студента',
  },

  // Teacher Schedule
  teacherSchedule: {
    title: 'Расписание',
    addLesson: 'Добавить занятие',
    students: 'Студентов',
  },

  // Teacher Finance
  teacherFinance: {
    title: 'Финансы',
    subtitle: 'Отслеживайте доходы и ожидающие оплаты.',
    earned: 'Заработано в этом месяце',
    outstanding: 'Задолженность',
    filterAll: 'Все',
    filterPaid: 'Оплачено',
    filterUnpaid: 'Не оплачено',
    filterWeek: 'На этой неделе',
    markPaid: 'Отметить как оплачено',
    markPayment: 'Отметить оплату',
    amountReceived: 'Полученная сумма',
    method: 'Способ',
    cash: 'Наличные',
    card: 'Карта',
    transfer: 'Перевод',
    note: 'Заметка (необязательно)',
    confirmPayment: 'Подтвердить оплату',
  },

  // Teacher Settings
  teacherSettings: {
    title: 'Настройки',
    syncedTelegram: 'Синхронизировано с Telegram',
    currentPlan: 'Текущий план: {plan}',
    freeTier: 'Бесплатный',
    coTeachers: 'Соучителя',
    addTeacher: 'Добавить преподавателя',
    notifications: 'Уведомления',
    lessonReminders: 'Напоминания о занятиях',
    paymentAlerts: 'Оповещения об оплате',
    language: 'Язык',
    shareProfile: 'Поделиться ссылкой профиля',
    logout: 'Выйти',
  },

  // Student Dashboard
  studentHome: {
    greeting: 'Привет, {name} 👋',
    subtitle: 'Готовы к сегодняшним занятиям?',
    nextLesson: 'СЛЕДУЮЩЕЕ ЗАНЯТИЕ',
    attendance: 'ПОСЕЩАЕМОСТЬ',
    homework: 'ДОМАШНЕЕ ЗАДАНИЕ',
    balance: 'БАЛАНС',
    debtContact: 'Свяжитесь с вашим преподавателем',
    upcomingTasks: 'Предстоящие задания',
  },

  // Student Groups
  studentGroups: {
    title: 'Мои группы',
    students: 'Активных студентов',
    nextLesson: 'Следующее занятие',
    openTelegram: 'Открыть группу Telegram',
    members: 'Участники',
    teacher: 'Преподаватель',
  },

  // Student Schedule
  studentSchedule: {
    title: 'Моё расписание',
    subtitle: 'Управляйте предстоящими занятиями.',
    hwDue: 'Сдача ДЗ',
    noClasses: 'В этот день нет занятий',
  },

  // Student Finance
  studentFinance: {
    title: 'Финансы',
    outstanding: 'Задолженность',
    dueDate: 'Срок: {date}',
    contactTeacher: 'Связаться с преподавателем',
    paymentHistory: 'История оплат',
  },

  // Add Student
  addStudent: {
    title: 'Добавить студента',
    uploadPhoto: 'Загрузить фото',
    fullName: 'Полное имя',
    contact: 'Телефон или Telegram username',
    subject: 'Предмет',
    assignGroup: 'Назначить в группу',
    monthlyRate: 'Ежемесячная оплата',
    billingDay: 'День ежемесячного расчёта',
    notes: 'Заметки',
    notesPlaceholder: 'Необязательные заметки о студенте...',
    submit: 'Добавить студента',
  },

  // Days of week
  days: {
    MON: 'Пн',
    TUE: 'Вт',
    WED: 'Ср',
    THU: 'Чт',
    FRI: 'Пт',
    SAT: 'Сб',
    SUN: 'Вс',
  },
}

export default ru
