import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { surname: 'asc' },
      select: {
        id: true,
        firstName: true,
        surname: true,
        email: true,
        managerId: true,
      },
    });
    return NextResponse.json(employees);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { firstName, surname, email, managerId } = body;

    if (!firstName || !surname || !email) {
      return NextResponse.json(
        { error: 'firstName, surname and email are required' },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.create({
      data: {
        firstName,
        surname,
        email,
        managerId: managerId || null,
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'An employee with that email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}