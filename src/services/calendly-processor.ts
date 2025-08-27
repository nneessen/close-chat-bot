import { prisma } from '@/lib/prisma';
import { CalendlyWebhookPayload } from '@/types';

export async function processCalendlyWebhook(
  webhookEventId: string,
  payload: CalendlyWebhookPayload
) {
  try {
    console.log(`Processing Calendly webhook event: ${webhookEventId}`);
    
    // Handle different Calendly events
    switch (payload.event) {
      case 'invitee.created':
        await handleAppointmentCreated(payload);
        break;
      case 'invitee.canceled':
        await handleAppointmentCanceled(payload);
        break;
      default:
        console.log(`Unhandled Calendly event type: ${payload.event}`);
    }

    // Mark webhook as processed
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });

  } catch (error) {
    console.error(`Failed to process Calendly webhook ${webhookEventId}:`, error);
    
    // Mark webhook as failed
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        processed: true,
        error: error instanceof Error ? error.message : 'Unknown error',
        processedAt: new Date(),
      },
    });
    
    throw error;
  }
}

async function handleAppointmentCreated(payload: CalendlyWebhookPayload) {
  const { event, invitee } = payload.payload;
  
  if (!event || !invitee) return;

  // Find lead by phone or email
  const lead = await findLeadByContact(invitee.email);
  
  if (lead) {
    // Create appointment record
    await prisma.appointment.create({
      data: {
        leadId: lead.id,
        calendlyEventId: event.uri,
        scheduledAt: new Date(event.start_time),
        duration: Math.round(
          (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000
        ),
        status: 'scheduled',
        eventType: event.event_type,
        metadata: {
          inviteeUri: invitee.uri,
          location: event.location,
          questionsAndAnswers: invitee.questions_and_answers,
          tracking: invitee.tracking,
        },
      },
    });

    // TODO: Send confirmation SMS through Close.io
    console.log(`Appointment created for lead ${lead.id}`);
  }
}

async function handleAppointmentCanceled(payload: CalendlyWebhookPayload) {
  const { event, invitee } = payload.payload;
  
  if (!event || !invitee) return;

  // Update appointment status
  await prisma.appointment.updateMany({
    where: {
      calendlyEventId: event.uri,
    },
    data: {
      status: 'canceled',
      metadata: {
        canceledBy: invitee.cancellation?.canceled_by,
        cancelReason: invitee.cancellation?.reason,
      },
    },
  });

  // TODO: Send cancellation follow-up SMS
  console.log(`Appointment canceled: ${event.uri}`);
}

async function findLeadByContact(email: string) {
  return await prisma.lead.findFirst({
    where: {
      OR: [
        { email: email },
        // Could extend to search by phone if available
      ],
    },
  });
}