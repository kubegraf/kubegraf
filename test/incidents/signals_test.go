// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents_test

import (
	"strings"
	"testing"
	"time"

	"github.com/kubegraf/kubegraf/pkg/incidents"
)

// ─────────────────────────────────────────────────────────────────────────────
// GenerateSignalID
// ─────────────────────────────────────────────────────────────────────────────

func TestGenerateSignalID_StartsWithSig(t *testing.T) {
	id := incidents.GenerateSignalID(incidents.SourceKubeEvent, incidents.KubeResourceRef{Kind: "Pod", Name: "test"}, time.Now())
	if !strings.HasPrefix(id, "sig-") {
		t.Errorf("GenerateSignalID = %q, should start with sig-", id)
	}
}

func TestGenerateSignalID_ContainsSource(t *testing.T) {
	id := incidents.GenerateSignalID(incidents.SourcePodLog, incidents.KubeResourceRef{Kind: "Pod", Name: "test"}, time.Now())
	if !strings.Contains(id, "log") {
		t.Errorf("GenerateSignalID = %q, should contain source 'log'", id)
	}
}

func TestGenerateSignalID_Unique(t *testing.T) {
	res := incidents.KubeResourceRef{Kind: "Pod", Name: "pod", Namespace: "ns"}
	id1 := incidents.GenerateSignalID(incidents.SourceKubeEvent, res, time.Now())
	id2 := incidents.GenerateSignalID(incidents.SourceKubeEvent, res, time.Now().Add(time.Nanosecond))
	if id1 == id2 {
		t.Error("GenerateSignalID should produce unique IDs for different timestamps")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// NewNormalizedSignal
// ─────────────────────────────────────────────────────────────────────────────

func TestNewNormalizedSignal_NotNil(t *testing.T) {
	res := incidents.KubeResourceRef{Kind: "Pod", Name: "p", Namespace: "ns"}
	s := incidents.NewNormalizedSignal(incidents.SourceKubeEvent, res, "test message")
	if s == nil {
		t.Fatal("NewNormalizedSignal returned nil")
	}
}

func TestNewNormalizedSignal_FieldsSet(t *testing.T) {
	res := incidents.KubeResourceRef{Kind: "Pod", Name: "api-pod", Namespace: "default"}
	s := incidents.NewNormalizedSignal(incidents.SourcePodStatus, res, "pod is running")

	if s.Source != incidents.SourcePodStatus {
		t.Errorf("Source = %q, want %q", s.Source, incidents.SourcePodStatus)
	}
	if s.Resource.Name != "api-pod" {
		t.Errorf("Resource.Name = %q, want api-pod", s.Resource.Name)
	}
	if s.Message != "pod is running" {
		t.Errorf("Message = %q, want 'pod is running'", s.Message)
	}
	if s.ID == "" {
		t.Error("ID should not be empty")
	}
	if s.Timestamp.IsZero() {
		t.Error("Timestamp should not be zero")
	}
	if s.Attributes == nil {
		t.Error("Attributes should be initialized, not nil")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// NormalizedSignal.SetAttribute / GetAttribute / HasAttribute
// ─────────────────────────────────────────────────────────────────────────────

func TestSetAttribute_SetsValue(t *testing.T) {
	s := &incidents.NormalizedSignal{}
	result := s.SetAttribute("key", "value")
	if result != s {
		t.Error("SetAttribute should return self for chaining")
	}
	if s.Attributes["key"] != "value" {
		t.Errorf("Attributes[key] = %q, want value", s.Attributes["key"])
	}
}

func TestSetAttribute_InitializesNilMap(t *testing.T) {
	s := &incidents.NormalizedSignal{}
	s.SetAttribute("k", "v")
	if s.Attributes == nil {
		t.Error("SetAttribute should initialize nil Attributes map")
	}
}

func TestGetAttribute_Found(t *testing.T) {
	s := &incidents.NormalizedSignal{Attributes: map[string]string{"pod_phase": "Running"}}
	got := s.GetAttribute("pod_phase")
	if got != "Running" {
		t.Errorf("GetAttribute = %q, want Running", got)
	}
}

func TestGetAttribute_NotFound(t *testing.T) {
	s := &incidents.NormalizedSignal{Attributes: map[string]string{}}
	got := s.GetAttribute("missing_key")
	if got != "" {
		t.Errorf("GetAttribute(missing) = %q, want empty", got)
	}
}

func TestGetAttribute_NilAttributes(t *testing.T) {
	s := &incidents.NormalizedSignal{}
	got := s.GetAttribute("key")
	if got != "" {
		t.Errorf("GetAttribute on nil Attributes = %q, want empty", got)
	}
}

func TestHasAttribute_True(t *testing.T) {
	s := &incidents.NormalizedSignal{Attributes: map[string]string{"exit_code": "137"}}
	if !s.HasAttribute("exit_code") {
		t.Error("HasAttribute(exit_code) should be true")
	}
}

func TestHasAttribute_False(t *testing.T) {
	s := &incidents.NormalizedSignal{Attributes: map[string]string{}}
	if s.HasAttribute("missing") {
		t.Error("HasAttribute(missing) should be false")
	}
}

func TestHasAttribute_NilAttributes(t *testing.T) {
	s := &incidents.NormalizedSignal{}
	if s.HasAttribute("any") {
		t.Error("HasAttribute on nil Attributes should return false")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SignalSource constants
// ─────────────────────────────────────────────────────────────────────────────

func TestSignalSourceConstants_NonEmpty(t *testing.T) {
	sources := []incidents.SignalSource{
		incidents.SourceKubeEvent, incidents.SourcePodLog, incidents.SourcePodStatus,
		incidents.SourceMetric, incidents.SourceProbe, incidents.SourceController,
	}
	for _, s := range sources {
		if s == "" {
			t.Error("SignalSource constant should not be empty")
		}
	}
}

func TestSignalSourceConstants_Unique(t *testing.T) {
	sources := []incidents.SignalSource{
		incidents.SourceKubeEvent, incidents.SourcePodLog, incidents.SourcePodStatus,
		incidents.SourceMetric, incidents.SourceProbe, incidents.SourceController,
	}
	seen := make(map[incidents.SignalSource]bool)
	for _, s := range sources {
		if seen[s] {
			t.Errorf("duplicate SignalSource: %q", s)
		}
		seen[s] = true
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SignalBatch
// ─────────────────────────────────────────────────────────────────────────────

func TestNewSignalBatch_NotNil(t *testing.T) {
	b := incidents.NewSignalBatch("prod-cluster")
	if b == nil {
		t.Fatal("NewSignalBatch returned nil")
	}
}

func TestNewSignalBatch_Fields(t *testing.T) {
	b := incidents.NewSignalBatch("prod-cluster")
	if b.ClusterContext != "prod-cluster" {
		t.Errorf("ClusterContext = %q, want prod-cluster", b.ClusterContext)
	}
	if b.Signals == nil {
		t.Error("Signals should be initialized")
	}
	if b.CollectedAt.IsZero() {
		t.Error("CollectedAt should not be zero")
	}
}

func TestSignalBatch_Add_Size(t *testing.T) {
	b := incidents.NewSignalBatch("test")
	if b.Size() != 0 {
		t.Errorf("initial Size() = %d, want 0", b.Size())
	}
	b.Add(&incidents.NormalizedSignal{ID: "s1"})
	b.Add(&incidents.NormalizedSignal{ID: "s2"})
	if b.Size() != 2 {
		t.Errorf("Size() after 2 Add = %d, want 2", b.Size())
	}
}

func TestSignalBatch_GroupByResource(t *testing.T) {
	b := incidents.NewSignalBatch("test")
	res1 := incidents.KubeResourceRef{Kind: "Pod", Name: "pod-a", Namespace: "ns"}
	res2 := incidents.KubeResourceRef{Kind: "Pod", Name: "pod-b", Namespace: "ns"}
	b.Add(&incidents.NormalizedSignal{Resource: res1})
	b.Add(&incidents.NormalizedSignal{Resource: res1})
	b.Add(&incidents.NormalizedSignal{Resource: res2})

	groups := b.GroupByResource()
	if len(groups) != 2 {
		t.Errorf("GroupByResource() = %d groups, want 2", len(groups))
	}
	key1 := res1.String()
	if len(groups[key1]) != 2 {
		t.Errorf("pod-a group = %d signals, want 2", len(groups[key1]))
	}
}

func TestSignalBatch_FilterBySource(t *testing.T) {
	b := incidents.NewSignalBatch("test")
	b.Add(&incidents.NormalizedSignal{Source: incidents.SourceKubeEvent, ID: "e1"})
	b.Add(&incidents.NormalizedSignal{Source: incidents.SourceKubeEvent, ID: "e2"})
	b.Add(&incidents.NormalizedSignal{Source: incidents.SourcePodLog, ID: "l1"})

	events := b.FilterBySource(incidents.SourceKubeEvent)
	if len(events) != 2 {
		t.Errorf("FilterBySource(event) = %d, want 2", len(events))
	}

	logs := b.FilterBySource(incidents.SourcePodLog)
	if len(logs) != 1 {
		t.Errorf("FilterBySource(log) = %d, want 1", len(logs))
	}
}

func TestSignalBatch_FilterBySource_Empty(t *testing.T) {
	b := incidents.NewSignalBatch("test")
	result := b.FilterBySource(incidents.SourceMetric)
	if len(result) != 0 {
		t.Errorf("FilterBySource on empty batch = %d, want 0", len(result))
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Attribute key constants
// ─────────────────────────────────────────────────────────────────────────────

func TestAttributeKeyConstants_NonEmpty(t *testing.T) {
	keys := []string{
		incidents.AttrEventType, incidents.AttrEventReason, incidents.AttrEventCount,
		incidents.AttrLogLevel, incidents.AttrLogContainer, incidents.AttrHTTPStatus,
		incidents.AttrPodPhase, incidents.AttrContainerState, incidents.AttrExitCode, incidents.AttrRestartCount,
		incidents.AttrProbeType, incidents.AttrSeverity, incidents.AttrNamespace,
	}
	for _, k := range keys {
		if k == "" {
			t.Error("attribute key constant should not be empty")
		}
	}
}
