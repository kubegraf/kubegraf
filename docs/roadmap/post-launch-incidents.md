# Post-launch: Incident Intelligence (Security scanner + 5xx RCA)

**Status:** Not in v1 launch.

## Scope
- Post-launch delivery of runtime incident intelligence that detects edge security scanners/exploit bursts and reliability 5xx spikes, with deterministic, evidence-backed RCA.
- Integrates Kubernetes state (pods, endpoints, events) with normalized ingress/edge HTTP logs for incident creation, proof blocks, and recommendations.

## Non-goals (v1 launch)
- No real-time log ingestion, parsers, aggregators, or backend wiring for incidents before launch.
- No new runtime traffic analysis in the v1 Security & Diagnostics launch scope (remains scheduled posture scanning, health score, categories, export report).
- No speculative/LLM-based RCA; all RCA remains deterministic and evidence-based when implemented post-launch.

## User stories (post-launch)
- As a platform engineer, I see security scanner/exploit probes from ingress/WAF logs aggregated into “Security incidents” with evidence and peak RPS.
- As an SRE, I get “Reliability incidents” for 5xx spikes with deterministic RCA tied to services/endpoints/pods/events.
- As a security/ops lead, I can copy a proof block with concrete signals (status distribution, signatures, endpoints, pod states).
- As a user on Security & Diagnostics, I see a “Live incidents” tile summarizing last-24h incidents and deep-linking to Incident Intelligence filters.

## Success criteria
- Deterministic incident rules (no probabilistic/LLM inference).
- Proof block per incident with concrete evidence items and metrics.
- Handles busy clusters without UI jank (backend aggregation; UI polls/SSE).
- Works offline/local-first using kubeconfig access only.

## Data sources
- Ingress/gateway/WAF access logs (initially nginx-ingress) for HTTP events.
- Kubernetes API for services, endpoints, pods, events, and node conditions.
- Optional: pod logs for RCA evidence sampling (bounded, non-streaming).

## Deterministic rules (post-launch)
- Security scanner/exploit: sliding-window per IP+host with thresholds on total requests, peak RPS, distinct paths, signature hits; classify blocked/partial/impact.
- Reliability 5xx spike: windowed 5xx/error-rate thresholds per host/upstream; evidence includes status buckets and sample paths.
- RCA rules: zero ready endpoints, readiness failures, CrashLoopBackOff, OOMKilled, ImagePullBackOff, upstream latency/timeouts, unhandled 501 routes.

## UI pages (post-launch)
- Incident Intelligence with tabs for Reliability and Security incidents, list + detail, evidence, proof block, recommendations.
- Security & Diagnostics tile: “Live incidents detected (last 24h)” linking to filtered Incident Intelligence.
- Dedicated “Security Incidents” and “Reliability Incidents” views show “Coming after launch” until backends are wired.

## Issue-style checklist

**Backend**
- [ ] HTTPEvent normalization for ingress/edge logs
- [ ] NGINX log parser (resilient to common formats)
- [ ] Sliding-window aggregation (per IP+host)
- [ ] Scanner/exploit signature detection
- [ ] 5xx spike detection with thresholds
- [ ] Deterministic RCA correlation (services/endpoints/pods/events)

**Frontend**
- [ ] Incidents list and detail views (Reliability, Security tabs)
- [ ] Proof block (copyable evidence summary)
- [ ] “Live incidents” deep-link tile in Security & Diagnostics

## Launch guardrails
- v1 launch keeps Security & Diagnostics focused on scheduled posture scanning, health scoring, categorized findings, and export.
- Runtime incident detection, log ingestion, and RCA correlation are explicitly deferred until after launch.

## Launch visibility & capability flags (v1)
- Visible at launch: incident detection outputs already present (list/detail), diagnosis + evidence, snapshot API, incident detail view, manual fix preview, Knowledge Bank (read-only).
- Hidden at launch (must be gated/flagged off): auto-remediation execution, learning dashboards, metrics correlation, similar incidents UI, bulk/autonomous fixes, pattern clustering UI.
- Behavior: hidden features should be fully invisible when disabled (no disabled buttons), guarded in backend/API/CLI by capabilities flags, and surfaced via `GET /api/capabilities`.
- Goal: stable, safe Incident Intelligence v1 with no user-facing automation or experimental UI.

## After-release unlock strategy (post-launch)
- Enable features only via capability/config flags, one-by-one: learning dashboards (read-only first), similar incident recommendations, metrics correlation tab.
- Add backend safety guards on unlock: confidence ≥ threshold, runbook risk = low, rollback available.
- Gradually expose UI only after backend enablement; clearly label optional/early features; never auto-execute.
- Add lightweight local (telemetry-free) logging for feature usage when toggled on.

## Trust & clarity checkpoints
- Keep messaging deterministic and evidence-based; avoid implying autonomy.
- Prefer calm, precise wording for incidents and errors; highlight proof blocks and recommendations that map to concrete signals.
- Maintain zero runtime automation at v1; post-launch unlocks should be opt-in and reversible.

