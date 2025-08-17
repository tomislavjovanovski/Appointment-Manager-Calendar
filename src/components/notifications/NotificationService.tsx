import { Appointment, Patient, NotificationSettings } from '@/types/appointment';
import { useToast } from '@/hooks/use-toast';

export class NotificationService {
  private toast: any;

  constructor(toast: any) {
    this.toast = toast;
  }

  async sendEmailNotification(
    appointment: Appointment,
    patient: Patient,
    settings: NotificationSettings,
    isReminderType: 'day-before' | 'same-day'
  ) {
    if (!settings.emailWebhookUrl) {
      console.warn('Email webhook URL not configured');
      return;
    }

    const emailData = {
      to: patient.email,
      subject: isReminderType === 'day-before' 
        ? `Appointment Reminder - Tomorrow at ${appointment.startTime}`
        : `Appointment Today - ${appointment.startTime}`,
      appointmentDetails: {
        patientName: patient.name,
        date: appointment.date,
        time: appointment.startTime,
        type: appointment.type,
        duration: appointment.duration,
        notes: appointment.notes
      },
      htmlTemplate: this.generateEmailTemplate(appointment, patient, settings.emailTemplate, isReminderType),
      timestamp: new Date().toISOString(),
      reminderType: isReminderType
    };

    try {
      await fetch(settings.emailWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify(emailData),
      });

      this.toast({
        title: "Email Sent",
        description: `Email notification sent to ${patient.name}`,
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
      this.toast({
        title: "Email Failed",
        description: `Failed to send email to ${patient.name}`,
        variant: "destructive",
      });
    }
  }

  async sendSMSNotification(
    appointment: Appointment,
    patient: Patient,
    settings: NotificationSettings
  ) {
    if (!settings.smsWebhookUrl) {
      console.warn('SMS webhook URL not configured');
      return;
    }

    const smsData = {
      to: patient.phone,
      message: this.generateSMSMessage(appointment, patient, settings.smsTemplate),
      appointmentDetails: {
        patientName: patient.name,
        date: appointment.date,
        time: appointment.startTime,
        type: appointment.type
      },
      timestamp: new Date().toISOString(),
      country: 'MK' // Macedonia country code
    };

    try {
      await fetch(settings.smsWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify(smsData),
      });

      this.toast({
        title: "SMS Sent",
        description: `SMS notification sent to ${patient.name}`,
      });
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
      this.toast({
        title: "SMS Failed",
        description: `Failed to send SMS to ${patient.name}`,
        variant: "destructive",
      });
    }
  }

  private generateEmailTemplate(
    appointment: Appointment,
    patient: Patient,
    template: string,
    reminderType: 'day-before' | 'same-day'
  ): string {
    if (!template) {
      // Default HTML template
      template = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
            .header { text-align: center; color: #2563eb; margin-bottom: 30px; }
            .appointment-details { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
            .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>{{REMINDER_TITLE}}</h1>
            </div>
            <p>Dear {{PATIENT_NAME}},</p>
            <p>This is a reminder about your upcoming appointment:</p>
            <div class="appointment-details">
              <div class="detail-row"><strong>Date:</strong> <span>{{DATE}}</span></div>
              <div class="detail-row"><strong>Time:</strong> <span>{{TIME}}</span></div>
              <div class="detail-row"><strong>Type:</strong> <span>{{TYPE}}</span></div>
              <div class="detail-row"><strong>Duration:</strong> <span>{{DURATION}} minutes</span></div>
              {{#NOTES}}<div class="detail-row"><strong>Notes:</strong> <span>{{NOTES}}</span></div>{{/NOTES}}
            </div>
            <p>Please arrive 10 minutes early for your appointment.</p>
            <div class="footer">
              <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    const reminderTitle = reminderType === 'day-before' 
      ? 'Appointment Reminder - Tomorrow'
      : 'Appointment Reminder - Today';

    return template
      .replace(/{{REMINDER_TITLE}}/g, reminderTitle)
      .replace(/{{PATIENT_NAME}}/g, patient.name)
      .replace(/{{DATE}}/g, new Date(appointment.date).toLocaleDateString())
      .replace(/{{TIME}}/g, appointment.startTime)
      .replace(/{{TYPE}}/g, appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1))
      .replace(/{{DURATION}}/g, appointment.duration.toString())
      .replace(/{{NOTES}}/g, appointment.notes || '')
      .replace(/{{#NOTES}}.*?{{\/NOTES}}/g, appointment.notes ? '$&' : '');
  }

  private generateSMSMessage(appointment: Appointment, patient: Patient, template: string): string {
    if (!template) {
      template = `Hi {{PATIENT_NAME}}, reminder: You have a {{TYPE}} appointment today at {{TIME}}. Please arrive 10 minutes early. Thank you!`;
    }

    return template
      .replace(/{{PATIENT_NAME}}/g, patient.name)
      .replace(/{{DATE}}/g, new Date(appointment.date).toLocaleDateString())
      .replace(/{{TIME}}/g, appointment.startTime)
      .replace(/{{TYPE}}/g, appointment.type);
  }

  // Method to check and send scheduled notifications
  async checkAndSendScheduledNotifications(
    appointments: Appointment[],
    patients: Patient[],
    settings: NotificationSettings
  ) {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    for (const appointment of appointments) {
      if (appointment.status !== 'scheduled') continue;

      const patient = patients.find(p => p.id === appointment.patientId);
      if (!patient) continue;

      // Same day notifications
      if (appointment.date === todayStr) {
        if (settings.enableSameDayEmail) {
          await this.sendEmailNotification(appointment, patient, settings, 'same-day');
        }
        if (settings.enableSameDaySMS) {
          await this.sendSMSNotification(appointment, patient, settings);
        }
      }

      // Day before notifications
      if (appointment.date === tomorrowStr && settings.enableDayBeforeEmail) {
        await this.sendEmailNotification(appointment, patient, settings, 'day-before');
      }
    }
  }
}