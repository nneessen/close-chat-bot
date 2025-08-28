import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'bot_enabled' }
    });

    const isEnabled = config?.value === true;

    return NextResponse.json({
      enabled: isEnabled,
      lastUpdated: config?.updatedAt?.toISOString(),
      message: isEnabled ? 'Bot is currently enabled' : 'Bot is currently disabled'
    });

  } catch (error) {
    console.error('Error getting bot status:', error);
    return NextResponse.json(
      { error: 'Failed to get bot status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean value' },
        { status: 400 }
      );
    }

    const config = await prisma.systemConfig.upsert({
      where: { key: 'bot_enabled' },
      create: {
        key: 'bot_enabled',
        value: enabled
      },
      update: {
        value: enabled,
        updatedAt: new Date()
      }
    });

    console.log(`🤖 Bot ${enabled ? 'ENABLED' : 'DISABLED'} via API`);

    return NextResponse.json({
      enabled,
      lastUpdated: config.updatedAt.toISOString(),
      message: `Bot has been ${enabled ? 'enabled' : 'disabled'}`
    });

  } catch (error) {
    console.error('Error updating bot status:', error);
    return NextResponse.json(
      { error: 'Failed to update bot status' },
      { status: 500 }
    );
  }
}