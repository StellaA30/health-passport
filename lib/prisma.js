import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma || new PrismaClient();

// this ensures that the prisma client is only instantiated once in development, 
// preventing hot reloading from creating multiple instances of the client. 
// In production, we want to create a new instance of the client for each request to ensure that we are not 
// sharing state between requests.
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}