import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const config = await prisma.systemConfig.upsert({
      where: { key: 'bot_enabled' },
      create: {
        key: 'bot_enabled',
        value: true
      },
      update: {
        value: true,
        updatedAt: new Date()
      }
    });

    console.log('🤖✅ Bot ENABLED via API');

    return NextResponse.json({
      enabled: true,
      lastUpdated: config.updatedAt.toISOString(),
      message: 'Bot has been enabled - will respond to new SMS messages'
    });

  } catch (error) {
    console.error('Error enabling bot:', error);
    return NextResponse.json(
      { error: 'Failed to enable bot' },
      { status: 500 }
    );
  }
}