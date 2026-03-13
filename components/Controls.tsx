"use client";

interface Props {
  startDate: string;
  endDate: string;
  horizon: number;
  onStartChange: (val: string) => void;
  onEndChange: (val: string) => void;
  onHorizonChange: (val: number) => void;
  onFetch: () => void;
  isLoading: boolean;
}

export default function Controls({
  startDate,
  endDate,
  horizon,
  onStartChange,
  onEndChange,
  onHorizonChange,
  onFetch,
  isLoading,
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Start Time
          </label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => onStartChange(e.target.value)}
            className="w-full text-black border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            End Time
          </label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => onEndChange(e.target.value)}
            className="w-full text-black border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Forecast Horizon:{" "}
          <span className="text-blue-600 font-bold">{horizon} hours</span>
        </label>
        <input
          type="range"
          min={0}
          max={66}
          step={1}
          value={horizon}
          onChange={(e) => onHorizonChange(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0h</span>
          <span>24h</span>
          <span>48h</span>
          <span>66h</span>
        </div>
      </div>

      <button
        onClick={onFetch}
        disabled={isLoading}
        className="w-full sm:w-auto self-end bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
      >
        {isLoading ? "Loading..." : "Update Chart"}
      </button>
    </div>
  );
}
