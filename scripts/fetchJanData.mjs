import { writeFileSync } from "fs";

async function fetchInChunks(baseUrl, startDate, endDate) {
  const results = [];
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current < end) {
    const chunkEnd = new Date(current);
    chunkEnd.setDate(chunkEnd.getDate() + 3);
    if (chunkEnd > end) chunkEnd.setTime(end.getTime());

    const from = current.toISOString().slice(0, 19) + "Z";
    const to = chunkEnd.toISOString().slice(0, 19) + "Z";
    const url = `${baseUrl}&from=${from}&to=${to}`;

    console.log(`  ${from} → ${to}`);

    try {
      const res = await fetch(url);
      const data = await res.json();
      const records = Array.isArray(data) ? data : (data?.data ?? []);
      console.log(`    Got ${records.length} records`);
      results.push(...records);
    } catch (e) {
      console.log(`    Error: ${e.message}`);
    }

    current = new Date(chunkEnd);
    await new Promise((r) => setTimeout(r, 400));
  }

  return results;
}

console.log("\n=== Fetching WINDFOR forecasts — latest/stream (Jan 2024) ===");
const latestForecasts = await fetchInChunks(
  "https://data.elexon.co.uk/bmrs/api/v1/forecast/generation/wind/latest/stream?format=json",
  "2024-01-01T00:00:00Z",
  "2024-01-31T23:30:00Z"
);
console.log(`Latest forecasts fetched: ${latestForecasts.length}`);

console.log(
  "\n=== Fetching WINDFOR forecasts — earliest/stream (Jan 2024) ==="
);
const earliestForecasts = await fetchInChunks(
  "https://data.elexon.co.uk/bmrs/api/v1/forecast/generation/wind/earliest/stream?format=json",
  "2024-01-01T00:00:00Z",
  "2024-01-31T23:30:00Z"
);
console.log(`Earliest forecasts fetched: ${earliestForecasts.length}`);

const forecastMap = new Map();
for (const f of [...latestForecasts, ...earliestForecasts]) {
  const key = `${f.startTime}__${f.publishTime}`;
  if (!forecastMap.has(key)) forecastMap.set(key, f);
}
const mergedForecasts = [...forecastMap.values()].sort((a, b) =>
  a.startTime.localeCompare(b.startTime)
);
console.log(`\nTotal unique forecasts after merge: ${mergedForecasts.length}`);

const validForecasts = mergedForecasts.filter((f) => {
  const pub = new Date(f.publishTime);
  const start = new Date(f.startTime);
  return pub < start;
});
console.log(`After filtering negative horizons: ${validForecasts.length}`);
console.log(
  `Removed: ${mergedForecasts.length - validForecasts.length} invalid records`
);

const horizons = validForecasts.map((f) => {
  const pub = new Date(f.publishTime);
  const start = new Date(f.startTime);
  return (start - pub) / (1000 * 60 * 60);
});
const minH = Math.min(...horizons).toFixed(1);
const maxH = Math.max(...horizons).toFixed(1);
const avgH = (horizons.reduce((a, b) => a + b, 0) / horizons.length).toFixed(1);
console.log(`\nHorizon range: ${minH}h → ${maxH}h (avg: ${avgH}h)`);

const pubTimes = [...new Set(validForecasts.map((d) => d.publishTime))].sort();
console.log(`Unique publishTimes: ${pubTimes.length}`);
console.log(
  `PublishTime range: ${pubTimes[0]} → ${pubTimes[pubTimes.length - 1]}`
);
console.log("Sample:", JSON.stringify(validForecasts.slice(0, 3), null, 2));

writeFileSync(
  "./public/forecasts-jan2024.json",
  JSON.stringify(validForecasts, null, 2)
);
console.log("\n✅ Saved forecasts-jan2024.json");

console.log("\n=== Fetching FUELHH actuals (Jan 2024) ===");
const rawActuals = await fetchInChunks(
  "https://data.elexon.co.uk/bmrs/api/v1/generation/actual/per-type/wind-and-solar?fuelType=WIND",
  "2024-01-01T00:00:00Z",
  "2024-01-31T23:30:00Z"
);
console.log(`\nTotal raw actual records: ${rawActuals.length}`);

const janActuals = rawActuals.filter((d) => d.startTime?.startsWith("2024-01"));
console.log(`Jan 2024 wind records: ${janActuals.length}`);

const combined = {};
for (const d of janActuals) {
  if (d.psrType === "Wind Onshore" || d.psrType === "Wind Offshore") {
    combined[d.startTime] = (combined[d.startTime] ?? 0) + d.quantity;
  }
}

const cleanActuals = Object.entries(combined)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([startTime, generation]) => ({
    startTime,
    generation: Math.round(generation),
  }));

console.log(`Clean combined wind actuals: ${cleanActuals.length}`);
console.log("Sample:", JSON.stringify(cleanActuals.slice(0, 3), null, 2));

writeFileSync(
  "./public/actuals-jan2024-clean.json",
  JSON.stringify(cleanActuals, null, 2)
);
console.log("✅ Saved actuals-jan2024-clean.json");

const forecastStarts = new Set(
  validForecasts.map((d) => d.startTime.slice(0, 16))
);
const actualStarts = new Set(cleanActuals.map((d) => d.startTime.slice(0, 16)));
const overlap = [...forecastStarts].filter((t) => actualStarts.has(t));

console.log(`\n📊 Sanity check:`);
console.log(`  Forecast startTimes: ${forecastStarts.size}`);
console.log(`  Actual startTimes:   ${actualStarts.size}`);
console.log(`  Overlapping:         ${overlap.length}`);

console.log(`\n📊 Horizon bucket coverage:`);
const buckets = [0, 1, 2, 4, 6, 12, 24, 36, 48, 60, 66];
const byStart = {};
for (const f of validForecasts) {
  if (!byStart[f.startTime]) byStart[f.startTime] = [];
  byStart[f.startTime].push(f);
}
const totalStarts = Object.keys(byStart).length;
for (const h of buckets) {
  let count = 0;
  for (const [st, flist] of Object.entries(byStart)) {
    const target = new Date(st);
    const cutoff = new Date(target.getTime() - h * 3600 * 1000);
    const valid = flist.filter((f) => new Date(f.publishTime) <= cutoff);
    if (valid.length > 0) count++;
  }
  console.log(
    `  horizon=${String(h).padStart(2)}h → ${count}/${totalStarts} startTimes have valid forecast (${((count / totalStarts) * 100).toFixed(1)}%)`
  );
}

console.log("\n🎉 Done! Files saved to public/");
