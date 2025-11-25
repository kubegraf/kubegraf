package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"sort"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/fatih/color"
	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
	"gopkg.in/yaml.v2"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	metricsclientset "k8s.io/metrics/pkg/client/clientset/versioned"
)

// Unicode status icons (k9s + argo-rollouts style)
const (
	IconOK          = "✔"
	IconBad         = "✖"
	IconWarning     = "⚠"
	IconProgressing = "◌"
	IconPaused      = "॥"
	IconUnknown     = "?"
	IconPending     = "◷"

	// Resource icons
	IconPod         = "🎯"
	IconDeployment  = "🚀"
	IconService     = "🌐"
	IconIngress     = "🚪"
	IconConfigMap   = "⚙️"
	IconSecret      = "🔐"

	// Relationship indicator
	IconArrow       = "►"
)

// App represents the main application
type App struct {
	app            *tview.Application
	pages          *tview.Pages
	table          *tview.Table
	tabBar         *tview.TextView
	statusBar      *tview.TextView
	metricsBar     *tview.TextView
	eventBar       *tview.TextView
	helpBar        *tview.TextView
	yamlView       *tview.TextView
	clientset      *kubernetes.Clientset
	metricsClient  *metricsclientset.Clientset
	namespace      string
	cluster        string
	currentTab     int
	tabs           []string
	selectedRow    int
	events         []Event
	eventsMux      sync.Mutex
	stopCh         chan struct{}
	ctx            context.Context
	cancel         context.CancelFunc
	tableData      *TableData
	isInitialized  bool
}

// TableData holds the current table information
type TableData struct {
	Headers []string
	Rows    [][]string
	RowIDs  []string // Full resource paths for operations
	mx      sync.RWMutex
}

// Event represents a Kubernetes event
type Event struct {
	Time      time.Time
	Type      string
	Reason    string
	Object    string
	Message   string
	Namespace string
}

// Resource types
const (
	ResourcePod        = "Pods"
	ResourceDeployment = "Deployments"
	ResourceService    = "Services"
	ResourceIngress    = "Ingresses"
	ResourceConfigMap  = "ConfigMaps"
	ResourceSecret     = "Secrets"
)

func main() {
	// Show splash screen
	showSplash()

	// Suppress verbose Kubernetes client logs
	os.Setenv("KUBE_LOG_LEVEL", "0")

	// Check for flags
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "--version", "-v":
			fmt.Println("KubeGraf v2.0.0 - Advanced Kubernetes Visualization")
			return
		case "--help", "-h":
			printHelp()
			return
		}
	}

	// Parse namespace
	namespace := "default"
	if len(os.Args) > 1 && !strings.HasPrefix(os.Args[1], "--") {
		namespace = os.Args[1]
	}

	// Create and initialize application
	app := NewApp(namespace)
	if err := app.Initialize(); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to initialize: %v\n", err)
		os.Exit(1)
	}

	// Run application
	if err := app.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Application error: %v\n", err)
		os.Exit(1)
	}
}

func showSplash() {
	// Clear screen
	fmt.Print("\033[H\033[2J")

	// ASCII art logo
	logo := `
  ██╗  ██╗██╗   ██╗██████╗ ███████╗ ██████╗ ██████╗  █████╗ ███████╗
  ██║ ██╔╝██║   ██║██╔══██╗██╔════╝██╔════╝ ██╔══██╗██╔══██╗██╔════╝
  █████╔╝ ██║   ██║██████╔╝█████╗  ██║  ███╗██████╔╝███████║█████╗
  ██╔═██╗ ██║   ██║██╔══██╗██╔══╝  ██║   ██║██╔══██╗██╔══██║██╔══╝
  ██║  ██╗╚██████╔╝██████╔╝███████╗╚██████╔╝██║  ██║██║  ██║██║
  ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝
`

	// Blue color
	blue := color.New(color.FgCyan, color.Bold)
	white := color.New(color.FgWhite)

	blue.Println(logo)
	fmt.Println()
	white.Println("                    Advanced Kubernetes Visualization Tool")
	blue.Println("                              Version 2.0.0")
	fmt.Println()
	white.Println("                          Initializing...")

	// Brief pause to show splash
	time.Sleep(1500 * time.Millisecond)

	// Clear screen again
	fmt.Print("\033[H\033[2J")
}

func printHelp() {
	fmt.Println(`KubeGraf v2.0.0 - Advanced Kubernetes Visualization Tool

USAGE:
  kubegraf [namespace] [flags]

KEYBOARD SHORTCUTS:
  q, Ctrl+C    Quit application
  r            Refresh resources
  n            Change namespace
  Tab, ←/→     Switch tabs (Tab/Shift+Tab or arrow keys)
  ↑/↓, j/k     Navigate rows
  Enter        View YAML
  d            Describe resource
  s            Shell into pod
  Ctrl+D       Delete resource (with confirmation)
  ?            Show help

FEATURES:
  • Real-time resource monitoring with live updates
  • Pod details: IP, restarts, uptime, CPU/MEM usage
  • Resource relationships: Ingress ► Service ► Pod
  • YAML viewing with syntax highlighting
  • Shell access to running pods
  • Safe delete operations with confirmation
  • Comprehensive describe functionality
  • Multi-cluster support`)
}

// NewApp creates a new application instance
func NewApp(namespace string) *App {
	ctx, cancel := context.WithCancel(context.Background())

	return &App{
		namespace:  namespace,
		events:     make([]Event, 0, 1000),
		stopCh:     make(chan struct{}),
		ctx:        ctx,
		cancel:     cancel,
		tableData:  &TableData{},
		tabs:       []string{ResourcePod, ResourceDeployment, ResourceService, ResourceIngress, ResourceConfigMap, ResourceSecret},
		currentTab: 0, // Default to Pods
	}
}

// Initialize sets up the application
func (a *App) Initialize() error {
	// Load kubeconfig
	loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
	configOverrides := &clientcmd.ConfigOverrides{}
	kubeConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, configOverrides)

	config, err := kubeConfig.ClientConfig()
	if err != nil {
		return fmt.Errorf("failed to load kubeconfig: %w", err)
	}

	// Create clientset
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return fmt.Errorf("failed to create clientset: %w", err)
	}
	a.clientset = clientset

	// Create metrics client
	metricsClient, err := metricsclientset.NewForConfig(config)
	if err == nil {
		a.metricsClient = metricsClient
	}

	// Get current context
	rawConfig, err := kubeConfig.RawConfig()
	if err != nil {
		return fmt.Errorf("failed to get raw config: %w", err)
	}
	a.cluster = rawConfig.CurrentContext

	// Setup UI
	a.setupUI()

	return nil
}

// setupUI creates the user interface
func (a *App) setupUI() {
	a.app = tview.NewApplication()
	a.pages = tview.NewPages()

	// Create tab bar
	a.tabBar = tview.NewTextView().
		SetDynamicColors(true).
		SetTextAlign(tview.AlignLeft)
	a.updateTabBar()

	// Create status bar (cluster info - top right)
	a.statusBar = tview.NewTextView().
		SetDynamicColors(true).
		SetTextAlign(tview.AlignRight)
	a.updateStatusBar()

	// Create main table (k9s style)
	a.table = tview.NewTable().
		SetBorders(false).
		SetSelectable(true, false).
		SetFixed(1, 0). // Fixed header row
		SetSeparator('│')
	a.table.SetBorder(true)


	// Create metrics bar (bottom left)
	a.metricsBar = tview.NewTextView().
		SetDynamicColors(true).
		SetTextAlign(tview.AlignLeft)

	// Create event bar (bottom right)
	a.eventBar = tview.NewTextView().
		SetDynamicColors(true).
		SetTextAlign(tview.AlignRight)

	// Create help bar (bottom)
	a.helpBar = tview.NewTextView().
		SetDynamicColors(true).
		SetTextAlign(tview.AlignLeft)
	a.helpBar.SetText(a.getHelpBar())

	// Create YAML viewer (hidden by default)
	a.yamlView = tview.NewTextView().
		SetDynamicColors(true).
		SetScrollable(true).
		SetWordWrap(true)
	a.yamlView.SetBorder(true).SetTitle(" YAML View (press Esc to close) ")

	// Create header with tabs (left) and cluster info (right)
	headerFlex := tview.NewFlex().SetDirection(tview.FlexColumn).
		AddItem(a.tabBar, 0, 1, false).
		AddItem(a.statusBar, 55, 0, false)

	// Create bottom status line (metrics left, events right)
	statusLine := tview.NewFlex().SetDirection(tview.FlexColumn).
		AddItem(a.metricsBar, 0, 1, false).
		AddItem(a.eventBar, 0, 1, false)

	// Main layout
	mainFlex := tview.NewFlex().SetDirection(tview.FlexRow).
		AddItem(headerFlex, 2, 0, false).
		AddItem(a.table, 0, 1, true).
		AddItem(statusLine, 1, 0, false).
		AddItem(a.helpBar, 1, 0, false)

	a.pages.AddPage("main", mainFlex, true, true)
	a.pages.AddPage("yaml", a.yamlView, true, false)

	// Set root and focus
	a.app.SetRoot(a.pages, true).SetFocus(a.table)

	// Set table selection handler
	a.table.SetSelectionChangedFunc(a.onSelectionChanged)
}

// updateTabBar updates the tab bar display
func (a *App) updateTabBar() {
	var tabText strings.Builder
	tabText.WriteString(" ")

	for i, tab := range a.tabs {
		if i == a.currentTab {
			tabText.WriteString(fmt.Sprintf("[black:cyan:b]« %s »[-:-:-] ", tab))
		} else {
			tabText.WriteString(fmt.Sprintf("[cyan]  %s  [-] ", tab))
		}
	}

	a.tabBar.SetText(tabText.String())
}

// updateStatusBar updates the status bar with cluster info
func (a *App) updateStatusBar() {
	// Start with basic info (non-blocking)
	status := fmt.Sprintf(
		"[cyan::b]Context:[-:-:-] [white]%s[-]\n[cyan::b]NS:[-:-:-] [white]%s[-] [gray]|[-] [cyan::b]Nodes:[-:-:-] [white]-[-] [gray]|[-] [cyan::b]CPU:[-:-:-] [white]-%%[-] [gray]|[-] [cyan::b]MEM:[-:-:-] [white]-%%[-]",
		a.cluster, a.namespace,
	)
	a.statusBar.SetText(status)

	// Update with real metrics in background
	if !a.isInitialized {
		return
	}

	go func() {
		var cpuPercent, memPercent int
		nodeCount := 0

		// Get node count
		nodes, err := a.clientset.CoreV1().Nodes().List(a.ctx, metav1.ListOptions{})
		if err == nil {
			nodeCount = len(nodes.Items)
		}

		// Try to get real metrics
		if a.metricsClient != nil {
			nodeMetrics, err := a.metricsClient.MetricsV1beta1().NodeMetricses().List(a.ctx, metav1.ListOptions{})
			if err == nil && len(nodeMetrics.Items) > 0 {
				var totalCPU, totalMem int64
				for _, nm := range nodeMetrics.Items {
					totalCPU += nm.Usage.Cpu().MilliValue()
					totalMem += nm.Usage.Memory().Value()
				}
				cpuPercent = int(float64(totalCPU) / float64(len(nodeMetrics.Items)*4000))
				memPercent = int(float64(totalMem) / float64(len(nodeMetrics.Items)*8*1024*1024*1024) * 100)
			}
		}

		status := fmt.Sprintf(
			"[cyan::b]Context:[-:-:-] [white]%s[-]\n[cyan::b]NS:[-:-:-] [white]%s[-] [gray]|[-] [cyan::b]Nodes:[-:-:-] [magenta]%d[-] [gray]|[-] [cyan::b]CPU:[-:-:-] [magenta]%d%%[-] [gray]|[-] [cyan::b]MEM:[-:-:-] [magenta]%d%%[-]",
			a.cluster, a.namespace, nodeCount, cpuPercent, memPercent,
		)
		a.app.QueueUpdateDraw(func() {
			a.statusBar.SetText(status)
		})
	}()
}

// getHelpBar returns the help bar text
func (a *App) getHelpBar() string {
	return " [cyan::b]q[-:-:-]Quit  [cyan::b]r[-:-:-]Refresh  [cyan::b]Enter[-:-:-]YAML  [cyan::b]d[-:-:-]Describe  [cyan::b]s[-:-:-]Shell  [cyan::b]1-6/h/l/←→[-:-:-]Tabs  [cyan::b]?[-:-:-]Help"
}

// handleKeyPress handles keyboard input (k9s style)
func (a *App) handleKeyPress(event *tcell.EventKey) *tcell.EventKey {
	key := event.Key()

	// Check if YAML view is open
	if a.pages.HasPage("yaml") {
		name, _ := a.pages.GetFrontPage()
		if name == "yaml" {
			if key == tcell.KeyEscape {
				a.pages.HidePage("yaml")
				a.app.SetFocus(a.table)
				return nil
			}
			return event
		}
	}

	// Pass through up/down for table navigation (k9s pattern)
	if key == tcell.KeyUp || key == tcell.KeyDown {
		return event
	}

	switch key {
	case tcell.KeyTab:
		go func() { a.switchTab(1) }()
		return nil
	case tcell.KeyBacktab:
		go func() { a.switchTab(-1) }()
		return nil
	case tcell.KeyRight:
		go func() { a.switchTab(1) }()
		return nil
	case tcell.KeyLeft:
		go func() { a.switchTab(-1) }()
		return nil
	case tcell.KeyEnter:
		a.viewYAML()
		return nil
	case tcell.KeyCtrlD:
		a.deleteResource()
		return nil
	case tcell.KeyRune:
		// Handle character keys (k9s style - convert rune to key)
		r := event.Rune()
		switch r {
		case 'q', 'Q':
			a.Shutdown()
			return nil
		case 'r', 'R':
			a.refreshCurrentTab()
			return nil
		case 'n', 'N':
			a.changeNamespace()
			return nil
		case 'd', 'D':
			a.describeResource()
			return nil
		case 'h', 'H':
			go func() { a.switchTab(-1) }()
			return nil
		case 'l', 'L':
			go func() { a.switchTab(1) }()
			return nil
		case '1':
			go func() {
				a.currentTab = 0
				a.updateTabBar()
				a.refreshCurrentTab()
			}()
			return nil
		case '2':
			go func() {
				if len(a.tabs) > 1 {
					a.currentTab = 1
					a.updateTabBar()
					a.refreshCurrentTab()
				}
			}()
			return nil
		case '3':
			go func() {
				a.currentTab = 2
				a.updateTabBar()
				a.refreshCurrentTab()
			}()
			return nil
		case '4':
			go func() {
				a.currentTab = 3
				a.updateTabBar()
				a.refreshCurrentTab()
			}()
			return nil
		case '5':
			go func() {
				a.currentTab = 4
				a.updateTabBar()
				a.refreshCurrentTab()
			}()
			return nil
		case '6':
			go func() {
				a.currentTab = 5
				a.updateTabBar()
				a.refreshCurrentTab()
			}()
			return nil
		case 's', 'S':
			a.shellIntoPod()
			return nil
		case '?':
			a.showHelp()
			return nil
		}
	case tcell.KeyCtrlC:
		a.Shutdown()
		return nil
	case tcell.KeyCtrlR:
		a.refreshCurrentTab()
		return nil
	}
	return event
}

// switchTab switches to a different tab
func (a *App) switchTab(direction int) {
	a.currentTab += direction
	if a.currentTab < 0 {
		a.currentTab = len(a.tabs) - 1
	} else if a.currentTab >= len(a.tabs) {
		a.currentTab = 0
	}
	a.updateTabBar()
	a.refreshCurrentTab()
}

// refreshCurrentTab refreshes the current tab
func (a *App) refreshCurrentTab() {
	switch a.tabs[a.currentTab] {
	case ResourcePod:
		a.renderPods()
	case ResourceDeployment:
		a.renderDeployments()
	case ResourceService:
		a.renderServices()
	case ResourceIngress:
		a.renderIngresses()
	case ResourceConfigMap:
		a.renderConfigMaps()
	case ResourceSecret:
		a.renderSecrets()
	}
	a.table.SetTitle(fmt.Sprintf(" %s ", a.tabs[a.currentTab]))
}

// renderPods renders the pods table (k9s style with all details)
func (a *App) renderPods() {
	pods, err := a.clientset.CoreV1().Pods(a.namespace).List(a.ctx, metav1.ListOptions{})
	if err != nil {
		return
	}

	// Get pod metrics if available
	podMetrics := make(map[string]struct {
		CPU int64
		MEM int64
	})
	if a.metricsClient != nil {
		metrics, err := a.metricsClient.MetricsV1beta1().PodMetricses(a.namespace).List(a.ctx, metav1.ListOptions{})
		if err == nil {
			for _, pm := range metrics.Items {
				var totalCPU, totalMEM int64
				for _, c := range pm.Containers {
					totalCPU += c.Usage.Cpu().MilliValue()
					totalMEM += c.Usage.Memory().Value()
				}
				podMetrics[pm.Name] = struct {
					CPU int64
					MEM int64
				}{CPU: totalCPU, MEM: totalMEM}
			}
		}
	}

	// Headers (k9s style)
	headers := []string{"NAME", "READY", "STATUS", "RESTARTS", "CPU", "MEM", "IP", "NODE", "AGE"}
	rows := [][]string{}
	rowIDs := []string{}

	for _, pod := range pods.Items {
		// Calculate ready containers
		readyCount := 0
		totalCount := len(pod.Spec.Containers)
		for _, cs := range pod.Status.ContainerStatuses {
			if cs.Ready {
				readyCount++
			}
		}

		// Calculate total restarts
		restarts := 0
		for _, cs := range pod.Status.ContainerStatuses {
			restarts += int(cs.RestartCount)
		}

		// Get status icon and color
		statusIcon, statusColor := getStatusIcon(string(pod.Status.Phase), readyCount == totalCount)
		status := fmt.Sprintf("[%s]%s %s[-]", statusColor, statusIcon, pod.Status.Phase)

		// Get metrics
		cpuStr := "-"
		memStr := "-"
		if m, ok := podMetrics[pod.Name]; ok {
			cpuStr = fmt.Sprintf("%dm", m.CPU)
			memStr = fmt.Sprintf("%dMi", m.MEM/(1024*1024))
		}

		// Get pod IP
		podIP := pod.Status.PodIP
		if podIP == "" {
			podIP = "-"
		}

		// Get node name
		nodeName := pod.Spec.NodeName
		if nodeName == "" {
			nodeName = "-"
		}

		// Calculate age
		age := time.Since(pod.CreationTimestamp.Time)
		ageStr := formatDuration(age)

		row := []string{
			fmt.Sprintf("[cyan]%s[-]", pod.Name), // Sky blue color for pod names
			fmt.Sprintf("%d/%d", readyCount, totalCount),
			status,
			strconv.Itoa(restarts),
			cpuStr,
			memStr,
			podIP,
			nodeName,
			ageStr,
		}
		rows = append(rows, row)
		rowIDs = append(rowIDs, pod.Name)
	}

	a.updateTable(headers, rows, rowIDs)
}

// renderDeployments renders the deployments table
func (a *App) renderDeployments() {
	deployments, err := a.clientset.AppsV1().Deployments(a.namespace).List(a.ctx, metav1.ListOptions{})
	if err != nil {
		return
	}

	headers := []string{"NAME", "READY", "UP-TO-DATE", "AVAILABLE", "AGE"}
	rows := [][]string{}
	rowIDs := []string{}

	for _, deploy := range deployments.Items {
		ready := fmt.Sprintf("%d/%d", deploy.Status.ReadyReplicas, deploy.Status.Replicas)
		age := formatDuration(time.Since(deploy.CreationTimestamp.Time))

		row := []string{
			fmt.Sprintf("[cyan]%s[-]", deploy.Name), // Bright blue for deployment names
			ready,
			strconv.Itoa(int(deploy.Status.UpdatedReplicas)),
			strconv.Itoa(int(deploy.Status.AvailableReplicas)),
			age,
		}
		rows = append(rows, row)
		rowIDs = append(rowIDs, deploy.Name)
	}

	a.updateTable(headers, rows, rowIDs)
}

// renderServices renders the services table with relationship indicators
func (a *App) renderServices() {
	services, err := a.clientset.CoreV1().Services(a.namespace).List(a.ctx, metav1.ListOptions{})
	if err != nil {
		return
	}

	headers := []string{"NAME", "TYPE", "CLUSTER-IP", "EXTERNAL-IP", "PORTS", "AGE"}
	rows := [][]string{}
	rowIDs := []string{}

	for _, svc := range services.Items {
		// Format ports with kdash-style arrows
		var ports []string
		for _, p := range svc.Spec.Ports {
			portStr := fmt.Sprintf("%s:%d", p.Name, p.Port)
			if p.NodePort != 0 {
				portStr += fmt.Sprintf("%s%d", IconArrow, p.NodePort)
			}
			if p.Protocol != corev1.ProtocolTCP {
				portStr += fmt.Sprintf("/%s", p.Protocol)
			}
			ports = append(ports, portStr)
		}
		portsStr := strings.Join(ports, ",")

		// Get external IPs
		var externalIPs []string
		for _, ing := range svc.Status.LoadBalancer.Ingress {
			if ing.IP != "" {
				externalIPs = append(externalIPs, ing.IP)
			} else if ing.Hostname != "" {
				externalIPs = append(externalIPs, ing.Hostname)
			}
		}
		externalIP := strings.Join(externalIPs, ",")
		if externalIP == "" {
			externalIP = "-"
		}

		age := formatDuration(time.Since(svc.CreationTimestamp.Time))

		row := []string{
			fmt.Sprintf("[cyan]%s[-]", svc.Name), // Bright blue for service names
			string(svc.Spec.Type),
			svc.Spec.ClusterIP,
			externalIP,
			portsStr,
			age,
		}
		rows = append(rows, row)
		rowIDs = append(rowIDs, svc.Name)
	}

	a.updateTable(headers, rows, rowIDs)
}

// renderIngresses renders the ingresses table with relationships
func (a *App) renderIngresses() {
	ingresses, err := a.clientset.NetworkingV1().Ingresses(a.namespace).List(a.ctx, metav1.ListOptions{})
	if err != nil {
		return
	}

	headers := []string{"NAME", "CLASS", "HOSTS", "PATHS", "AGE"}
	rows := [][]string{}
	rowIDs := []string{}

	for _, ing := range ingresses.Items {
		className := "-"
		if ing.Spec.IngressClassName != nil {
			className = *ing.Spec.IngressClassName
		}

		var hosts []string
		var paths []string
		for _, rule := range ing.Spec.Rules {
			host := rule.Host
			if host == "" {
				host = "*"
			}
			hosts = append(hosts, host)

			if rule.HTTP != nil {
				for _, path := range rule.HTTP.Paths {
					pathStr := path.Path
					if pathStr == "" {
						pathStr = "/"
					}
					// Show relationship: host/path ► service:port
					backend := fmt.Sprintf("%s%s:%d", IconArrow, path.Backend.Service.Name, path.Backend.Service.Port.Number)
					paths = append(paths, pathStr+backend)
				}
			}
		}

		hostsStr := strings.Join(hosts, ",")
		pathsStr := strings.Join(paths, " ")
		age := formatDuration(time.Since(ing.CreationTimestamp.Time))

		row := []string{
			fmt.Sprintf("[cyan]%s[-]", ing.Name), // Bright blue for ingress names
			className,
			hostsStr,
			pathsStr,
			age,
		}
		rows = append(rows, row)
		rowIDs = append(rowIDs, ing.Name)
	}

	a.updateTable(headers, rows, rowIDs)
}

// renderConfigMaps renders the configmaps table
func (a *App) renderConfigMaps() {
	configmaps, err := a.clientset.CoreV1().ConfigMaps(a.namespace).List(a.ctx, metav1.ListOptions{})
	if err != nil {
		return
	}

	headers := []string{"NAME", "DATA", "AGE"}
	rows := [][]string{}
	rowIDs := []string{}

	for _, cm := range configmaps.Items {
		age := formatDuration(time.Since(cm.CreationTimestamp.Time))
		row := []string{
			fmt.Sprintf("[cyan]%s[-]", cm.Name), // Bright blue for configmap names
			strconv.Itoa(len(cm.Data)),
			age,
		}
		rows = append(rows, row)
		rowIDs = append(rowIDs, cm.Name)
	}

	a.updateTable(headers, rows, rowIDs)
}

// renderSecrets renders the secrets table
func (a *App) renderSecrets() {
	secrets, err := a.clientset.CoreV1().Secrets(a.namespace).List(a.ctx, metav1.ListOptions{})
	if err != nil {
		return
	}

	headers := []string{"NAME", "TYPE", "DATA", "AGE"}
	rows := [][]string{}
	rowIDs := []string{}

	for _, secret := range secrets.Items {
		age := formatDuration(time.Since(secret.CreationTimestamp.Time))
		row := []string{
			fmt.Sprintf("[cyan]%s[-]", secret.Name), // Bright blue for secret names
			string(secret.Type),
			strconv.Itoa(len(secret.Data)),
			age,
		}
		rows = append(rows, row)
		rowIDs = append(rowIDs, secret.Name)
	}

	a.updateTable(headers, rows, rowIDs)
}

// updateTable updates the table with new data
func (a *App) updateTable(headers []string, rows [][]string, rowIDs []string) {
	a.tableData.mx.Lock()
	a.tableData.Headers = headers
	a.tableData.Rows = rows
	a.tableData.RowIDs = rowIDs
	a.tableData.mx.Unlock()

	a.app.QueueUpdateDraw(func() {
		a.table.Clear()

		// Set headers (fixed row)
		for col, header := range headers {
			cell := tview.NewTableCell(fmt.Sprintf("[#87CEEB::b]%s[-:-:-]", header)).
				SetAlign(tview.AlignLeft).
				SetSelectable(false)
			a.table.SetCell(0, col, cell)
		}

		// Set rows
		for row, rowData := range rows {
			for col, cellData := range rowData {
				cell := tview.NewTableCell(cellData).
					SetAlign(tview.AlignLeft).
					SetMaxWidth(0)
				a.table.SetCell(row+1, col, cell)
			}
		}

		// Restore selection
		if a.selectedRow < len(rows) {
			a.table.Select(a.selectedRow+1, 0)
		} else if len(rows) > 0 {
			a.table.Select(1, 0)
		}
	})
}

// onSelectionChanged handles table selection changes
func (a *App) onSelectionChanged(row, col int) {
	if row > 0 { // Skip header
		a.selectedRow = row - 1
		a.updateMetricsBar()
	}
}

// updateMetricsBar updates the metrics bar with selected resource info
func (a *App) updateMetricsBar() {
	a.tableData.mx.RLock()
	defer a.tableData.mx.RUnlock()

	if a.selectedRow < 0 || a.selectedRow >= len(a.tableData.RowIDs) {
		a.metricsBar.SetText("")
		return
	}

	resourceName := a.tableData.RowIDs[a.selectedRow]
	text := fmt.Sprintf("[gray]Selected:[-] [white]%s[-]", resourceName)

	// Add pod-specific metrics
	if a.tabs[a.currentTab] == ResourcePod && a.selectedRow < len(a.tableData.Rows) {
		row := a.tableData.Rows[a.selectedRow]
		if len(row) > 5 {
			text += fmt.Sprintf(" [gray]CPU:[-] [cyan]%s[-] [gray]MEM:[-] [cyan]%s[-] [gray]IP:[-] [white]%s[-]", row[4], row[5], row[6])
		}
	}

	a.metricsBar.SetText(text)
}

// viewYAML shows the YAML for the selected resource
func (a *App) viewYAML() {
	a.tableData.mx.RLock()
	if a.selectedRow < 0 || a.selectedRow >= len(a.tableData.RowIDs) {
		a.tableData.mx.RUnlock()
		return
	}
	resourceName := a.tableData.RowIDs[a.selectedRow]
	resourceType := a.tabs[a.currentTab]
	a.tableData.mx.RUnlock()

	// Get resource YAML
	yaml, err := a.getResourceYAML(resourceType, resourceName)
	if err != nil {
		a.showError(fmt.Sprintf("Failed to get YAML: %v", err))
		return
	}

	// Show YAML view
	a.yamlView.SetText(yaml)
	a.yamlView.SetTitle(fmt.Sprintf(" YAML: %s/%s (press Esc to close) ", resourceType, resourceName))
	a.yamlView.ScrollToBeginning()
	a.pages.ShowPage("yaml")
	a.app.SetFocus(a.yamlView)
}

// getResourceYAML retrieves the YAML for a resource
func (a *App) getResourceYAML(resourceType, name string) (string, error) {
	var obj runtime.Object
	var err error

	switch resourceType {
	case ResourcePod:
		obj, err = a.clientset.CoreV1().Pods(a.namespace).Get(a.ctx, name, metav1.GetOptions{})
	case ResourceDeployment:
		obj, err = a.clientset.AppsV1().Deployments(a.namespace).Get(a.ctx, name, metav1.GetOptions{})
	case ResourceService:
		obj, err = a.clientset.CoreV1().Services(a.namespace).Get(a.ctx, name, metav1.GetOptions{})
	case ResourceIngress:
		obj, err = a.clientset.NetworkingV1().Ingresses(a.namespace).Get(a.ctx, name, metav1.GetOptions{})
	case ResourceConfigMap:
		obj, err = a.clientset.CoreV1().ConfigMaps(a.namespace).Get(a.ctx, name, metav1.GetOptions{})
	case ResourceSecret:
		obj, err = a.clientset.CoreV1().Secrets(a.namespace).Get(a.ctx, name, metav1.GetOptions{})
	default:
		return "", fmt.Errorf("unsupported resource type: %s", resourceType)
	}

	if err != nil {
		return "", err
	}

	// Convert to YAML
	jsonBytes, err := json.Marshal(obj)
	if err != nil {
		return "", fmt.Errorf("failed to marshal to JSON: %w", err)
	}

	var jsonObj interface{}
	if err := json.Unmarshal(jsonBytes, &jsonObj); err != nil {
		return "", fmt.Errorf("failed to unmarshal JSON: %w", err)
	}

	yamlBytes, err := yaml.Marshal(jsonObj)
	if err != nil {
		return "", fmt.Errorf("failed to marshal to YAML: %w", err)
	}

	return string(yamlBytes), nil
}

// describeResource shows kubectl describe output
func (a *App) describeResource() {
	a.tableData.mx.RLock()
	if a.selectedRow < 0 || a.selectedRow >= len(a.tableData.RowIDs) {
		a.tableData.mx.RUnlock()
		return
	}
	resourceName := a.tableData.RowIDs[a.selectedRow]
	resourceType := strings.ToLower(a.tabs[a.currentTab])
	a.tableData.mx.RUnlock()

	// Stop TUI
	a.app.Stop()

	// Clear screen
	fmt.Print("\033[H\033[2J")
	fmt.Printf("\n[Describing %s/%s - Press 'q' to quit]\n\n", resourceType, resourceName)

	// Run kubectl describe through less
	cmd := exec.Command("kubectl", "describe", resourceType, resourceName, "-n", a.namespace)
	lessCmd := exec.Command("less", "-R")
	lessCmd.Stdin, _ = cmd.StdoutPipe()
	lessCmd.Stdout = os.Stdout
	lessCmd.Stderr = os.Stderr
	lessCmd.Stdin = os.Stdin

	if err := lessCmd.Start(); err == nil {
		cmd.Run()
		lessCmd.Wait()
	}

	// Restart application
	fmt.Print("\033[H\033[2J")
	fmt.Println("Restarting KubeGraf...")

	binary, _ := os.Executable()
	syscall.Exec(binary, os.Args, os.Environ())
}

// shellIntoPod opens a shell in the selected pod
func (a *App) shellIntoPod() {
	// Only works on Pods tab
	if a.tabs[a.currentTab] != ResourcePod {
		a.showError("Shell access is only available on the Pods tab")
		return
	}

	a.tableData.mx.RLock()
	if a.selectedRow < 0 || a.selectedRow >= len(a.tableData.RowIDs) {
		a.tableData.mx.RUnlock()
		return
	}
	podName := a.tableData.RowIDs[a.selectedRow]
	a.tableData.mx.RUnlock()

	// Get pod details
	pod, err := a.clientset.CoreV1().Pods(a.namespace).Get(a.ctx, podName, metav1.GetOptions{})
	if err != nil {
		a.showError(fmt.Sprintf("Failed to get pod: %v", err))
		return
	}

	// Check if pod is running
	if pod.Status.Phase != corev1.PodRunning {
		a.showError(fmt.Sprintf("Pod %s is not running (status: %s)", podName, pod.Status.Phase))
		return
	}

	// Get containers
	containers := make([]string, 0)
	for _, container := range pod.Spec.Containers {
		containers = append(containers, container.Name)
	}

	if len(containers) == 0 {
		a.showError("No containers found in pod")
		return
	}

	// If only one container, exec directly
	if len(containers) == 1 {
		a.execIntoContainer(podName, containers[0])
		return
	}

	// Multiple containers - show selection dialog
	// Create a copy to avoid closure issues
	containersCopy := make([]string, len(containers))
	copy(containersCopy, containers)

	list := tview.NewList()
	list.SetTitle(fmt.Sprintf(" Select Container for %s (↑/↓ then Enter or 's') ", podName))
	list.SetBorder(true)

	// Add containers to list with proper closure handling
	for i := 0; i < len(containersCopy); i++ {
		idx := i // Capture index for closure
		cName := containersCopy[idx] // Capture name for closure
		list.AddItem(
			fmt.Sprintf("[cyan]%s[-]", cName),
			fmt.Sprintf("Container %d/%d", idx+1, len(containersCopy)),
			0,
			func() {
				a.pages.HidePage("container-select")
				a.execIntoContainer(podName, cName)
			},
		)
	}

	// Handle keyboard input
	list.SetInputCapture(func(event *tcell.EventKey) *tcell.EventKey {
		switch event.Key() {
		case tcell.KeyEscape:
			a.pages.HidePage("container-select")
			a.app.SetFocus(a.table)
			return nil
		case tcell.KeyEnter:
			// Let the default handler trigger the selected callback
			return event
		case tcell.KeyRune:
			if event.Rune() == 's' || event.Rune() == 'S' {
				currentItem := list.GetCurrentItem()
				if currentItem >= 0 && currentItem < len(containersCopy) {
					a.pages.HidePage("container-select")
					a.execIntoContainer(podName, containersCopy[currentItem])
					return nil
				}
			}
		}
		return event
	})

	a.pages.AddPage("container-select", list, true, true)
	a.app.SetFocus(list)
}

// execIntoContainer opens a shell in the specified container
func (a *App) execIntoContainer(podName, containerName string) {
	// Stop the TUI
	a.app.Stop()

	// Clear screen
	fmt.Print("\033[H\033[2J")
	fmt.Printf("\n[Opening shell in %s/%s]\n", podName, containerName)
	fmt.Printf("Type 'exit' to return to KubeGraf\n\n")

	// Try bash first, then sh
	shells := []string{"/bin/bash", "/bin/sh"}
	var lastErr error

	for i, shell := range shells {
		cmd := exec.Command("kubectl", "exec", "-it", podName, "-n", a.namespace, "-c", containerName, "--", shell)
		cmd.Stdin = os.Stdin
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr

		if err := cmd.Run(); err != nil {
			lastErr = err
			if i < len(shells)-1 {
				fmt.Printf("Failed with %s, trying %s...\n", shell, shells[i+1])
			}
			continue
		}

		lastErr = nil
		break
	}

	if lastErr != nil {
		fmt.Printf("\n\nError opening shell: %v\n", lastErr)
		fmt.Println("\nPress Enter to continue...")
		fmt.Scanln()
	}

	// Clear screen and restart
	fmt.Print("\033[H\033[2J")
	fmt.Println("Restarting KubeGraf...")

	binary, _ := os.Executable()
	syscall.Exec(binary, os.Args, os.Environ())
}

// deleteResource deletes the selected resource with confirmation
func (a *App) deleteResource() {
	a.tableData.mx.RLock()
	if a.selectedRow < 0 || a.selectedRow >= len(a.tableData.RowIDs) {
		a.tableData.mx.RUnlock()
		return
	}
	resourceName := a.tableData.RowIDs[a.selectedRow]
	resourceType := a.tabs[a.currentTab]
	a.tableData.mx.RUnlock()

	// Create confirmation dialog
	modal := tview.NewModal().
		SetText(fmt.Sprintf("Delete %s '%s'?\n\nThis action cannot be undone!", resourceType, resourceName)).
		AddButtons([]string{"Cancel", "Delete"}).
		SetDoneFunc(func(buttonIndex int, buttonLabel string) {
			a.pages.HidePage("delete-confirm")
			if buttonLabel == "Delete" {
				a.performDelete(resourceType, resourceName)
			}
		})

	a.pages.AddPage("delete-confirm", modal, true, true)
}

// performDelete actually deletes the resource
func (a *App) performDelete(resourceType, name string) {
	var err error

	switch resourceType {
	case ResourcePod:
		err = a.clientset.CoreV1().Pods(a.namespace).Delete(a.ctx, name, metav1.DeleteOptions{})
	case ResourceDeployment:
		err = a.clientset.AppsV1().Deployments(a.namespace).Delete(a.ctx, name, metav1.DeleteOptions{})
	case ResourceService:
		err = a.clientset.CoreV1().Services(a.namespace).Delete(a.ctx, name, metav1.DeleteOptions{})
	case ResourceIngress:
		err = a.clientset.NetworkingV1().Ingresses(a.namespace).Delete(a.ctx, name, metav1.DeleteOptions{})
	case ResourceConfigMap:
		err = a.clientset.CoreV1().ConfigMaps(a.namespace).Delete(a.ctx, name, metav1.DeleteOptions{})
	case ResourceSecret:
		err = a.clientset.CoreV1().Secrets(a.namespace).Delete(a.ctx, name, metav1.DeleteOptions{})
	}

	if err != nil {
		a.showError(fmt.Sprintf("Delete failed: %v", err))
	} else {
		a.showInfo(fmt.Sprintf("Deleted %s '%s'", resourceType, name))
		a.refreshCurrentTab()
	}
}

// showError shows an error modal
func (a *App) showError(msg string) {
	modal := tview.NewModal().
		SetText(fmt.Sprintf("[red::b]Error:[::-]\n\n%s", msg)).
		AddButtons([]string{"OK"}).
		SetDoneFunc(func(buttonIndex int, buttonLabel string) {
			a.pages.HidePage("error")
		})
	a.pages.AddPage("error", modal, true, true)
}

// showInfo shows an info modal
func (a *App) showInfo(msg string) {
	modal := tview.NewModal().
		SetText(fmt.Sprintf("[cyan::b]Success:[::-]\n\n%s", msg)).
		AddButtons([]string{"OK"}).
		SetDoneFunc(func(buttonIndex int, buttonLabel string) {
			a.pages.HidePage("info")
		})
	a.pages.AddPage("info", modal, true, true)
}

// changeNamespace prompts for namespace change
func (a *App) changeNamespace() {
	inputField := tview.NewInputField().
		SetLabel("Enter namespace: ").
		SetText(a.namespace).
		SetFieldWidth(30)

	inputField.SetDoneFunc(func(key tcell.Key) {
		if key == tcell.KeyEnter {
			a.namespace = inputField.GetText()
			a.pages.HidePage("input")
			a.updateStatusBar()
			a.refreshCurrentTab()
		} else if key == tcell.KeyEscape {
			a.pages.HidePage("input")
		}
	})

	a.pages.AddPage("input", inputField, true, true)
	a.app.SetFocus(inputField)
}

// showHelp shows the help dialog
func (a *App) showHelp() {
	helpText := `[cyan::b]KubeGraf v2.0 - Keyboard Shortcuts[::-]

[cyan]Navigation:[-]
  [white]↑/↓[-]            Navigate rows
  [white]1-6[-]            Jump to tab (1=Pods, 2=Deployments, etc.)
  [white]h/l or ←/→[-]     Previous/Next tab
  [white]Enter[-]          View resource YAML
  [white]Esc[-]            Close modal/dialog

[cyan]Operations:[-]
  [white]q, Ctrl+C[-]      Quit application
  [white]r, Ctrl+R[-]      Refresh resources
  [white]n[-]              Change namespace
  [white]d[-]              Describe resource (kubectl describe)
  [white]s[-]              Shell into pod (exec)
  [white]Ctrl+D[-]         Delete resource (with confirmation)
  [white]?[-]              Show this help

[cyan]Features:[-]
  • Real-time pod metrics (CPU/MEM)
  • Pod details: IP, restarts, uptime
  • Shell access to running pods
  • Resource relationships with ► indicators
  • Safe delete with confirmation dialogs
  • Full YAML viewing

Press [cyan]q[-] or [cyan]Esc[-] to close this help.`

	modal := tview.NewModal().
		SetText(helpText).
		AddButtons([]string{"Close"}).
		SetDoneFunc(func(buttonIndex int, buttonLabel string) {
			a.pages.HidePage("help")
		})

	a.pages.AddPage("help", modal, true, true)
}

// Run starts the application
func (a *App) Run() error {
	// Setup signal handling
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		a.Shutdown()
		os.Exit(0)
	}()

	// Start background tasks AFTER app.Run() starts
	go func() {
		// Small delay to ensure app is fully started
		time.Sleep(100 * time.Millisecond)

		// Set input capture after app is running (CRITICAL!)
		a.table.SetInputCapture(a.handleKeyPress)
		a.app.SetInputCapture(a.handleKeyPress)

		// Mark as initialized
		a.isInitialized = true

		// Load initial resources
		a.refreshCurrentTab()
		a.updateStatusBar()

		// Start watchers
		go a.watchEvents()
		go a.updateLoop()
	}()

	// Run application (this blocks until quit)
	return a.app.Run()
}

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

// Shutdown gracefully shuts down the application
func (a *App) Shutdown() {
	a.cancel()
	select {
	case <-a.stopCh:
	default:
		close(a.stopCh)
	}
	a.app.Stop()
}

// Helper functions

func getStatusIcon(status string, ready bool) (string, string) {
	switch status {
	case "Running":
		if ready {
			return IconOK, "green"
		}
		return IconProgressing, "yellow"
	case "Pending":
		return IconPending, "yellow"
	case "Succeeded", "Completed":
		return IconOK, "green"
	case "Failed":
		return IconBad, "red"
	case "CrashLoopBackOff":
		return IconBad, "red"
	default:
		return IconUnknown, "gray"
	}
}

func getEventIcon(eventType string) (string, string) {
	switch eventType {
	case "Normal":
		return IconOK, "green"
	case "Warning":
		return IconWarning, "yellow"
	case "Error":
		return IconBad, "red"
	default:
		return IconUnknown, "gray"
	}
}

func formatDuration(d time.Duration) string {
	if d < time.Minute {
		return fmt.Sprintf("%ds", int(d.Seconds()))
	} else if d < time.Hour {
		return fmt.Sprintf("%dm", int(d.Minutes()))
	} else if d < 24*time.Hour {
		return fmt.Sprintf("%dh", int(d.Hours()))
	} else {
		return fmt.Sprintf("%dd", int(d.Hours()/24))
	}
}
