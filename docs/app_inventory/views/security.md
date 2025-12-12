# View: `security`

- **Route file**: `ui/solid/src/routes/Security.tsx`
- **Component closure**: 7 files (TS/TSX). Controls extracted from 2 TSX files.

## Headings & copy

- `All checks passed!`
- `CVE Vulnerabilities (NIST NVD)`
- `CVE Vulnerabilities are disabled`
- `Check: REL005 - Single Replica Deployment/StatefulSet`
- `Check: REL006 - Missing PDB`
- `Check: REL007 - No Anti-Affinity`
- `Click "Scan Cluster" to scan for vulnerabilities.`
- `Cluster health checks, security posture, vulnerability scanning, and best practices analysis`
- `Deployments and StatefulSets with only 1 replica are at high risk. At least 2 replicas are recommended for production workloads to ensure high availability.`
- `Diagnostics are disabled`
- `Enable CVE Vulnerabilities (NIST NVD) in Settings to scan for vulnerabilities`
- `Enable Diagnostics in Settings to run health checks`
- `Error Loading Data`
- `Error scanning for vulnerabilities`
- `Findings ( )`
- `Findings ( ) Optimized with parallel execution and caching`
- `High Availability (HA) Recommendations`
- `Impact: No redundancy - single point of failure`
- `Multi-replica workloads should use podAntiAffinity to spread pods across different nodes, preventing all replicas from being on the same node.`
- `No issues found in the selected scope.`
- `No vulnerabilities found matching the selected criteria.`
- `Optimized with parallel execution and caching`
- `Pod Anti-Affinity Multi-replica workloads should use podAntiAffinity to spread pods across different nodes, preventing all replicas from being on the same node.`
- `Pod Disruption Budget (PDB) PodDisruptionBudgets ensure that a minimum number of pods remain available during voluntary disruptions (node drains, cluster upgrades, etc.).`
- `PodDisruptionBudgets ensure that a minimum number of pods remain available during voluntary disruptions (node drains, cluster upgrades, etc.).`
- `Recommendation: Add podAntiAffinity rules to pod templates`
- `Recommendation: Create PDBs for all production workloads with 2+ replicas`
- `Security & Diagnostics`
- `Security Best Practices`
- `Single Replica Issues Findings ( ) Optimized with parallel execution and caching`
- `This may take a few moments`

## Buttons

- `All Categories`
- `Export Report`
- `Next`
- `Previous`
- `REL005`
- `Retry Scan`
- `Run Diagnostics`
- `Scan Cluster`
- `Single Replica Issues`

## Links

- `Reference`

## Component prop text (cards/widgets)

### `title=`
- `Export diagnostic report`
- `Refresh NVD data`
- `Show single replica workloads`

## Controls by file

### `components/Loading.tsx`
- **headings/copy**: `Error Loading Data`

### `routes/Security.tsx`
- **headings/copy**: `All checks passed!`, `CVE Vulnerabilities (NIST NVD)`, `CVE Vulnerabilities are disabled`, `Check: REL005 - Single Replica Deployment/StatefulSet`, `Check: REL006 - Missing PDB`, `Check: REL007 - No Anti-Affinity`, `Click "Scan Cluster" to scan for vulnerabilities.`, `Cluster health checks, security posture, vulnerability scanning, and best practices analysis`, `Deployments and StatefulSets with only 1 replica are at high risk. At least 2 replicas are recommended for production workloads to ensure high availability.`, `Diagnostics are disabled`, `Enable CVE Vulnerabilities (NIST NVD) in Settings to scan for vulnerabilities`, `Enable Diagnostics in Settings to run health checks`, `Error scanning for vulnerabilities`, `Findings ( )`, `Findings ( ) Optimized with parallel execution and caching`, `High Availability (HA) Recommendations`, `Impact: No redundancy - single point of failure`, `Multi-replica workloads should use podAntiAffinity to spread pods across different nodes, preventing all replicas from being on the same node.`, `No issues found in the selected scope.`, `No vulnerabilities found matching the selected criteria.`, `Optimized with parallel execution and caching`, `Pod Anti-Affinity Multi-replica workloads should use podAntiAffinity to spread pods across different nodes, preventing all replicas from being on the same node.`, `Pod Disruption Budget (PDB) PodDisruptionBudgets ensure that a minimum number of pods remain available during voluntary disruptions (node drains, cluster upgrades, etc.).`, `PodDisruptionBudgets ensure that a minimum number of pods remain available during voluntary disruptions (node drains, cluster upgrades, etc.).`, `Recommendation: Add podAntiAffinity rules to pod templates`, `Recommendation: Create PDBs for all production workloads with 2+ replicas`, `Security & Diagnostics`, `Security Best Practices`, `Single Replica Issues Findings ( ) Optimized with parallel execution and caching`, `This may take a few moments`
- **buttons**: `All Categories`, `Export Report`, `Next`, `Previous`, `REL005`, `Retry Scan`, `Run Diagnostics`, `Scan Cluster`, `Single Replica Issues`
- **links**: `Reference`
- **jsx props**:
  - `title=`: `Export diagnostic report`, `Refresh NVD data`, `Show single replica workloads`
