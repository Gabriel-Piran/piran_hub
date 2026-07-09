import { NextResponse } from "next/server";
import { ensureBuckets } from "@/lib/supabase-storage";

export async function GET() {
  await ensureBuckets();
  return NextResponse.json({ status: "ok" });
}
