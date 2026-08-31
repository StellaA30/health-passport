import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';


/**
 * Handles the POST request for user login.
 * POST is used because we are sending sensitive information (email and password) in the request body, 
 * which should not be exposed in the URL as it would be with a GET request.
 *  Using POST helps to keep this information secure.
 * @param {Request} request - The incoming request object.
 * @returns {Promise<NextResponse>} - The response object.
 */
export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'email and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { employee: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const response = NextResponse.json({
      id: user.employee.id,
      firstName: user.employee.firstName,
      surname: user.employee.surname,
      role: user.role,
    });
    response.cookies.set('userId', user.id, { httpOnly: true, sameSite: 'lax', path: '/' });

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

/**
 * This function handles the DELETE request to log out the user by deleting the 'userId' cookie.
 * @param {Request} request - The incoming request object.
 * @returns 
 */
export async function DELETE() {
    const response = NextResponse.json({ message: 'Logged out successfully' });
    response.cookies.delete('userId');
    return response;
}