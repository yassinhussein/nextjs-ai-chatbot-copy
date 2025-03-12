import { getServerSession } from "next-auth/next";
import { authConfig } from "@/lib/auth.config";

export async function auth() {
  const session = await getServerSession(authConfig);
  if (!session) return null;
  return {
    ...session,
    user: session.user || { id: null }, // ✅ Ensures user exists
  };
}
