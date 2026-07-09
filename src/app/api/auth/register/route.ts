import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(72), // bcrypt truncates past 72 bytes
  name: z.string().max(100).optional()
});

export async function POST(req: Request) {
  if (!rateLimit(`register:${clientIp(req)}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const { password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Account already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name }
  });

  return NextResponse.json({ id: user.id, email: user.email });
}
