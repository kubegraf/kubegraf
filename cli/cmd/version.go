// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License")
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

package cli

import (
	"encoding/json"
	"fmt"
	"os"
	"runtime"

	"github.com/fatih/color"
	"github.com/spf13/cobra"
)

var (
	versionOutput string
)

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print version information",
	Long: `Print version information for KubeGraf.

Examples:
  kubegraf version
  kubegraf version --output json`,
	RunE: runVersion,
}

func init() {
	versionCmd.Flags().StringVarP(&versionOutput, "output", "o", "text", "Output format (text|json)")
}

// cliVersion is the version string for the CLI command
// This should be set via ldflags: -ldflags "-X github.com/kubegraf/kubegraf/cmd/cli.cliVersion=1.7.54"
// If not set, it defaults to the same version as main.version
// For consistency, use the same version as main: -ldflags "-X main.version=1.7.54 -X github.com/kubegraf/kubegraf/cmd/cli.cliVersion=1.7.54"
var cliVersion = "1.7.54" // Default matches version.go Version constant

// getVersionString returns the version string
func getVersionString() string {
	// If cliVersion was set via ldflags and is not the default, use it
	// Otherwise, return the default which matches main.Version constant
	return cliVersion
}

func runVersion(cmd *cobra.Command, args []string) error {
	version := getVersionString()
	buildInfo := map[string]string{
		"version": version,
		"go":      runtime.Version(),
		"os":      runtime.GOOS,
		"arch":    runtime.GOARCH,
	}

	if versionOutput == "json" {
		encoder := json.NewEncoder(os.Stdout)
		encoder.SetIndent("", "  ")
		return encoder.Encode(buildInfo)
	}

	// Color definitions
	headerColor := color.New(color.Bold, color.FgCyan)
	labelColor := color.New(color.Bold, color.FgCyan)
	valueColor := color.New(color.FgWhite)
	versionColor := color.New(color.FgGreen, color.Bold)

	headerColor.Println("═══════════════════════════════════════════════════════════════════════════════")
	headerColor.Println("KUBEGRAF VERSION")
	headerColor.Println("═══════════════════════════════════════════════════════════════════════════════")
	fmt.Println()

	labelColor.Print("Version:    ")
	versionColor.Printf("%s\n", version)
	labelColor.Print("Go:         ")
	valueColor.Println(runtime.Version())
	labelColor.Print("OS/Arch:    ")
	valueColor.Printf("%s/%s\n", runtime.GOOS, runtime.GOARCH)

	return nil
}
