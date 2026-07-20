import { createServer } from 'http'
import { config } from './config.js'
import { verifyTelegramInitData } from './auth.js'
import { checkRateLimit } from './rateLimiter.js'
import { validate } from './validation.js'
import * as authService from './services/authService.js'
import * as groupService from './services/groupService.js'
import * as sessionService from './services/sessionService.js'
import * as billingService from './services/billingService.js'
import * as studentService from './services/studentService.js'
import * as teacherService from './services/teacherService.js'
import * as userService from './services/userService.js'

// Validation schemas per route
const validationSchemas = {
  '/api/auth/session': {},
  '/api/auth/role': { role: { required: true, type: 'string', enum: ['teacher', 'student', 'parent'] } },
  '/api/auth/invite/join': { inviteToken: { required: true, type: 'string' } },

  '/api/teacher/dashboard': { month: { type: 'number' }, year: { type: 'number' } },
  '/api/teacher/groups': {},
  '/api/teacher/payments': { filter: { type: 'string', enum: ['all', 'paid', 'unpaid'] } },
  '/api/teacher/schedule': { weekStart: { type: 'number' } },
  '/api/teacher/remind-debtors': {},
  '/api/teacher/remind-student': { paymentId: { required: true, type: 'uuid' } },

  '/api/groups/create': { name: { required: true, type: 'string' }, subject: { type: 'string' } },
  '/api/groups/delete': { groupId: { required: true, type: 'uuid' } },
  '/api/groups/update': { groupId: { required: true, type: 'uuid' }, name: { type: 'string' }, subject: { type: 'string' }, color: { type: 'string' }, telegram_group_link: { type: 'string' }, billing_day: { type: 'number' }, price_per_month: { type: 'number' }, schedule_template: { type: 'array' } },
  '/api/groups/detail': { groupId: { required: true, type: 'uuid' } },
  '/api/groups/homework': { groupId: { required: true, type: 'uuid' } },
  '/api/groups/homework/create': { groupId: { required: true, type: 'uuid' }, title: { required: true, type: 'string' }, dueDate: { type: 'string' }, description: { type: 'string' } },
  '/api/groups/homework/delete': { homeworkId: { required: true, type: 'uuid' } },
  '/api/groups/attendance': { sessionId: { required: true, type: 'uuid' }, studentId: { required: true, type: 'uuid' }, present: { required: true, type: 'boolean' } },
  '/api/groups/day-attendance': { groupId: { required: true, type: 'uuid' }, date: { required: true, type: 'string' } },
  '/api/groups/monthly-stats': { groupId: { required: true, type: 'uuid' } },

  '/api/students/create': { name: { required: true, type: 'string' }, contact: { type: 'string' }, groupIds: { required: true, type: 'array' }, monthlyRate: { type: 'number' } },
  '/api/students/remove': { groupId: { required: true, type: 'uuid' }, studentId: { required: true, type: 'uuid' } },
  '/api/students/rate': { groupId: { required: true, type: 'uuid' }, studentId: { required: true, type: 'uuid' }, amount: { required: true, type: 'number' } },

  '/api/sessions/create': { groupId: { required: true, type: 'uuid' }, scheduledAt: { required: true, type: 'string' }, durationMin: { type: 'number' } },
  '/api/sessions/update': { sessionId: { required: true, type: 'uuid' }, status: { type: 'string', enum: ['upcoming', 'ongoing', 'done', 'cancelled'] }, notes: { type: 'string' } },
  '/api/sessions/delete': { sessionId: { required: true, type: 'uuid' } },

  '/api/payments/mark-paid': { paymentId: { required: true, type: 'uuid' }, method: { type: 'string', enum: ['cash', 'card', 'transfer'] }, note: { type: 'string' } },
  '/api/payments/create': { studentId: { required: true, type: 'uuid' }, groupId: { required: true, type: 'uuid' }, teacherId: { required: true, type: 'uuid' }, amount: { required: true, type: 'number' }, month: { required: true, type: 'number' }, year: { type: 'number' } },

  '/api/student/dashboard': { studentId: { type: 'uuid' } },
  '/api/student/groups': { studentId: { type: 'uuid' } },
  '/api/student/payments': { studentId: { type: 'uuid' } },
  '/api/student/schedule': { weekStart: { type: 'number' }, studentId: { type: 'uuid' } },
  '/api/student/homework': { studentId: { type: 'uuid' } },
  '/api/student/homework/done': { submissionId: { required: true, type: 'uuid' }, done: { required: true, type: 'boolean' } },

  '/api/parent/children': {},
  '/api/parent/invites/create': { studentId: { type: 'uuid' } },

  '/api/billing/create-order': { planId: { required: true, type: 'string', enum: ['solo', 'center'] } },
  '/api/billing/status': {},

  '/api/user/settings': { lesson_reminders_enabled: { type: 'boolean' }, payment_alerts_enabled: { type: 'boolean' } },
  '/api/user/delete': {},
}

const apiRoutes = {
  '/api/auth/session': authService.handleAuthSession,
  '/api/auth/role': authService.handleAuthRole,
  '/api/auth/invite/join': authService.handleInviteJoin,

  '/api/teacher/dashboard': teacherService.handleTeacherDashboard,
  '/api/teacher/groups': teacherService.handleTeacherGroups,
  '/api/teacher/payments': teacherService.handleTeacherPayments,
  '/api/teacher/schedule': teacherService.handleTeacherSchedule,
  '/api/teacher/remind-debtors': teacherService.handleTeacherRemindDebtors,
  '/api/teacher/remind-student': teacherService.handleTeacherRemindStudent,

  '/api/groups/create': groupService.handleGroupCreate,
  '/api/groups/delete': groupService.handleGroupDelete,
  '/api/groups/update': groupService.handleGroupUpdate,
  '/api/groups/detail': groupService.handleGroupDetail,
  '/api/groups/homework': groupService.handleGroupHomework,
  '/api/groups/homework/create': groupService.handleHomeworkCreate,
  '/api/groups/homework/delete': groupService.handleGroupHomeworkDelete,
  '/api/groups/attendance': groupService.handleAttendanceSave,
  '/api/groups/day-attendance': userService.handleGroupDayAttendance,
  '/api/groups/monthly-stats': userService.handleGroupMonthlyStats,

  '/api/students/create': groupService.handleStudentCreate,
  '/api/students/remove': groupService.handleStudentRemove,
  '/api/students/rate': groupService.handleStudentRate,

  '/api/sessions/create': sessionService.handleSessionCreate,
  '/api/sessions/update': sessionService.handleSessionUpdate,
  '/api/sessions/delete': sessionService.handleSessionDelete,

  '/api/payments/mark-paid': billingService.handlePaymentMarkPaid,
  '/api/payments/create': billingService.handlePaymentCreate,

  '/api/student/dashboard': studentService.handleStudentDashboard,
  '/api/student/groups': studentService.handleStudentGroups,
  '/api/student/payments': studentService.handleStudentPayments,
  '/api/student/schedule': studentService.handleStudentSchedule,
  '/api/student/homework': studentService.handleStudentHomework,
  '/api/student/homework/done': studentService.handleStudentHomeworkDone,

  '/api/parent/children': studentService.handleParentChildren,
  '/api/parent/invites/create': studentService.handleParentInviteCreate,


  '/api/billing/create-order': billingService.handleBillingCreateOrder,
  '/api/billing/status': billingService.handleBillingStatus,

  '/api/user/settings': userService.handleUserSettings,
  '/api/user/delete': userService.handleUserDelete,
}

function getCorsOrigin(originHeader) {
  const allowedOrigins = [
    config.WEBAPP_URL,
    config.WEBAPP_ORIGIN,
    'http://localhost:5173'
  ].filter(Boolean)
  
  if (originHeader && allowedOrigins.includes(originHeader)) {
    return originHeader
  }
  return allowedOrigins[0] || '*'
}

function sendJson(res, statusCode, data, origin = '*') {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })
  res.end(JSON.stringify(data))
}

function readBody(req) {
  const MAX_BODY_SIZE = 1_000_000 // 1 MB
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', chunk => {
      raw += chunk
      if (raw.length > MAX_BODY_SIZE) {
        req.destroy()
        reject(new Error('Request body too large'))
      }
    })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch (e) {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

export function startApiServer() {
  const server = createServer(async (req, res) => {
    const origin = getCorsOrigin(req.headers.origin)

    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {}, origin)
      return
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, { ok: true, timestamp: new Date().toISOString() }, origin)
      return
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' }, origin)
      return
    }

    try {
      const body = await readBody(req)

      const handler = apiRoutes[url.pathname]
      if (!handler) {
        sendJson(res, 404, { ok: false, error: 'Not found' }, origin)
        return
      }

      const initDataHeader = req.headers.authorization?.startsWith('tma ') 
        ? req.headers.authorization.slice(4) 
        : body.initData
      const telegramUser = verifyTelegramInitData(initDataHeader)

      if (!checkRateLimit(telegramUser.id)) {
        sendJson(res, 429, { ok: false, error: 'Too many requests. Please slow down.' }, origin)
        return
      }

      // Validate request body against schema
      const schema = validationSchemas[url.pathname]
      if (schema) {
        validate(body, schema)
      }

      const result = await handler(telegramUser, body)
      sendJson(res, 200, result, origin)
    } catch (error) {
      const status = error.status || 400
      console.error(`API ${url.pathname} error:`, error.message)
      sendJson(res, status, { ok: false, error: error.message }, origin)
    }
  })

  server.listen(config.API_PORT, '0.0.0.0', () => {
    console.log(`API server listening on port ${config.API_PORT}`)
  })
  
  return server
}
