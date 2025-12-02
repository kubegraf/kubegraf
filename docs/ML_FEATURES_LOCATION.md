# Where to Find ML Features in KubeGraf

## 🎯 Quick Navigation Guide

### 1. **AI Insights (Anomaly Detection + ML Recommendations)**

**Location**: Sidebar → **Insights** → **AI Insights**

**Path**: `http://localhost:3000` → Click "AI Insights" in sidebar

**What You'll See**:
- **Two Tabs**:
  1. **Anomaly Detection** - Real-time anomaly detection
  2. **ML Recommendations** - ML-powered optimization suggestions

#### Tab 1: Anomaly Detection
- **Detect Anomalies** button - Click to scan cluster
- **Statistics Cards**: Total, Critical, Warning, Info anomalies
- **Anomaly List**: Each anomaly shows:
  - 🔴 Alert/Message
  - 💡 Recommendation
  - ⚡ Auto-Remediate button (if available)
- **Filter by Severity**: Critical, Warning, Info
- **Pagination**: 10 items per page

#### Tab 2: ML Recommendations
- **Refresh Recommendations** button
- **ML Recommendations List**: Shows:
  - Resource optimization suggestions
  - Predictive scaling recommendations
  - Cost-saving opportunities
  - Confidence scores
  - Impact and effort ratings

---

### 2. **Local Cluster Installers (k3d, kind, minikube)**

**Location**: Sidebar → **Deployments** → **Deploy** → **Marketplace** tab

**Path**: `http://localhost:3000` → Click "Deploy" → Marketplace tab → Filter by "Local Cluster"

**What You'll See**:
- **k3d** - Local Kubernetes (k3s in Docker)
- **kind** - Kubernetes in Docker
- **minikube** - Local Kubernetes in VM

**How to Use**:
1. Click "Install" on any local cluster tool
2. Backend will install the tool and create a cluster
3. Check server logs for progress

---

### 3. **Dashboard Overview**

**Location**: Sidebar → **Overview** → **Dashboard**

**Path**: `http://localhost:3000` → Click "Dashboard"

**What You'll See**:
- **AI Insights & Recommendations** card (bottom left)
- Quick overview of cluster health
- Links to detailed ML features

---

## 📍 Complete Navigation Map

```
KubeGraf App
│
├── 📊 Overview
│   └── Dashboard (shows AI Insights card)
│
├── 📌 Insights
│   ├── 🤖 AI Insights ⭐ ML FEATURES HERE
│   │   ├── Tab: Anomaly Detection
│   │   │   ├── Detect Anomalies button
│   │   │   ├── Statistics (Total, Critical, Warning, Info)
│   │   │   ├── Anomaly list with recommendations
│   │   │   └── Auto-Remediate buttons
│   │   └── Tab: ML Recommendations
│   │       ├── Resource optimization
│   │       ├── Predictive scaling
│   │       └── Cost optimization
│   ├── 💰 Cost Analysis
│   ├── 🔒 Security Insights
│   └── 🔄 Drift Detection
│
├── 🚀 Deployments
│   └── Deploy → Marketplace ⭐ LOCAL CLUSTER INSTALLERS HERE
│       └── Filter: "Local Cluster"
│           ├── k3d
│           ├── kind
│           └── minikube
│
└── ... (other sections)
```

---

## 🎬 Step-by-Step: How to Access ML Features

### Step 1: Access AI Insights
1. Open `http://localhost:3000`
2. Look at the **left sidebar**
3. Find **"Insights"** section (expand if collapsed)
4. Click **"AI Insights"**

### Step 2: View Anomaly Detection
1. You'll see the **"Anomaly Detection"** tab (default)
2. Click **"Detect Anomalies"** button
3. Wait for scan to complete
4. View detected anomalies with:
   - Alert messages
   - Recommendations
   - Auto-Remediate buttons (if available)

### Step 3: View ML Recommendations
1. Click the **"ML Recommendations"** tab
2. Click **"Refresh Recommendations"** button
3. View ML-powered suggestions:
   - Resource optimization
   - Predictive scaling
   - Cost savings

### Step 4: Access Local Cluster Installers
1. Click **"Deploy"** in sidebar (under Deployments)
2. Make sure you're on the **"Marketplace"** tab
3. Use the category filter → Select **"Local Cluster"**
4. You'll see: k3d, kind, minikube
5. Click **"Install"** on any tool

---

## 🔍 What Each Feature Does

### Anomaly Detection Tab
- **Detects**: CPU spikes, memory spikes, crash loops, HPA maxed, pod issues
- **Shows**: Severity, score, recommendation
- **Can Do**: Auto-remediate (restart, scale)

### ML Recommendations Tab
- **Resource Optimization**: Suggests optimal CPU/memory requests
- **Predictive Scaling**: Predicts future load and recommends pre-scaling
- **Cost Optimization**: Identifies idle resources for cost savings

### Local Cluster Installers
- **k3d**: Creates lightweight k3s cluster in Docker
- **kind**: Creates Kubernetes cluster using Docker containers
- **minikube**: Creates single-node cluster in VM

---

## 💡 Tips

1. **First Time**: ML Recommendations may be empty - the system needs historical data
2. **Anomaly Detection**: Click "Detect Anomalies" to scan your cluster
3. **Auto-Remediate**: Only available for certain anomaly types (crash loops, CPU/memory spikes)
4. **Local Clusters**: Installation may take a few minutes - check server logs

---

## 🚨 Troubleshooting

**Q: I don't see "AI Insights" in the sidebar**
- Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
- Check if you're connected to a cluster

**Q: ML Recommendations tab is empty**
- This is normal - the system needs historical metrics
- Run anomaly detection a few times to collect data
- Recommendations will appear after 20+ metric samples

**Q: Local cluster installers not showing**
- Make sure you're on the "Marketplace" tab (not "Custom Apps")
- Filter by "Local Cluster" category
- Check server logs if installation fails

---

## Summary

✅ **AI Insights** = Sidebar → Insights → AI Insights
✅ **Anomaly Detection** = AI Insights page → "Anomaly Detection" tab
✅ **ML Recommendations** = AI Insights page → "ML Recommendations" tab
✅ **Local Cluster Installers** = Sidebar → Deploy → Marketplace → Filter "Local Cluster"

All ML features are now accessible! 🎉

