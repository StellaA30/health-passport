import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { uploadAttachment } from '../lib/s3.js';

const prisma = new PrismaClient();

const MANAGER_ID = '00000000-0000-0000-0000-000000000001';
const MANAGER_ID_2 = '00000000-0000-0000-0000-000000000002';
const MANAGER_ID_3 = '00000000-0000-0000-0000-000000000003';

const EMPLOYEE_ID = '00000000-0000-0000-0000-000000000011'; // manager_id = MANAGER_ID
const EMPLOYEE_ID_2 = '00000000-0000-0000-0000-000000000012'; // manager_id = MANAGER_ID
const EMPLOYEE_ID_3 = '00000000-0000-0000-0000-000000000013'; // manager_id = MANAGER_ID
const EMPLOYEE_ID_4 = '00000000-0000-0000-0000-000000000014'; // manager_id = MANAGER_ID_2
const EMPLOYEE_ID_5 = '00000000-0000-0000-0000-000000000015'; // manager_id = MANAGER_ID_3

async function main() {
// Employee schema upserts
  // employee upserts
  await prisma.employee.upsert({
    where: { id: MANAGER_ID },
    update: {},
    create: {
      id: MANAGER_ID,
      firstName: 'John',
      surname: 'Lee',
      jobTitle: 'Lead Software Engineer',
      email: 'john.lee@healthpassport.com'
    },
  });

   await prisma.employee.upsert({
    where: { id: MANAGER_ID_2 },
    update: {},
    create: {
      id: MANAGER_ID_2,
      firstName: 'Grace',
      surname: 'Hopper',
      jobTitle: 'Senior Solutions Architect',
      email: 'grace.hopper@healthpassport.com'
    },
  });

  await prisma.employee.upsert({
    where: { id: MANAGER_ID_3 },
    update: {},
    create: {
      id: MANAGER_ID_3,
      firstName: 'Mary',
      surname: 'Smith',
      jobTitle: 'Senior Product Manager',
      email: 'mary.smith@healthpassport.com'
    },
  });
    // employee upserts
  await prisma.employee.upsert({
    where: { id: EMPLOYEE_ID },
    update: {},
    create: {
      id: EMPLOYEE_ID,
      firstName: 'Jamie',
      surname: 'Doyle',
      jobTitle: 'Junior Software Engineer',
      email: 'jamie.doyle@healthpassport.com',
      managerId: MANAGER_ID,
    },
  });

  await prisma.employee.upsert({
    where: { id: EMPLOYEE_ID_2 },
    update: {},
    create: {
      id: EMPLOYEE_ID_2,
      firstName: 'Adam',
      surname: 'Williams',
      jobTitle: 'Software Engineer',
      email: 'adam.williams@healthpassport.com',
      managerId: MANAGER_ID,
    },
  });


  await prisma.employee.upsert({
    where: { id: EMPLOYEE_ID_3 },
    update: {},
    create: {
      id: EMPLOYEE_ID_3,
      firstName: 'Katy',
      surname: 'McCann',
      jobTitle: 'Quality Engineer',
      email: 'katy.mccann@healthpassport.com',
      managerId: MANAGER_ID,
    },
  });

  await prisma.employee.upsert({
    where: { id: EMPLOYEE_ID_4 },
    update: {},
    create: {
      id: EMPLOYEE_ID_4,
      firstName: 'Liam',
      surname: 'Johnson',
      jobTitle: 'Software Engineer',
      email: 'liam.johnson@healthpassport.com',
      managerId: MANAGER_ID_2,
    },
  });

  await prisma.employee.upsert({
    where: { id: EMPLOYEE_ID_5 },
    update: {},
    create: {
      id: EMPLOYEE_ID_5,
      firstName: 'Bella',
      surname: 'Spencer',
      jobTitle: 'Business Analyst',
      email: 'bella.spencer@healthpassport.com',
      managerId: MANAGER_ID_3,
    },
  });

  

  

  const passwordHash = await bcrypt.hash('DemoPass123!', 10);

  // user upserts - 
    // managers
  await prisma.user.upsert({
    where: { employeeId: MANAGER_ID },
    update: {},
    create: {
      employeeId: MANAGER_ID,
      email: 'john.lee@healthpassport.com',
      passwordHash,
      role: 'MANAGER',
    },
  });

  await prisma.user.upsert({
    where: { employeeId: MANAGER_ID_2 },
    update: {},
    create: {
      employeeId: MANAGER_ID_2,
      email: 'grace.hopper@healthpassport.com',
      passwordHash,
      role: 'MANAGER',
    },
  });

  await prisma.user.upsert({
    where: { employeeId: MANAGER_ID_3 },
    update: {},
    create: {
      employeeId: MANAGER_ID_3,
      email: 'mary.smith@healthpassport.com',
      passwordHash,
      role: 'MANAGER',
    },
  });
   // employees
  await prisma.user.upsert({
    where: { employeeId: EMPLOYEE_ID },
    update: {},
    create: {
      employeeId: EMPLOYEE_ID,
      email: 'jamie.doyle@healthpassport.com',
      passwordHash,
      role: 'EMPLOYEE',
    },
  });

  await prisma.user.upsert({
    where: { employeeId: EMPLOYEE_ID_2 },
    update: {},
    create: {
      employeeId: EMPLOYEE_ID_2,
      email: 'adam.williams@healthpassport.com',
      passwordHash,
      role: 'EMPLOYEE',
    },
  });

  await prisma.user.upsert({
    where: { employeeId: EMPLOYEE_ID_3 },
    update: {},
    create: {
      employeeId: EMPLOYEE_ID_3,
      email: 'katy.mccann@healthpassport.com',
      passwordHash,
      role: 'EMPLOYEE',
    },
  });

  await prisma.user.upsert({
    where: { employeeId: EMPLOYEE_ID_4 },
    update: {},
    create: {
      employeeId: EMPLOYEE_ID_4,
      email: 'liam.johnson@healthpassport.com',
      passwordHash,
      role: 'EMPLOYEE',
    },
  });

  await prisma.user.upsert({
    where: { employeeId: EMPLOYEE_ID_5 },
    update: {},
    create: {
      employeeId: EMPLOYEE_ID_5,
      email: 'bella.spencer@healthpassport.com',
      passwordHash,
      role: 'EMPLOYEE',
    },
  });

  // Best-effort demo attachment. If MinIO / the bucket isn't up, still seed the
  // entry (without a document) so the demo logins and data always work.
  let attachmentKey = null;
  try {
    const samplePdf = Buffer.from('%PDF-1.4 demo attachment content', 'utf-8');
    const key = `health-entries/demo/${Date.now()}-occupational-health-report.pdf`;
    await uploadAttachment(key, samplePdf, 'application/pdf');
    attachmentKey = key;
  } catch (err) {
    console.warn(`Skipping demo attachment upload (S3 unavailable): ${err.message}`);
  }

  // health entry upserts
  await prisma.healthEntry.create({
    data: {
      employeeId: EMPLOYEE_ID,
      issueDescription: 'Recurring lower back pain affecting desk-based work',
      supportNeeded: 'Sit-stand desk and ergonomic chair assessment',
      supportStartDate: new Date('2026-06-01'),
      createdAt: new Date('2026-06-01'),
      supportEndDate: new Date('2026-12-01'),
      attachmentKey,
    },
  });

  await prisma.healthEntry.create({
    data: {
      employeeId: EMPLOYEE_ID,
      issueDescription: 'Temporary headaches and eye strain from prolonged screen time',
      supportNeeded: 'Regular breaks, screen filters, and ergonomic adjustments',
      supportStartDate: new Date('2026-07-15'),
      createdAt: new Date('2026-07-15'),
      supportEndDate: null
    },
  });

  await prisma.healthEntry.create({
    data: {
      employeeId: EMPLOYEE_ID_2,
      issueDescription: 'Mild anxiety affecting work performance',
      supportNeeded: 'Flexible working hours and access to mental health resources',
      supportStartDate: new Date('2026-08-28'),
      createdAt: new Date('2026-08-28'),
      supportEndDate: null,
    },
  });

  await prisma.healthEntry.create({
    data: {
      employeeId: EMPLOYEE_ID_3,
      issueDescription: 'ADHD',
      supportNeeded: 'Noise-cancelling headphones and task management support',
      supportStartDate: new Date('2026-05-30'),
      createdAt: new Date('2026-05-30'),
      supportEndDate: null,
    },
  });

  await prisma.healthEntry.create({
    data: {
      employeeId: EMPLOYEE_ID_3,
      issueDescription: 'Sprained ankle during a weekend hike, causing temporary mobility issues',
      supportNeeded: 'Temporary remote work arrangement and ergonomic adjustments for home office',
      supportStartDate: new Date('2026-04-13'),
      createdAt: new Date('2026-04-13'),
      supportEndDate: new Date('2026-07-15'),
      updatedAt: new Date('2026-07-16')
    },
  });

   await prisma.healthEntry.create({
    data: {
      employeeId: EMPLOYEE_ID_4,
      issueDescription: 'Flu-like symptoms and fatigue',
      supportNeeded: 'Temporary sick leave and remote work options',
      supportStartDate: new Date('2026-02-03'),
      createdAt: new Date('2026-02-03'),
      supportEndDate: new Date('2026-02-10'),
      updatedAt: new Date('2026-07-10')
    },
  });

   await prisma.healthEntry.create({
    data: {
      employeeId: EMPLOYEE_ID_5,
      issueDescription: 'Child unwell with a contagious illness, requiring care at home',
      supportNeeded: 'Temporary flexible working hours',
      supportStartDate: new Date('2026-08-31'),
      createdAt: new Date('2026-08-31'),
      supportEndDate: null
    },
  });


  console.log('Seed complete. Demo login: jamie.doyle@healthpassport.com / john.lee@healthpassport.com, password: DemoPass123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());