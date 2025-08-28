/**
 * Script to setup comprehensive template system
 */

import { templateManager } from '../src/services/template-manager';

async function setupTemplates() {
  try {
    console.log('🚀 Setting up comprehensive template system...');
    console.log('');
    
    const importedCount = await templateManager.createComprehensiveTemplateSet();
    
    console.log('');
    console.log('✅ SUCCESS! Template system initialized');
    console.log('📊 Template Breakdown:');
    console.log('  • Opening Messages: 20+ variations');
    console.log('  • Permission Requests: 15+ variations');
    console.log('  • Qualification Questions: 25+ variations');
    console.log('  • Objection Handling: 100+ variations');
    console.log('  • Appointment Booking: 30+ variations');
    console.log('  • Follow-up Sequences: 40+ variations');
    console.log('  • Urgency & Scarcity: 20+ variations');
    console.log('  • Social Proof: 25+ variations');
    console.log('');
    console.log(`📝 Total: ${importedCount} response templates created`);
    console.log('🤖 Your chatbot now has intelligent, context-aware responses!');
    
  } catch (error) {
    console.error('❌ Failed to setup template system:', error);
    process.exit(1);
  }
}

setupTemplates();