import { z } from "zod";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = z
    .string()
    .regex(/^[a-z0-9]{20,40}$/)
    .safeParse((await params).id);
  if (!parsed.success) return new Response(null, { status: 404 });
  const media = await prisma.media.findUnique({ where: { id: parsed.data } });
  if (!media) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(media.data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
