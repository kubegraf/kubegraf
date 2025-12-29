//go:build !windows
// +build !windows

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

package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

// handleWindowsConPTYTerminal is a stub for non-Windows platforms
// This function should never be called on Unix-like systems since
// handleLocalTerminalWS checks for runtime.GOOS == "windows" before calling this
func (ws *WebServer) handleWindowsConPTYTerminal(conn *websocket.Conn, r *http.Request) {
	err := fmt.Errorf("Windows ConPTY terminal is not available on this platform")
	log.Printf("ERROR: %v", err)
	conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31m%v\x1b[0m\r\n", err)))
	conn.Close()
}
