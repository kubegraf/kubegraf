import { Component } from 'solid-js';
import TrafficMap from '../features/kiali/TrafficMap';

const TrafficMapPage: Component = () => {
  return (
    <div class="h-full flex flex-col">
      {/* Header */}
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Service Mesh Traffic Map</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Live traffic visualization powered by Kiali • Real-time metrics from Istio service mesh</p>
        </div>
      </div>

      {/* Kiali Traffic Map - Full screen */}
      <div class="flex-1">
        <TrafficMap />
      </div>
    </div>
  );
};

export default TrafficMapPage;
