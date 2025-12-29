// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Package telemetry provides opt-in, privacy-preserving install tracking for KubeGraf.
// It implements a one-time, first-run prompt for user consent.
// NO cluster data, NO commands, NO identifiers are ever collected.
package telemetry

import (
	"encoding/json"
	"os"
	"path/filepath"
)

const (
	// ConfigFileName is the name of the config file
	ConfigFileName = "config.json"

	// TransparencyMessage is shown to users about telemetry
	TransparencyMessage = `Anonymous telemetry helps us understand adoption and improve KubeGraf.
No cluster data, commands, or personal information is ever collected.`
)

// Config represents the telemetry configuration stored locally
type Config struct {
	Telemetry TelemetryConfig `json:"telemetry"`
}

// TelemetryConfig holds the telemetry decision
type TelemetryConfig struct {
	Decided bool `json:"decided"` // Has the user made a decision?
	Enabled bool `json:"enabled"` // Did the user opt-in?
}

// GetConfigPath returns the path to the config file
func GetConfigPath() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	kubegrafDir := filepath.Join(homeDir, ".kubegraf")
	if err := os.MkdirAll(kubegrafDir, 0755); err != nil {
		return "", err
	}

	return filepath.Join(kubegrafDir, ConfigFileName), nil
}

// LoadConfig loads the telemetry config from disk
func LoadConfig() (*Config, error) {
	configPath, err := GetConfigPath()
	if err != nil {
		return nil, err
	}

	// If file doesn't exist, return default (undecided)
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		return &Config{
			Telemetry: TelemetryConfig{
				Decided: false,
				Enabled: false, // Default to NO
			},
		}, nil
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, err
	}

	var config Config
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, err
	}

	return &config, nil
}

// SaveConfig saves the telemetry config to disk
func SaveConfig(config *Config) error {
	configPath, err := GetConfigPath()
	if err != nil {
		return err
	}

	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(configPath, data, 0644)
}

// IsFirstRun checks if this is the first run (telemetry decision not made)
func IsFirstRun() bool {
	config, err := LoadConfig()
	if err != nil {
		// On error, treat as first run (safe default)
		return true
	}

	return !config.Telemetry.Decided
}

// RecordDecision records the user's telemetry decision
func RecordDecision(enabled bool) error {
	config := &Config{
		Telemetry: TelemetryConfig{
			Decided: true,
			Enabled: enabled,
		},
	}

	return SaveConfig(config)
}

// IsEnabled returns true if telemetry is enabled
func IsEnabled() bool {
	config, err := LoadConfig()
	if err != nil {
		return false // Default to disabled on error
	}

	return config.Telemetry.Decided && config.Telemetry.Enabled
}
