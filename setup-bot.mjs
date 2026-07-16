import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, 'bot/.env') })
dotenv.config({ path: path.resolve(__dirname, 'bot.env') })

const token = process.env.BOT_TOKEN

if (!token) {
  throw new Error('BOT_TOKEN is required. Add it to bot/.env or bot.env before running setup-bot.mjs.')
}

async function setup() {
  const cmdRes = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commands: [
        { command: 'start', description: 'TutorSpace ilovasini ochish' },
        { command: 'help', description: 'Yordam' },
        { command: 'stats', description: 'Statistika' },
      ],
    }),
  }).then((response) => response.json())
  console.log('Commands set:', cmdRes.ok)

  const descRes = await fetch(`https://api.telegram.org/bot${token}/setMyDescription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: "O'qituvchilar va talabalar uchun aqlli ta'lim platformasi. Darslar, to'lovlar, vazifalar va guruhlarni oson boshqaring.",
    }),
  }).then((response) => response.json())
  console.log('Description set:', descRes.ok)

  const shortRes = await fetch(`https://api.telegram.org/bot${token}/setMyShortDescription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      short_description: "Ta'lim platformasi - darslar, to'lovlar, guruhlar",
    }),
  }).then((response) => response.json())
  console.log('Short description set:', shortRes.ok)

  const info = await fetch(`https://api.telegram.org/bot${token}/getMe`).then((response) => response.json())
  console.log('\nBot info:')
  console.log('  Name:', info.result.first_name)
  console.log('  Username: @' + info.result.username)
  console.log('  ID:', info.result.id)
  console.log('  Supports inline:', info.result.supports_inline_queries)
  console.log('\nBot is READY! Open https://t.me/tut0rspacebot to test.')
}

setup().catch(console.error)
