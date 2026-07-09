import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const schema = z.object({
  matchId: z.string().min(1).max(64),
  status: z.enum(["new", "saved", "dismissed"])
});

export async function PATCH(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const match = await prisma.match.findFirst({
    where: { id: parsed.data.matchId, userId }
  });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.match.update({
    where: { id: match.id },
    data: { status: parsed.data.status }
  });

  return NextResponse.json(updated);
}
