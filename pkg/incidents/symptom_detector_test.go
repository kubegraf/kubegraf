// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"testing"
	"time"
)

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build a signal with source and attributes
// ─────────────────────────────────────────────────────────────────────────────

func makeSignal(source SignalSource, resource KubeResourceRef, msg string, attrs map[string]string) *NormalizedSignal {
	s := &NormalizedSignal{
		ID:         "sig-test",
		Source:     source,
		Resource:   resource,
		Message:    msg,
		Timestamp:  time.Now(),
		Attributes: attrs,
	}
	return s
}

// ─────────────────────────────────────────────────────────────────────────────
// containsAny / contains / toLower helpers
// ─────────────────────────────────────────────────────────────────────────────

func TestContainsAny_Found(t *testing.T) {
	if !containsAny("CrashLoopBackOff happened", "crash", "oom") {
		t.Error("containsAny should find 'crash' in string")
	}
}

func TestContainsAny_NotFound(t *testing.T) {
	if containsAny("all is good", "error", "fail") {
		t.Error("containsAny should not find error/fail in 'all is good'")
	}
}

func TestContainsAny_CaseInsensitive(t *testing.T) {
	if !containsAny("LIVENESS probe failed", "liveness") {
		t.Error("containsAny should be case-insensitive")
	}
}

func TestContainsAny_Empty(t *testing.T) {
	if containsAny("", "something") {
		t.Error("containsAny on empty string should be false")
	}
}

func TestContains_True(t *testing.T) {
	if !contains("hello world", "world") {
		t.Error("contains should find 'world'")
	}
}

func TestContains_False(t *testing.T) {
	if contains("hello", "xyz") {
		t.Error("contains should not find 'xyz'")
	}
}

func TestContains_EmptySubstr(t *testing.T) {
	// empty substring is always contained
	if !contains("anything", "") {
		t.Error("contains with empty substr should be true")
	}
}

func TestToLower_UpperCase(t *testing.T) {
	if toLower("HELLO") != "hello" {
		t.Errorf("toLower(HELLO) = %q, want hello", toLower("HELLO"))
	}
}

func TestToLower_Mixed(t *testing.T) {
	if toLower("CrashLoop") != "crashloop" {
		t.Errorf("toLower(CrashLoop) = %q, want crashloop", toLower("CrashLoop"))
	}
}

func TestToLower_AlreadyLower(t *testing.T) {
	if toLower("lower") != "lower" {
		t.Errorf("toLower(lower) = %q, want lower", toLower("lower"))
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SymptomDetector.DetectSymptoms — with real signals
// ─────────────────────────────────────────────────────────────────────────────

func TestSymptomDetector_DetectSymptoms_CrashLoopStatus(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "crasher", Namespace: "default"}
	signal := makeSignal(SourcePodStatus, res, "container in CrashLoopBackOff", map[string]string{
		AttrContainerReason: "CrashLoopBackOff",
		AttrContainerState:  "Waiting",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	if len(symptoms) == 0 {
		t.Error("DetectSymptoms should detect CrashLoopBackOff from status signal")
	}
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomCrashLoopBackOff {
			found = true
		}
	}
	if !found {
		t.Error("Should detect SymptomCrashLoopBackOff")
	}
}

func TestSymptomDetector_DetectSymptoms_OOMKilled(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "oom-pod", Namespace: "ns"}
	signal := makeSignal(SourcePodStatus, res, "OOMKilled", map[string]string{
		AttrContainerReason: "OOMKilled",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomExitCodeOOM {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect ExitCodeOOM from OOMKilled status")
	}
}

func TestSymptomDetector_DetectSymptoms_ImagePullError(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "pull-fail", Namespace: "ns"}
	signal := makeSignal(SourcePodStatus, res, "failed to pull image", map[string]string{
		AttrContainerReason: "ErrImagePull",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomImagePullError {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect ImagePullError")
	}
}

func TestSymptomDetector_DetectSymptoms_ErrorTerminated(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "err-pod", Namespace: "ns"}
	signal := makeSignal(SourcePodStatus, res, "container exited with error", map[string]string{
		AttrContainerReason: "Error",
		AttrContainerState:  "Terminated",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomExitCodeError {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect ExitCodeError for Error+Terminated")
	}
}

func TestSymptomDetector_DetectSymptoms_WaitingUnknownReason(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "waiting-pod", Namespace: "ns"}
	signal := makeSignal(SourcePodStatus, res, "container waiting for unknown reason", map[string]string{
		AttrContainerState:  "Waiting",
		AttrContainerReason: "SomeCustomReason",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomContainerWaiting {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect ContainerWaiting for unknown waiting reason")
	}
}

func TestSymptomDetector_DetectSymptoms_InvalidConfig(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "config-err", Namespace: "ns"}
	signal := makeSignal(SourcePodStatus, res, "config error", map[string]string{
		AttrContainerReason: "CreateContainerConfigError",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomInvalidConfig {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect InvalidConfig")
	}
}

func TestSymptomDetector_DetectSymptoms_HighRestartCount(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "restart-pod", Namespace: "ns"}
	// highRestartThreshold is 5
	signal := makeSignal(SourcePodStatus, res, "restart count is high", map[string]string{
		AttrRestartCount: "10",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomHighRestartCount {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect HighRestartCount when count >= threshold")
	}
}

func TestSymptomDetector_DetectSymptoms_OOMExitCode(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "oom-exit", Namespace: "ns"}
	signal := makeSignal(SourcePodStatus, res, "OOM killed", map[string]string{
		AttrExitCode: "137",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomExitCodeOOM {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect OOM from exit code 137")
	}
}

func TestSymptomDetector_DetectSymptoms_KubeEvent_FailedScheduling(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "unschedulable", Namespace: "ns"}
	signal := makeSignal(SourceKubeEvent, res, "pod cannot be scheduled", map[string]string{
		AttrEventType:   "Warning",
		AttrEventReason: "FailedScheduling",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomUnschedulable {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect Unschedulable from FailedScheduling event")
	}
}

func TestSymptomDetector_DetectSymptoms_KubeEvent_BackOff(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "backoff-pod", Namespace: "ns"}
	signal := makeSignal(SourceKubeEvent, res, "back-off restarting", map[string]string{
		AttrEventType:   "Warning",
		AttrEventReason: "BackOff",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomCrashLoopBackOff {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect CrashLoopBackOff from BackOff event")
	}
}

func TestSymptomDetector_DetectSymptoms_KubeEvent_LivenessUnhealthy(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "liveness-fail", Namespace: "ns"}
	signal := makeSignal(SourceKubeEvent, res, "liveness probe failed", map[string]string{
		AttrEventType:   "Warning",
		AttrEventReason: "Unhealthy",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomLivenessProbeFailure {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect LivenessProbeFailure from Unhealthy event with liveness message")
	}
}

func TestSymptomDetector_DetectSymptoms_KubeEvent_ReadinessUnhealthy(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "readiness-fail", Namespace: "ns"}
	signal := makeSignal(SourceKubeEvent, res, "readiness probe failed", map[string]string{
		AttrEventType:   "Warning",
		AttrEventReason: "Unhealthy",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomReadinessProbeFailure {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect ReadinessProbeFailure from readiness Unhealthy event")
	}
}

func TestSymptomDetector_DetectSymptoms_KubeEvent_StartupUnhealthy(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "startup-fail", Namespace: "ns"}
	signal := makeSignal(SourceKubeEvent, res, "startup probe failed", map[string]string{
		AttrEventType:   "Warning",
		AttrEventReason: "Unhealthy",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomStartupProbeFailure {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect StartupProbeFailure from startup Unhealthy event")
	}
}

func TestSymptomDetector_DetectSymptoms_KubeEvent_FailedMount_Secret(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "secret-fail", Namespace: "ns"}
	signal := makeSignal(SourceKubeEvent, res, "failed to mount secret volume", map[string]string{
		AttrEventType:   "Warning",
		AttrEventReason: "FailedMount",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomMissingSecret {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect MissingSecret from FailedMount secret event")
	}
}

func TestSymptomDetector_DetectSymptoms_KubeEvent_FailedMount_ConfigMap(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "cm-fail", Namespace: "ns"}
	signal := makeSignal(SourceKubeEvent, res, "failed to mount configmap volume", map[string]string{
		AttrEventType:   "Warning",
		AttrEventReason: "FailedMount",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomMissingConfigMap {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect MissingConfigMap from FailedMount configmap event")
	}
}

func TestSymptomDetector_DetectSymptoms_KubeEvent_NodeNotReady(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Node", Name: "node-1"}
	signal := makeSignal(SourceKubeEvent, res, "node is not ready", map[string]string{
		AttrEventType:   "Warning",
		AttrEventReason: "NodeNotReady",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomNodeNotReady {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect NodeNotReady")
	}
}

func TestSymptomDetector_DetectSymptoms_KubeEvent_NodeUnreachable(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Node", Name: "node-1"}
	signal := makeSignal(SourceKubeEvent, res, "node unreachable", map[string]string{
		AttrEventType:   "Warning",
		AttrEventReason: "NodeUnreachable",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomNodeUnreachable {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect NodeUnreachable")
	}
}

func TestSymptomDetector_DetectSymptoms_KubeEvent_Evicted(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "evicted-pod", Namespace: "ns"}
	signal := makeSignal(SourceKubeEvent, res, "pod evicted due to memory pressure", map[string]string{
		AttrEventType:   "Warning",
		AttrEventReason: "Evicted",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomNodePressure {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect NodePressure from Evicted event")
	}
}

func TestSymptomDetector_DetectSymptoms_KubeEvent_Forbidden(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "rbac-fail", Namespace: "ns"}
	signal := makeSignal(SourceKubeEvent, res, "action forbidden", map[string]string{
		AttrEventType:   "Warning",
		AttrEventReason: "Forbidden",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomRBACDenied {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect RBACDenied from Forbidden event")
	}
}

func TestSymptomDetector_DetectSymptoms_KubeEvent_Normal_Ignored(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "normal-pod", Namespace: "ns"}
	signal := makeSignal(SourceKubeEvent, res, "pod started successfully", map[string]string{
		AttrEventType:   "Normal",
		AttrEventReason: "Started",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	if len(symptoms) != 0 {
		t.Errorf("DetectSymptoms should ignore Normal events unless Unhealthy, got %d symptoms", len(symptoms))
	}
}

func TestSymptomDetector_DetectSymptoms_LogSignal_DNSError(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "dns-fail", Namespace: "ns"}
	signal := makeSignal(SourcePodLog, res, "dns resolve failed for api.example.com", map[string]string{})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomDNSResolutionFailed {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect DNSResolutionFailed from log")
	}
}

func TestSymptomDetector_DetectSymptoms_LogSignal_ConnectionRefused(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "conn-refused", Namespace: "ns"}
	signal := makeSignal(SourcePodLog, res, "connection refused to 10.0.0.1:8080", map[string]string{})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomConnectionRefused {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect ConnectionRefused from log")
	}
}

func TestSymptomDetector_DetectSymptoms_LogSignal_ConnectionTimeout(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "timeout-pod", Namespace: "ns"}
	signal := makeSignal(SourcePodLog, res, "connection timeout to upstream service", map[string]string{})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomConnectionTimeout {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect ConnectionTimeout from log")
	}
}

func TestSymptomDetector_DetectSymptoms_LogSignal_OOM(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "oom-log", Namespace: "ns"}
	signal := makeSignal(SourcePodLog, res, "out of memory: kill process 1234", map[string]string{})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomMemoryPressure {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect MemoryPressure from OOM log message")
	}
}

func TestSymptomDetector_DetectSymptoms_LogSignal_HTTP5xxAttr(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "http-fail", Namespace: "ns"}
	// 5 signals with http status 500 (threshold is 5)
	var signals []*NormalizedSignal
	for i := 0; i < 6; i++ {
		s := makeSignal(SourcePodLog, res, "request failed", map[string]string{
			AttrHTTPStatus: "500",
		})
		signals = append(signals, s)
	}
	symptoms := d.DetectSymptoms(signals)
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomHTTP5xx {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect HTTP5xx when count >= threshold")
	}
}

func TestSymptomDetector_DetectSymptoms_LogSignal_HTTPTimeout(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "timeout-pod", Namespace: "ns"}
	signal := makeSignal(SourcePodLog, res, "request timeout", map[string]string{
		AttrHTTPStatus: "408",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomHTTPTimeout {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect HTTPTimeout from HTTP 408 log signal")
	}
}

func TestSymptomDetector_DetectSymptoms_LogSignal_502_NoEndpoints(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "upstream-fail", Namespace: "ns"}
	signal := makeSignal(SourcePodLog, res, "upstream unavailable", map[string]string{
		AttrHTTPStatus: "502",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomNoEndpoints {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect NoEndpoints from 502 signal")
	}
}

func TestSymptomDetector_DetectSymptoms_ProbeSignal_Liveness(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "probe-fail", Namespace: "ns"}
	signal := makeSignal(SourceProbe, res, "liveness probe failed", map[string]string{
		AttrProbeType:    "liveness",
		AttrProbeFailure: "3",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomLivenessProbeFailure {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect LivenessProbeFailure from probe signal")
	}
}

func TestSymptomDetector_DetectSymptoms_ProbeSignal_Readiness(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "probe-fail", Namespace: "ns"}
	signal := makeSignal(SourceProbe, res, "readiness probe failed", map[string]string{
		AttrProbeType:    "readiness",
		AttrProbeFailure: "2",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomReadinessProbeFailure {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect ReadinessProbeFailure from probe signal")
	}
}

func TestSymptomDetector_DetectSymptoms_ProbeSignal_Startup(t *testing.T) {
	d := NewSymptomDetector()
	res := KubeResourceRef{Kind: "Pod", Name: "probe-fail", Namespace: "ns"}
	signal := makeSignal(SourceProbe, res, "startup probe failed", map[string]string{
		AttrProbeType:    "startup",
		AttrProbeFailure: "1",
	})
	symptoms := d.DetectSymptoms([]*NormalizedSignal{signal})
	found := false
	for _, s := range symptoms {
		if s.Type == SymptomStartupProbeFailure {
			found = true
		}
	}
	if !found {
		t.Error("DetectSymptoms should detect StartupProbeFailure from probe signal")
	}
}

func TestSymptomDetector_DetectSymptoms_MultiResource(t *testing.T) {
	d := NewSymptomDetector()
	res1 := KubeResourceRef{Kind: "Pod", Name: "pod-a", Namespace: "ns"}
	res2 := KubeResourceRef{Kind: "Pod", Name: "pod-b", Namespace: "ns"}
	signals := []*NormalizedSignal{
		makeSignal(SourcePodStatus, res1, "crash", map[string]string{AttrContainerReason: "CrashLoopBackOff"}),
		makeSignal(SourcePodStatus, res2, "oom", map[string]string{AttrContainerReason: "OOMKilled"}),
	}
	symptoms := d.DetectSymptoms(signals)
	if len(symptoms) < 2 {
		t.Errorf("DetectSymptoms with 2 resources: got %d symptoms, want >= 2", len(symptoms))
	}
}
