const {
  AndroidConfig,
  withAndroidManifest,
} = require("@expo/config-plugins");

function withKeyboardManifest(config) {
  return withAndroidManifest(config, (modConfig) => {
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(
      modConfig.modResults
    );

    mainActivity.$["android:windowSoftInputMode"] = "adjustResize";
    return modConfig;
  });
}

module.exports = function withAndroidKeyboardConfig(config) {
  return withKeyboardManifest(config);
};
