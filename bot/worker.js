import TelegramBot from 'node-telegram-bot-api'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { startCronJobs } from './cron.js'
import { setBot } from './bot.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '.env') })
dotenv.config({ path: path.resolve(__dirname, '../bot.env') })

const BOT_TOKEN = process.env.BOT_TOKEN
const SUPABASE_URL = process.env.SUPABASE_URL
const rawSupabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
const rawSupabaseAnonKey = process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = rawSupabaseServiceKey && !rawSupabaseServiceKey.includes('YOUR_SERVICE_ROLE_KEY')
  ? rawSupabaseServiceKey
  : ''
const SUPABASE_KEY = SUPABASE_SERVICE_KEY || rawSupabaseAnonKey

if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN is required. Add it to bot/.env or ../bot.env before starting the worker.')
}

const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY)
if (!hasSupabase) {
  console.log('Worker disabled: Supabase not configured.')
  process.exit(0)
}

// Worker only sends messages, NO polling to avoid conflicting with the main bot process
const bot = new TelegramBot(BOT_TOKEN, { polling: false })
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

setBot(bot)

console.log('TutorSpace Background Worker process started')
console.log('Supabase connected for crons')

startCronJobs(bot, supabase)

// Keep process alive
process.on('SIGINT', () => { process.exit(0) })
process.on('SIGTERM', () => { process.exit(0) })
process.on('unhandledRejection', (error) => console.error('Worker unhandled promise rejection:', error))
