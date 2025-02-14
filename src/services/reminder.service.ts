import { prisma } from '../lib/prisma';
import cron from 'node-cron';

export class ReminderService {
  static async processReminders() {
    const now = new Date();
    const activePlans = await prisma.planItem.findMany({
      where: {
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

    for (const plan of activePlans) {
      const { frequency, duration, checkIns, startDate } = plan;
      const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const requiredCheckIns = daysSinceStart + 1;
      const actualCheckIns = checkIns.length;

      // If we have all required check-ins, mark as completed
      if (actualCheckIns >= duration) {
        await prisma.planItem.update({
          where: { id: plan.id },
          data: { completed: true },
        });
        continue;
      }

      // If we're missing check-ins, extend the duration
      if (actualCheckIns < requiredCheckIns) {
        // Log reminder (in production, this would send notifications)
        console.log(`Reminder for patient ${plan.note.patient.name}: ${plan.action}`);
      }
    }
  }

  static startScheduler() {
    // Run every hour
    cron.schedule('0 * * * *', () => {
      ReminderService.processReminders().catch(console.error);
    });
  }
} 