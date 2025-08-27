import { NextResponse } from 'next/server';
import { conversationLearningService } from '@/services/conversation-learning';

export async function POST() {
  try {
    console.log('🚀 Starting conversation learning process...');
    
    // Extract successful patterns from sold leads
    const patterns = await conversationLearningService.extractSuccessfulConversations();
    
    // Generate insights from patterns
    const insights = await conversationLearningService.generateInsights();
    
    console.log('✅ Learning process completed!');
    
    return NextResponse.json({
      success: true,
      message: 'Successfully learned from conversations',
      stats: {
        patternsExtracted: patterns.length,
        insightsGenerated: insights.length,
        topInsights: insights.slice(0, 5).map(insight => ({
          pattern: insight.pattern.substring(0, 100) + '...',
          effectiveness: Math.round(insight.effectiveness * 100) + '%',
          leadPreference: insight.leadAgePreference,
          usageCount: insight.usage_frequency
        }))
      }
    });
  } catch (error) {
    console.error('❌ Learning process failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to learn from conversations',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}