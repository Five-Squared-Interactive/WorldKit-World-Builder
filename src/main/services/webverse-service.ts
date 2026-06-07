/**
 * WebVerse Service
 *
 * Handles detection of WebVerse installation on the system.
 * Checks standard installation locations and PATH for both
 * WebVerse Desktop and WebVerse Runtime.
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { WebVerseDetectionResult } from '../../shared/types/ipc';

/**
 * Cached detection result to avoid repeated file system checks
 */
let cachedResult: WebVerseDetectionResult | null = null;

/**
 * Check if a file exists and is executable
 */
function isExecutable(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    // File doesn't exist or isn't executable
    return false;
  }
}

/**
 * Check if a file or directory exists
 */
function exists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the list of paths to check for WebVerse on Windows
 */
function getWindowsPaths(): string[] {
  const localAppData = process.env.LOCALAPPDATA || '';
  const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
  const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';

  return [
    // Standard install locations
    path.join(localAppData, 'WebVerse', 'WebVerse.exe'),
    path.join(localAppData, 'WebVerse-Runtime', 'WebVerse-Runtime.exe'),
    path.join(programFiles, 'WebVerse', 'WebVerse.exe'),
    path.join(programFiles, 'WebVerse-Runtime', 'WebVerse-Runtime.exe'),
    path.join(programFilesX86, 'WebVerse', 'WebVerse.exe'),
    path.join(programFilesX86, 'WebVerse-Runtime', 'WebVerse-Runtime.exe'),
  ];
}

/**
 * Get the list of paths to check for WebVerse on macOS
 */
function getMacPaths(): string[] {
  const home = app.getPath('home');

  return [
    // Standard install locations
    '/Applications/WebVerse.app/Contents/MacOS/WebVerse',
    '/Applications/WebVerse-Runtime.app/Contents/MacOS/WebVerse-Runtime',
    path.join(home, 'Applications', 'WebVerse.app', 'Contents', 'MacOS', 'WebVerse'),
    path.join(home, 'Applications', 'WebVerse-Runtime.app', 'Contents', 'MacOS', 'WebVerse-Runtime'),
  ];
}

/**
 * Get the list of paths to check for WebVerse on Linux
 */
function getLinuxPaths(): string[] {
  const home = app.getPath('home');

  return [
    // Standard install locations
    '/usr/bin/webverse',
    '/usr/local/bin/webverse',
    '/usr/bin/webverse-runtime',
    '/usr/local/bin/webverse-runtime',
    path.join(home, '.local', 'bin', 'webverse'),
    path.join(home, '.local', 'bin', 'webverse-runtime'),
    // AppImage locations
    path.join(home, 'Applications', 'WebVerse.AppImage'),
    path.join(home, 'Applications', 'WebVerse-Runtime.AppImage'),
  ];
}

/**
 * Check if WebVerse is available in PATH
 */
function checkPath(): { found: boolean; path?: string; type?: 'desktop' | 'runtime' } {
  const pathEnv = process.env.PATH || '';
  const pathSep = process.platform === 'win32' ? ';' : ':';
  const pathDirs = pathEnv.split(pathSep);

  // Executable names to look for
  const executables =
    process.platform === 'win32'
      ? ['WebVerse.exe', 'WebVerse-Runtime.exe', 'webverse.exe', 'webverse-runtime.exe']
      : ['webverse', 'webverse-runtime', 'WebVerse', 'WebVerse-Runtime'];

  for (const dir of pathDirs) {
    for (const exe of executables) {
      const fullPath = path.join(dir, exe);
      if (exists(fullPath)) {
        const isRuntime =
          exe.toLowerCase().includes('runtime') || fullPath.toLowerCase().includes('runtime');
        return {
          found: true,
          path: fullPath,
          type: isRuntime ? 'runtime' : 'desktop',
        };
      }
    }
  }

  return { found: false };
}

/**
 * Determine the type of WebVerse installation from the path
 */
function getInstallationType(exePath: string): 'desktop' | 'runtime' {
  const lowerPath = exePath.toLowerCase();
  return lowerPath.includes('runtime') ? 'runtime' : 'desktop';
}

/**
 * Detect WebVerse installation on the system
 * Checks standard installation locations and PATH
 */
export function detectWebVerse(): WebVerseDetectionResult {
  // First, check PATH (most reliable if user has it configured)
  const pathResult = checkPath();
  if (pathResult.found && pathResult.path) {
    cachedResult = {
      installed: true,
      path: pathResult.path,
      type: pathResult.type,
    };
    return cachedResult;
  }

  // Then check standard installation locations based on platform
  let searchPaths: string[] = [];

  switch (process.platform) {
    case 'win32':
      searchPaths = getWindowsPaths();
      break;
    case 'darwin':
      searchPaths = getMacPaths();
      break;
    case 'linux':
      searchPaths = getLinuxPaths();
      break;
    default:
      // Unsupported platform
      cachedResult = { installed: false };
      return cachedResult;
  }

  // Check each path
  for (const searchPath of searchPaths) {
    if (exists(searchPath)) {
      cachedResult = {
        installed: true,
        path: searchPath,
        type: getInstallationType(searchPath),
      };
      return cachedResult;
    }
  }

  // Not found
  cachedResult = { installed: false };
  return cachedResult;
}

/**
 * Get the cached WebVerse detection result
 * If no cached result exists, performs detection
 */
export function getWebVerseStatus(): WebVerseDetectionResult {
  if (cachedResult === null) {
    return detectWebVerse();
  }
  return cachedResult;
}

/**
 * Clear the cached detection result
 * Use this when user manually sets the path or after installation
 */
export function clearWebVerseCache(): void {
  cachedResult = null;
}

/**
 * Set a custom WebVerse path and update the cached result
 * @param customPath - Path to the WebVerse executable
 * @returns Updated detection result
 */
export function setCustomWebVersePath(customPath: string): WebVerseDetectionResult {
  if (!exists(customPath)) {
    return { installed: false };
  }

  cachedResult = {
    installed: true,
    path: customPath,
    type: getInstallationType(customPath),
  };

  return cachedResult;
}
