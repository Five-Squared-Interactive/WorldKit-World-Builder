/**
 * Network Connectivity Service
 *
 * Manages network connectivity detection for offline mode support.
 * Provides real-time network status updates to the renderer process.
 *
 * Features:
 * - Detect online/offline state using Electron's net module
 * - Subscribe to system network events
 * - Debounce rapid state changes to avoid flapping
 * - Callback pattern for notifying listeners
 */

import { net, BrowserWindow } from 'electron';
import { NetworkChannels } from '../../shared/ipc-channels';
import type { NetworkStatus } from '../../shared/types/ipc';

/**
 * Debounce delay in milliseconds
 * Prevents rapid state flapping when network is unstable
 */
const DEBOUNCE_DELAY = 1000;

/**
 * Polling interval in milliseconds
 * Checks net.online periodically to detect network changes
 */
const POLL_INTERVAL = 5000;

/**
 * Current network state
 */
let isOnline: boolean = true;
let mainWindow: BrowserWindow | null = null;
let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Callback for status change notifications
 */
let onStatusChangeCallback: ((status: NetworkStatus) => void) | null = null;

/**
 * Gets the current network status
 * @returns NetworkStatus object with online state
 */
export function getNetworkStatus(): NetworkStatus {
  return {
    online: isOnline,
  };
}

/**
 * Checks if currently online
 * @returns true if online, false if offline
 */
export function isNetworkOnline(): boolean {
  return isOnline;
}

/**
 * Sends network status to the renderer process
 */
function sendNetworkStatus(status: NetworkStatus): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(NetworkChannels.STATUS, status);
  }
}

/**
 * Updates the network state with debouncing
 * Prevents rapid state changes from causing UI flicker
 */
function setNetworkState(online: boolean): void {
  // Clear any pending debounce
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
    debounceTimeout = null;
  }

  // If state hasn't changed, do nothing
  if (online === isOnline) {
    return;
  }

  // Debounce the state change
  debounceTimeout = setTimeout(() => {
    isOnline = online;
    const status = getNetworkStatus();

    console.log(`[network-service] Network state changed to: ${online ? 'online' : 'offline'}`);

    // Send to renderer
    sendNetworkStatus(status);

    // Notify external listeners
    if (onStatusChangeCallback) {
      onStatusChangeCallback(status);
    }

    debounceTimeout = null;
  }, DEBOUNCE_DELAY);
}

/**
 * Registers a callback for network status changes
 * @param callback - Function to call when status changes
 */
export function onNetworkStatusChange(callback: (status: NetworkStatus) => void): void {
  onStatusChangeCallback = callback;
}

/**
 * Initializes the network service
 * Sets up polling for network state changes
 *
 * @param window - The main BrowserWindow instance for IPC communication
 */
export function initNetworkService(window: BrowserWindow): void {
  mainWindow = window;

  // Get initial state from Electron's net module
  isOnline = net.online;
  console.log(`[network-service] Initial network state: ${isOnline ? 'online' : 'offline'}`);

  // Start polling for network status changes
  // Electron doesn't have app-level 'online'/'offline' events,
  // so we poll net.online periodically to detect changes
  pollInterval = setInterval(() => {
    const currentOnline = net.online;
    if (currentOnline !== isOnline) {
      console.log(`[network-service] Polling detected network change: ${currentOnline ? 'online' : 'offline'}`);
      setNetworkState(currentOnline);
    }
  }, POLL_INTERVAL);

  console.log('[network-service] Service initialized with polling');
}

/**
 * Handles online event from system
 * Called when network connectivity is restored
 */
export function handleOnlineEvent(): void {
  console.log('[network-service] Online event received');
  setNetworkState(true);
}

/**
 * Handles offline event from system
 * Called when network connectivity is lost
 */
export function handleOfflineEvent(): void {
  console.log('[network-service] Offline event received');
  setNetworkState(false);
}

/**
 * Refreshes the network status by checking net.online
 * Useful for periodic checks or manual refresh
 */
export function refreshNetworkStatus(): void {
  const currentOnline = net.online;
  if (currentOnline !== isOnline) {
    setNetworkState(currentOnline);
  }
}

/**
 * Cleans up the network service
 * Call this before app quits
 */
export function cleanupNetworkService(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
    debounceTimeout = null;
  }
  mainWindow = null;
  onStatusChangeCallback = null;
  isOnline = true; // Reset to default
  console.log('[network-service] Service cleaned up');
}
