import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

let cached: any[] | null = null;

function loadActuals() {
  if (cached) {
    console.log("[Actuals] Using cached data:", cached.length, "records");
    return cached;
  }
  const filePath = path.join(
    process.cwd(),
    "public",
    "actuals-jan2024-clean.json"
  );
  console.log("[Actuals] Loading from file:", filePath);
  cached = JSON.parse(readFileSync(filePath, "utf-8"));
  console.log("[Actuals] Loaded", cached!.length, "records");
  console.log(
    "[Actuals] Sample:",
    JSON.stringify(cached!.slice(0, 2), null, 2)
  );
  return cached!;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from")!;
  const to = searchParams.get("to")!;

  console.log("[Actuals] Request range:", from, "→", to);

  const allActuals = loadActuals();

  const filtered = allActuals.filter((d) => {
    return d.startTime >= from && d.startTime <= to;
  });

  console.log("[Actuals] Filtered:", filtered.length, "records");
  if (filtered.length > 0) {
    console.log("[Actuals] First:", filtered[0]);
    console.log("[Actuals] Last:", filtered[filtered.length - 1]);
  }

  return NextResponse.json(filtered);
}
