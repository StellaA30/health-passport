import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteAttachmentsByPrefix } from '@/lib/s3';
import { getCurrentUser } from '@/lib/session';

async function authoriseAccess(entry, currentUser) {
  if (!currentUser) return false;
  if (currentUser.role === 'MANAGER') {
    const owner = await prisma.employee.findUnique({ where: { id: entry.employeeId } });
    return owner?.managerId === currentUser.employee.id;
  }
  return entry.employeeId === currentUser.employee.id;
}

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const currentUser = await getCurrentUser();
    const entry = await prisma.healthEntry.findUnique({ where: { id } });

    if (!entry) return NextResponse.json({ error: 'Health entry not found' }, { status: 404 });
    if (!(await authoriseAccess(entry, currentUser))) {
      return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch health entry' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  try {
    const currentUser = await getCurrentUser();
    const entry = await prisma.healthEntry.findUnique({ where: { id } });

    if (!entry) return NextResponse.json({ error: 'Health entry not found' }, { status: 404 });

    if (!currentUser || entry.employeeId !== currentUser.employee.id) {
      return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
    }

    const body = await request.json();
    const { issueDescription, supportNeeded, supportStartDate, supportEndDate } = body;

    const updated = await prisma.healthEntry.update({
      where: { id },
      data: {
        ...(issueDescription !== undefined && { issueDescription }),
        ...(supportNeeded !== undefined && { supportNeeded }),
        ...(supportStartDate !== undefined && { supportStartDate: new Date(supportStartDate) }),
        ...(supportEndDate !== undefined && { supportEndDate: supportEndDate ? new Date(supportEndDate) : null }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update health entry' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const currentUser = await getCurrentUser();
    const entry = await prisma.healthEntry.findUnique({ where: { id } });

    if (!entry) return NextResponse.json({ error: 'Health entry not found' }, { status: 404 });

    if (!currentUser || entry.employeeId !== currentUser.employee.id) {
      return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
    }

    // Remove the entry's whole folder from the bucket, including any files left
    // over from previous "Replace" uploads.
    await deleteAttachmentsByPrefix(`health-entries/${id}/`);

    await prisma.healthEntry.delete({ where: { id } });
    return NextResponse.json({ message: 'Health entry deleted' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete health entry' }, { status: 500 });
  }
}