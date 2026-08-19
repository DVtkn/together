import { NextResponse } from 'next/server'

export function validationError(message = 'Ошибка валидации'): NextResponse {
  return NextResponse.json({ error: message }, { status: 422 })
}