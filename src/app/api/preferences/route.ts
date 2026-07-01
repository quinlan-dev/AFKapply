import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  roleTitles: z.array(z.string()).min(1),
  locations: z.array(z.string()).default([]),
  remoteOnly: z.boolean().default(false),
  minSalary: z.number().nullable().optional(),
  companySlugs: z.array(z.string()).min(1)
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const preference = await prisma.preference.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(preference);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userId = (session.user as any).id as string;
  const preference = await prisma.preference.create({
    data: { userId, ...parsed.data }
  });

  return NextResponse.json(preference);
}
