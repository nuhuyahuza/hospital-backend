import express from 'express';
import { protect, restrictTo } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { LLMService } from '../services/llm.service';
import { EncryptionService } from '../services/encryption.service';

const router = express.Router();
const llmService = new LLMService();

/**
 * @swagger
 * components:
 *   schemas:
 *     Note:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         encryptedNote:
 *           type: string
 *         doctorId:
 *           type: string
 *           format: uuid
 *         patientId:
 *           type: string
 *           format: uuid
 *         checklist:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ChecklistItem'
 *         plan:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PlanItem'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ChecklistItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         task:
 *           type: string
 *         completed:
 *           type: boolean
 *         dueDate:
 *           type: string
 *           format: date-time
 *     PlanItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         action:
 *           type: string
 *         frequency:
 *           type: string
 *         duration:
 *           type: integer
 *         startDate:
 *           type: string
 *           format: date-time
 *         completed:
 *           type: boolean
 *         checkIns:
 *           type: array
 *           items:
 *             type: string
 *             format: date-time
 */

// Protect all routes after this middleware
router.use(protect);
router.use(restrictTo(UserRole.DOCTOR));

/**
 * @swagger
 * /api/doctors/patients:
 *   get:
 *     tags: [Doctors]
 *     summary: Get doctor's patients
 *     description: Retrieve all patients assigned to the authenticated doctor
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of patients successfully retrieved
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
 *                     patients:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Not a doctor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/patients', async (req, res, next) => {
  try {
    const patients = await prisma.user.findMany({
      where: {
        assignedDoctorId: req.user.id,
        role: UserRole.PATIENT,
      },
      select: {
        id: true,
        email: true,
        name: true,
        assignedDoctorId: true,
        role: true,
      },
    });

    res.status(200).json({
      status: 'success',
      data: {
        patients,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/doctors/patients/{patientId}/notes:
 *   post:
 *     tags: [Doctors]
 *     summary: Submit note for a patient
 *     description: Create a new medical note for a patient with LLM-processed actionable steps
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the patient
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - note
 *             properties:
 *               note:
 *                 type: string
 *                 example: "Patient shows symptoms of flu. Prescribe bed rest and fluids."
 *     responses:
 *       201:
 *         description: Note created successfully
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
 *                     note:
 *                       $ref: '#/components/schemas/Note'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Patient not found or not assigned to doctor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/patients/:patientId/notes', async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { note } = req.body;

    const patient = await prisma.user.findUnique({
      where: {
        id: patientId,
        assignedDoctorId: req.user.id,
        role: UserRole.PATIENT,
      },
    });

    if (!patient) {
      throw new AppError(404, 'Patient not found or not assigned to you');
    }

    const actionableSteps = await llmService.processNote(note);
    const encryptedNote = EncryptionService.encryptData(note);

    // Cancel previous actionable steps
    await prisma.note.findMany({
      where: { patientId },
      include: {
        plan: true,
        checklist: true,
      },
    }).then(async (notes) => {
      for (const note of notes) {
        await prisma.planItem.updateMany({
          where: { noteId: note.id, completed: false },
          data: { completed: true },
        });
        await prisma.checklistItem.updateMany({
          where: { noteId: note.id, completed: false },
          data: { completed: true },
        });
      }
    });

    const newNote = await prisma.note.create({
      data: {
        doctorId: req.user.id,
        patientId,
        encryptedNote,
        checklist: {
          create: actionableSteps.checklist,
        },
        plan: {
          create: actionableSteps.plan.map(item => ({
            ...item,
            checkIns: [],
          })),
        },
      },
      include: {
        checklist: true,
        plan: true,
      },
    });

    res.status(201).json({
      status: 'success',
      data: { note: newNote },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/doctors/patients/{patientId}/notes:
 *   get:
 *     tags: [Doctors]
 *     summary: Get patient's notes
 *     description: Retrieve all medical notes for a specific patient
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the patient
 *     responses:
 *       200:
 *         description: Notes retrieved successfully
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
 *                         $ref: '#/components/schemas/Note'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/patients/:patientId/notes', async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const notes = await prisma.note.findMany({
      where: {
        doctorId: req.user.id,
        patientId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        checklist: true,
        plan: true,
      },
    });

    const decryptedNotes = notes.map(note => ({
      ...note,
      note: EncryptionService.decryptData(note.encryptedNote),
    }));

    res.status(200).json({
      status: 'success',
      data: { notes: decryptedNotes },
    });
  } catch (error) {
    next(error);
  }
});

export default router; 