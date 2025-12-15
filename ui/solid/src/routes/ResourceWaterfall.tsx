import { Component, createSignal, onMount, onCleanup, Show, createEffect } from 'solid-js';
import { namespace } from '../stores/cluster';
import { addNotification } from '../stores/ui';

interface MetricSnapshot {
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  cpuCores?: number[];
  memoryBreakdown?: {
    rss: number;
    cache: number;
    free: number;
  };
}

const ResourceWaterfall: Component = () => {
  const [metricsHistory, setMetricsHistory] = createSignal<MetricSnapshot[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  let canvasRef: HTMLCanvasElement | undefined;
  let animationFrameId: number;
  let intervalId: number;

  const MAX_SNAPSHOTS = 60; // 60 seconds of history
  const RIDGE_DEPTH = 50; // How many "rows" deep the 3D effect goes

  const fetchMetrics = async () => {
    try {
      const ns = namespace();
      const params = new URLSearchParams();
      if (ns && ns !== 'All Namespaces') {
        params.append('namespace', ns);
      }

      const response = await fetch(`/api/metrics?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch metrics');

      const data = await response.json();

      const snapshot: MetricSnapshot = {
        timestamp: Date.now(),
        cpuUsage: parseFloat(data.cpu || 0),
        memoryUsage: parseFloat(data.memory || 0),
        memoryBreakdown: {
          rss: parseFloat(data.memory || 0) * 0.6,
          cache: parseFloat(data.memory || 0) * 0.3,
          free: parseFloat(data.memory || 0) * 0.1,
        },
      };

      setMetricsHistory(prev => {
        const updated = [...prev, snapshot];
        const result = updated.slice(-MAX_SNAPSHOTS);
        console.log('[ResourceWaterfall] Metrics history updated:', result.length, 'points', snapshot);
        return result;
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      setIsLoading(false);
    }
  };

  const drawWaterfall = () => {
    if (!canvasRef) {
      console.log('[drawWaterfall] No canvasRef');
      return;
    }

    const canvas = canvasRef;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('[drawWaterfall] No context');
      return;
    }

    // Get display dimensions (accounting for device pixel ratio)
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Don't draw if canvas has no dimensions
    if (width <= 0 || height <= 0) {
      console.log('[drawWaterfall] Canvas has invalid dimensions:', width, 'x', height);
      return;
    }
    
    const history = metricsHistory();

    console.log('[drawWaterfall] Canvas:', width, 'x', height, 'History length:', history.length);

    if (history.length === 0) {
      // Clear and show "waiting for data" message
      ctx.fillStyle = 'rgba(10, 10, 20, 1)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Collecting metrics data...', width / 2, height / 2);
      return;
    }

    // Clear canvas with dark background
    ctx.fillStyle = 'rgba(10, 10, 20, 1)';
    ctx.fillRect(0, 0, width, height);

    // 3D perspective settings
    const vanishingPointX = width / 2;
    const vanishingPointY = height * 0.2;
    const nearPlaneY = height * 0.9;
    const ridgeSpacing = height * 0.6 / RIDGE_DEPTH;

    // Draw grid lines for depth perception
    ctx.strokeStyle = 'rgba(50, 50, 80, 0.3)';
    ctx.lineWidth = 1;

    for (let i = 0; i < RIDGE_DEPTH; i++) {
      const progress = i / RIDGE_DEPTH;
      const y = nearPlaneY - progress * (nearPlaneY - vanishingPointY);

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw CPU ridge (front ridge - cyan/blue)
    const cpuRidgeY = nearPlaneY - (nearPlaneY - vanishingPointY) * 0.4;
    console.log('[ResourceWaterfall] Drawing CPU ridge at Y:', cpuRidgeY, 'with', history.length, 'points');
    drawRidge(ctx, history, cpuRidgeY, vanishingPointX, vanishingPointY, width, 'cpu');

    // Draw Memory ridge (back ridge - purple/magenta)
    const memRidgeY = nearPlaneY - (nearPlaneY - vanishingPointY) * 0.7;
    console.log('[ResourceWaterfall] Drawing Memory ridge at Y:', memRidgeY, 'with', history.length, 'points');
    drawRidge(ctx, history, memRidgeY, vanishingPointX, vanishingPointY, width, 'memory');

    // Draw axis labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Time →', 20, height - 20);

    ctx.textAlign = 'right';
    ctx.fillText('← Past', width - 20, height - 20);
  };

  const drawRidge = (
    ctx: CanvasRenderingContext2D,
    history: MetricSnapshot[],
    baseY: number,
    vanishingX: number,
    vanishingY: number,
    width: number,
    type: 'cpu' | 'memory'
  ) => {
    const pointCount = history.length;
    if (pointCount < 1) return;

    const isCPU = type === 'cpu';
    const color = isCPU ? { r: 6, g: 182, b: 212 } : { r: 139, g: 92, b: 246 };
    const altColor = isCPU ? { r: 14, g: 165, b: 233 } : { r: 168, g: 85, b: 247 };

    // Calculate perspective scale (things closer to vanishing point are smaller)
    const distanceFromVanishing = Math.abs(baseY - vanishingY);
    const scale = distanceFromVanishing / (vanishingY * 2);

    const maxHeight = 150 * scale; // Max peak height
    const ridgeWidth = width * 0.8 * scale;
    const ridgeStartX = (width - ridgeWidth) / 2;

    console.log(`[drawRidge ${type}] scale:`, scale, 'maxHeight:', maxHeight, 'ridgeWidth:', ridgeWidth, 'baseY:', baseY);

    // Draw filled ridge with gradient
    ctx.beginPath();

    // Start from baseline
    ctx.moveTo(ridgeStartX, baseY);

    // Draw the peaks
    for (let i = 0; i < pointCount; i++) {
      const snapshot = history[i];
      const progress = pointCount === 1 ? 0.5 : i / (pointCount - 1);
      const x = ridgeStartX + progress * ridgeWidth;
      const value = isCPU ? snapshot.cpuUsage : snapshot.memoryUsage;
      const peakHeight = (value / 100) * maxHeight;
      const y = baseY - peakHeight;

      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    // Close the shape back to baseline
    ctx.lineTo(ridgeStartX + ridgeWidth, baseY);
    ctx.closePath();

    // Fill with gradient
    const gradient = ctx.createLinearGradient(0, baseY - maxHeight, 0, baseY);
    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`);
    gradient.addColorStop(0.5, `rgba(${altColor.r}, ${altColor.g}, ${altColor.b}, 0.6)`);
    gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0.2)`);

    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw outline for definition
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw highlight on peaks
    ctx.beginPath();
    for (let i = 0; i < pointCount; i++) {
      const snapshot = history[i];
      const progress = pointCount === 1 ? 0.5 : i / (pointCount - 1);
      const x = ridgeStartX + progress * ridgeWidth;
      const value = isCPU ? snapshot.cpuUsage : snapshot.memoryUsage;
      const peakHeight = (value / 100) * maxHeight;
      const y = baseY - peakHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = `rgba(255, 255, 255, 0.6)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Add glow effect on recent peaks
    if (pointCount > 0) {
      const recentIndex = pointCount - 1;
      const snapshot = history[recentIndex];
      const progress = pointCount === 1 ? 0.5 : recentIndex / (pointCount - 1);
      const x = ridgeStartX + progress * ridgeWidth;
      const value = isCPU ? snapshot.cpuUsage : snapshot.memoryUsage;
      const peakHeight = (value / 100) * maxHeight;
      const y = baseY - peakHeight;

      // Glow
      const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 20);
      glowGradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`);
      glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();

      // Dot on peak
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Label
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'left';
    const label = isCPU ? 'CPU' : 'Memory';
    const labelX = ridgeStartX - 60;
    ctx.fillText(label, labelX, baseY);

    // Current value
    if (history.length > 0) {
      const latest = history[history.length - 1];
      const value = isCPU ? latest.cpuUsage : latest.memoryUsage;
      ctx.font = '14px Inter, sans-serif';
      ctx.fillText(`${value.toFixed(1)}%`, labelX, baseY + 20);
    }
  };

  const animate = () => {
    drawWaterfall();
    animationFrameId = requestAnimationFrame(animate);
  };

  // Initialize canvas when ref is available
  createEffect(() => {
    if (canvasRef) {
      const rect = canvasRef.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        console.log('[createEffect] Canvas ref available, initializing:', rect);
        // Use device pixel ratio for crisp rendering
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = rect.width;
        const displayHeight = rect.height;
        canvasRef.width = displayWidth * dpr;
        canvasRef.height = displayHeight * dpr;
        const ctx = canvasRef.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
        console.log('[createEffect] Canvas dimensions set:', canvasRef.width, 'x', canvasRef.height, 'display:', displayWidth, 'x', displayHeight);
        // Start animation if not already running
        if (!animationFrameId) {
          animate();
        }
      }
    }
  });

  onMount(() => {
    console.log('[onMount] Starting initialization');
    fetchMetrics();
    intervalId = setInterval(fetchMetrics, 1000);
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
        // Only resize if we have valid dimensions
        if (rect.width > 0 && rect.height > 0) {
          const dpr = window.devicePixelRatio || 1;
          const displayWidth = rect.width;
          const displayHeight = rect.height;
          canvasRef.width = displayWidth * dpr;
          canvasRef.height = displayHeight * dpr;
          const ctx = canvasRef.getContext('2d');
          if (ctx) {
            ctx.scale(dpr, dpr);
          }
          // Redraw after resize
          drawWaterfall();
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  // Redraw when metrics history changes
  createEffect(() => {
    const history = metricsHistory();
    if (history.length > 0 && canvasRef) {
      // Check if canvas has valid dimensions before drawing
      const rect = canvasRef.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Small delay to ensure canvas is ready
        setTimeout(() => {
          drawWaterfall();
        }, 50);
      }
    }
  });

  const currentMetrics = () => {
    const metrics = metricsHistory();
    return metrics[metrics.length - 1];
  };

  const getMaxPeaks = () => {
    const history = metricsHistory();
    if (history.length === 0) return { cpu: 0, memory: 0 };

    let maxCPU = 0;
    let maxMemory = 0;

    history.forEach(snapshot => {
      if (snapshot.cpuUsage > maxCPU) maxCPU = snapshot.cpuUsage;
      if (snapshot.memoryUsage > maxMemory) maxMemory = snapshot.memoryUsage;
    });

    return { cpu: maxCPU, memory: maxMemory };
  };

  return (
    <div class="p-6 space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Resource Waterfall
          </h1>
          <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
            3D ridge plot showing CPU and memory trends moving toward you over time
          </p>
        </div>
      </div>

      <Show when={!isLoading()} fallback={
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p class="mt-4 text-sm opacity-70">Loading metrics...</p>
        </div>
      }>
        {/* Current Stats */}
        <Show when={currentMetrics()}>
          {(current) => (
            <div class="grid grid-cols-3 gap-4">
              <div class="card p-4">
                <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Current CPU</div>
                <div class="text-3xl font-bold mt-2" style={{ color: '#06b6d4' }}>
                  {current().cpuUsage.toFixed(1)}%
                </div>
              </div>
              <div class="card p-4">
                <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Current Memory</div>
                <div class="text-3xl font-bold mt-2" style={{ color: '#8b5cf6' }}>
                  {current().memoryUsage.toFixed(1)}%
                </div>
              </div>
              <div class="card p-4">
                <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Peak Values (60s)</div>
                <div class="mt-2 space-y-1">
                  <div class="text-lg font-bold" style={{ color: '#06b6d4' }}>
                    CPU: {getMaxPeaks().cpu.toFixed(1)}%
                  </div>
                  <div class="text-lg font-bold" style={{ color: '#8b5cf6' }}>
                    Mem: {getMaxPeaks().memory.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </Show>

        {/* Canvas */}
        <div class="card p-6">
          <canvas
            ref={canvasRef}
            class="w-full"
            style={{ height: '600px', background: 'rgba(10, 10, 20, 1)', 'border-radius': '8px' }}
          />
        </div>

        {/* Info - Compact */}
        <div class="card p-3">
          <div class="text-xs" style={{ color: 'var(--text-secondary)' }}>
            <strong class="text-sm">Legend:</strong>
            <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span><span style={{ color: '#06b6d4' }}>●</span> CPU (front/cyan)</span>
              <span><span style={{ color: '#8b5cf6' }}>●</span> Memory (back/purple)</span>
              <span>⚪ Latest data point</span>
              <span>← Time flows left</span>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default ResourceWaterfall;
