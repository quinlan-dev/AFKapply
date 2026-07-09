import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { rateLimit } from "./rateLimit";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();

        // Throttle brute-force attempts per account.
        if (!rateLimit(`login:${email}`, 10, 15 * 60 * 1000)) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          // Equalize timing between unknown-user and wrong-password paths.
          await bcrypt.compare(credentials.password, "$2a$12$invalidsaltinvalidsaltinvalidsaltinvalid12");
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name ?? undefined };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as { id?: string }).id = token.id as string;
      return session;
    }
  }
};
