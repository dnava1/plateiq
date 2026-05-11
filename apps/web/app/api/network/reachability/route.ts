import { NextResponse } from 'next/server'

const REACHABILITY_HEADERS = {
  'Cache-Control': 'no-store',
}

export function GET() {
  return new NextResponse(null, {
    headers: REACHABILITY_HEADERS,
    status: 204,
  })
}

export function HEAD() {
  return new NextResponse(null, {
    headers: REACHABILITY_HEADERS,
    status: 204,
  })
}