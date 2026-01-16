# ML Models in KubeGraf

## How ML Models Work

KubeGraf uses **online/adaptive learning** algorithms that don't require separate model training or retraining.

### Current Implementation

#### 1. **Anomaly Detection** (`anomaly_detection.go`)
- **Algorithm**: Simplified Isolation Forest using z-scores and statistical analysis
- **Learning Method**: Online learning - continuously adapts as new data arrives
- **How it works**:
  1. Collects metrics every time `DetectAnomalies()` is called
  2. Maintains a rolling window of last 10,000 samples
  3. Recalculates mean/std from current history in real-time
  4. Compares new metrics against this adaptive baseline
  5. No separate "training" phase needed

```go
// Each detection run:
1. Collect current metrics
2. Add to metricsHistory (rolling window)
3. Recalculate means/stds from history
4. Calculate z-scores for new metrics
5. Generate anomaly scores
```

#### 2. **ML Recommendations** (`ml_recommendations.go`)
- **Algorithm**: Statistical analysis (percentiles, trend analysis)
- **Learning Method**: Online learning - uses historical data directly
- **How it works**:
  1. Analyzes historical metrics (P95, P99 percentiles)
  2. Calculates trends for predictive scaling
  3. Compares current vs historical patterns
  4. Generates recommendations based on statistical analysis

### Why No Retraining Needed (Current Approach)

✅ **Automatic Adaptation**: Models adapt as new data arrives
✅ **Rolling Window**: Only uses recent data (last 10k samples)
✅ **Real-time Learning**: Baseline updates with each detection run
✅ **No Model Artifacts**: No files to save/load/version

### When You WOULD Need Retraining

If you upgrade to more sophisticated ML models, you'd need retraining for:

#### 1. **Traditional ML Models**
- Neural Networks (LSTM, Autoencoders)
- Gradient Boosting (XGBoost, LightGBM)
- Deep Learning models
- **Why**: These require training on historical data to learn patterns

#### 2. **Hyperparameter Tuning**
- Adjusting anomaly thresholds
- Optimizing feature weights
- Tuning model parameters
- **When**: Monthly/quarterly to improve accuracy

#### 3. **Feedback Learning**
- Learning from false positives/negatives
- User corrections/feedback
- Labeled anomaly data
- **When**: Continuously as feedback is collected

#### 4. **Advanced Time Series Models**
- ARIMA, Prophet, LSTM for forecasting
- Seasonal pattern detection
- **When**: Weekly/monthly to capture new patterns

## Recommended Approach: Hybrid Model

### Phase 1: Current (Online Learning) ✅
- Simple statistical models
- Automatic adaptation
- No retraining needed
- Good for MVP

### Phase 2: Add Periodic Evaluation (Recommended)
Add model evaluation and threshold tuning:

```go
// Evaluate model performance weekly
func (ad *AnomalyDetector) EvaluateModel(ctx context.Context) ModelMetrics {
    // Calculate:
    // - Precision/Recall from user feedback
    // - False positive rate
    // - Optimal threshold
    // - Feature importance
}

// Auto-tune threshold based on feedback
func (ad *AnomalyDetector) AutoTuneThreshold(feedback []Feedback) {
    // Adjust threshold to minimize false positives
}
```

### Phase 3: Optional Advanced Models
If needed, add traditional ML with retraining:

```go
// Train model on historical data
func TrainAnomalyModel(historicalData []MetricSample) *TrainedModel {
    // Use scikit-learn, TensorFlow, etc.
    // Save model artifact
    // Version model
}

// Retrain periodically
func RetrainModel(ctx context.Context) {
    // Collect new labeled data
    // Retrain model
    // Validate performance
    // Deploy new model
}
```

## GitHub Actions for ML (If Needed)

### Current: Not Needed ✅
- Models adapt automatically
- No training pipeline required
- CI builds include ML code

### If Adding Retraining:

```yaml
# .github/workflows/ml-train.yml
name: ML Model Training

on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday 2 AM
  workflow_dispatch:  # Manual trigger

jobs:
  train:
    runs-on: ubuntu-latest
    steps:
      - name: Collect training data
        run: |
          # Export historical metrics
          kubectl exec -it kubegraf -- kubegraf export-metrics > training-data.json
      
      - name: Train model
        run: |
          python train_anomaly_model.py training-data.json
      
      - name: Validate model
        run: |
          python validate_model.py model.pkl
      
      - name: Upload model artifact
        uses: actions/upload-artifact@v4
        with:
          name: ml-model
          path: model.pkl
```

## Recommendations

### For Current Implementation:
✅ **No retraining needed** - models adapt automatically
✅ **Monitor performance** - track false positive rate
✅ **Collect feedback** - user corrections improve accuracy over time

### For Future Enhancement:
1. **Add Model Evaluation** (weekly)
   - Calculate precision/recall
   - Track false positives
   - Auto-tune thresholds

2. **Optional: Periodic Retraining** (monthly)
   - If using advanced models
   - If accuracy degrades
   - If patterns change significantly

3. **A/B Testing**
   - Compare model versions
   - Test new algorithms
   - Measure impact

## Summary

**Current**: Online learning - no retraining needed ✅
**Future**: Add evaluation/metrics, optional retraining for advanced models

The current approach is perfect for production because:
- ✅ Adapts to changing workloads automatically
- ✅ No infrastructure for training pipelines
- ✅ Simple and maintainable
- ✅ Good accuracy for most use cases

