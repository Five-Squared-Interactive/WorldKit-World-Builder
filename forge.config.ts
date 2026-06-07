import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

// GitHub repository for auto-update releases
// Set these environment variables or configure directly for production
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'Five-Squared-Interactive';
const GITHUB_REPO = process.env.GITHUB_REPO || 'WorldKit-World-Builder';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: 'World Builder',
    executableName: 'worldkit',
    // Protocol handler for worldkit:// deep links
    protocols: [
      {
        name: 'WorldKit Protocol',
        schemes: ['worldkit'],
      },
    ],
    // File associations for .worldkit and .veml files
    fileAssociations: [
      {
        ext: 'worldkit',
        name: 'WorldKit Project',
        description: 'WorldKit World Builder Project',
        mimeType: 'application/x-worldkit',
        role: 'Editor',
      },
      {
        ext: 'veml',
        name: 'VEML File',
        description: 'Virtual Environment Markup Language',
        mimeType: 'application/x-veml',
        role: 'Viewer',
      },
    ],
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: 'WorldBuilder',
      // Windows code signing (optional - set environment variables)
      // certificateFile: process.env.WINDOWS_CERTIFICATE_FILE,
      // certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD,
    }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  // Publishers configuration for auto-update
  // Uses GitHub Releases as the update server
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: GITHUB_OWNER,
          name: GITHUB_REPO,
        },
        prerelease: false,
        draft: true, // Creates draft releases for review before publishing
      },
    },
  ],
  plugins: [
    new VitePlugin({
      // Build configurations for main, preload, and renderer processes
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload/index.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses for enhanced security
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
