import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { smsQueue } from '../../../../lib/queue';

export async function POST() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: {} as Record<string, { status: 'pass' | 'fail', details: string, error?: string }>,
    summary: ''
  };

  // Test 1: Database WebhookEvent table exists and is writable
  try {
    console.log('🔍 Testing WebhookEvent table...');
    
    const testEvent = await prisma.webhookEvent.create({
      data: {
        source: 'test',
        eventType: 'test.webhook',
        payload: { test: 'diagnostic', timestamp: new Date().toISOString() }
      }
    });
    
    await prisma.webhookEvent.delete({
      where: { id: testEvent.id }
    });
    
    results.tests.webhookEventTable = {
      status: 'pass',
      details: 'WebhookEvent table exists and is writable'
    };
  } catch (error) {
    results.tests.webhookEventTable = {
      status: 'fail',
      details: 'WebhookEvent table test failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }

  // Test 2: Queue system
  try {
    console.log('🔍 Testing queue system...');
    
    const job = await smsQueue.add('test-job', {
      test: true,
      timestamp: new Date().toISOString()
    });
    
    results.tests.queueSystem = {
      status: 'pass', 
      details: `Queue job created successfully: ${job.id}`
    };
  } catch (error) {
    results.tests.queueSystem = {
      status: 'fail',
      details: 'Queue system test failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }

  // Test 3: Simulate actual webhook payload
  try {
    console.log('🔍 Testing webhook processing simulation...');
    
    const mockPayload = {
      event: {
        object_type: 'activity.sms',
        action: 'created',
        data: {
          id: 'test-sms-' + Date.now(),
          direction: 'inbound',
          text: 'Test diagnostic message',
          lead_id: 'test-lead-123',
          remote_phone: '8723137425',
          local_phone: '5551234567'
        }
      }
    };

    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        source: 'close',
        eventType: 'activity.sms',
        payload: mockPayload,
      }
    });

    const job = await smsQueue.add('process-sms', {
      webhookEventId: webhookEvent.id,
      payload: mockPayload,
    });

    results.tests.webhookSimulation = {
      status: 'pass',
      details: `Webhook simulation successful - Event ID: ${webhookEvent.id}, Job ID: ${job.id}`
    };
  } catch (error) {
    results.tests.webhookSimulation = {
      status: 'fail',
      details: 'Webhook simulation failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }

  // Test 4: Check recent webhook events
  try {
    console.log('🔍 Checking recent webhook events...');
    
    const recentEvents = await prisma.webhookEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        source: true,
        eventType: true,
        processed: true,
        error: true,
        createdAt: true
      }
    });
    
    results.tests.recentEvents = {
      status: 'pass',
      details: `Found ${recentEvents.length} recent webhook events: ${recentEvents.map(e => `${e.source}:${e.eventType}:${e.processed ? 'processed' : 'pending'}`).join(', ')}`
    };
  } catch (error) {
    results.tests.recentEvents = {
      status: 'fail',
      details: 'Failed to check recent webhook events',
      error: error instanceof Error ? error.message : String(error)
    };
  }

  // Determine overall status
  const failedTests = Object.values(results.tests).filter(t => t.status === 'fail');
  const passedTests = Object.values(results.tests).filter(t => t.status === 'pass');
  
  results.summary = `${passedTests.length} passed, ${failedTests.length} failed`;

  console.log('🔍 Diagnostic results:', results);

  return NextResponse.json(results);
}