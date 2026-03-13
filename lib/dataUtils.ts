import { parseISO, subHours, isBefore, isEqual } from "date-fns";

export interface ActualPoint {
  startTime: string;
  generation: number;
}

export interface ForecastPoint {
  startTime: string;
  publishTime: string;
  generation: number;
}

export interface ChartPoint {
  time: string;
  actual: number | null;
  forecast: number | null;
}

function normalizeTime(t: string): string {
  return t.slice(0, 16); // "2024-01-01T00:00"
}

export function buildChartData(
  actuals: ActualPoint[],
  forecasts: ForecastPoint[],
  horizonHours: number
): ChartPoint[] {
  const forecastMap = new Map<string, ForecastPoint[]>();
  for (const f of forecasts) {
    const key = normalizeTime(f.startTime);
    if (!forecastMap.has(key)) forecastMap.set(key, []);
    forecastMap.get(key)!.push(f);
  }
  for (const [, arr] of forecastMap) {
    arr.sort(
      (a, b) =>
        parseISO(b.publishTime).getTime() - parseISO(a.publishTime).getTime()
    );
  }

  let matched = 0,
    horizonFiltered = 0,
    noForecast = 0;

  const result = actuals.map((actual) => {
    const targetTime = parseISO(actual.startTime);
    const cutoffTime = subHours(targetTime, horizonHours);
    const key = normalizeTime(actual.startTime);
    const candidates = forecastMap.get(key) ?? [];

    if (candidates.length === 0) {
      noForecast++;
      return {
        time: actual.startTime,
        actual: actual.generation,
        forecast: null,
      };
    }

    const valid = candidates.find((f) => {
      const pub = parseISO(f.publishTime);
      return isBefore(pub, cutoffTime) || isEqual(pub, cutoffTime);
    });

    if (!valid) {
      horizonFiltered++;
      return {
        time: actual.startTime,
        actual: actual.generation,
        forecast: null,
      };
    }

    matched++;
    return {
      time: actual.startTime,
      actual: actual.generation,
      forecast: valid.generation,
    };
  });

  console.log(
    `[buildChartData] horizon=${horizonHours}h | matched=${matched} | horizonFiltered=${horizonFiltered} | noForecast=${noForecast}`
  );

  return result;
}
