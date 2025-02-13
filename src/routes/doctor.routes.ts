import express from 'express';
import { protect, restrictTo } from '../middleware/auth.middleware';
import { User, UserRole } from '../models/user.model';
import { Note } from '../models/note.model';
import { AppError } from '../middleware/error.middleware';
import { LLMService } from '../services/llm.service';

const router = express.Router();
const llmService = new LLMService();

// Protect all routes after this middleware
router.use(protect);
router.use(restrictTo(UserRole.DOCTOR));

// Get doctor's patients
router.get('/patients', async (req, res, next) => {
  try {
    const patients = await User.find({
      assignedDoctor: req.user._id,
      role: UserRole.PATIENT,
    }).select('-password');

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

// Submit note for a patient
router.post('/patients/:patientId/notes', async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { note } = req.body;

    // Verify patient exists and is assigned to doctor
    const patient = await User.findOne({
      _id: patientId,
      assignedDoctor: req.user._id,
      role: UserRole.PATIENT,
    });

    if (!patient) {
      throw new AppError(404, 'Patient not found or not assigned to you');
    }

    // Process note with LLM
    const actionableSteps = await llmService.processNote(note);

    // Encrypt note
    const encryptedNote = req.user.encryptData(note);

    // Cancel previous actionable steps
    await Note.updateMany(
      {
        patientId,
        'plan.completed': false,
      },
      {
        $set: {
          'plan.$[].completed': true,
          'checklist.$[].completed': true,
        },
      }
    );

    // Create new note with actionable steps
    const newNote = await Note.create({
      doctorId: req.user._id,
      patientId,
      encryptedNote,
      checklist: actionableSteps.checklist,
      plan: actionableSteps.plan.map(item => ({
        ...item,
        checkIns: [],
      })),
    });

    res.status(201).json({
      status: 'success',
      data: {
        note: newNote,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get patient's notes
router.get('/patients/:patientId/notes', async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const notes = await Note.find({
      doctorId: req.user._id,
      patientId,
    }).sort({ createdAt: -1 });

    // Decrypt notes
    const decryptedNotes = notes.map(note => ({
      ...note.toObject(),
      note: req.user.decryptData(note.encryptedNote),
    }));

    res.status(200).json({
      status: 'success',
      data: {
        notes: decryptedNotes,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router; 