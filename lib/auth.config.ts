import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    newUser: "/",
  },
  providers: [], // No providers (credentials-only auth)
  callbacks: {
    async session({ session, token }) {
      if (token?.id) {
        session.user = { id: token.id }; // ✅ Ensures user has ID
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id; // ✅ Stores ID in token
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;
