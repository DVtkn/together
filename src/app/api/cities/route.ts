import { NextResponse } from 'next/server'

// Hardcoded cities for the Russian market (MVP)
const cities = [
  { id: '1', name: 'Москва', emoji: '🏙️', timezone: 'Europe/Moscow' },
  { id: '2', name: 'Санкт-Петербург', emoji: '🏙️', timezone: 'Europe/Moscow' },
  { id: '3', name: 'Новосибирск', emoji: '🏙️', timezone: 'Asia/Novosibirsk' },
  { id: '4', name: 'Екатеринбург', emoji: '🏙️', timezone: 'Asia/Yekaterinburg' },
  { id: '5', name: 'Казань', emoji: '🏙️', timezone: 'Europe/Kazan' },
  { id: '6', name: 'Нижний Новгород', emoji: '🏙️', timezone: 'Europe/Moscow' },
  { id: '7', name: 'Нově', emoji: '🏙️', timezone: 'Europe/Moscow' },
  { id: '8', name: 'Казань', emoji: '🏙️', timezone: 'Europe/Kazan' },
]

export async function GET() {
  try {
    return NextResponse.json({ cities })
  } catch (error) {
    console.error('Get cities error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'