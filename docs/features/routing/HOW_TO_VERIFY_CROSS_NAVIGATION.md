# How to Verify Cross-Navigation Feature

## Prerequisites
1. KubeGraf is running and connected to a Kubernetes cluster
2. You have kubectl access to the cluster
3. You have some workloads deployed (Deployments, StatefulSets, etc.)

## Verification Steps

### 1. Verify Pods Table Workload Chip

**Setup:**
```bash
# Create a deployment
kubectl create deployment nginx --image=nginx -n default

# Wait for pods to be created
kubectl get pods -n default -w
```

**Expected UI Behavior:**
1. Navigate to Pods view in KubeGraf
2. Find a pod owned by the nginx deployment
3. You should see a chip next to the pod name like: `DEP nginx`
4. Hover over the chip - tooltip should show: "Pod -> ReplicaSet <rs-name> -> Deployment nginx"
5. Click the chip - should navigate to Deployments view

**Verify:**
- [ ] Chip appears inline next to pod name
- [ ] Chip shows correct abbreviation (DEP for Deployment)
- [ ] Tooltip shows full ownership chain
- [ ] Clicking chip navigates to Deployments view

### 2. Verify Workload Resolution (ReplicaSet -> Deployment)

**Setup:**
```bash
# Get a pod name
POD_NAME=$(kubectl get pods -n default -l app=nginx -o jsonpath='{.items[0].metadata.name}')

# Check owner chain
kubectl get pod $POD_NAME -n default -o jsonpath='{.metadata.ownerReferences[*].kind}'
# Should show: ReplicaSet

# Get ReplicaSet name
RS_NAME=$(kubectl get pod $POD_NAME -n default -o jsonpath='{.metadata.ownerReferences[0].name}')

# Check ReplicaSet owner
kubectl get replicaset $RS_NAME -n default -o jsonpath='{.metadata.ownerReferences[*].kind}'
# Should show: Deployment
```

**Expected UI Behavior:**
1. In Pods view, the pod should show chip: `DEP nginx` (not `RS <name>`)
2. Tooltip should show full chain including ReplicaSet

**Verify:**
- [ ] Pod shows Deployment chip, not ReplicaSet chip
- [ ] Tooltip includes ReplicaSet in the chain

### 3. Verify Direct StatefulSet Ownership

**Setup:**
```bash
# Create a StatefulSet
kubectl create statefulset redis --image=redis --service-name=redis -n default

# Wait for pods
kubectl get pods -n default -w
```

**Expected UI Behavior:**
1. In Pods view, find a pod owned by redis StatefulSet
2. Should see chip: `STS redis`
3. Tooltip should show: "Pod -> StatefulSet redis"

**Verify:**
- [ ] Chip shows `STS redis`
- [ ] Tooltip shows direct ownership (no intermediate resources)

### 4. Verify Job -> CronJob Resolution

**Setup:**
```bash
# Create a CronJob
kubectl create cronjob backup --image=busybox --schedule="*/1 * * * *" -- echo "backup" -n default

# Wait for job to be created (may take up to 1 minute)
kubectl get jobs -n default -w

# Get job name
JOB_NAME=$(kubectl get jobs -n default -l job-name=backup -o jsonpath='{.items[0].metadata.name}')

# Get pod name
POD_NAME=$(kubectl get pods -n default -l job-name=$JOB_NAME -o jsonpath='{.items[0].metadata.name}')
```

**Expected UI Behavior:**
1. In Pods view, find the pod owned by the backup job
2. Should see chip: `CJ backup` (CronJob, not Job)
3. Tooltip should show: "Pod -> Job <job-name> -> CronJob backup"

**Verify:**
- [ ] Pod shows CronJob chip (`CJ backup`), not Job chip
- [ ] Tooltip includes Job in the chain

### 5. Verify Unowned Pods

**Setup:**
```bash
# Create a pod directly (not owned by any workload)
kubectl run test-pod --image=busybox --restart=Never -- echo "test" -n default
```

**Expected UI Behavior:**
1. In Pods view, find the test-pod
2. Should see chip: `Unowned` (non-clickable)
3. Tooltip should show: "Unowned"

**Verify:**
- [ ] Unowned pod shows "Unowned" chip
- [ ] Chip is not clickable

### 6. Verify Related Resources Section

**Setup:**
```bash
# Ensure you have a deployment with services and ingresses
kubectl create deployment web --image=nginx -n default
kubectl expose deployment web --port=80 --target-port=80 -n default
kubectl create ingress web --rule=web.example.com/*=web:80 -n default
```

**Expected UI Behavior:**
1. Navigate to Deployments view
2. Click on a deployment (e.g., `web`)
3. You should see a "Related" section at the top with pills:
   - `Pods (N)` - where N is the number of pods
   - `Services (N)` - where N is the number of services
   - `Ingresses (N)` - where N is the number of ingresses
   - `ReplicaSets (N)` - for deployments only

**Verify:**
- [ ] Related section appears when deployment is selected
- [ ] Pods count is correct
- [ ] Services count is correct
- [ ] Ingresses count is correct
- [ ] ReplicaSets count appears for deployments

### 7. Verify Pods Filtering by Owner

**Expected UI Behavior:**
1. In Deployments view, click on a deployment
2. Click the "Pods (N)" pill in Related section
3. Should navigate to Pods view
4. Pods list should be filtered to show only pods owned by that deployment
5. URL should contain: `?ownerKind=deployment&ownerName=<name>&namespace=<ns>`

**Verify:**
- [ ] Clicking Pods pill navigates to Pods view
- [ ] Pods list is filtered correctly
- [ ] URL contains correct query parameters
- [ ] Only pods owned by the deployment are shown

### 8. Verify Backend Endpoints

**Test API endpoints directly:**

```bash
# Get workload details
curl http://localhost:3003/api/workloads/default/deployment/nginx

# Get related resources
curl http://localhost:3003/api/workloads/default/deployment/nginx/related

# Get pods with workloadRef
curl http://localhost:3003/api/pods?namespace=default | jq '.[0].workloadRef'
```

**Expected Response:**
- `/api/workloads/:namespace/:kind/:name` returns workload details
- `/api/workloads/:namespace/:kind/:name/related` returns related resources
- `/api/pods` includes `workloadRef` field for each pod

**Verify:**
- [ ] Workload details endpoint returns correct data
- [ ] Related resources endpoint returns pods, services, ingresses
- [ ] Pods endpoint includes `workloadRef` field

## Troubleshooting

### Chip doesn't appear
- Check browser console for errors
- Verify pod has ownerReferences: `kubectl get pod <name> -o yaml | grep ownerReferences`
- Verify backend is returning `workloadRef` in pods response

### Related section doesn't appear
- Check browser console for errors
- Verify deployment is selected (click on a deployment row)
- Verify backend endpoint is accessible: `curl http://localhost:3003/api/workloads/default/deployment/<name>/related`

### Filtering doesn't work
- Check URL parameters are present
- Verify pods have correct `workloadRef` field
- Check browser console for JavaScript errors

### Navigation doesn't work
- Verify view names are correct (deployments, statefulsets, etc.)
- Check browser console for errors
- Verify `setCurrentView` is imported and working

## Expected kubectl Output Examples

```bash
# Example: Pod owned by Deployment
$ kubectl get pod nginx-xxx -o jsonpath='{.metadata.ownerReferences[*].kind}'
ReplicaSet

$ kubectl get replicaset nginx-xxx -o jsonpath='{.metadata.ownerReferences[*].kind}'
Deployment

# Example: Pod owned by StatefulSet
$ kubectl get pod redis-0 -o jsonpath='{.metadata.ownerReferences[*].kind}'
StatefulSet

# Example: Pod owned by Job (from CronJob)
$ kubectl get pod backup-xxx -o jsonpath='{.metadata.ownerReferences[*].kind}'
Job

$ kubectl get job backup-xxx -o jsonpath='{.metadata.ownerReferences[*].kind}'
CronJob
```

