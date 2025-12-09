// Copyright 2025 KubeGraf Contributors
// Cloud provider logo URL mappings with official logos from CDNs

export interface CloudProviderLogoConfig {
  name: string;
  logoUrl: string;
  svgContent?: string; // Fallback SVG if URL fails
  altText: string;
}

/**
 * Official cloud provider logo URLs
 * Using reliable CDNs and official sources for accurate logos
 */
export const CLOUD_PROVIDER_LOGOS: Record<string, CloudProviderLogoConfig> = {
  gcp: {
    name: 'Google Cloud Platform',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg',
    altText: 'Google Cloud Platform',
    // Fallback SVG - official GCP logo colors
    svgContent: `<svg viewBox="0 0 256 206" xmlns="http://www.w3.org/2000/svg">
      <path d="M170.252 56.819l22.253-22.253 1.483-9.37C153.437-11.677 88.976-7.496 52.42 33.92 42.267 45.423 34.734 59.764 30.717 74.573l7.97-1.123 44.505-7.34 3.436-3.513c19.797-21.742 53.27-24.667 76.128-5.632l7.496-.146z" fill="#EA4335"/>
      <path d="M224.205 73.918a100.249 100.249 0 00-30.217-48.722l-31.232 31.232a55.515 55.515 0 0120.379 44.037v5.544c15.35 0 27.797 12.446 27.797 27.796 0 15.352-12.446 27.573-27.797 27.573h-55.671l-5.466 5.621v33.339l5.466 5.389h55.67c40.143.312 73.076-31.857 73.388-72 .178-23.106-10.736-44.898-29.84-59.653l-2.477.844z" fill="#4285F4"/>
      <path d="M71.87 205.796h55.593V161.29H71.87a27.275 27.275 0 01-11.467-2.545l-7.97 2.468-22.331 22.253-1.949 7.65c12.758 9.603 28.39 14.758 44.484 14.68h-.767z" fill="#34A853"/>
      <path d="M71.87 50.525C31.727 50.837-1.207 84.447.081 124.59c.72 22.632 11.389 43.821 28.925 57.476l32.25-32.25c-16.292-7.378-23.503-26.672-16.125-42.964a31.86 31.86 0 0116.125-16.125l-32.25-32.25A72.002 72.002 0 0071.87 50.525z" fill="#FBBC05"/>
    </svg>`,
  },
  aws: {
    name: 'Amazon Web Services',
    logoUrl: 'https://logo.svgcdn.com/logos/aws.svg',
    altText: 'Amazon Web Services',
    // Fallback SVG - AWS logo
    svgContent: `<svg viewBox="0 0 256 153" xmlns="http://www.w3.org/2000/svg">
      <path d="M72.392 55.438c0 3.137.34 5.68.933 7.545a45.373 45.373 0 002.712 6.103c.424.678.593 1.356.593 1.95 0 .847-.508 1.695-1.61 2.543l-5.34 3.56c-.763.509-1.526.763-2.205.763-.847 0-1.695-.424-2.543-1.187a26.224 26.224 0 01-3.051-3.984 65.48 65.48 0 01-2.628-5.001c-6.612 7.798-14.92 11.698-24.922 11.698-7.12 0-12.8-2.035-16.954-6.103-4.153-4.07-6.272-9.495-6.272-16.277 0-7.206 2.543-13.054 7.714-17.462 5.17-4.408 12.037-6.612 20.682-6.612 2.882 0 5.849.254 8.985.678 3.137.424 6.358 1.102 9.749 1.865V29.33c0-6.443-1.356-10.935-3.984-13.563-2.712-2.628-7.29-3.9-13.817-3.9-2.967 0-6.018.34-9.155 1.103-3.136.762-6.188 1.695-9.155 2.882-.763.34-1.441.593-1.95.763-.508.17-.932.254-1.271.254-1.102 0-1.61-.763-1.61-2.374v-4.153c0-1.272.17-2.205.593-2.713.424-.508 1.187-1.017 2.374-1.525 2.967-1.526 6.527-2.798 10.68-3.815C24.922.678 29.33.085 33.992.085c10.256 0 17.716 2.374 22.463 7.12 4.662 4.747 7.036 11.952 7.036 21.615v28.618h-.1z" fill="#252F3E"/>
      <path d="M237.596 145.256c-29.126 21.531-71.418 32.974-107.813 32.974-50.996 0-96.927-18.853-131.65-50.235-2.713-2.459-.339-5.849 2.967-3.9 37.517 21.785 83.787 34.922 131.65 34.922 32.296 0 67.78-6.697 100.414-20.598 4.916-2.12 9.07 3.221 4.432 6.837z" fill="#FF9900"/>
      <path d="M249.548 131.524c-3.73-4.747-24.668-2.289-34.078-1.102-2.882.339-3.306-2.12-.678-3.9 16.7-11.698 43.99-8.308 47.127-4.408 3.136 3.984-.848 31.314-16.531 44.369-2.374 2.035-4.662.932-3.56-1.78 3.475-8.562 11.189-28.449 7.72-33.179z" fill="#FF9900"/>
    </svg>`,
  },
  azure: {
    name: 'Microsoft Azure',
    logoUrl: '', // Use SVG fallback to avoid CORS issues
    altText: 'Microsoft Azure',
    svgContent: `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
      <path d="M33.337 6.11L2.305 81.954h21.792L57.67 6.11H33.337z" fill="#0078D4"/>
      <path d="M71.175 26.316H43.09L20.97 82.097h22.125l28.08-55.781z" fill="#0078D4"/>
      <path d="M79.04 6.11L57.8 89.9h18.41l21.484-83.79H79.04z" fill="#0078D4"/>
    </svg>`,
  },
  ibm: {
    name: 'IBM Cloud',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg',
    altText: 'IBM Cloud',
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#0530AD">
      <path d="M0 7.5h4.05v.9H0zm5.4 0v.9H6.3v-.9h-.9zm3.6 0v.9h4.05v-.9H9zm8.1 0v.9h.9v-.9h-.9zm3.6 0v.9H24v-.9h-3.3zM0 9.3h4.05v.9H0zm5.4 0v.9H6.3v-.9h-.9zm3.6 0v.9h4.05v-.9H9zm8.1 0v.9h.9v-.9h-.9zm3.6 0v.9H24v-.9h-3.3z"/>
    </svg>`,
  },
  oracle: {
    name: 'Oracle Cloud',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/50/Oracle_logo.svg/440px-Oracle_logo.svg.png',
    altText: 'Oracle Cloud',
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#F80000">
      <path d="M6.754 16.15h10.492c2.294 0 4.254-1.96 4.254-4.254S19.54 7.642 17.246 7.642H6.754C4.46 7.642 2.5 9.602 2.5 11.896s1.96 4.254 4.254 4.254zm0-6.204h10.492c1.078 0 1.95.872 1.95 1.95s-.872 1.95-1.95 1.95H6.754c-1.078 0-1.95-.872-1.95-1.95s.872-1.95 1.95-1.95z"/>
    </svg>`,
  },
  digitalocean: {
    name: 'DigitalOcean',
    logoUrl: 'https://www.digitalocean.com/favicon.ico',
    altText: 'DigitalOcean',
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#0080FF">
      <path d="M12.04 24v-4.8h-4.8V24H12zm-4.8-4.8v-3.6H3.6v3.6h3.64zm0-3.6v-3.6H3.6v3.6h3.64zm6-3.6v-3.6H9.6v3.6h3.64zm0 0a7.2 7.2 0 007.2-7.2H12.04v4.8h4.8v-4.8h-4.8v7.2z"/>
    </svg>`,
  },
  alibaba: {
    name: 'Alibaba Cloud',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Alibaba_Cloud_logo.svg',
    altText: 'Alibaba Cloud',
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#FF6A00">
      <path d="M21.692 18.5L12 13.5l-9.692 5L0 17l12-6.154L24 17l-2.308 1.5zm0-6L12 7.5l-9.692 5L0 11l12-6.154L24 11l-2.308 1.5z"/>
    </svg>`,
  },
  linode: {
    name: 'Linode',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Linode_logo.svg',
    altText: 'Linode',
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#00A95C">
      <path d="M12 2L2 7l10 5 10-5-10-5zm0 7.5L4.5 7 12 4.5l7.5 2.5L12 9.5z"/>
    </svg>`,
  },
  vultr: {
    name: 'Vultr',
    logoUrl: 'https://www.vultr.com/media/logo.svg',
    altText: 'Vultr',
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#007BFC">
      <path d="M19.743 6H23.5l-7 12h-3.757L19.743 6z"/>
    </svg>`,
  },
  ovh: {
    name: 'OVH Cloud',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/OVH_logo.svg',
    altText: 'OVH Cloud',
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#123F6D">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
    </svg>`,
  },
  hetzner: {
    name: 'Hetzner Cloud',
    logoUrl: 'https://www.hetzner.com/assets/theme2018/img/favicon.svg',
    altText: 'Hetzner Cloud',
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#D50C2D">
      <path d="M4 4h16v16H4V4zm2 2v12h12V6H6z"/>
    </svg>`,
  },
  openshift: {
    name: 'Red Hat OpenShift',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/OpenShift-LogoType.svg',
    altText: 'Red Hat OpenShift',
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#EE0000">
      <path d="M21.665 11.812l-9.027-3.046a.67.67 0 00-.423 0l-9.027 3.046a.67.67 0 00-.445.631v5.545c0 .286.18.542.445.632l9.027 3.046a.67.67 0 00.423 0l9.027-3.046a.67.67 0 00.445-.632v-5.545a.67.67 0 00-.445-.631z"/>
    </svg>`,
  },
  rancher: {
    name: 'Rancher',
    logoUrl: 'https://rancher.com/img/brand/rancher-logo-horiz-color.svg',
    altText: 'Rancher',
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#0075A8">
      <path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/>
    </svg>`,
  },
  kind: {
    name: 'Kind',
    logoUrl: 'https://kind.sigs.k8s.io/images/favicon.png',
    altText: 'Kind',
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#326CE5">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
    </svg>`,
  },
  minikube: {
    name: 'Minikube',
    logoUrl: 'https://minikube.sigs.k8s.io/images/logo/logo.png',
    altText: 'Minikube',
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#326CE5">
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/>
    </svg>`,
  },
  'docker-desktop': {
    name: 'Docker Desktop',
    logoUrl: 'https://www.docker.com/wp-content/uploads/2022/03/vertical-logo-monochromatic.svg',
    altText: 'Docker Desktop',
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#2496ED">
      <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185z"/>
    </svg>`,
  },
  k3s: {
    name: 'K3s',
    logoUrl: 'https://k3s.io/img/logo/k3s-logo-light.svg',
    altText: 'K3s',
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#FFC61C">
      <path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/>
    </svg>`,
  },
  generic: {
    name: 'Cloud',
    logoUrl: '',
    altText: 'Cloud Provider',
    svgContent: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
    </svg>`,
  },
};

/**
 * Get logo configuration for a cloud provider
 */
export function getCloudProviderLogo(provider: string | undefined | null): CloudProviderLogoConfig {
  const normalizedProvider = provider?.toLowerCase() || 'generic';
  return CLOUD_PROVIDER_LOGOS[normalizedProvider] || CLOUD_PROVIDER_LOGOS.generic;
}
