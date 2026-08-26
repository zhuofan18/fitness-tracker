import { NextRequest, NextResponse } from "next/server";
import { analyzeFoodPhoto } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("photo");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing photo" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported image type" },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  try {
    const analysis = await analyzeFoodPhoto(
      base64,
      file.type as "image/jpeg" | "image/png" | "image/webp",
    );
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Food analysis failed", error);
    return NextResponse.json(
      { error: "Failed to analyze photo" },
      { status: 502 },
    );
  }
}
