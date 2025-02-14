import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clean up existing data
  await prisma.planItem.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.note.deleteMany();
  await prisma.user.deleteMany();

  // Create a test doctor
  const doctor = await prisma.user.create({
    data: {
      name: 'Dr. John Smith',
      email: 'doctor@example.com',
      password: await bcrypt.hash('password123', 10),
      role: UserRole.DOCTOR,
    },
  });

  // Create a test patient
  const patient = await prisma.user.create({
    data: {
      name: 'Jane Doe',
      email: 'patient@example.com',
      password: await bcrypt.hash('password123', 10),
      role: UserRole.PATIENT,
      assignedDoctorId: doctor.id,
    },
  });

  console.log('Database has been seeded with test data');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 