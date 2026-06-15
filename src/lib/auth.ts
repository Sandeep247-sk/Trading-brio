import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Role } from "@prisma/client";
import authConfig from "./auth.config";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("[AUTH DEBUG] authorize called with credentials:", {
          email: credentials?.email,
          hasPassword: !!credentials?.password
        });

        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          console.log("[AUTH DEBUG] z.safeParse failed:", parsed.error.format());
          return null;
        }

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email, isActive: true, deletedAt: null },
        });

        console.log("[AUTH DEBUG] user query result:", user ? {
          id: user.id,
          email: user.email,
          isActive: user.isActive,
          deletedAt: user.deletedAt,
          hasHash: !!user.password
        } : "null");

        if (!user || !user.password) {
          console.log("[AUTH DEBUG] User not found or has no password");
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        console.log("[AUTH DEBUG] bcrypt.compare result:", isValid);

        if (!isValid) {
          console.log("[AUTH DEBUG] Password validation failed");
          return null;
        }

        // Log successful login
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "LOGIN",
            entity: "user",
            entityId: user.id,
            details: { method: "credentials" },
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role: Role }).role = token.role as Role;
      }
      return session;
    },
  },
});
