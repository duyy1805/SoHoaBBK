const fs = require("fs");
const path = require("path");

const cmakePath = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-native-keyboard-controller",
  "android",
  "src",
  "main",
  "jni",
  "CMakeLists.txt"
);

if (!fs.existsSync(cmakePath)) {
  console.log("react-native-keyboard-controller is not installed; skipping CMake patch.");
  process.exit(0);
}

const unityBuildLine =
  "set_target_properties(${LIB_TARGET_NAME} PROPERTIES UNITY_BUILD ON)";
const source = fs.readFileSync(cmakePath, "utf8");

if (source.includes(unityBuildLine)) {
  console.log("Keyboard controller CMake Unity Build patch is already applied.");
  process.exit(0);
}

const marker = ")\n\ntarget_include_directories(\n  ${LIB_TARGET_NAME}";
if (!source.includes(marker)) {
  throw new Error(
    "Unsupported react-native-keyboard-controller CMakeLists.txt; Unity Build patch was not applied."
  );
}

const patched = source.replace(
  marker,
  `)\n\n${unityBuildLine}\n\ntarget_include_directories(\n  \${LIB_TARGET_NAME}`
);

fs.writeFileSync(cmakePath, patched);
console.log("Applied keyboard controller CMake Unity Build patch.");
