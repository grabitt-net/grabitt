// Expo config plugin: mark location hardware features as NOT required.
//
// expo-location adds ACCESS_FINE/COARSE_LOCATION permissions, and Google Play
// implies `android.hardware.location[.gps|.network]` as *required* features from
// those permissions — which excludes devices without GPS (tablets, etc.) and
// triggers Play's "no longer supports N devices" warning. "Near Me" is a
// convenience, not a core feature, so we declare these features optional.
const { withAndroidManifest } = require('@expo/config-plugins')

const FEATURES = [
  'android.hardware.location',
  'android.hardware.location.gps',
  'android.hardware.location.network',
]

module.exports = function withLocationNotRequired(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest
    manifest['uses-feature'] = manifest['uses-feature'] || []
    for (const name of FEATURES) {
      const existing = manifest['uses-feature'].find(
        (f) => f && f['$'] && f['$']['android:name'] === name,
      )
      if (existing) {
        existing['$']['android:required'] = 'false'
      } else {
        manifest['uses-feature'].push({ $: { 'android:name': name, 'android:required': 'false' } })
      }
    }
    return cfg
  })
}
