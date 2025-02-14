import express from 'express';
import { protect, restrictTo } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { EncryptionService } from '../services/encryption.service';

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);
router.use(restrictTo(UserRole.PATIENT));

/**
 * @swagger
 * /api/patients/doctors:
 *   get:
 *     tags: [Patients]
 *     summary: Get available doctors
 *     description: Retrieve a list of all available doctors
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of doctors successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     doctors:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/doctors', async (req, res, next) => {
  try {
    const doctors = await prisma.user.findMany({
      where: {
        role: UserRole.DOCTOR,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    res.status(200).json({
      status: 'success',
      data: { doctors },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/patients/select-doctor/{doctorId}:
 *   post:
 *     tags: [Patients]
 *     summary: Select a doctor
 *     description: Assign a doctor to the authenticated patient
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the doctor to assign
 *     responses:
 *       200:
 *         description: Doctor successfully assigned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     patient:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Doctor not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/select-doctor/:doctorId', async (req, res, next) => {
  try {
    const { doctorId } = req.params;

    const doctor = await prisma.user.findUnique({
      where: {
        id: doctorId,
        role: UserRole.DOCTOR,
      },
    });

    if (!doctor) {
      throw new AppError(404, 'Doctor not found');
    }

    const patient = await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        assignedDoctorId: doctorId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        assignedDoctorId: true,
      },
    });

    res.status(200).json({
      status: 'success',
      data: { patient },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/patients/my-doctor:
 *   get:
 *     tags: [Patients]
 *     summary: Get current doctor
 *     description: Retrieve information about the patient's assigned doctor
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doctor information successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     doctor:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: No doctor assigned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/my-doctor', async (req, res, next) => {
  try {
    const patient = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!patient?.doctor) {
      throw new AppError(404, 'No doctor assigned');
    }

    res.status(200).json({
      status: 'success',
      data: { doctor: patient.doctor },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/patients/my-notes:
 *   get:
 *     tags: [Patients]
 *     summary: Get patient's notes
 *     description: Retrieve all medical notes and actionable steps for the authenticated patient
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notes successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     notes:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/Note'
 *                           - type: object
 *                             properties:
 *                               doctor:
 *                                 $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/my-notes', async (req, res, next) => {
  try {
    const notes = await prisma.note.findMany({
      where: {
        AND: [
          { patientId: req.user.id },
          { deleted: false }
        ]
      },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        checklist: {
          where: {
            deleted: false
          }
        },
        plan: {
          where: {
            deleted: false
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Decrypt notes
    const decryptedNotes = notes.map(note => ({
      ...note,
      note: EncryptionService.decryptData(note.encryptedNote),
    }));

    res.status(200).json({
      status: 'success',
      data: { notes: decryptedNotes },
    });
  } catch (error) {
    next(new AppError(500, 'Internal server error'));
  }
});

/**
 * @swagger
 * /api/patients/check-in/{noteId}/{planItemId}:
 *   post:
 *     tags: [Patients]
 *     summary: Record plan item check-in
 *     description: Record a check-in for a specific plan item in a medical note
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the note
 *       - in: path
 *         name: planItemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the plan item
 *     responses:
 *       200:
 *         description: Check-in recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Check-in recorded successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Note or plan item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/check-in/:noteId/:planItemId', async (req, res, next) => {
  try {
    const { noteId, planItemId } = req.params;

    const planItem = await prisma.planItem.findFirst({
      where: {
        id: planItemId,
        deleted: false,
        note: {
          id: noteId,
          patientId: req.user.id,
          deleted: false
        }
      }
    });

    if (!planItem) {
      throw new AppError(404, 'Note or plan item not found');
    }

    await prisma.planItem.update({
      where: {
        id: planItemId
      },
      data: {
        checkIns: {
          push: new Date()
        }
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Check-in recorded successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/patients/complete-task/{noteId}/{taskId}:
 *   post:
 *     tags: [Patients]
 *     summary: Complete checklist task
 *     description: Mark a checklist item as completed
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the note
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the checklist item
 *     responses:
 *       200:
 *         description: Task marked as completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Task marked as completed
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Note or checklist item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/complete-task/:noteId/:taskId', async (req, res, next) => {
  try {
    const { noteId, taskId } = req.params;

    const checklistItem = await prisma.checklistItem.findFirst({
      where: {
        id: taskId,
        deleted: false,
        note: {
          is: {
            id: noteId,
            patientId: req.user.id,
            deleted: false
          }
        }
      }
    });

    if (!checklistItem) {
      throw new AppError(404, 'Note or checklist item not found');
    }

    await prisma.checklistItem.update({
      where: {
        id: taskId
      },
      data: {
        completed: true
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Task marked as completed'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/patients/notes/{noteId}:
 *   delete:
 *     tags: [Patients]
 *     summary: Soft delete a note
 *     description: Mark a note as deleted (soft delete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the note to delete
 *     responses:
 *       200:
 *         description: Note deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Note deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Note not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/notes/:noteId', async (req, res, next) => {
  try {
    const { noteId } = req.params;

    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        patientId: req.user.id,
        deleted: false
      }
    });

    if (!note) {
      throw new AppError(404, 'Note not found');
    }

    await prisma.note.update({
      where: {
        id: noteId
      },
      data: {
        deleted: true
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Note deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/patients/check-in/{noteId}/{planItemId}:
 *   delete:
 *     tags: [Patients]
 *     summary: Soft delete a plan item
 *     description: Mark a plan item as deleted (soft delete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the note
 *       - in: path
 *         name: planItemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the plan item to delete
 *     responses:
 *       200:
 *         description: Plan item deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Plan item deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Plan item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/check-in/:noteId/:planItemId', async (req, res, next) => {
  try {
    const { noteId, planItemId } = req.params;

    const planItem = await prisma.planItem.findFirst({
      where: {
        id: planItemId,
        note: {
          id: noteId,
          patientId: req.user.id
        },
        deleted: false
      }
    });

    if (!planItem) {
      throw new AppError(404, 'Plan item not found');
    }

    await prisma.planItem.update({
      where: {
        id: planItemId
      },
      data: {
        deleted: true
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Plan item deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/patients/tasks/{noteId}/{taskId}:
 *   delete:
 *     tags: [Patients]
 *     summary: Soft delete a checklist task
 *     description: Mark a checklist task as deleted (soft delete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the note
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the checklist task to delete
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Task deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/tasks/:noteId/:taskId', async (req, res, next) => {
  try {
    const { noteId, taskId } = req.params;

    const checklistItem = await prisma.checklistItem.findFirst({
      where: {
        id: taskId,
        deleted: false,
        note: {
          is: {
            id: noteId,
            patientId: req.user.id,
            deleted: false
          }
        }
      }
    });

    if (!checklistItem) {
      throw new AppError(404, 'Task not found');
    }

    await prisma.checklistItem.update({
      where: {
        id: taskId
      },
      data: {
        deleted: true
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Task deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router; 