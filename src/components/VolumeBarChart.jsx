import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const COLORS = ["#5961F5", "#5EA0EE", "#EC4899", "#F59E0B", "#10B981", "#8B5CF6"];

export default function VolumeBarChart({ coins, loading }) {
  if (loading) return <div className="skeleton skel-chart" />;

  const labels = coins.map((c) => c.name);
  const volumes = coins.map((c) => c.total_volume ?? 0);

  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            label: "24h Volume (USD)",
            data: volumes,
            backgroundColor: labels.map((_, i) => COLORS[i % COLORS.length]),
            borderRadius: 10,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { font: { weight: "700" } } },
          y: {
            ticks: {
              callback: (v) => {
                const n = Number(v);
                if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
                if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
                if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
                return n;
              },
            },
          },
        },
      }}
    />
  );
}
