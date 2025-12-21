// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"sync"
	"time"

	"github.com/kubegraf/kubegraf/pkg/incidents"
)

// IncidentCache provides caching for incident-related data
type IncidentCache struct {
	// V1 incidents cache (keyed by namespace, empty string = all namespaces)
	v1Incidents     map[string][]KubernetesIncident
	v1IncidentsTime map[string]time.Time
	v1Mu            sync.RWMutex
	v1TTL           time.Duration

	// Converted v2 incidents cache (keyed by incident ID)
	v2Incidents     map[string]*incidents.Incident
	v2IncidentsTime map[string]time.Time
	v2Mu            sync.RWMutex
	v2TTL           time.Duration

	// Evidence packs cache (keyed by incident ID)
	evidencePacks     map[string]*incidents.EvidencePack
	evidencePacksTime map[string]time.Time
	evidenceMu      sync.RWMutex
	evidenceTTL        time.Duration

	// Citations cache (keyed by incident ID)
	citations     map[string][]map[string]interface{}
	citationsTime map[string]time.Time
	citationsMu   sync.RWMutex
	citationsTTL  time.Duration

	// Runbooks cache (keyed by pattern)
	runbooks     map[string][]map[string]interface{}
	runbooksTime map[string]time.Time
	runbooksMu   sync.RWMutex
	runbooksTTL  time.Duration
}

// NewIncidentCache creates a new incident cache
func NewIncidentCache() *IncidentCache {
	return &IncidentCache{
		v1Incidents:      make(map[string][]KubernetesIncident),
		v1IncidentsTime:  make(map[string]time.Time),
		v1TTL:            30 * time.Second, // Cache v1 incidents for 30 seconds
		v2Incidents:      make(map[string]*incidents.Incident),
		v2IncidentsTime:  make(map[string]time.Time),
		v2TTL:            5 * time.Minute, // Cache converted incidents for 5 minutes
		evidencePacks:    make(map[string]*incidents.EvidencePack),
		evidencePacksTime: make(map[string]time.Time),
		evidenceTTL:      2 * time.Minute, // Cache evidence for 2 minutes
		citations:        make(map[string][]map[string]interface{}),
		citationsTime:    make(map[string]time.Time),
		citationsTTL:     5 * time.Minute, // Cache citations for 5 minutes
		runbooks:         make(map[string][]map[string]interface{}),
		runbooksTime:     make(map[string]time.Time),
		runbooksTTL:      10 * time.Minute, // Cache runbooks for 10 minutes (they rarely change)
	}
}

// GetV1Incidents gets v1 incidents from cache or returns nil if not cached/expired
func (c *IncidentCache) GetV1Incidents(namespace string) []KubernetesIncident {
	c.v1Mu.RLock()
	defer c.v1Mu.RUnlock()

	key := namespace
	if time.Since(c.v1IncidentsTime[key]) < c.v1TTL {
		return c.v1Incidents[key]
	}
	return nil
}

// SetV1Incidents caches v1 incidents
func (c *IncidentCache) SetV1Incidents(namespace string, incidents []KubernetesIncident) {
	c.v1Mu.Lock()
	defer c.v1Mu.Unlock()

	key := namespace
	c.v1Incidents[key] = incidents
	c.v1IncidentsTime[key] = time.Now()
}

// GetV2Incident gets a converted v2 incident from cache
func (c *IncidentCache) GetV2Incident(incidentID string) *incidents.Incident {
	c.v2Mu.RLock()
	defer c.v2Mu.RUnlock()

	if time.Since(c.v2IncidentsTime[incidentID]) < c.v2TTL {
		return c.v2Incidents[incidentID]
	}
	return nil
}

// SetV2Incident caches a converted v2 incident
func (c *IncidentCache) SetV2Incident(incidentID string, incident *incidents.Incident) {
	c.v2Mu.Lock()
	defer c.v2Mu.Unlock()

	c.v2Incidents[incidentID] = incident
	c.v2IncidentsTime[incidentID] = time.Now()
}

// GetEvidencePack gets an evidence pack from cache
func (c *IncidentCache) GetEvidencePack(incidentID string) *incidents.EvidencePack {
	c.evidenceMu.RLock()
	defer c.evidenceMu.RUnlock()

	if time.Since(c.evidencePacksTime[incidentID]) < c.evidenceTTL {
		return c.evidencePacks[incidentID]
	}
	return nil
}

// SetEvidencePack caches an evidence pack
func (c *IncidentCache) SetEvidencePack(incidentID string, pack *incidents.EvidencePack) {
	c.evidenceMu.Lock()
	defer c.evidenceMu.Unlock()

	c.evidencePacks[incidentID] = pack
	c.evidencePacksTime[incidentID] = time.Now()
}

// GetCitations gets citations from cache
func (c *IncidentCache) GetCitations(incidentID string) []map[string]interface{} {
	c.citationsMu.RLock()
	defer c.citationsMu.RUnlock()

	if time.Since(c.citationsTime[incidentID]) < c.citationsTTL {
		return c.citations[incidentID]
	}
	return nil
}

// SetCitations caches citations
func (c *IncidentCache) SetCitations(incidentID string, citations []map[string]interface{}) {
	c.citationsMu.Lock()
	defer c.citationsMu.Unlock()

	c.citations[incidentID] = citations
	c.citationsTime[incidentID] = time.Now()
}

// GetRunbooks gets runbooks from cache
func (c *IncidentCache) GetRunbooks(pattern string) []map[string]interface{} {
	c.runbooksMu.RLock()
	defer c.runbooksMu.RUnlock()

	if time.Since(c.runbooksTime[pattern]) < c.runbooksTTL {
		return c.runbooks[pattern]
	}
	return nil
}

// SetRunbooks caches runbooks
func (c *IncidentCache) SetRunbooks(pattern string, runbooks []map[string]interface{}) {
	c.runbooksMu.Lock()
	defer c.runbooksMu.Unlock()

	c.runbooks[pattern] = runbooks
	c.runbooksTime[pattern] = time.Now()
}

// Clear clears all caches (useful for testing or manual refresh)
func (c *IncidentCache) Clear() {
	c.v1Mu.Lock()
	c.v1Incidents = make(map[string][]KubernetesIncident)
	c.v1IncidentsTime = make(map[string]time.Time)
	c.v1Mu.Unlock()

	c.v2Mu.Lock()
	c.v2Incidents = make(map[string]*incidents.Incident)
	c.v2IncidentsTime = make(map[string]time.Time)
	c.v2Mu.Unlock()

	c.evidenceMu.Lock()
	c.evidencePacks = make(map[string]*incidents.EvidencePack)
	c.evidencePacksTime = make(map[string]time.Time)
	c.evidenceMu.Unlock()

	c.citationsMu.Lock()
	c.citations = make(map[string][]map[string]interface{})
	c.citationsTime = make(map[string]time.Time)
	c.citationsMu.Unlock()

	c.runbooksMu.Lock()
	c.runbooks = make(map[string][]map[string]interface{})
	c.runbooksTime = make(map[string]time.Time)
	c.runbooksMu.Unlock()
}

