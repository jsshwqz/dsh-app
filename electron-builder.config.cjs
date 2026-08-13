/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.deepseek.dsh-desktop',
  productName: 'DSH Desktop',
  directories: { output: 'release', buildResources: 'build' },
  files: [
    'dist/**/*',
    'src/renderer/dist/**/*',
    'runtime/cordis.yml',
    'package.json',
    'build/**/*',
    '!**/*.map',
  ],
  win: {
    target: ['nsis', 'portable'],
    icon: 'build/icon.ico',
    artifactName: '\${productName}-\${version}-setup.\${ext}',
    requestedExecutionLevel: 'asInvoker',
  },
  mac: {
    target: ['dmg', 'zip'],
    icon: 'build/icon.icns',
    category: 'public.app-category.developer-tools',
    artifactName: '\${ProductName}-\${version}.\${ext}',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    extendInfo: {
      CFBundleDocumentTypes: [
        {
          CFBundleTypeName: 'All Files',
          CFBundleTypeRole: 'Editor',
          LSItemContentTypes: ['public.data'],
        },
      ],
    },
  },
  linux: {
    target: ['AppImage', 'deb', 'rpm'],
    icon: 'build/icon.png',
    category: 'Development',
    artifactName: '\${productName}-\${version}.\${ext}',
    desktop: {
      Name: 'DSH Desktop',
      Comment: 'DeepSeek Harness Desktop Client',
      Categories: 'Development;',
      Terminal: false,
      Type: 'Application',
    },
    maintainer: 'jsshwqz',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'DSH Desktop',
    installerIcon: 'build/icon.ico',
  },
  deb: {
    depends: ['libnotify4', 'libnss3', 'libxkbfile1', 'libxss1'],
  },
  rpm: {
    depends: ['notify-desktop', 'nss', 'xorg-x11-font-utils'],
  },
  afterPack: './scripts/after-pack.cjs',
}