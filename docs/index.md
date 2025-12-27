# KubeGraf Docs Landing

KubeGraf is a local-first incident intelligence and diagnostics tool for Kubernetes clusters. It helps SREs and platform engineers detect problems quickly, explain what happened with concrete evidence, and apply fixes safely—all without sending cluster data to the cloud.

## What problem it solves
- Fragmented signals slow incident response: logs, events, and resource state live in different places.
- Root cause is often guesswork: many tools surface symptoms but not evidence-backed conclusions.
- Production trust is hard: automation that isn’t explainable can feel risky to run on live clusters.
KubeGraf brings these together with deterministic rules and an evidence-first workflow so you can trust what you see and act with confidence.

## When to use it (real scenarios)
- A deployment shows 5xx spikes: you want to see ingress logs, service endpoints, pod readiness, and recent rollouts in one view.
- A pod keeps restarting: you need crash evidence, events, and a dry-run fix preview before changing replicas or configs.
- A security scanner hits your ingress: you want to confirm it’s blocked, see signatures, and export proof without adding cloud dependencies.
- You need a quick posture readout for an environment before a release window.

## How it differs from typical Kubernetes IDEs
- Built for incidents, not just browsing: timelines, RCA evidence, and fix previews are first-class.
- Deterministic, evidence-backed outputs: no opaque heuristics; each insight cites concrete signals (events, conditions, logs, readiness, exits).
- Local-first by default: works with your kubeconfig; keeps data on your machine; no cloud round-trips required for core flows.
- Calm, minimal automation: guided previews and dry-runs before applies; avoids surprise changes.
This complements general-purpose IDEs (like Lens) by focusing on explainable incident response and safe execution, rather than broad resource navigation alone.

## Core trust principles
- Deterministic: rules and detectors are explicit; outcomes map to observable signals.
- Evidence-backed: every diagnosis links to pods, events, conditions, logs, or metrics.
- Local-first: operates against your kubeconfig; core flows run without external data collection.
- Safe-by-default: previews, diffs, and dry-runs precede applies; no hidden automation.

## What you’ll see in the UI
- Incident Intelligence: list and detail views with timelines, proof blocks, and recommendations.
- Fix preview and dry-run: diffs and server-side validation before applying changes.
- Execution panel: live streams for apply operations with exit codes, duration, and masked output.
- Resource views: deployments, pods, and services with quick drill-down into events and YAML.

## Quick start links
- Quickstart: `docs/quickstart.html`
- Installation: `docs/installation.html`
- Configuration: `docs/configuration.html`
- Security: `docs/security.html`
- Workflows (common tasks): `docs/workflows/`
- Terminal UI: `docs/terminal-ui.html`
- Resource Map: `docs/resource-map.html`
- Commands reference: `docs/commands.html`
- Plugins: `docs/plugins.html`

## Using KubeGraf in practice
1) Connect a cluster with your kubeconfig (local or remote).  
2) Open Incident Intelligence to review active issues.  
3) For an incident, open the detail view to see evidence (events, readiness, logs, exits).  
4) Run a fix preview and dry-run to validate the change.  
5) Apply when ready; monitor the execution panel for live output and exit status.  
6) Export evidence if you need to share with teammates or change boards.

## Keep it calm and predictable
- No marketing overlays or animations; focus stays on evidence and outcomes.
- All actions show what will change before they run.
- Logs are masked; no secrets appear in the UI.

## Need more depth?
- Concepts: `docs/core-concepts/`
- Troubleshooting: `docs/troubleshooting/`
- Integrations: `docs/integrations/`
- Reference API/commands: `docs/reference/`

KubeGraf is designed for teams who value clear evidence and controlled execution in Kubernetes. Explore the links above to go deeper. 
# KubeGraf Docs Landing

KubeGraf is a local-first incident intelligence and diagnostics tool for Kubernetes clusters. It helps SREs and platform engineers detect problems quickly, explain what happened with concrete evidence, and apply fixes safely—all without sending cluster data to the cloud.

## What problem it solves
- Fragmented signals slow incident response: logs, events, and resource state live in different places.
- Root cause is often guesswork: many tools surface symptoms but not evidence-backed conclusions.
- Production trust is hard: automation that isn’t explainable can feel risky to run on live clusters.
KubeGraf brings these together with deterministic rules and an evidence-first workflow so you can trust what you see and act with confidence.

## When to use it (real scenarios)
- A deployment shows 5xx spikes: you want to see ingress logs, service endpoints, pod readiness, and recent rollouts in one view.
- A pod keeps restarting: you need crash evidence, events, and a dry-run fix preview before changing replicas or configs.
- A security scanner hits your ingress: you want to confirm it’s blocked, see signatures, and export proof without adding cloud dependencies.
- You need a quick posture readout for an environment before a release window.

## How it differs from typical Kubernetes IDEs
- Built for incidents, not just browsing: timelines, RCA evidence, and fix previews are first-class.
- Deterministic, evidence-backed outputs: no opaque heuristics; each insight cites concrete signals (events, conditions, logs, readiness, exits).
- Local-first by default: works with your kubeconfig; keeps data on your machine; no cloud round-trips required for core flows.
- Calm, minimal automation: guided previews and dry-runs before applies; avoids surprise changes.
This complements general-purpose IDEs (like Lens) by focusing on explainable incident response and safe execution, rather than broad resource navigation alone.

## Core trust principles
- Deterministic: rules and detectors are explicit; outcomes map to observable signals.
- Evidence-backed: every diagnosis links to pods, events, conditions, logs, or metrics.
- Local-first: operates against your kubeconfig; core flows run without external data collection.
- Safe-by-default: previews, diffs, and dry-runs precede applies; no hidden automation.

## What you’ll see in the UI
- Incident Intelligence: list and detail views with timelines, proof blocks, and recommendations.
- Fix preview and dry-run: diffs and server-side validation before applying changes.
- Execution panel: live streams for apply operations with exit codes, duration, and masked output.
- Resource views: deployments, pods, and services with quick drill-down into events and YAML.

## Quick start links
- Quickstart: `docs/quickstart.html`
- Installation: `docs/installation.html`
- Configuration: `docs/configuration.html`
- Security: `docs/security.html`
- Workflows (common tasks): `docs/workflows/`
- Terminal UI: `docs/terminal-ui.html`
- Resource Map: `docs/resource-map.html`
- Commands reference: `docs/commands.html`
- Plugins: `docs/plugins.html`

## Using KubeGraf in practice
1) Connect a cluster with your kubeconfig (local or remote).  
2) Open Incident Intelligence to review active issues.  
3) For an incident, open the detail view to see evidence (events, readiness, logs, exits).  
4) Run a fix preview and dry-run to validate the change.  
5) Apply when ready; monitor the execution panel for live output and exit status.  
6) Export evidence if you need to share with teammates or change boards.

## Keep it calm and predictable
- No marketing overlays or animations; focus stays on evidence and outcomes.
- All actions show what will change before they run.
- Logs are masked; no secrets appear in the UI.

## Need more depth?
- Concepts: `docs/core-concepts/`
- Troubleshooting: `docs/troubleshooting/`
- Integrations: `docs/integrations/`
- Reference API/commands: `docs/reference/`

KubeGraf is designed for teams who value clear evidence and controlled execution in Kubernetes. Explore the links above to go deeper. 

