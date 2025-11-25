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
	"sort"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/watch"
)

// updateLoop periodically updates the display
func (a *App) updateLoop() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-a.stopCh:
			return
		case <-ticker.C:
			if a.isInitialized {
				a.refreshCurrentTab()
				a.updateStatusBar()
			}
		}
	}
}

// watchEvents watches for Kubernetes events
func (a *App) watchEvents() {
	for {
		select {
		case <-a.stopCh:
			return
		default:
			watcher, err := a.clientset.CoreV1().Events(a.namespace).Watch(a.ctx, metav1.ListOptions{})
			if err != nil {
				time.Sleep(5 * time.Second)
				continue
			}

			for event := range watcher.ResultChan() {
				if event.Type == watch.Added || event.Type == watch.Modified {
					if ev, ok := event.Object.(*corev1.Event); ok {
						a.addEvent(Event{
							Time:      ev.LastTimestamp.Time,
							Type:      ev.Type,
							Reason:    ev.Reason,
							Object:    fmt.Sprintf("%s/%s", ev.InvolvedObject.Kind, ev.InvolvedObject.Name),
							Message:   ev.Message,
							Namespace: ev.Namespace,
						})
					}
				}
			}
		}
	}
}

// addEvent adds an event to the log
func (a *App) addEvent(event Event) {
	a.eventsMux.Lock()
	defer a.eventsMux.Unlock()

	a.events = append(a.events, event)
	if len(a.events) > 1000 {
		a.events = a.events[len(a.events)-1000:]
	}

	a.updateEventBar()
}

// updateEventBar updates the event bar
func (a *App) updateEventBar() {
	a.eventsMux.Lock()
	defer a.eventsMux.Unlock()

	// Sort events by time (newest first)
	sort.Slice(a.events, func(i, j int) bool {
		return a.events[i].Time.After(a.events[j].Time)
	})

	if len(a.events) > 0 {
		event := a.events[0]
		icon, color := getEventIcon(event.Type)
		message := event.Message
		if len(message) > 50 {
			message = message[:47] + "..."
		}

		text := fmt.Sprintf("[gray]Event:[-] [%s]%s %s %s[-] [gray]%s[-]",
			color, icon, event.Time.Format("15:04"), event.Object, message)
		a.app.QueueUpdateDraw(func() {
			a.eventBar.SetText(text)
		})
	}
}
