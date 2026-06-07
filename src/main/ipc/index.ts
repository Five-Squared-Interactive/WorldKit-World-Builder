/**
 * IPC Handler Registration
 *
 * Central point for registering all IPC handlers.
 * Call registerAllHandlers() during app initialization.
 */

import { registerSystemHandlers, unregisterSystemHandlers } from './systemHandlers';
import { registerUpdateHandlers, unregisterUpdateHandlers } from './updateHandlers';
import { registerNetworkHandlers, unregisterNetworkHandlers } from './networkHandlers';
import { registerProjectHandlers, unregisterProjectHandlers } from './projectHandlers';
import { registerFileHandlers, unregisterFileHandlers } from './fileHandlers';
import { registerCacheHandlers, unregisterCacheHandlers } from './cacheHandlers';
import { registerTemplateHandlers, unregisterTemplateHandlers } from './templateHandlers';
import { registerPreferencesHandlers, unregisterPreferencesHandlers } from './preferencesHandlers';
import { registerWebVerseHandlers, unregisterWebVerseHandlers } from './webverseHandlers';
import { registerExportHandlers, unregisterExportHandlers } from './exportHandlers';
import { registerPreviewHandlers, unregisterPreviewHandlers } from './previewHandlers';

/**
 * Register all IPC handlers for the application
 * Should be called once during app.whenReady()
 */
export function registerAllHandlers(): void {
  registerSystemHandlers();
  registerUpdateHandlers();
  registerNetworkHandlers();
  registerProjectHandlers();
  registerFileHandlers();
  registerCacheHandlers();
  registerTemplateHandlers();
  registerPreferencesHandlers();
  registerWebVerseHandlers();
  registerExportHandlers();
  registerPreviewHandlers();
}

/**
 * Unregister all IPC handlers
 * Useful for cleanup during testing
 */
export function unregisterAllHandlers(): void {
  unregisterSystemHandlers();
  unregisterUpdateHandlers();
  unregisterNetworkHandlers();
  unregisterProjectHandlers();
  unregisterFileHandlers();
  unregisterCacheHandlers();
  unregisterTemplateHandlers();
  unregisterPreferencesHandlers();
  unregisterWebVerseHandlers();
  unregisterExportHandlers();
  unregisterPreviewHandlers();
}

// Re-export individual handler modules
export { registerSystemHandlers, unregisterSystemHandlers } from './systemHandlers';
export { registerUpdateHandlers, unregisterUpdateHandlers } from './updateHandlers';
export { registerNetworkHandlers, unregisterNetworkHandlers } from './networkHandlers';
export { registerProjectHandlers, unregisterProjectHandlers } from './projectHandlers';
export { registerFileHandlers, unregisterFileHandlers } from './fileHandlers';
export { registerCacheHandlers, unregisterCacheHandlers } from './cacheHandlers';
export { registerTemplateHandlers, unregisterTemplateHandlers } from './templateHandlers';
export { registerPreferencesHandlers, unregisterPreferencesHandlers } from './preferencesHandlers';
export { registerWebVerseHandlers, unregisterWebVerseHandlers } from './webverseHandlers';
export { registerExportHandlers, unregisterExportHandlers, triggerExport } from './exportHandlers';
export { registerPreviewHandlers, unregisterPreviewHandlers } from './previewHandlers';
