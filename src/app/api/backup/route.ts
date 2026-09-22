import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readDbJson, writeDbJson } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const data = readDbJson();
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = 'printbazzar-backup-' + dateStr + '.json';

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="' + filename + '"',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
 try {
 const body = await request.json();
 if (!body || typeof body !== 'object') {
 return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 });
 }

 // Basic structure validation
 if (!Array.isArray(body.media) && !Array.isArray(body.rates) && !Array.isArray(body.jobs)) {
 return NextResponse.json({ error: 'Backup file must contain media, rates, or jobs data' }, { status: 400 });
 }

 const current = readDbJson();
 const merged = {
 ...current,
 ...body,
 users: body.users || current.users,
 machines: body.machines || current.machines,
 rates: body.rates || current.rates,
 media: body.media || current.media,
 jobs: body.jobs || current.jobs,
 dailyCounters: body.dailyCounters || current.dailyCounters,
 wastageReasons: body.wastageReasons || current.wastageReasons,
 updatedAt: new Date().toISOString(),
 };

 writeDbJson(merged);

 return NextResponse.json({
 success: true,
 message: 'Backup restored successfully into local database.',
 jobCount: merged.jobs?.length || 0,
 mediaCount: merged.media?.length || 0,
 counterCount: merged.dailyCounters?.length || 0,
 });
 } catch (err: any) {
 return NextResponse.json({ error: err.message }, { status: 500 });
 }
}
