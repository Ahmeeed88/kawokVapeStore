import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const settings = await db.settings.findMany({
      orderBy: {
        key: 'asc',
      },
    });

    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const settings = body.settings;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Settings object is required' },
        { status: 400 }
      );
    }

    // Update settings in transaction
    await db.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(settings)) {
        await tx.settings.upsert({
          where: { key },
          update: { value: value as string },
          create: { key, value: value as string },
        });
      }
    });

    return NextResponse.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Settings POST error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}