import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;
    if (!userId) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { employee: true },
    });

    if (!user) {
        return null;
    }

    // never hand the password hash to callers
    const { passwordHash, ...safeUser } = user;
    return safeUser;
}

/**
 * Server-component guard. Redirects to /login when signed out, and to / when a
 * required role does not match. Returns the current user otherwise.
 */
export async function requireUser(role) {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }
    if (role && user.role !== role) {
        redirect("/");
    }
    return user;
}