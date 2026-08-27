import { NextRequest, NextResponse } from "next/server";
import { identifyDishViaWebSearch } from "@/lib/anthropic";
import {
  analyzeFoodDescriptionViaGroq,
  analyzeFoodPhotoViaGroq,
} from "@/lib/groq";
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
  const description = formData.get("description");
  const lookup = formData.get("lookup") === "true";

  try {
    if (file instanceof File) {
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
      const analysis = await analyzeFoodPhotoViaGroq(
        base64,
        file.type as "image/jpeg" | "image/png" | "image/webp",
      );
      return NextResponse.json(analysis);
    }

    if (typeof description === "string" && description.trim().length > 0) {
      let research = "";
      if (lookup) {
        try {
          research = await identifyDishViaWebSearch(description.trim());
        } catch (error) {
          console.error("Dish lookup failed", error);
        }
      }
      const analysis = await analyzeFoodDescriptionViaGroq(
        description.trim(),
        research,
      );
      return NextResponse.json(analysis);
    }

    return NextResponse.json(
      { error: "Missing photo or description" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Food analysis failed", error);
    return NextResponse.json(
      { error: "Failed to analyze food" },
      { status: 502 },
    );
  }
}
