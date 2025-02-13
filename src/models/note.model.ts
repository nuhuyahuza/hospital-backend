import mongoose, { Document, Schema } from 'mongoose';

interface IChecklistItem extends Document {
  task: string;
  completed: boolean;
  dueDate?: Date;
}

interface IPlanItem extends Document {
  action: string;
  frequency: string;
  duration: number;
  startDate: Date;
  completed: boolean;
  checkIns: Date[];
}

export interface INote extends Document {
  doctorId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  encryptedNote: string;
  checklist: IChecklistItem[];
  plan: IPlanItem[];
  createdAt: Date;
  updatedAt: Date;
}

const checklistItemSchema = new Schema<IChecklistItem>({
  task: { type: String, required: true },
  completed: { type: Boolean, default: false },
  dueDate: { type: Date },
});

const planItemSchema = new Schema<IPlanItem>({
  action: { type: String, required: true },
  frequency: { type: String, required: true },
  duration: { type: Number, required: true },
  startDate: { type: Date, required: true },
  completed: { type: Boolean, default: false },
  checkIns: [{ type: Date }],
});

const noteSchema = new Schema<INote>(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    encryptedNote: {
      type: String,
      required: true,
    },
    checklist: [checklistItemSchema],
    plan: [planItemSchema],
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
noteSchema.index({ doctorId: 1, patientId: 1, createdAt: -1 });

export const Note = mongoose.model<INote>('Note', noteSchema); 