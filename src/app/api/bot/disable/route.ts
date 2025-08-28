import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const config = await prisma.systemConfig.upsert({
      where: { key: 'bot_enabled' },
      create: {
        key: 'bot_enabled',
        value: false
      },
      update: {
        value: false,
        updatedAt: new Date()
      }
    });

    console.log('🤖❌ Bot DISABLED via API');

    return NextResponse.json({
      enabled: false,
      lastUpdated: config.updatedAt.toISOString(),
      message: 'Bot has been disabled - will not respond to new SMS messages'
    });

  } catch (error) {
    console.error('Error disabling bot:', error);
    return NextResponse.json(
      { error: 'Failed to disable bot' },
      { status: 500 }
    );
  }
}