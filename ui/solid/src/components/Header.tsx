import { Component, For, Show, createSignal, createMemo, onCleanup, createResource } from 'solid-js';
import { Portal } from 'solid-js/web';
import { namespace, setNamespace, namespaces, clusterStatus, refreshAll, namespacesResource, contexts, currentContext, switchContext, contextsResource } from '../stores/cluster';
import { toggleAIPanel, searchQuery, setSearchQuery } from '../stores/ui';
import ThemeToggle from './ThemeToggle';
import { api } from '../services/api';
import LocalTerminalModal from './LocalTerminalModal';

// Cloud provider logos as inline SVGs
const CloudLogos: Record<string, () => any> = {
  gcp: () => (
    <svg viewBox="0 0 256 206" class="w-5 h-5" fill="none">
      <path d="M170.252 56.819l22.253-22.253 1.483-9.37C153.437-11.677 88.976-7.496 52.42 33.92 42.267 45.423 34.734 59.764 30.717 74.573l7.97-1.123 44.505-7.34 3.436-3.513c19.797-21.742 53.27-24.667 76.128-5.632l7.496-.146z" fill="#EA4335"/>
      <path d="M224.205 73.918a100.249 100.249 0 00-30.217-48.722l-31.232 31.232a55.515 55.515 0 0120.379 44.037v5.544c15.35 0 27.797 12.446 27.797 27.796 0 15.352-12.446 27.573-27.797 27.573h-55.671l-5.466 5.621v33.339l5.466 5.389h55.67c40.143.312 73.076-31.857 73.388-72 .178-23.106-10.736-44.898-29.84-59.653l-2.477.844z" fill="#4285F4"/>
      <path d="M71.87 205.796h55.593V161.29H71.87a27.275 27.275 0 01-11.467-2.545l-7.97 2.468-22.331 22.253-1.949 7.65c12.758 9.603 28.39 14.758 44.484 14.68h-.767z" fill="#34A853"/>
      <path d="M71.87 50.525C31.727 50.837-1.207 84.447.081 124.59c.72 22.632 11.389 43.821 28.925 57.476l32.25-32.25c-16.292-7.378-23.503-26.672-16.125-42.964a31.86 31.86 0 0116.125-16.125l-32.25-32.25A72.002 72.002 0 0071.87 50.525z" fill="#FBBC05"/>
    </svg>
  ),
  aws: () => (
    <svg viewBox="0 0 256 153" class="w-5 h-5" fill="none">
      <path d="M72.392 55.438c0 3.137.34 5.68.933 7.545a45.373 45.373 0 002.712 6.103c.424.678.593 1.356.593 1.95 0 .847-.508 1.695-1.61 2.543l-5.34 3.56c-.763.509-1.526.763-2.205.763-.847 0-1.695-.424-2.543-1.187a26.224 26.224 0 01-3.051-3.984 65.48 65.48 0 01-2.628-5.001c-6.612 7.798-14.92 11.698-24.922 11.698-7.12 0-12.8-2.035-16.954-6.103-4.153-4.07-6.272-9.495-6.272-16.277 0-7.206 2.543-13.054 7.714-17.462 5.17-4.408 12.037-6.612 20.682-6.612 2.882 0 5.849.254 8.985.678 3.137.424 6.358 1.102 9.749 1.865V29.33c0-6.443-1.356-10.935-3.984-13.563-2.712-2.628-7.29-3.9-13.817-3.9-2.967 0-6.018.34-9.155 1.103-3.136.762-6.188 1.695-9.155 2.882-.763.34-1.441.593-1.95.763-.508.17-.932.254-1.271.254-1.102 0-1.61-.763-1.61-2.374v-4.153c0-1.272.17-2.205.593-2.713.424-.508 1.187-1.017 2.374-1.525 2.967-1.526 6.527-2.798 10.68-3.815C24.922.678 29.33.085 33.992.085c10.256 0 17.716 2.374 22.463 7.12 4.662 4.747 7.036 11.952 7.036 21.615v28.618h-.1z" fill="#252F3E"/>
      <path d="M30.94 67.052c2.798 0 5.68-.509 8.731-1.526 3.052-1.017 5.765-2.882 8.054-5.425 1.356-1.61 2.374-3.39 2.882-5.51.509-2.12.848-4.661.848-7.629v-3.646a70.732 70.732 0 00-7.799-1.44 63.56 63.56 0 00-7.968-.509c-5.68 0-9.833 1.102-12.63 3.39-2.798 2.289-4.154 5.51-4.154 9.749 0 3.984 1.017 6.95 3.136 8.985 2.035 2.12 5.001 3.137 8.9 3.137v.424z" fill="#252F3E"/>
      <path d="M126.434 74.087c-1.441 0-2.374-.254-2.967-.847-.593-.509-1.102-1.61-1.525-3.052l-17.039-56.05c-.424-1.526-.678-2.543-.678-3.136 0-1.272.593-1.95 1.78-1.95h8.308c1.526 0 2.543.254 3.052.847.593.509 1.017 1.61 1.44 3.052l12.206 48.082 11.359-48.082c.34-1.526.763-2.543 1.356-3.052.593-.508 1.695-.847 3.136-.847h6.782c1.526 0 2.543.254 3.136.847.593.509 1.102 1.61 1.357 3.052l11.528 48.675 12.545-48.675c.424-1.526.932-2.543 1.441-3.052.593-.508 1.61-.847 3.051-.847h7.883c1.187 0 1.865.678 1.865 1.95 0 .338-.085.678-.17 1.101-.084.424-.254 1.017-.508 1.78l-17.378 56.219c-.424 1.526-.932 2.543-1.526 3.052-.593.508-1.61.847-2.966.847h-7.29c-1.526 0-2.544-.254-3.137-.847-.593-.593-1.102-1.61-1.356-3.136l-11.274-46.877-11.19 46.793c-.339 1.526-.763 2.543-1.356 3.136-.593.593-1.695.848-3.137.848h-7.29z" fill="#252F3E"/>
      <path d="M201.462 78.325c-4.408 0-8.816-.508-13.055-1.525-4.238-1.017-7.544-2.12-9.748-3.39-1.357-.763-2.29-1.61-2.629-2.374-.339-.763-.508-1.61-.508-2.374v-4.322c0-1.61.593-2.374 1.695-2.374.423 0 .847.085 1.271.254.424.17 1.102.424 1.865.763 2.543 1.187 5.34 2.12 8.308 2.798 3.051.678 6.018 1.017 9.07 1.017 4.831 0 8.562-.847 11.105-2.543 2.543-1.695 3.9-4.153 3.9-7.29 0-2.119-.678-3.9-2.035-5.34-1.356-1.441-3.984-2.713-7.798-3.9l-11.19-3.475c-5.68-1.78-9.918-4.408-12.546-7.883-2.628-3.39-3.984-7.205-3.984-11.274 0-3.306.678-6.188 2.035-8.731 1.356-2.543 3.136-4.747 5.425-6.527 2.288-1.865 4.916-3.221 8.053-4.153 3.136-.932 6.442-1.356 9.918-1.356 1.78 0 3.645.085 5.425.339 1.865.254 3.56.593 5.255.932 1.61.424 3.136.847 4.577 1.356 1.44.508 2.543 1.017 3.305 1.525.932.593 1.61 1.187 1.95 1.865.339.593.508 1.44.508 2.458v3.984c0 1.61-.593 2.458-1.695 2.458-.593 0-1.526-.254-2.798-.763-4.238-1.95-9.07-2.882-14.495-2.882-4.408 0-7.883.678-10.341 2.12-2.459 1.44-3.73 3.645-3.73 6.781 0 2.12.763 3.9 2.289 5.34 1.525 1.441 4.408 2.882 8.562 4.153l10.935 3.475c5.595 1.78 9.665 4.238 12.122 7.374 2.459 3.136 3.646 6.697 3.646 10.681 0 3.39-.678 6.442-1.95 9.155-1.356 2.713-3.22 5.086-5.594 7.036-2.374 2.035-5.255 3.56-8.647 4.577-3.56 1.102-7.374 1.61-11.444 1.61z" fill="#252F3E"/>
      <path d="M237.596 145.256c-29.126 21.531-71.418 32.974-107.813 32.974-50.996 0-96.927-18.853-131.65-50.235-2.713-2.459-.339-5.849 2.967-3.9 37.517 21.785 83.787 34.922 131.65 34.922 32.296 0 67.78-6.697 100.414-20.598 4.916-2.12 9.07 3.221 4.432 6.837z" fill="#FF9900"/>
      <path d="M249.548 131.524c-3.73-4.747-24.668-2.289-34.078-1.102-2.882.339-3.306-2.12-.678-3.9 16.7-11.698 43.99-8.308 47.127-4.408 3.136 3.984-.848 31.314-16.531 44.369-2.374 2.035-4.662.932-3.56-1.78 3.475-8.562 11.189-28.449 7.72-33.179z" fill="#FF9900"/>
    </svg>
  ),
  azure: () => (
    <svg viewBox="0 0 96 96" class="w-5 h-5" fill="none">
      <path d="M33.337 6.11L2.305 81.954h21.792L57.67 6.11H33.337z" fill="#0078D4"/>
      <path d="M71.175 26.316H43.09L20.97 82.097h22.125l28.08-55.781z" fill="#0078D4"/>
      <path d="M79.04 6.11L57.8 89.9h18.41l21.484-83.79H79.04z" fill="#0078D4"/>
    </svg>
  ),
  ibm: () => (
    <svg viewBox="0 0 24 24" class="w-5 h-5" fill="#0530AD">
      <path d="M0 7.5h4.05v.9H0zm5.4 0v.9H6.3v-.9h-.9zm3.6 0v.9h4.05v-.9H9zm8.1 0v.9h.9v-.9h-.9zm3.6 0v.9H24v-.9h-3.3zM0 9.3h4.05v.9H0zm5.4 0v.9H6.3v-.9h-.9zm3.6 0v.9h4.05v-.9H9zm8.1 0v.9h.9v-.9h-.9zm3.6 0v.9H24v-.9h-3.3zM0 11.1h2.7v.9H0zm3.6 0v.9h1.35c.124-.31.248-.6.45-.9H3.6zm5.4 0v.9h1.35c.186.31.31.6.45.9H9zm8.1 0c.124.31.248.6.45.9h1.35v-.9h-.9zm2.7 0v.9h.9c.186-.31.31-.6.45-.9h-.45zm2.7 0c.124.31.248.6.45.9H24v-.9h-3.3zM0 12.9h2.7v.9H0zm3.6 0v.9h.45c-.186-.31-.31-.6-.45-.9zm5.4 0c-.124-.31-.248-.6-.45-.9v.9H9zm8.1 0v.9c.124-.31.248-.6.45-.9h-.45zm2.7 0c-.186.31-.31.6-.45.9h.45v-.9zm2.7 0v.9H24v-.9h-3.3zM0 14.7h4.05v.9H0zm5.4 0v.9H6.3v-.9h-.9zm3.6 0v.9h4.05v-.9H9zm8.1 0v.9h.9v-.9h-.9zm3.6 0v.9H24v-.9h-3.3zM0 16.5h4.05v.9H0zm5.4 0v.9H6.3v-.9h-.9zm3.6 0v.9h4.05v-.9H9zm8.1 0v.9h.9v-.9h-.9zm3.6 0v.9H24v-.9h-3.3z"/>
    </svg>
  ),
  oracle: () => (
    <svg viewBox="0 0 24 24" class="w-5 h-5" fill="#F80000">
      <path d="M6.754 16.15h10.492c2.294 0 4.254-1.96 4.254-4.254S19.54 7.642 17.246 7.642H6.754C4.46 7.642 2.5 9.602 2.5 11.896s1.96 4.254 4.254 4.254zm0-6.204h10.492c1.078 0 1.95.872 1.95 1.95s-.872 1.95-1.95 1.95H6.754c-1.078 0-1.95-.872-1.95-1.95s.872-1.95 1.95-1.95z"/>
    </svg>
  ),
  digitalocean: () => (
    <svg viewBox="0 0 24 24" class="w-5 h-5" fill="#0080FF">
      <path d="M12.04 24v-4.8h-4.8V24H12zm-4.8-4.8v-3.6H3.6v3.6h3.64zm0-3.6v-3.6H3.6v3.6h3.64zm6-3.6v-3.6H9.6v3.6h3.64zm0 0a7.2 7.2 0 007.2-7.2H12.04v4.8h4.8v-4.8h-4.8v7.2z"/>
      <path d="M12 0C5.37 0 0 5.37 0 12h4.8A7.2 7.2 0 0112 4.8V0z"/>
    </svg>
  ),
  alibaba: () => (
    <svg viewBox="0 0 24 24" class="w-5 h-5" fill="#FF6A00">
      <path d="M21.692 18.5L12 13.5l-9.692 5L0 17l12-6.154L24 17l-2.308 1.5zm0-6L12 7.5l-9.692 5L0 11l12-6.154L24 11l-2.308 1.5z"/>
    </svg>
  ),
  linode: () => (
    <svg viewBox="0 0 24 24" class="w-5 h-5" fill="#00A95C">
      <path d="M12 2L2 7l10 5 10-5-10-5zm0 7.5L4.5 7 12 4.5l7.5 2.5L12 9.5zm0 3L4.5 10 12 7.5l7.5 2.5L12 12.5zm0 3L4.5 13 12 10.5l7.5 2.5L12 15.5zm0 3L4.5 16 12 13.5l7.5 2.5L12 18.5zm0 3L2 17v2l10 5 10-5v-2l-10 4.5z"/>
    </svg>
  ),
  vultr: () => (
    <svg viewBox="0 0 24 24" class="w-5 h-5" fill="#007BFC">
      <path d="M19.743 6H23.5l-7 12h-3.757L19.743 6zM.5 6h3.757l7 12H7.5L.5 6zm7.28 0h3.757l5.723 9.8h-3.757L7.78 6z"/>
    </svg>
  ),
  ovh: () => (
    <svg viewBox="0 0 24 24" class="w-5 h-5" fill="#123F6D">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v2h-2zm0-8h2v6h-2z"/>
    </svg>
  ),
  hetzner: () => (
    <svg viewBox="0 0 24 24" class="w-5 h-5" fill="#D50C2D">
      <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h3v8H8V8zm5 0h3v8h-3V8z"/>
    </svg>
  ),
  kind: () => (
    <svg viewBox="0 0 24 24" class="w-5 h-5" fill="#326CE5">
      <path d="M12 2L2 7l10 5 10-5-10-5zm0 12l-8-4v7l8 4 8-4v-7l-8 4z"/>
    </svg>
  ),
  minikube: () => (
    <svg viewBox="0 0 24 24" class="w-5 h-5" fill="#326CE5">
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm-2-6l5-3-5-3v6z"/>
    </svg>
  ),
  'docker-desktop': () => (
    <svg viewBox="0 0 24 24" class="w-5 h-5" fill="#2496ED">
      <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185zm-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186zm0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186zm-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186zm-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186zm5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185zm-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185zm-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186h-2.12a.186.186 0 00-.185.186v1.887c0 .102.084.185.186.185zm-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185zM23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288z"/>
    </svg>
  ),
  k3s: () => (
    <svg viewBox="0 0 24 24" class="w-5 h-5" fill="#FFC61C">
      <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.5L19 8l-7 3.5L5 8l7-3.5zM4 9.5l7 3.5v7l-7-3.5v-7zm16 0v7l-7 3.5v-7l7-3.5z"/>
    </svg>
  ),
  rancher: () => (
    <svg viewBox="0 0 24 24" class="w-5 h-5" fill="#0075A8">
      <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 3l6 3-6 3-6-3 6-3zm-7 5l6 3v5l-6-3v-5zm14 0v5l-6 3v-5l6-3z"/>
    </svg>
  ),
  openshift: () => (
    <svg viewBox="0 0 24 24" class="w-5 h-5" fill="#EE0000">
      <path d="M21.665 11.812l-9.027-3.046a.67.67 0 00-.423 0l-9.027 3.046a.67.67 0 00-.445.631v5.545c0 .286.18.542.445.632l9.027 3.046a.67.67 0 00.423 0l9.027-3.046a.67.67 0 00.445-.632v-5.545a.67.67 0 00-.445-.631zm-9.242 7.726l-7.37-2.49v-3.62l7.37 2.488v3.622zm.408-4.97l-7.576-2.558 7.576-2.558 7.576 2.558-7.576 2.558zm8.03 2.48l-7.37 2.49v-3.622l7.37-2.488v3.62z"/>
    </svg>
  ),
  generic: () => (
    <svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor">
      <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
    </svg>
  ),
};

const Header: Component = () => {
  const [searchFocused, setSearchFocused] = createSignal(false);
  const [nsDropdownOpen, setNsDropdownOpen] = createSignal(false);
  const [nsSearch, setNsSearch] = createSignal('');
  const [ctxDropdownOpen, setCtxDropdownOpen] = createSignal(false);
  const [ctxSearch, setCtxSearch] = createSignal('');
  const [switching, setSwitching] = createSignal(false);
  const [terminalOpen, setTerminalOpen] = createSignal(false);
  let nsDropdownRef: HTMLDivElement | undefined;
  let nsButtonRef: HTMLButtonElement | undefined;
  let ctxDropdownRef: HTMLDivElement | undefined;
  let ctxButtonRef: HTMLButtonElement | undefined;

  // Fetch cloud info (fast endpoint - single API call)
  const [cloudInfo] = createResource(() => api.getCloudInfo().catch(() => null));

  const getCloudLogo = () => {
    const provider = cloudInfo()?.provider?.toLowerCase() || 'generic';
    return CloudLogos[provider] || CloudLogos.generic;
  };

  // Short display names for cloud providers
  const getProviderShortName = () => {
    const provider = cloudInfo()?.provider?.toLowerCase();
    const shortNames: Record<string, string> = {
      gcp: 'GCP',
      aws: 'AWS',
      azure: 'Azure',
      ibm: 'IBM',
      oracle: 'Oracle',
      digitalocean: 'DO',
      alibaba: 'Alibaba',
      linode: 'Linode',
      vultr: 'Vultr',
      ovh: 'OVH',
      hetzner: 'Hetzner',
      kind: 'Kind',
      minikube: 'Minikube',
      'docker-desktop': 'Docker',
      k3s: 'K3s',
      rancher: 'Rancher',
      openshift: 'OpenShift',
    };
    return shortNames[provider || ''] || cloudInfo()?.displayName || 'Cloud';
  };

  // Filtered namespaces based on search
  const filteredNamespaces = createMemo(() => {
    const search = nsSearch().toLowerCase();
    if (!search) return namespaces();
    return namespaces().filter(ns => ns.toLowerCase().includes(search));
  });

  // Filtered contexts based on search
  const filteredContexts = createMemo(() => {
    const search = ctxSearch().toLowerCase();
    if (!search) return contexts();
    return contexts().filter(ctx => ctx.name.toLowerCase().includes(search));
  });

  // Keyboard shortcut for search
  if (typeof window !== 'undefined') {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    });

    // Close dropdown when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (nsDropdownOpen() && nsDropdownRef && !nsDropdownRef.contains(e.target as Node) &&
          nsButtonRef && !nsButtonRef.contains(e.target as Node)) {
        setNsDropdownOpen(false);
        setNsSearch('');
      }
      if (ctxDropdownOpen() && ctxDropdownRef && !ctxDropdownRef.contains(e.target as Node) &&
          ctxButtonRef && !ctxButtonRef.contains(e.target as Node)) {
        setCtxDropdownOpen(false);
        setCtxSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    onCleanup(() => document.removeEventListener('mousedown', handleClickOutside));
  }

  const selectNamespace = (ns: string) => {
    setNamespace(ns);
    setNsDropdownOpen(false);
    setNsSearch('');
  };

  const selectContext = async (ctxName: string) => {
    if (ctxName === currentContext()) return;
    setSwitching(true);
    try {
      await switchContext(ctxName);
    } catch (err) {
      console.error('Failed to switch context:', err);
    } finally {
      setSwitching(false);
      setCtxDropdownOpen(false);
      setCtxSearch('');
    }
  };

  const getDisplayName = () => {
    return namespace() === '_all' ? 'All Namespaces' : namespace();
  };

  return (
    <header class="h-16 header-glass flex items-center justify-between px-6 relative" style={{ 'z-index': 100 }}>
      {/* Left side - Namespace selector & Search */}
      <div class="flex items-center gap-4">
        {/* Namespace selector with search */}
        <div class="flex items-center gap-2 relative">
          <label class="text-sm" style={{ color: 'var(--text-secondary)' }}>Namespace:</label>
          <button
            ref={nsButtonRef}
            onClick={() => setNsDropdownOpen(!nsDropdownOpen())}
            class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm min-w-[180px] justify-between"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <span class="truncate">{getDisplayName()}</span>
            <svg class={`w-4 h-4 transition-transform ${nsDropdownOpen() ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          <Show when={nsDropdownOpen()}>
            <div
              ref={nsDropdownRef}
              class="absolute top-full left-0 mt-1 w-64 rounded-lg shadow-xl z-[200] overflow-hidden"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
              }}
            >
              {/* Search input */}
              <div class="p-2 border-b" style={{ 'border-color': 'var(--border-color)' }}>
                <div class="relative">
                  <svg
                    class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--text-muted)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search namespaces..."
                    value={nsSearch()}
                    onInput={(e) => setNsSearch(e.target.value)}
                    class="w-full rounded-md pl-8 pr-3 py-1.5 text-sm"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                    }}
                    autofocus
                  />
                </div>
              </div>

              {/* Options list */}
              <div class="max-h-64 overflow-y-auto">
                {/* All namespaces option */}
                <Show when={!nsSearch() || 'all namespaces'.includes(nsSearch().toLowerCase())}>
                  <button
                    onClick={() => selectNamespace('_all')}
                    class="w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors"
                    style={{
                      background: namespace() === '_all' ? 'var(--bg-tertiary)' : 'transparent',
                      color: namespace() === '_all' ? 'var(--accent-primary)' : 'var(--text-primary)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = namespace() === '_all' ? 'var(--bg-tertiary)' : 'transparent'}
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    All Namespaces
                    <Show when={namespace() === '_all'}>
                      <svg class="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </Show>
                  </button>
                </Show>

                {/* Namespace list */}
                <Show when={!namespacesResource.loading} fallback={
                  <div class="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</div>
                }>
                  <For each={filteredNamespaces()}>
                    {(ns) => (
                      <button
                        onClick={() => selectNamespace(ns)}
                        class="w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors"
                        style={{
                          background: namespace() === ns ? 'var(--bg-tertiary)' : 'transparent',
                          color: namespace() === ns ? 'var(--accent-primary)' : 'var(--text-primary)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = namespace() === ns ? 'var(--bg-tertiary)' : 'transparent'}
                      >
                        <svg class="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span class="truncate flex-1">{ns}</span>
                        <Show when={namespace() === ns}>
                          <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                          </svg>
                        </Show>
                      </button>
                    )}
                  </For>
                </Show>

                {/* No results */}
                <Show when={nsSearch() && filteredNamespaces().length === 0}>
                  <div class="px-3 py-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                    No namespaces found
                  </div>
                </Show>
              </div>

              {/* Footer with count */}
              <div class="px-3 py-2 text-xs border-t" style={{ 'border-color': 'var(--border-color)', color: 'var(--text-muted)' }}>
                {namespaces().length} namespaces available
              </div>
            </div>
          </Show>
        </div>

        {/* Global Search */}
        <div class="relative">
          <svg
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--text-muted)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="global-search"
            type="text"
            placeholder="Search resources..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            class="w-72 rounded-lg pl-10 pr-16 py-1.5 text-sm"
          />
          <Show when={!searchFocused()}>
            <kbd class="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
              ⌘K
            </kbd>
          </Show>
        </div>
      </div>

      {/* Right side - Cluster selector, Status and actions */}
      <div class="flex items-center gap-4">
        {/* Cluster/Context selector with cloud provider */}
        <div class="flex items-center gap-2 relative">
          <label class="text-sm" style={{ color: 'var(--text-secondary)' }}>Cluster:</label>
          <button
            ref={ctxButtonRef}
            onClick={() => setCtxDropdownOpen(!ctxDropdownOpen())}
            disabled={switching()}
            class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm min-w-[200px] justify-between"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              opacity: switching() ? 0.7 : 1,
            }}
          >
            <div class="flex items-center gap-2">
              {/* Cloud provider logo - clickable only for cloud providers with console URLs */}
              <Show when={cloudInfo() && !cloudInfo.loading} fallback={
                <span class={`w-2 h-2 rounded-full ${clusterStatus().connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              }>
                <Show
                  when={cloudInfo()?.consoleUrl}
                  fallback={
                    // Local cluster - show icon but not clickable
                    <div
                      class="opacity-70"
                      title={`${cloudInfo()?.displayName || 'Local'} Cluster (no console available)`}
                    >
                      {getCloudLogo()()}
                    </div>
                  }
                >
                  {(consoleUrl) => (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (consoleUrl()) {
                          window.open(consoleUrl(), '_blank', 'noopener,noreferrer');
                        }
                      }}
                      class="cursor-pointer hover:opacity-80 transition-opacity"
                      title={`Open ${cloudInfo()?.displayName || 'Cloud'} Console`}
                    >
                      {getCloudLogo()()}
                    </button>
                  )}
                </Show>
              </Show>
              <div class="flex flex-col items-start">
                <span class="truncate">{switching() ? 'Switching...' : (currentContext() || 'Select cluster')}</span>
                <Show when={cloudInfo() && !cloudInfo.loading}>
                  <span class="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {cloudInfo()?.region || ''}
                  </span>
                </Show>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <span class={`w-2 h-2 rounded-full ${clusterStatus().connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <svg class={`w-4 h-4 transition-transform ${ctxDropdownOpen() ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* Context Dropdown */}
          <Show when={ctxDropdownOpen()}>
            <div
              ref={ctxDropdownRef}
              class="absolute top-full right-0 mt-1 w-72 rounded-lg shadow-xl z-[200] overflow-hidden"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
              }}
            >
              {/* Search input */}
              <div class="p-2 border-b" style={{ 'border-color': 'var(--border-color)' }}>
                <div class="relative">
                  <svg
                    class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--text-muted)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search clusters..."
                    value={ctxSearch()}
                    onInput={(e) => setCtxSearch(e.target.value)}
                    class="w-full rounded-md pl-8 pr-3 py-1.5 text-sm"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                    }}
                    autofocus
                  />
                </div>
              </div>

              {/* Context list */}
              <div class="max-h-64 overflow-y-auto">
                <Show when={!contextsResource.loading} fallback={
                  <div class="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>Loading clusters...</div>
                }>
                  <For each={filteredContexts()}>
                    {(ctx) => (
                      <button
                        onClick={() => selectContext(ctx.name)}
                        class="w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors"
                        style={{
                          background: ctx.isCurrent ? 'var(--bg-tertiary)' : 'transparent',
                          color: ctx.isCurrent ? 'var(--accent-primary)' : 'var(--text-primary)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = ctx.isCurrent ? 'var(--bg-tertiary)' : 'transparent'}
                      >
                        <span class={`w-2 h-2 rounded-full flex-shrink-0 ${ctx.connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <div class="flex-1 min-w-0">
                          <span class="truncate block">{ctx.name}</span>
                          <Show when={ctx.serverVersion}>
                            <span class="text-xs" style={{ color: 'var(--text-muted)' }}>{ctx.serverVersion}</span>
                          </Show>
                        </div>
                        <Show when={ctx.isCurrent}>
                          <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                          </svg>
                        </Show>
                      </button>
                    )}
                  </For>
                </Show>

                {/* No results */}
                <Show when={ctxSearch() && filteredContexts().length === 0}>
                  <div class="px-3 py-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                    No clusters found
                  </div>
                </Show>

                {/* Empty state */}
                <Show when={!contextsResource.loading && contexts().length === 0}>
                  <div class="px-3 py-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                    No clusters available
                  </div>
                </Show>
              </div>

              {/* Footer with count */}
              <div class="px-3 py-2 text-xs border-t" style={{ 'border-color': 'var(--border-color)', color: 'var(--text-muted)' }}>
                {contexts().length} cluster{contexts().length !== 1 ? 's' : ''} available
              </div>
            </div>
          </Show>
        </div>

        {/* Terminal button */}
        <button
          onClick={() => setTerminalOpen(true)}
          class="icon-btn"
          title="Open Local Terminal"
          style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '40px',
            minHeight: '40px'
          }}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        {/* Refresh button */}
        <button
          onClick={(e) => {
            const btn = e.currentTarget;
            btn.classList.add('refreshing');
            setTimeout(() => btn.classList.remove('refreshing'), 500);
            refreshAll();
          }}
          class="icon-btn"
          title="Refresh all data"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* AI Assistant button */}
        <button
          onClick={toggleAIPanel}
          class="flex items-center gap-2 px-4 py-2 btn-accent rounded-lg"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span>AI</span>
        </button>

        {/* Cloud Provider Badge - Far right */}
        <div
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          }}
          title={`${cloudInfo()?.displayName || 'Cloud'} - ${cloudInfo()?.region || ''}`}
        >
          {getCloudLogo()()}
          <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {cloudInfo.loading ? '...' : getProviderShortName()}
          </span>
        </div>
      </div>

      {/* Local Terminal Modal */}
      <LocalTerminalModal isOpen={terminalOpen()} onClose={() => setTerminalOpen(false)} />
    </header>
  );
};

export default Header;
