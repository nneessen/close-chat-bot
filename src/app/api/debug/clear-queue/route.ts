import { NextResponse } from 'next/server';
import { smsQueue } from '@/lib/queue';

export async function POST() {
  try {
    console.log('🧹 Clearing SMS queue of all pending jobs...');
    
    // Clear all jobs
    await smsQueue.clean(0, 100, 'completed');
    await smsQueue.clean(0, 100, 'failed'); 
    await smsQueue.clean(0, 100, 'active');
    await smsQueue.clean(0, 100, 'waiting');
    await smsQueue.clean(0, 100, 'delayed');
    
    console.log('✅ SMS queue cleared successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Queue cleared - old test jobs removed' 
    });
    
  } catch (error) {
    console.error('❌ Failed to clear queue:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}