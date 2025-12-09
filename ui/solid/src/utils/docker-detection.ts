// Copyright 2025 KubeGraf Contributors
// Docker detection utilities

export interface DockerDetectionResult {
  available: boolean;
  error?: string;
  installUrl?: string;
}

/**
 * Get Docker Desktop installation URL based on OS
 */
export function getDockerInstallUrl(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('win')) {
    return 'https://www.docker.com/products/docker-desktop/';
  } else if (userAgent.includes('mac')) {
    return 'https://www.docker.com/products/docker-desktop/';
  } else {
    return 'https://docs.docker.com/get-docker/';
  }
}

/**
 * Check if Docker is available (client-side check)
 * Note: This is a basic check. The backend will do the actual verification.
 */
export function checkDockerAvailable(): Promise<DockerDetectionResult> {
  return new Promise((resolve) => {
    // We can't directly check Docker from the browser
    // This will be handled by the backend API
    // For now, we'll assume it might be available and let the backend verify
    resolve({
      available: true, // Optimistic - backend will verify
    });
  });
}

/**
 * Format Docker error message with install link
 */
export function formatDockerError(): { message: string; installUrl: string } {
  const installUrl = getDockerInstallUrl();
  const osName = navigator.userAgent.includes('Win') ? 'Windows' :
                 navigator.userAgent.includes('Mac') ? 'macOS' : 'Linux';
  
  return {
    message: `Docker is not installed or not running on ${osName}. Local clusters (k3d, kind, minikube) require Docker Desktop to be installed and running.`,
    installUrl,
  };
}

