// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

package feast

// FeastStatus represents the status of Feast installation
type FeastStatus struct {
	Installed    bool   `json:"installed"`
	Version      string `json:"version,omitempty"`
	Namespace    string `json:"namespace,omitempty"`
	OnlineStore  string `json:"onlineStore,omitempty"`  // redis, bigquery
	OfflineStore string `json:"offlineStore,omitempty"` // file, pvc, bigquery, snowflake
	ServingURL   string `json:"servingURL,omitempty"`
	RegistryURL  string `json:"registryURL,omitempty"`
}

// FeastInstallRequest represents a request to install Feast
type FeastInstallRequest struct {
	Namespace    string            `json:"namespace"`
	Version      string            `json:"version,omitempty"`
	OnlineStore  *OnlineStoreSpec  `json:"onlineStore"`
	OfflineStore *OfflineStoreSpec `json:"offlineStore"`
	CPU          string            `json:"cpu,omitempty"`
	Memory       string            `json:"memory,omitempty"`
}

// OnlineStoreSpec defines online store configuration
type OnlineStoreSpec struct {
	Type     string            `json:"type"` // redis, bigquery
	Redis     *RedisConfig     `json:"redis,omitempty"`
	BigQuery  *BigQueryConfig  `json:"bigquery,omitempty"`
}

// OfflineStoreSpec defines offline store configuration
type OfflineStoreSpec struct {
	Type      string            `json:"type"` // file, pvc, bigquery, snowflake
	File      *FileStoreConfig  `json:"file,omitempty"`
	PVC       *PVCConfig       `json:"pvc,omitempty"`
	BigQuery  *BigQueryConfig  `json:"bigquery,omitempty"`
	Snowflake *SnowflakeConfig `json:"snowflake,omitempty"`
}

// RedisConfig defines Redis configuration
type RedisConfig struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Password string `json:"password,omitempty"`
	Database int    `json:"database,omitempty"`
}

// BigQueryConfig defines BigQuery configuration
type BigQueryConfig struct {
	ProjectID string `json:"projectId"`
	Dataset   string `json:"dataset"`
	Credentials string `json:"credentials,omitempty"` // Base64 encoded service account JSON
}

// FileStoreConfig defines file-based store configuration
type FileStoreConfig struct {
	Path string `json:"path"` // /data/feast
}

// PVCConfig defines PVC-based store configuration
type PVCConfig struct {
	PVCName   string `json:"pvcName"`
	MountPath string `json:"mountPath"`
}

// SnowflakeConfig defines Snowflake configuration
type SnowflakeConfig struct {
	Account   string `json:"account"`
	Database  string `json:"database"`
	Schema    string `json:"schema"`
	Warehouse string `json:"warehouse"`
	Username  string `json:"username"`
	Password  string `json:"password,omitempty"`
}

// FeastEntity represents a Feast entity
type FeastEntity struct {
	Name        string            `json:"name"`
	ValueType   string            `json:"valueType"`
	Description string            `json:"description,omitempty"`
	Tags        map[string]string `json:"tags,omitempty"`
}

// FeastFeature represents a Feast feature
type FeastFeature struct {
	Name        string            `json:"name"`
	ValueType   string            `json:"valueType"`
	Description string            `json:"description,omitempty"`
	Entity      string            `json:"entity"`
	Tags        map[string]string `json:"tags,omitempty"`
}

// FeastFeatureView represents a Feast feature view
type FeastFeatureView struct {
	Name        string   `json:"name"`
	Features    []string `json:"features"`
	Description string   `json:"description,omitempty"`
}

