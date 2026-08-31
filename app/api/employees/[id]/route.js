import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { reports: { select: { id: true, firstName: true, surname: true } } },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { firstName, surname, email, managerId } = body;

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(surname !== undefined && { surname }),
        ...(email !== undefined && { email }),
        ...(managerId !== undefined && { managerId }),
      },
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    await prisma.employee.delete({ where: { id } });
    return NextResponse.json({ message: 'Employee deleted' });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
}