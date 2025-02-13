import express from 'express';
import { protect, restrictTo } from '../middleware/auth.middleware';
import { User, UserRole } from '../models/user.model';
import { Note } from '../models/note.model';
import { AppError } from '../middleware/error.middleware';

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);
router.use(restrictTo(UserRole.PATIENT));

// Get available doctors
router.get('/doctors', async (req, res, next) => {
  try {
    const doctors = await User.find({
      role: UserRole.DOCTOR,
    }).select('name email');

    res.status(200).json({
      status: 'success',
      data: {
        doctors,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Select doctor
router.post('/select-doctor/:doctorId', async (req, res, next) => {
  try {
    const { doctorId } = req.params;

    const doctor = await User.findOne({
      _id: doctorId,
      role: UserRole.DOCTOR,
    });

    if (!doctor) {
      throw new AppError(404, 'Doctor not found');
    }

    // Update patient's assigned doctor
    const patient = await User.findByIdAndUpdate(
      req.user._id,
      { assignedDoctor: doctorId },
      { new: true }
    ).select('-password');

    // Add patient to doctor's patient list
    await User.findByIdAndUpdate(doctorId, {
      $addToSet: { patients: req.user._id },
    });

    res.status(200).json({
      status: 'success',
      data: {
        patient,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get current doctor
router.get('/my-doctor', async (req, res, next) => {
  try {
    const patient = await User.findById(req.user._id)
      .populate('assignedDoctor', 'name email')
      .select('-password');

    if (!patient) {
      throw new AppError(404, 'Patient not found');
    }

    if (!patient.assignedDoctor) {
      throw new AppError(404, 'No doctor assigned');
    }

    res.status(200).json({
      status: 'success',
      data: {
        doctor: patient.assignedDoctor,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get patient's notes and actionable steps
router.get('/my-notes', async (req, res, next) => {
  try {
    const notes = await Note.find({
      patientId: req.user._id,
    })
      .populate('doctorId', 'name email')
      .sort({ createdAt: -1 });

    // Decrypt notes using the doctor's encryption
    const decryptedNotes = await Promise.all(
      notes.map(async (note) => {
        const doctor = await User.findById(note.doctorId);
        if (!doctor) {
          throw new AppError(404, `Doctor not found for note ${note._id}`);
        }
        return {
          ...note.toObject(),
          note: doctor.decryptData(note.encryptedNote),
        };
      })
    );

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

// Check-in for a plan item
router.post('/check-in/:noteId/:planItemId', async (req, res, next) => {
  try {
    const { noteId, planItemId } = req.params;

    const note = await Note.findOne({
      _id: noteId,
      patientId: req.user._id,
      'plan._id': planItemId,
    });

    if (!note) {
      throw new AppError(404, 'Note or plan item not found');
    }

    // Add check-in
    await Note.updateOne(
      {
        _id: noteId,
        'plan._id': planItemId,
      },
      {
        $push: {
          'plan.$.checkIns': new Date(),
        },
      }
    );

    res.status(200).json({
      status: 'success',
      message: 'Check-in recorded successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Complete a checklist item
router.post('/complete-task/:noteId/:taskId', async (req, res, next) => {
  try {
    const { noteId, taskId } = req.params;

    const note = await Note.findOneAndUpdate(
      {
        _id: noteId,
        patientId: req.user._id,
        'checklist._id': taskId,
      },
      {
        $set: {
          'checklist.$.completed': true,
        },
      },
      { new: true }
    );

    if (!note) {
      throw new AppError(404, 'Note or checklist item not found');
    }

    res.status(200).json({
      status: 'success',
      message: 'Task marked as completed',
    });
  } catch (error) {
    next(error);
  }
});

export default router; 