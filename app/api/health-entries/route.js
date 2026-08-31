import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    const where =
      currentUser.role === 'MANAGER'
        ? { employee: { managerId: currentUser.employee.id } }
        : { employeeId: currentUser.employee.id };

    const entries = await prisma.healthEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { employee: { select: { firstName: true, surname: true } } },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch health entries' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    if (currentUser.role === 'MANAGER') {
      return NextResponse.json({ error: 'Managers cannot create health entries' }, { status: 403 });
    }

    const body = await request.json();
    const { issueDescription, supportNeeded, supportStartDate, supportEndDate } = body;

    if (!issueDescription || !supportNeeded || !supportStartDate) {
      return NextResponse.json(
        { error: 'issueDescription, supportNeeded and supportStartDate are required' },
        { status: 400 }
      );
    }

    const entry = await prisma.healthEntry.create({
      data: {
        employeeId: currentUser.employee.id,
        issueDescription,
        supportNeeded,
        supportStartDate: new Date(supportStartDate),
        supportEndDate: supportEndDate ? new Date(supportEndDate) : null,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create health entry' }, { status: 500 });
  }
}