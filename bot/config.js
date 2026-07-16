import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '.env') })
dotenv.config({ path: path.resolve(__dirname, '../bot.env') })

const rawSupabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
const rawSupabaseAnonKey = process.env.SUPABASE_ANON_KEY

export const config = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  BOT_USERNAME: process.env.BOT_USERNAME || '@tutorspace_app_bot',
  WEBAPP_URL: process.env.WEBAPP_URL || 'https://tutorspace-app.loca.lt',
  WEBAPP_ORIGIN: process.env.WEBAPP_ORIGIN,
  API_PORT: Number(process.env.PORT || process.env.API_PORT || 8080),
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: rawSupabaseServiceKey && !rawSupabaseServiceKey.includes('YOUR_SERVICE_ROLE_KEY')
    ? rawSupabaseServiceKey
    : '',
  SUPABASE_ANON_KEY: rawSupabaseAnonKey,
  get SUPABASE_KEY() {
    return this.SUPABASE_SERVICE_KEY || this.SUPABASE_ANON_KEY
  },
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || '',
  ADMIN_TELEGRAM_ID: Number(process.env.ADMIN_TELEGRAM_ID || process.env.VITE_ADMIN_TELEGRAM_ID || 0),
  INIT_DATA_MAX_AGE_SECONDS: Number(process.env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS || 86400),
  SUPABASE_APP_JWT_TTL_SECONDS: Number(process.env.SUPABASE_APP_JWT_TTL_SECONDS || 3600),
  PAYMENT_CARD_NUMBER: process.env.PAYMENT_CARD_NUMBER || '8600 0000 0000 0000 (Karta egasi)',
  // Defaults that were hardcoded
  DEFAULT_SESSION_DURATION_MIN: Number(process.env.DEFAULT_SESSION_DURATION_MIN || 90),
  SOLO_PLAN_PRICE_UZS: Number(process.env.SOLO_PLAN_PRICE_UZS || 150000),
  CENTER_PLAN_PRICE_UZS: Number(process.env.CENTER_PLAN_PRICE_UZS || 400000),
  BILLING_CYCLE_DAYS: Number(process.env.BILLING_CYCLE_DAYS || 30),
}

export const hasSupabase = Boolean(config.SUPABASE_URL && config.SUPABASE_KEY)
