import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { UserRole } from "@prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { member: true },
        });

        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        );
        if (!valid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          memberId: user.memberId ?? undefined,
          name: user.member
            ? `${user.member.firstName} ${user.member.lastName}`
            : user.email,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: UserRole }).role;
        token.memberId = (user as { memberId?: string }).memberId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role as UserRole;
      session.user.memberId = token.memberId as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
});

export type AllowedRole = UserRole | UserRole[];

export function requireRole(
  sessionRole: UserRole,
  allowed: AllowedRole
): boolean {
  const roles = Array.isArray(allowed) ? allowed : [allowed];
  return roles.includes(sessionRole);
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  member: 0,
  loan_officer: 1,
  treasurer: 2,
  secretary: 2,
  president: 3,
  superadmin: 4,
};

export function hasMinRole(sessionRole: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[sessionRole] >= ROLE_HIERARCHY[minRole];
}

export function isOfficer(role: UserRole): boolean {
  return hasMinRole(role, "loan_officer");
}
