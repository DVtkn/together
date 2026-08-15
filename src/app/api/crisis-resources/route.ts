import { NextResponse } from 'next/server'

const DEFAULT_RESOURCES = [
  {
    type: 'emergency',
    title: 'Экстренная помощь',
    description: 'Общая экстренная помощь',
    phone: '112',
    url: null,
    country: 'RU',
    icon: 'Phone',
    order: 1,
  },
  {
    type: 'safety',
    title: 'Линия безопасности',
    description: 'Линия психологической поддержки',
    phone: '8-800-100-13-11',
    url: null,
    country: 'RU',
    icon: 'Shield',
    order: 2,
  },
]

export async function GET() {
  return NextResponse.json(DEFAULT_RESOURCES)
}
