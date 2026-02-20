/**
 * WorkloadScreen — Exact match to kubegraf-final-white.html prototype
 * Static table with 7 rows: checkout-api, payment-proc, api-gateway,
 * auth-service, order-service, billing-service, prometheus
 */

import { Component, createSignal } from 'solid-js';

type Filter = 'critical' | 'warning' | 'all';

const WorkloadScreen: Component<{ onViewIncident?: () => void }> = (props) => {
  const [activeFilter, setActiveFilter] = createSignal<Filter>('critical');

  return (
    <div class="wl-body">
      {/* Toolbar */}
      <div class="wl-toolbar">
        <div
          class={`filter-btn ${activeFilter() === 'critical' ? 'on' : ''}`}
          onClick={() => setActiveFilter('critical')}
        >
          <div style={{ width: '6px', height: '6px', 'border-radius': '50%', background: 'currentColor' }} />
          Critical (2)
        </div>
        <div
          class={`filter-btn ${activeFilter() === 'warning' ? 'on' : ''}`}
          onClick={() => setActiveFilter('warning')}
        >
          Warning (3)
        </div>
        <div
          class={`filter-btn ${activeFilter() === 'all' ? 'on' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All (16)
        </div>
        <div style={{ flex: '1' }} />
        <button class="btn ghost" style={{ 'font-size': '11px' }}>Sort: Restarts</button>
        <button class="btn ghost" style={{ 'font-size': '11px' }}>Namespace: All</button>
      </div>

      {/* Workload table */}
      <table class="wl-table">
        <thead>
          <tr>
            <th>Workload</th>
            <th>Status</th>
            <th>Replicas</th>
            <th>Restarts</th>
            <th>CPU</th>
            <th>Memory</th>
            <th>Age</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {/* checkout-api — CRITICAL */}
          <tr class="crit-row" onClick={props.onViewIncident}>
            <td>
              <div class="wl-name">
                <div style={{ width: '7px', height: '7px', 'border-radius': '50%', background: 'var(--crit)', 'flex-shrink': '0', animation: 'crit-pulse 1.8s ease-in-out infinite' }} />
                checkout-api
                <span class="wl-ns">payments-ns</span>
              </div>
            </td>
            <td><span class="wl-status crit">● OOMKilled</span></td>
            <td><span class="wl-replicas bad">0/3</span></td>
            <td><span class="wl-restarts high">14</span></td>
            <td>
              <span class="wl-cpu">620m</span>
              <div class="usage-bar"><div class="usage-fill" style={{ width: '62%', background: 'var(--warn)' }} /></div>
            </td>
            <td>
              <span class="wl-mem bad">510Mi/512Mi</span>
              <div class="usage-bar"><div class="usage-fill" style={{ width: '99%', background: 'var(--crit)' }} /></div>
            </td>
            <td><span class="age-tag">6m</span></td>
            <td><span class="action-dots">···</span></td>
          </tr>

          {/* payment-proc — CRITICAL */}
          <tr class="crit-row">
            <td>
              <div class="wl-name">
                <div style={{ width: '7px', height: '7px', 'border-radius': '50%', background: 'var(--crit)', 'flex-shrink': '0', animation: 'crit-pulse 1.8s ease-in-out infinite' }} />
                payment-proc
                <span class="wl-ns">payments-ns</span>
              </div>
            </td>
            <td><span class="wl-status crit">● CrashLoop</span></td>
            <td><span class="wl-replicas bad">1/3</span></td>
            <td><span class="wl-restarts high">8</span></td>
            <td>
              <span class="wl-cpu">290m</span>
              <div class="usage-bar"><div class="usage-fill" style={{ width: '29%', background: 'var(--ok)' }} /></div>
            </td>
            <td>
              <span class="wl-mem">310Mi/512Mi</span>
              <div class="usage-bar"><div class="usage-fill" style={{ width: '61%', background: 'var(--ok)' }} /></div>
            </td>
            <td><span class="age-tag">6m</span></td>
            <td><span class="action-dots">···</span></td>
          </tr>

          {/* api-gateway — WARNING */}
          <tr>
            <td>
              <div class="wl-name">
                <div style={{ width: '7px', height: '7px', 'border-radius': '50%', background: 'var(--warn)', 'flex-shrink': '0' }} />
                api-gateway
                <span class="wl-ns">prod-ns</span>
              </div>
            </td>
            <td><span class="wl-status warn">● High Latency</span></td>
            <td><span class="wl-replicas">3/3</span></td>
            <td><span class="wl-restarts">0</span></td>
            <td>
              <span class="wl-cpu">780m</span>
              <div class="usage-bar"><div class="usage-fill" style={{ width: '78%', background: 'var(--warn)' }} /></div>
            </td>
            <td>
              <span class="wl-mem">402Mi/512Mi</span>
              <div class="usage-bar"><div class="usage-fill" style={{ width: '78%', background: 'var(--warn)' }} /></div>
            </td>
            <td><span class="age-tag">14m</span></td>
            <td><span class="action-dots">···</span></td>
          </tr>

          {/* auth-service — WARNING */}
          <tr>
            <td>
              <div class="wl-name">
                <div style={{ width: '7px', height: '7px', 'border-radius': '50%', background: 'var(--warn)', 'flex-shrink': '0' }} />
                auth-service
                <span class="wl-ns">prod-ns</span>
              </div>
            </td>
            <td><span class="wl-status warn">● Degraded</span></td>
            <td><span class="wl-replicas">2/3</span></td>
            <td><span class="wl-restarts">2</span></td>
            <td>
              <span class="wl-cpu">340m</span>
              <div class="usage-bar"><div class="usage-fill" style={{ width: '34%', background: 'var(--ok)' }} /></div>
            </td>
            <td>
              <span class="wl-mem">280Mi/512Mi</span>
              <div class="usage-bar"><div class="usage-fill" style={{ width: '55%', background: 'var(--ok)' }} /></div>
            </td>
            <td><span class="age-tag">14m</span></td>
            <td><span class="action-dots">···</span></td>
          </tr>

          {/* order-service — OK */}
          <tr>
            <td>
              <div class="wl-name">
                <div style={{ width: '7px', height: '7px', 'border-radius': '50%', background: 'var(--ok)', 'flex-shrink': '0' }} />
                order-service
                <span class="wl-ns">prod-ns</span>
              </div>
            </td>
            <td><span class="wl-status ok">● Running</span></td>
            <td><span class="wl-replicas">3/3</span></td>
            <td><span class="wl-restarts">0</span></td>
            <td>
              <span class="wl-cpu">220m</span>
              <div class="usage-bar"><div class="usage-fill" style={{ width: '22%', background: 'var(--ok)' }} /></div>
            </td>
            <td>
              <span class="wl-mem">195Mi/512Mi</span>
              <div class="usage-bar"><div class="usage-fill" style={{ width: '38%', background: 'var(--ok)' }} /></div>
            </td>
            <td><span class="age-tag">2d</span></td>
            <td><span class="action-dots">···</span></td>
          </tr>

          {/* billing-service — OK */}
          <tr>
            <td>
              <div class="wl-name">
                <div style={{ width: '7px', height: '7px', 'border-radius': '50%', background: 'var(--ok)', 'flex-shrink': '0' }} />
                billing-service
                <span class="wl-ns">payments-ns</span>
              </div>
            </td>
            <td><span class="wl-status ok">● Running</span></td>
            <td><span class="wl-replicas">2/2</span></td>
            <td><span class="wl-restarts">0</span></td>
            <td>
              <span class="wl-cpu">180m</span>
              <div class="usage-bar"><div class="usage-fill" style={{ width: '18%', background: 'var(--ok)' }} /></div>
            </td>
            <td>
              <span class="wl-mem">210Mi/512Mi</span>
              <div class="usage-bar"><div class="usage-fill" style={{ width: '41%', background: 'var(--ok)' }} /></div>
            </td>
            <td><span class="age-tag">5d</span></td>
            <td><span class="action-dots">···</span></td>
          </tr>

          {/* prometheus — OK */}
          <tr>
            <td>
              <div class="wl-name">
                <div style={{ width: '7px', height: '7px', 'border-radius': '50%', background: 'var(--ok)', 'flex-shrink': '0' }} />
                prometheus
                <span class="wl-ns">monitoring</span>
              </div>
            </td>
            <td><span class="wl-status ok">● Running</span></td>
            <td><span class="wl-replicas">1/1</span></td>
            <td><span class="wl-restarts">0</span></td>
            <td>
              <span class="wl-cpu">120m</span>
              <div class="usage-bar"><div class="usage-fill" style={{ width: '12%', background: 'var(--ok)' }} /></div>
            </td>
            <td>
              <span class="wl-mem">890Mi/2Gi</span>
              <div class="usage-bar"><div class="usage-fill" style={{ width: '44%', background: 'var(--ok)' }} /></div>
            </td>
            <td><span class="age-tag">12d</span></td>
            <td><span class="action-dots">···</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default WorkloadScreen;
