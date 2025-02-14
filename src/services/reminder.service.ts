import { prisma } from '../lib/prisma';
import cron from 'node-cron';
import { PlanItem, Note, User } from '@prisma/client';

interface ReminderContext {
  planItem: PlanItem & {
    note: Note & {
      patient: User;
    };
  };
  daysElapsed: number;
  missedDays: number;
}

export class ReminderService {
  private static async calculateReminderStatus(planItem: PlanItem): Promise<ReminderContext> {
    const now = new Date();
    const startDate = new Date(planItem.startDate);
    const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate expected check-ins based on frequency
    let expectedCheckIns = 0;
    switch (planItem.frequency.toLowerCase()) {
      case 'daily':
        expectedCheckIns = daysElapsed + 1;
        break;
      case 'weekly':
        expectedCheckIns = Math.floor(daysElapsed / 7) + 1;
        break;
      case 'as needed':
        expectedCheckIns = 1; // Only one check-in expected for "as needed" items
        break;
      default:
        expectedCheckIns = daysElapsed + 1; // Default to daily if frequency is unknown
    }

    // Calculate missed days
    const actualCheckIns = planItem.checkIns.length;
    const missedDays = Math.max(0, expectedCheckIns - actualCheckIns);

    return {
      planItem,
      daysElapsed,
      missedDays
    };
  }

  static async processReminders() {
    console.log('Processing reminders...');
    const now = new Date();

    try {
      // Get all active plan items
      const activePlans = await prisma.planItem.findMany({
        where: {
          deleted: false,
          completed: false,
          startDate: {
            lte: now,
          },
        },
        include: {
          note: {
            include: {
              patient: true,
            },
          },
        },
      });

      console.log(`Found ${activePlans.length} active plans to process`);

      for (const plan of activePlans) {
        try {
          const status = await this.calculateReminderStatus(plan);
          
          // If we've completed all required check-ins (including make-up days)
          if (plan.checkIns.length >= plan.duration + status.missedDays) {
            console.log(`Completing plan item ${plan.id} - all check-ins completed`);
            await prisma.planItem.update({
              where: { id: plan.id },
              data: { completed: true }
            });
            continue;
          }

          // If we need to extend the duration due to missed check-ins
          if (status.missedDays > 0) {
            console.log(`Plan item ${plan.id} has ${status.missedDays} missed check-ins`);
            
            // Log reminder (in production, this would send notifications)
            const reminderMessage = this.generateReminderMessage(plan, status);
            await this.logReminder(plan.id, reminderMessage);
          }

        } catch (error) {
          console.error(`Error processing plan item ${plan.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in reminder processing:', error);
    }
  }

  private static generateReminderMessage(plan: PlanItem & { note: Note & { patient: User } }, status: ReminderContext): string {
    const patientName = plan.note.patient.name;
    const action = plan.action;
    const missedDays = status.missedDays;

    if (missedDays > 0) {
      return `Reminder for ${patientName}: You have missed ${missedDays} ${plan.frequency} check-in(s) for "${action}". Please complete your check-in.`;
    }
    
    return `Reminder for ${patientName}: Time for your ${plan.frequency} "${action}". Please complete your check-in.`;
  }

  private static async logReminder(planItemId: string, message: string) {
    // In a production environment, this would:
    // 1. Store the reminder in a database
    // 2. Send notifications (email, SMS, push notification, etc.)
    // 3. Track reminder status
    
    console.log(`[REMINDER LOG] ${new Date().toISOString()} - Plan ${planItemId}:`, message);
  }

  static startScheduler() {
    console.log('Starting reminder scheduler...');
    
    // Run every hour
    cron.schedule('0 * * * *', () => {
      console.log('Running scheduled reminder check...');
      this.processReminders().catch(error => {
        console.error('Error in scheduled reminder processing:', error);
      });
    });

    // Also process immediately on startup
    this.processReminders().catch(error => {
      console.error('Error in initial reminder processing:', error);
    });
  }

  static async cancelPreviousReminders(patientId: string) {
    console.log(`Cancelling previous reminders for patient ${patientId}`);
    
    try {
      // Mark all active plan items and checklist items as deleted
      const [updatedPlanItems, updatedChecklistItems] = await Promise.all([
        prisma.planItem.updateMany({
          where: {
            note: {
              patientId,
            },
            deleted: false,
            completed: false,
          },
          data: {
            deleted: true,
          },
        }),
        prisma.checklistItem.updateMany({
          where: {
            note: {
              patientId,
            },
            deleted: false,
            completed: false,
          },
          data: {
            deleted: true,
          },
        }),
      ]);

      console.log(`Cancelled ${updatedPlanItems.count} plan items and ${updatedChecklistItems.count} checklist items`);
      
      return {
        cancelledPlanItems: updatedPlanItems.count,
        cancelledChecklistItems: updatedChecklistItems.count,
      };
    } catch (error) {
      console.error('Error cancelling previous reminders:', error);
      throw error;
    }
  }
} 