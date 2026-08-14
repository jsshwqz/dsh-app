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
    '!**/*.map',
  ],
  win: {
    target: ['nsis', 'portable'],
    icon: 'build/icon.ico',
    artifactName: '${productName}-${version}-setup.${ext}',
  },
  mac: {
    target: ['dmg', 'zip'],
    icon: 'build/icon.icns',
    category: 'public.app-category.developer-tools',
    artifactName: '${ProductName}-${version}.${ext}',
  },
  linux: {
    target: ['AppImage', 'deb'],
    icon: 'build/icon.png',
    category: 'Development',
    artifactName: '${productName}-${version}.${ext}',
  },
  nsis: { oneClick: false, allowToChangeInstallationDirectory: true },
};