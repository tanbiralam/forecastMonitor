import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

let cached: any[] | null = null;

function loadForecasts() {
  if (cached) {
    console.log("[Forecasts] Using cached data:", cached.length, "records");
    return cached;
  }
  const filePath = path.join(process.cwd(), "public", "forecasts-jan2024.json");

  console.log("[Forecasts] Loading from file:", filePath);
  cached = JSON.parse(readFileSync(filePath, "utf-8"));
  console.log("[Forecasts] Loaded", cached!.length, "records");
  console.log(
    "[Forecasts] Sample:",
    JSON.stringify(cached!.slice(0, 2), null, 2)
  );
  return cached!;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from")!;
  const to = searchParams.get("to")!;

  console.log("[Forecasts] Request range:", from, "→", to);

  const allForecasts = loadForecasts();

  const filtered = allForecasts.filter((d) => {
    return d.startTime >= from && d.startTime <= to;
  });

  console.log("[Forecasts] Filtered:", filtered.length, "records");
  if (filtered.length > 0) {
    console.log("[Forecasts] First:", filtered[0]);
    console.log("[Forecasts] Last:", filtered[filtered.length - 1]);
  } else {
    console.log("[Forecasts] ⚠️ No records matched range:", from, "→", to);
    const allStarts = allForecasts.map((d) => d.startTime).sort();
    console.log(
      "[Forecasts] Available range:",
      allStarts[0],
      "→",
      allStarts[allStarts.length - 1]
    );
  }

  return NextResponse.json(filtered);
}
