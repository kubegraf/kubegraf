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
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var tuiCmd = &cobra.Command{
	Use:   "tui",
	Short: "Launch terminal UI (EXPERIMENTAL)",
	Long: `Launch the terminal UI (TUI) for KubeGraf.

⚠️  EXPERIMENTAL: TUI is not part of v1 stability guarantee.

This command launches the interactive terminal UI. For production use,
consider using the web UI instead: kubegraf web

Examples:
  kubegraf tui
  kubegraf tui production`,
	RunE: runTUI,
}

func init() {
	// TUI command is registered in root.go
}

func runTUI(cmd *cobra.Command, args []string) error {
	fmt.Fprintf(os.Stderr, "⚠️  EXPERIMENTAL: TUI is not part of v1 stability guarantee.\n\n")
	fmt.Fprintf(os.Stderr, "The TUI command should be handled by main.go before reaching Cobra.\n")
	fmt.Fprintf(os.Stderr, "If you see this message, there's a routing issue.\n")
	return fmt.Errorf("TUI command should be handled in main.go")
}
