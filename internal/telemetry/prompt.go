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

package telemetry

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"time"

	"golang.org/x/term"
)

const (
	// PromptTimeout is the timeout for user response (10 seconds)
	PromptTimeout = 10 * time.Second
)

// IsInteractiveTerminal checks if we're running in an interactive terminal
func IsInteractiveTerminal() bool {
	// Check if stdin is a terminal
	return term.IsTerminal(int(os.Stdin.Fd()))
}

// PromptUser prompts the user for telemetry consent.
// Returns true if user opts in, false if user declines or times out.
// This function ONLY runs in interactive terminals.
func PromptUser() bool {
	// Never prompt in non-interactive shells
	if !IsInteractiveTerminal() {
		return false // Default to NO
	}

	fmt.Println()
	fmt.Println("╭─────────────────────────────────────────────────────────────╮")
	fmt.Println("│                    Help improve KubeGraf?                   │")
	fmt.Println("╰─────────────────────────────────────────────────────────────╯")
	fmt.Println()
	fmt.Println("  Send anonymous install metadata (version, OS, install method).")
	fmt.Println("  No cluster data. No commands. No identifiers.")
	fmt.Println()
	fmt.Print("  [Y] Yes   [N] No (default)   ")

	// Channel to receive user input
	responseChan := make(chan string, 1)

	// Goroutine to read user input
	go func() {
		reader := bufio.NewReader(os.Stdin)
		input, err := reader.ReadString('\n')
		if err != nil {
			responseChan <- ""
			return
		}
		responseChan <- strings.TrimSpace(input)
	}()

	// Wait for user input or timeout
	select {
	case response := <-responseChan:
		fmt.Println() // New line after input
		response = strings.ToLower(response)
		if response == "y" || response == "yes" {
			fmt.Println("  ✓ Thank you! Anonymous telemetry enabled.")
			fmt.Println("  You can disable it anytime with: kubegraf telemetry disable")
			fmt.Println()
			return true
		}
		fmt.Println("  ✓ Telemetry disabled. You can enable it later with: kubegraf telemetry enable")
		fmt.Println()
		return false

	case <-time.After(PromptTimeout):
		fmt.Println()
		fmt.Println("  ⏱  Timeout. Telemetry disabled (default).")
		fmt.Println("  You can enable it later with: kubegraf telemetry enable")
		fmt.Println()
		return false
	}
}

// HandleFirstRun handles the first-run experience.
// It prompts the user for telemetry consent and records the decision.
// Returns true if telemetry should be sent, false otherwise.
func HandleFirstRun() bool {
	// Check if this is truly the first run
	if !IsFirstRun() {
		return false // Decision already made
	}

	// Prompt user for consent
	enabled := PromptUser()

	// Record the decision
	if err := RecordDecision(enabled); err != nil {
		// Failed to save decision, but don't block startup
		// Default to disabled (safe choice)
		return false
	}

	return enabled
}
