#!/usr/bin/env bash
# compile_shaders.sh
# Compiles GLSL compute shaders to SPIR-V for the ClonEngine Vulkan Fusion layer.
#
# Prerequisites:
#   Android NDK: $ANDROID_NDK/shader-tools/linux-x86_64/glslangValidator
#   OR system glslang: sudo apt install glslang-tools   (Ubuntu/Debian)
#
# Run from: artifacts/klonos/modules/klonos-callosum/scripts/
# Output: ../android/src/main/assets/shaders/connectome_fusion.spv

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CPP_DIR="$SCRIPT_DIR/../android/src/main/cpp"
ASSET_DIR="$SCRIPT_DIR/../android/src/main/assets/shaders"
SHADER="$CPP_DIR/connectome_fusion.comp"
OUTPUT="$ASSET_DIR/connectome_fusion.spv"

mkdir -p "$ASSET_DIR"

# Try NDK glslangValidator first, then system fallback
NDK_GLSLANG=""
if [ -n "${ANDROID_NDK:-}" ]; then
  for ARCH in linux-x86_64 darwin-x86_64 windows-x86_64; do
    CANDIDATE="$ANDROID_NDK/shader-tools/$ARCH/glslangValidator"
    if [ -f "$CANDIDATE" ]; then
      NDK_GLSLANG="$CANDIDATE"
      break
    fi
  done
fi

GLSLANG="${NDK_GLSLANG:-$(which glslangValidator 2>/dev/null || echo '')}"

if [ -z "$GLSLANG" ]; then
  echo "ERROR: glslangValidator not found."
  echo "Install with: sudo apt install glslang-tools"
  echo "Or set ANDROID_NDK to your NDK path."
  exit 1
fi

echo "Compiling: $SHADER"
echo "Compiler:  $GLSLANG"
echo "Output:    $OUTPUT"

"$GLSLANG" -V "$SHADER" -o "$OUTPUT" --target-env vulkan1.1

echo ""
echo "SPIR-V size: $(wc -c < "$OUTPUT") bytes"
echo ""
echo "Done. connectome_fusion.spv is ready for Android assets."
echo ""
echo "Next: run 'npx expo prebuild --platform android' to rebuild the native module."
