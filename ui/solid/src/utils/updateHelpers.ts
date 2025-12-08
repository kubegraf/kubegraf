// Update helper utilities for managing update operations

import { api } from '../services/api';
import { UpdateInfo } from '../stores/globalStore';

export interface UpdateInstallResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Applies an update by calling the install API
 * @param updateInfo - The update information containing downloadUrl
 * @returns Promise with the installation result
 */
export async function applyUpdate(updateInfo: UpdateInfo): Promise<UpdateInstallResult> {
  if (!updateInfo.downloadUrl) {
    return {
      success: false,
      error: 'Download URL is not available for this update',
    };
  }

  try {
    const result = await api.installUpdate(updateInfo.downloadUrl);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to apply update',
    };
  }
}

/**
 * Checks if an update can be applied (has downloadUrl)
 * @param updateInfo - The update information to check
 * @returns true if update can be applied
 */
export function canApplyUpdate(updateInfo: UpdateInfo | null): boolean {
  return updateInfo !== null && updateInfo.updateAvailable && !!updateInfo.downloadUrl;
}

