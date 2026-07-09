import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

// Returns the signed-in user's id, or null. Every API route that touches
// user data must call this and 401 on null.
export async function requireUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const id = (session.user as { id?: string }).id;
  return id ?? null;
}
