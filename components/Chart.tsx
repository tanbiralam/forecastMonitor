/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { ChartPoint } from "@/lib/dataUtils";
import { format, parseISO } from "date-fns";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface Props {
  data: ChartPoint[];
  isLoading: boolean;
}

export default function ForecastChart({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-xl border border-gray-200">
        <div className="text-gray-400 text-sm animate-pulse">
          Loading chart data...
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-xl border border-gray-200">
        <div className="text-gray-400 text-sm">
          Select a date range to view data
        </div>
      </div>
    );
  }

  const labels = data.map((d) => format(parseISO(d.time), "dd MMM HH:mm"));

  const chartData = {
    labels,
    datasets: [
      {
        label: "Actual Generation (MW)",
        data: data.map((d) => d.actual),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.08)",
        borderWidth: 2,
        pointRadius: 0, // actuals are dense (30-min), no dots needed
        tension: 0.3,
        spanGaps: false,
      },
      {
        label: "Forecasted Generation (MW)",
        data: data.map((d) => d.forecast),
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.08)",
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 5,
        tension: 0.3,
        spanGaps: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          usePointStyle: true,
          pointStyleWidth: 16,
          font: { size: 13 },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const val = ctx.parsed.y;
            return val !== null
              ? `${ctx.dataset.label}: ${Math.round(val).toLocaleString()} MW`
              : `${ctx.dataset.label}: No forecast available`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 12,
          font: { size: 11 },
          maxRotation: 45,
        },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
      y: {
        title: {
          display: true,
          text: "Generation (MW)",
          font: { size: 12 },
        },
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: {
          callback: (val: any) => `${val.toLocaleString()} MW`,
        },
      },
    },
  };

  return (
    <div className="relative h-96 w-full">
      <Line data={chartData} options={options} />
    </div>
  );
}
