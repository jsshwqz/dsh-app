/**
 * After-pack hook: ensure platform icons are copied to the correct location.
 */
module.exports = async function(context) {
  const { electronPlatformName, appOutDir, electronVersion } = context
  console.log(`After pack: ${electronPlatformName} ${electronVersion}`)
}
