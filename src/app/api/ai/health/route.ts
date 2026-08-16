import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  return NextResponse.json({ ok: true, status: 200 })
}

export const dynamic = "force-dynamic"
export const revalidate = 0