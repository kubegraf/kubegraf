import { Component, createSignal, onMount, onCleanup, For } from 'solid-js';
import { setCurrentView } from '../stores/ui';

// Animated Kubernetes Network Visualization
const KubernetesAnimation: Component = () => {
  let canvasRef: HTMLCanvasElement | undefined;
  let animationId: number;

  interface Node {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    type: 'pod' | 'service' | 'node' | 'ingress';
    color: string;
    pulsePhase: number;
  }

  interface Connection {
    from: number;
    to: number;
    progress: number;
    speed: number;
    particles: { pos: number; speed: number }[];
  }

  onMount(() => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d')!;
    const width = canvasRef.width = canvasRef.offsetWidth * 2;
    const height = canvasRef.height = canvasRef.offsetHeight * 2;
    ctx.scale(2, 2);

    const colors = {
      pod: '#ec4899',
      service: '#06b6d4',
      node: '#22c55e',
      ingress: '#f59e0b',
    };

    const types: Node['type'][] = ['pod', 'service', 'node', 'ingress'];

    // Create nodes
    const nodes: Node[] = Array.from({ length: 25 }, (_, i) => {
      const type = types[Math.floor(Math.random() * types.length)];
      return {
        x: Math.random() * (width / 2),
        y: Math.random() * (height / 2),
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: type === 'node' ? 20 : type === 'service' ? 15 : 10,
        type,
        color: colors[type],
        pulsePhase: Math.random() * Math.PI * 2,
      };
    });

    // Create connections
    const connections: Connection[] = [];
    for (let i = 0; i < 30; i++) {
      const from = Math.floor(Math.random() * nodes.length);
      let to = Math.floor(Math.random() * nodes.length);
      while (to === from) to = Math.floor(Math.random() * nodes.length);

      connections.push({
        from,
        to,
        progress: Math.random(),
        speed: 0.002 + Math.random() * 0.003,
        particles: Array.from({ length: 3 }, () => ({
          pos: Math.random(),
          speed: 0.005 + Math.random() * 0.01,
        })),
      });
    }

    const drawNode = (node: Node, time: number) => {
      const pulse = Math.sin(time * 0.003 + node.pulsePhase) * 0.3 + 1;

      // Outer glow
      const gradient = ctx.createRadialGradient(
        node.x, node.y, 0,
        node.x, node.y, node.radius * 2 * pulse
      );
      gradient.addColorStop(0, node.color + '40');
      gradient.addColorStop(1, node.color + '00');
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * 2 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Main circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = node.color + '30';
      ctx.fill();
      ctx.strokeStyle = node.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = node.color + '60';
      ctx.fill();

      // Icon based on type
      ctx.fillStyle = node.color;
      ctx.font = `${node.radius * 0.8}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icons: Record<string, string> = { pod: '◆', service: '●', node: '■', ingress: '▲' };
      ctx.fillText(icons[node.type], node.x, node.y);
    };

    const drawConnection = (conn: Connection, time: number) => {
      const from = nodes[conn.from];
      const to = nodes[conn.to];

      // Draw line
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw flowing particles
      conn.particles.forEach(particle => {
        particle.pos += particle.speed;
        if (particle.pos > 1) particle.pos = 0;

        const x = from.x + (to.x - from.x) * particle.pos;
        const y = from.y + (to.y - from.y) * particle.pos;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#06b6d4';
        ctx.fill();

        // Particle trail
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 10);
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0.5)');
        gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });
    };

    const animate = (time: number) => {
      ctx.clearRect(0, 0, width / 2, height / 2);

      // Update node positions
      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off walls
        if (node.x < node.radius || node.x > width / 2 - node.radius) node.vx *= -1;
        if (node.y < node.radius || node.y > height / 2 - node.radius) node.vy *= -1;

        // Keep in bounds
        node.x = Math.max(node.radius, Math.min(width / 2 - node.radius, node.x));
        node.y = Math.max(node.radius, Math.min(height / 2 - node.radius, node.y));
      });

      // Draw connections first (behind nodes)
      connections.forEach(conn => drawConnection(conn, time));

      // Draw nodes
      nodes.forEach(node => drawNode(node, time));

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    onCleanup(() => cancelAnimationFrame(animationId));
  });

  return (
    <canvas
      ref={canvasRef}
      class="absolute inset-0 w-full h-full"
      style={{ opacity: 0.8 }}
    />
  );
};

// Animated counter
const AnimatedCounter: Component<{ end: number; suffix?: string; duration?: number }> = (props) => {
  const [count, setCount] = createSignal(0);

  onMount(() => {
    const duration = props.duration || 2000;
    const steps = 60;
    const increment = props.end / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= props.end) {
        setCount(props.end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    onCleanup(() => clearInterval(timer));
  });

  return <span>{count().toLocaleString()}{props.suffix || ''}</span>;
};

// Feature card with hover animation
const FeatureCard: Component<{ icon: string; title: string; description: string; delay: number }> = (props) => {
  const [isVisible, setIsVisible] = createSignal(false);
  let ref: HTMLDivElement | undefined;

  onMount(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), props.delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref) observer.observe(ref);
    onCleanup(() => observer.disconnect());
  });

  return (
    <div
      ref={ref}
      class={`group relative p-6 rounded-2xl border transition-all duration-700 transform ${
        isVisible() ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
        'border-color': 'rgba(6, 182, 212, 0.2)',
      }}
    >
      <div class="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div class="relative z-10">
        <div class="text-4xl mb-4">{props.icon}</div>
        <h3 class="text-xl font-bold text-white mb-2">{props.title}</h3>
        <p class="text-gray-400">{props.description}</p>
      </div>
      <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-b-2xl transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
    </div>
  );
};

const LandingPage: Component = () => {
  const [scrollY, setScrollY] = createSignal(0);
  const [mousePos, setMousePos] = createSignal({ x: 0, y: 0 });

  onMount(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);

    onCleanup(() => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    });
  });

  const features = [
    { icon: '🎯', title: 'Real-time Monitoring', description: 'Watch your cluster in real-time with live updates via WebSocket connections.' },
    { icon: '🗺️', title: 'Resource Mapping', description: 'Interactive D3.js visualizations showing relationships between your resources.' },
    { icon: '🔐', title: 'Security Analysis', description: 'Identify security issues, RBAC misconfigurations, and vulnerabilities.' },
    { icon: '🚀', title: 'One-Click Actions', description: 'Scale deployments, restart pods, port-forward services with a single click.' },
    { icon: '🎨', title: 'Beautiful Themes', description: '5 stunning themes including Dark, Light, Midnight, Cyberpunk, and Ocean.' },
    { icon: '🔌', title: 'Plugin System', description: 'Built-in support for Helm, ArgoCD, Flux, and Kustomize.' },
  ];

  const stats = [
    { value: 100, suffix: '%', label: 'Open Source' },
    { value: 50, suffix: '+', label: 'K8s Resources' },
    { value: 5, suffix: '', label: 'Theme Options' },
    { value: 0, suffix: '', label: 'Dependencies*' },
  ];

  return (
    <div class="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Animated background gradient that follows mouse */}
      <div
        class="fixed inset-0 pointer-events-none transition-all duration-1000"
        style={{
          background: `radial-gradient(800px circle at ${mousePos().x}px ${mousePos().y}px, rgba(6, 182, 212, 0.15), transparent 40%)`,
        }}
      />

      {/* Navigation */}
      <nav class={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrollY() > 50 ? 'bg-[#0a0a0f]/90 backdrop-blur-lg border-b border-white/10' : ''}`}>
        <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-1">
            <div class="w-7 h-7 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <svg class="w-4 h-4" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                {/* G outline */}
                <path d="M80 30 L60 12 L35 12 L12 30 L12 70 L35 88 L60 88 L80 70 L80 50 L55 50" fill="none" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
                {/* 3D Pod inside G */}
                <path d="M42 22 L62 34 L42 46 L22 34 Z" fill="white" opacity="0.9"/>
                <path d="M42 46 L62 34 L62 54 L42 66 Z" fill="white" opacity="0.6"/>
                <path d="M42 46 L22 34 L22 54 L42 66 Z" fill="white" opacity="0.75"/>
              </svg>
            </div>
            <span class="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              KubēGraf
            </span>
          </div>
          <div class="flex items-center gap-6">
            <a href="#features" class="text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#demo" class="text-gray-400 hover:text-white transition-colors">Demo</a>
            <a href="https://github.com/kubegraf/kubegraf" target="_blank" class="text-gray-400 hover:text-white transition-colors">GitHub</a>
            <button
              onClick={() => setCurrentView('dashboard')}
              class="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 transition-all font-medium"
            >
              Launch App
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section class="relative min-h-screen flex items-center justify-center pt-20">
        {/* Animated background */}
        <div class="absolute inset-0 overflow-hidden">
          <KubernetesAnimation />
        </div>

        {/* Grid pattern overlay */}
        <div
          class="absolute inset-0 opacity-20"
          style={{
            'background-image': `
              linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)
            `,
            'background-size': '50px 50px',
          }}
        />

        <div class="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div
            class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-sm mb-8 animate-pulse"
          >
            <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            Now with Real-time Updates
          </div>

          <h1
            class="text-5xl md:text-7xl font-bold mb-6 leading-tight"
            style={{
              transform: `translateY(${scrollY() * 0.3}px)`,
              opacity: Math.max(0, 1 - scrollY() / 500),
            }}
          >
            <span class="bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent">
              Intelligent Insight
            </span>
            <br />
            <span class="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              for Kubernetes Incidents
            </span>
          </h1>

          <p
            class="text-xl text-gray-400 mb-10 max-w-2xl mx-auto"
            style={{
              transform: `translateY(${scrollY() * 0.2}px)`,
              opacity: Math.max(0, 1 - scrollY() / 400),
            }}
          >
            A beautiful, high-performance Kubernetes management UI with real-time updates,
            interactive visualizations, and powerful resource management.
          </p>

          <div
            class="flex flex-col sm:flex-row items-center justify-center gap-4"
            style={{
              transform: `translateY(${scrollY() * 0.1}px)`,
              opacity: Math.max(0, 1 - scrollY() / 300),
            }}
          >
            <button
              onClick={() => setCurrentView('dashboard')}
              class="group px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 transition-all font-semibold text-lg flex items-center gap-2"
            >
              Get Started
              <svg class="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <a
              href="https://github.com/kubegraf/kubegraf"
              target="_blank"
              class="px-8 py-4 rounded-xl border border-white/20 hover:border-white/40 hover:bg-white/5 transition-all font-semibold text-lg flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              View on GitHub
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div class="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section class="relative py-20 border-y border-white/10">
        <div class="max-w-7xl mx-auto px-6">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
            <For each={stats}>
              {(stat) => (
                <div class="text-center">
                  <div class="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  </div>
                  <div class="text-gray-400 mt-2">{stat.label}</div>
                </div>
              )}
            </For>
          </div>
          <p class="text-center text-gray-500 text-sm mt-8">*Single binary, no external dependencies required</p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" class="py-24">
        <div class="max-w-7xl mx-auto px-6">
          <div class="text-center mb-16">
            <h2 class="text-4xl md:text-5xl font-bold mb-4">
              <span class="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Powerful Features
              </span>
            </h2>
            <p class="text-xl text-gray-400 max-w-2xl mx-auto">
              Everything you need to manage your Kubernetes clusters effectively
            </p>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <For each={features}>
              {(feature, i) => (
                <FeatureCard {...feature} delay={i() * 100} />
              )}
            </For>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" class="py-24 relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent" />
        <div class="max-w-7xl mx-auto px-6 relative z-10">
          <div class="text-center mb-16">
            <h2 class="text-4xl md:text-5xl font-bold mb-4">
              <span class="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                See It In Action
              </span>
            </h2>
            <p class="text-xl text-gray-400">
              Interactive resource management at your fingertips
            </p>
          </div>

          <div class="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-cyan-500/20">
            <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10" />
            <div class="bg-[#12121a] p-2">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-3 h-3 rounded-full bg-red-500" />
                <div class="w-3 h-3 rounded-full bg-yellow-500" />
                <div class="w-3 h-3 rounded-full bg-green-500" />
                <span class="ml-4 text-gray-500 text-sm">kubegraf.io</span>
              </div>
              <div class="aspect-video bg-[#0a0a0f] rounded-lg flex items-center justify-center">
                <div class="text-center">
                  <div class="text-6xl mb-4">🎬</div>
                  <p class="text-gray-400">Dashboard Preview Coming Soon</p>
                  <button onClick={() => setCurrentView('dashboard')} class="inline-block mt-4 px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium">
                    Try Live Demo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section class="py-24">
        <div class="max-w-4xl mx-auto px-6 text-center">
          <h2 class="text-4xl md:text-5xl font-bold mb-6">
            Ready to <span class="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Get Started?</span>
          </h2>
          <p class="text-xl text-gray-400 mb-10">
            Deploy KubēGraf and start managing your Kubernetes clusters with style.
          </p>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div class="bg-[#12121a] rounded-xl p-4 font-mono text-sm text-gray-300 border border-white/10">
              <span class="text-cyan-400">$</span> go install github.com/kubegraf/kubegraf@latest
            </div>
            <span class="text-gray-500">or</span>
            <div class="bg-[#12121a] rounded-xl p-4 font-mono text-sm text-gray-300 border border-white/10">
              <span class="text-cyan-400">$</span> brew install kubegraf
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer class="py-12 border-t border-white/10">
        <div class="max-w-7xl mx-auto px-6">
          <div class="flex flex-col md:flex-row items-center justify-between gap-6">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                <svg class="w-5 h-5" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  {/* G outline */}
                  <path d="M80 30 L60 12 L35 12 L12 30 L12 70 L35 88 L60 88 L80 70 L80 50 L55 50" fill="none" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
                  {/* 3D Pod inside G */}
                  <path d="M42 22 L62 34 L42 46 L22 34 Z" fill="white" opacity="0.9"/>
                  <path d="M42 46 L62 34 L62 54 L42 66 Z" fill="white" opacity="0.6"/>
                  <path d="M42 46 L22 34 L22 54 L42 66 Z" fill="white" opacity="0.75"/>
                </svg>
              </div>
              <span class="text-lg font-bold">KubēGraf</span>
            </div>
            <div class="flex items-center gap-6 text-gray-400">
              <a href="https://github.com/kubegraf/kubegraf" target="_blank" class="hover:text-white transition-colors">GitHub</a>
              <a href="#" class="hover:text-white transition-colors">Documentation</a>
              <a href="#" class="hover:text-white transition-colors">Discord</a>
            </div>
            <p class="text-gray-500 text-sm">
              Made with ❤️ for the Kubernetes community
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
