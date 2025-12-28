import { c as createSignal, o as onMount, E as onCleanup, n as createEffect, t as template, i as insert, d as createComponent, S as Show, L as use, P as namespace } from './index-NnaOo1cf.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="card p-6"><canvas class=w-full style="height:600px;background:rgba(0, 0, 0, 0.2);border-radius:8px">`), _tmpl$2 = /* @__PURE__ */ template(`<div class="card p-4"><div class=text-sm style=color:var(--text-secondary)><strong>How to read:</strong><ul class="mt-2 space-y-1 list-disc list-inside"><li>Time spirals outward from center (now) to edge (3 minutes ago)</li><li>Brighter glow = higher CPU usage</li><li>Thicker ribbon = more memory allocated (RSS + Cache + Free)</li><li>Recent points (last 10 seconds) are highlighted with white rings</li><li>Perfect for spotting repeating spikes and "just happened" incidents`), _tmpl$3 = /* @__PURE__ */ template(`<div class="p-6 space-y-6"><div class="flex items-center justify-between"><div><h1 class="text-2xl font-bold"style=color:var(--text-primary)>Time Helix</h1><p class=text-sm style=color:var(--text-secondary)>Spiral timeline showing CPU intensity and memory thickness over the last 3 minutes`), _tmpl$4 = /* @__PURE__ */ template(`<div class="text-center py-12"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div><p class="mt-4 text-sm opacity-70">Loading metrics...`), _tmpl$5 = /* @__PURE__ */ template(`<div class="grid grid-cols-2 gap-4"><div class="card p-4"><div class=text-sm style=color:var(--text-secondary)>CPU Usage</div><div class="text-3xl font-bold mt-2"style=color:#06b6d4>%</div></div><div class="card p-4"><div class=text-sm style=color:var(--text-secondary)>Memory Usage</div><div class="text-3xl font-bold mt-2"style=color:#8b5cf6>%`);
const TimeHelix = () => {
  const [metricsData, setMetricsData] = createSignal([]);
  const [isLoading, setIsLoading] = createSignal(true);
  let canvasRef;
  let animationFrameId;
  let intervalId;
  const SPIRAL_TURNS = 3;
  const POINTS_PER_TURN = 60;
  const MAX_POINTS = SPIRAL_TURNS * POINTS_PER_TURN;
  const fetchMetrics = async () => {
    try {
      const ns = namespace();
      const params = new URLSearchParams();
      if (ns && ns !== "All Namespaces") {
        params.append("namespace", ns);
      }
      const response = await fetch(`/api/metrics?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch metrics");
      const data = await response.json();
      const newPoint = {
        timestamp: Date.now(),
        cpuUsage: parseFloat(data.cpu || 0),
        memoryUsage: parseFloat(data.memory || 0),
        memoryRSS: parseFloat(data.memory || 0) * 0.6,
        // Approximate RSS as 60% of total
        memoryCache: parseFloat(data.memory || 0) * 0.3,
        // Approximate cache as 30%
        memoryFree: parseFloat(data.memory || 0) * 0.1
        // Approximate free as 10%
      };
      setMetricsData((prev) => {
        const updated = [...prev, newPoint];
        return updated.slice(-MAX_POINTS);
      });
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
      setIsLoading(false);
    }
  };
  const drawSpiral = () => {
    if (!canvasRef) return;
    const canvas = canvasRef;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.4;
    ctx.clearRect(0, 0, width, height);
    const metrics = metricsData();
    if (metrics.length === 0) return;
    ctx.strokeStyle = "rgba(100, 100, 100, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= MAX_POINTS; i++) {
      const angle = i / POINTS_PER_TURN * Math.PI * 2;
      const progress = i / MAX_POINTS;
      const radius = maxRadius * progress;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    metrics.forEach((point, index) => {
      const angle = index / POINTS_PER_TURN * Math.PI * 2;
      const progress = index / MAX_POINTS;
      const radius = maxRadius * progress;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      const cpuIntensity = point.cpuUsage / 100;
      const glowSize = 3 + cpuIntensity * 15;
      const totalMemory = point.memoryRSS + point.memoryCache + point.memoryFree;
      const memThickness = 2 + totalMemory / 100 * 8;
      ctx.beginPath();
      ctx.arc(x, y, memThickness / 2, 0, Math.PI * 2);
      const rssRatio = point.memoryRSS / totalMemory;
      const cacheRatio = point.memoryCache / totalMemory;
      ctx.fillStyle = `rgba(${100 + rssRatio * 155}, ${100 + cacheRatio * 100}, 150, 0.6)`;
      ctx.fill();
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
      gradient.addColorStop(0, `rgba(6, 182, 212, ${cpuIntensity * 0.8})`);
      gradient.addColorStop(0.5, `rgba(6, 182, 212, ${cpuIntensity * 0.4})`);
      gradient.addColorStop(1, "rgba(6, 182, 212, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, glowSize, 0, Math.PI * 2);
      ctx.fill();
      if (index > metrics.length - 10) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, glowSize + 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    ctx.fillStyle = "#06b6d4";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(6, 182, 212, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "12px Inter, sans-serif";
    ctx.textAlign = "center";
    for (let turn = 0; turn <= SPIRAL_TURNS; turn++) {
      const angle = 0;
      const progress = turn / SPIRAL_TURNS;
      const radius = maxRadius * progress;
      const x = centerX + radius * Math.cos(angle - Math.PI / 2);
      const y = centerY + radius * Math.sin(angle - Math.PI / 2) - 15;
      const minutesAgo = (SPIRAL_TURNS - turn) * 1;
      ctx.fillText(`-${minutesAgo}m`, x, y);
    }
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.font = "14px Inter, sans-serif";
    ctx.fillText("Time Helix - Last 3 Minutes", 20, 30);
    ctx.font = "12px Inter, sans-serif";
    ctx.fillStyle = "rgba(6, 182, 212, 0.9)";
    ctx.fillText("● Glow = CPU Usage", 20, 55);
    ctx.fillStyle = "rgba(139, 92, 246, 0.9)";
    ctx.fillText("● Thickness = Memory (RSS + Cache + Free)", 20, 75);
  };
  const animate = () => {
    drawSpiral();
    animationFrameId = requestAnimationFrame(animate);
  };
  onMount(() => {
    fetchMetrics();
    intervalId = setInterval(fetchMetrics, 1e3);
    if (canvasRef) {
      const rect = canvasRef.getBoundingClientRect();
      canvasRef.width = rect.width;
      canvasRef.height = rect.height;
      animate();
    }
  });
  onCleanup(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    if (intervalId) {
      clearInterval(intervalId);
    }
  });
  createEffect(() => {
    const handleResize = () => {
      if (canvasRef) {
        const rect = canvasRef.getBoundingClientRect();
        canvasRef.width = rect.width;
        canvasRef.height = rect.height;
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  });
  const currentMetrics = () => {
    const metrics = metricsData();
    return metrics[metrics.length - 1];
  };
  return (() => {
    var _el$ = _tmpl$3(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling;
    insert(_el$, createComponent(Show, {
      get when() {
        return !isLoading();
      },
      get fallback() {
        return _tmpl$4();
      },
      get children() {
        return [createComponent(Show, {
          get when() {
            return currentMetrics();
          },
          children: (current) => (() => {
            var _el$1 = _tmpl$5(), _el$10 = _el$1.firstChild, _el$11 = _el$10.firstChild, _el$12 = _el$11.nextSibling, _el$13 = _el$12.firstChild, _el$14 = _el$10.nextSibling, _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling, _el$17 = _el$16.firstChild;
            insert(_el$12, () => current().cpuUsage.toFixed(1), _el$13);
            insert(_el$16, () => current().memoryUsage.toFixed(1), _el$17);
            return _el$1;
          })()
        }), (() => {
          var _el$6 = _tmpl$(), _el$7 = _el$6.firstChild;
          var _ref$ = canvasRef;
          typeof _ref$ === "function" ? use(_ref$, _el$7) : canvasRef = _el$7;
          return _el$6;
        })(), (() => {
          var _el$8 = _tmpl$2(); _el$8.firstChild;
          return _el$8;
        })()];
      }
    }), null);
    return _el$;
  })();
};

export { TimeHelix as default };
//# sourceMappingURL=TimeHelix-CNNLbh8X.js.map
