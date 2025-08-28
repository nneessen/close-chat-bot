import { templateManager } from '@/services/template-manager';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log('🚀 Setting up comprehensive template system...');
    
    const importedCount = await templateManager.createComprehensiveTemplateSet();
    
    console.log(`✅ Successfully imported ${importedCount} response templates`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully created ${importedCount} response templates`,
      details: {
        opening: '20+ variations',
        permission: '15+ variations', 
        qualification: '25+ variations',
        objection: '100+ variations',
        appointment: '30+ variations',
        followup: '40+ variations',
        urgency: '20+ variations',
        social_proof: '25+ variations',
        total: `${importedCount} templates`
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to setup template system:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const report = await templateManager.generatePerformanceReport();
    
    return NextResponse.json({
      success: true,
      performance_report: report
    });
    
  } catch (error) {
    console.error('❌ Failed to generate template report:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}