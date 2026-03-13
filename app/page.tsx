"use client";

import { useState, useCallback, useRef } from "react";
import Controls from "@/components/Controls";
import ForecastChart from "@/components/Chart";
import {
  buildChartData,
  ChartPoint,
  ActualPoint,
  ForecastPoint,
} from "@/lib/dataUtils";
import { format } from "date-fns";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-1">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-xl font-bold text-gray-800">{value}</span>
    </div>
  );
}

function computeStats(data: ChartPoint[]) {
  const paired = data.filter((d) => d.actual !== null && d.forecast !== null);
  if (!paired.length) return null;
  const errors = paired.map((d) => Math.abs(d.actual! - d.forecast!));
  const mae = errors.reduce((a, b) => a + b, 0) / errors.length;
  const maxActual = Math.max(...data.map((d) => d.actual ?? 0));
  const avgActual =
    data.reduce((a, d) => a + (d.actual ?? 0), 0) /
    data.filter((d) => d.actual !== null).length;
  const coveragePct = ((paired.length / data.length) * 100).toFixed(1);
  return { mae, maxActual, avgActual, coveragePct };
}

export default function Home() {
  const [startDate, setStartDate] = useState("2024-01-01T00:00");
  const [endDate, setEndDate] = useState("2024-01-07T23:30");
  const [horizon, setHorizon] = useState(4);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const rawActuals = useRef<ActualPoint[]>([]);
  const rawForecasts = useRef<ForecastPoint[]>([]);

  const handleHorizonChange = useCallback((val: number) => {
    setHorizon(val);
    if (rawActuals.current.length > 0) {
      const built = buildChartData(
        rawActuals.current,
        rawForecasts.current,
        val
      );
      setChartData(built);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return;
    if (new Date(startDate) >= new Date(endDate)) {
      setError("Start time must be before end time.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const from = new Date(startDate).toISOString();
      const to = new Date(endDate).toISOString();

      const [actualsRes, forecastsRes] = await Promise.all([
        fetch(
          `/api/actuals?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
        ),
        fetch(
          `/api/forecasts?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
        ),
      ]);

      if (!actualsRes.ok || !forecastsRes.ok)
        throw new Error("Failed to fetch data.");

      const actualsRaw = await actualsRes.json();
      const forecastsRaw = await forecastsRes.json();

      // Deduplicate actuals by startTime
      const seen = new Set<string>();
      const actuals: ActualPoint[] = (
        Array.isArray(actualsRaw) ? actualsRaw : []
      )
        .filter((d: any) => {
          if (seen.has(d.startTime)) return false;
          seen.add(d.startTime);
          return true;
        })
        .map((d: any) => ({
          startTime: d.startTime,
          generation: d.generation,
        }));

      const forecasts: ForecastPoint[] = (
        Array.isArray(forecastsRaw) ? forecastsRaw : []
      ).map((d: any) => ({
        startTime: d.startTime,
        publishTime: d.publishTime,
        generation: d.generation,
      }));

      rawActuals.current = actuals;
      rawForecasts.current = forecasts;

      const built = buildChartData(actuals, forecasts, horizon);
      setChartData(built);
      setLastFetched(format(new Date(), "HH:mm:ss"));
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, horizon]);

  const stats = computeStats(chartData);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              🌬️ UK Wind Power Forecast Monitor
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              National-level wind generation — actual vs forecast
            </p>
          </div>
          {lastFetched && (
            <span className="text-xs text-gray-400">
              Last updated: {lastFetched}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        <Controls
          startDate={startDate}
          endDate={endDate}
          horizon={horizon}
          onStartChange={setStartDate}
          onEndChange={setEndDate}
          onHorizonChange={handleHorizonChange} // ← uses instant handler
          onFetch={fetchData}
          isLoading={isLoading}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            ⚠️ {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">
              Generation Overview
            </h2>
            {chartData.length > 0 && (
              <span className="text-xs text-gray-400">
                {chartData.length} data points · Horizon: {horizon}h
              </span>
            )}
          </div>
          <ForecastChart data={chartData} isLoading={isLoading} />
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Mean Abs Error"
              value={`${Math.round(stats.mae).toLocaleString()} MW`}
            />
            <StatCard
              label="Avg Actual"
              value={`${Math.round(stats.avgActual).toLocaleString()} MW`}
            />
            <StatCard
              label="Peak Actual"
              value={`${Math.round(stats.maxActual).toLocaleString()} MW`}
            />
            <StatCard
              label="Forecast Coverage"
              value={`${stats.coveragePct}%`}
            />
          </div>
        )}

        <p className="text-xs text-gray-400 text-center pb-4">
          Data source: Elexon BMRS API · January 2024 · Wind power only
        </p>
      </div>
    </main>
  );
}
