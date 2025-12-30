#!/bin/bash

# Flutter Editor 文件遷移腳本
# 將 assets/editor/ 下的文件移到 assets/ 根目錄並加上 editor- 前綴

SOURCE_DIR="assets/editor"
TARGET_DIR="assets"

echo "開始遷移 Flutter Editor 文件..."

# 檢查源目錄是否存在
if [ ! -d "$SOURCE_DIR" ]; then
    echo "錯誤: $SOURCE_DIR 目錄不存在"
    exit 1
fi

# 1. 遷移主要文件
echo "遷移主要文件..."
cp "$SOURCE_DIR/flutter_bootstrap.js" "$TARGET_DIR/editor-flutter_bootstrap.js"
cp "$SOURCE_DIR/main.dart.js" "$TARGET_DIR/editor-main.dart.js"
cp "$SOURCE_DIR/flutter.js" "$TARGET_DIR/editor-flutter.js"
cp "$SOURCE_DIR/flutter_service_worker.js" "$TARGET_DIR/editor-flutter_service_worker.js"
cp "$SOURCE_DIR/manifest.json" "$TARGET_DIR/editor-manifest.json"
cp "$SOURCE_DIR/version.json" "$TARGET_DIR/editor-version.json"
cp "$SOURCE_DIR/favicon.png" "$TARGET_DIR/editor-favicon.png"

# 2. 遷移 Icons
echo "遷移 Icons..."
cp "$SOURCE_DIR/icons/Icon-192.png" "$TARGET_DIR/editor-icon-192.png"
cp "$SOURCE_DIR/icons/Icon-512.png" "$TARGET_DIR/editor-icon-512.png"
cp "$SOURCE_DIR/icons/Icon-maskable-192.png" "$TARGET_DIR/editor-icon-maskable-192.png"
cp "$SOURCE_DIR/icons/Icon-maskable-512.png" "$TARGET_DIR/editor-icon-maskable-512.png"

# 3. 遷移 Canvaskit 文件
echo "遷移 Canvaskit 文件..."
cp "$SOURCE_DIR/canvaskit/canvaskit.js" "$TARGET_DIR/editor-canvaskit.js"
cp "$SOURCE_DIR/canvaskit/canvaskit.wasm" "$TARGET_DIR/editor-canvaskit.wasm"
cp "$SOURCE_DIR/canvaskit/skwasm.js" "$TARGET_DIR/editor-skwasm.js"
cp "$SOURCE_DIR/canvaskit/skwasm.wasm" "$TARGET_DIR/editor-skwasm.wasm"
cp "$SOURCE_DIR/canvaskit/skwasm_heavy.js" "$TARGET_DIR/editor-skwasm-heavy.js"
cp "$SOURCE_DIR/canvaskit/skwasm_heavy.wasm" "$TARGET_DIR/editor-skwasm-heavy.wasm"
cp "$SOURCE_DIR/canvaskit/chromium/canvaskit.js" "$TARGET_DIR/editor-canvaskit-chromium.js"
cp "$SOURCE_DIR/canvaskit/chromium/canvaskit.wasm" "$TARGET_DIR/editor-canvaskit-chromium.wasm"

# 4. 遷移 Assets 子目錄文件
echo "遷移 Assets 文件..."
cp "$SOURCE_DIR/assets/FontManifest.json" "$TARGET_DIR/editor-font-manifest.json"
cp "$SOURCE_DIR/assets/AssetManifest.bin.json" "$TARGET_DIR/editor-asset-manifest.json"
cp "$SOURCE_DIR/assets/printora_logo.png" "$TARGET_DIR/editor-printora-logo.png"
cp "$SOURCE_DIR/assets/tee_black.png" "$TARGET_DIR/editor-tee-black.png"
cp "$SOURCE_DIR/assets/tee_white.png" "$TARGET_DIR/editor-tee-white.png"
cp "$SOURCE_DIR/assets/size_chart.png" "$TARGET_DIR/editor-size-chart.png"
cp "$SOURCE_DIR/assets/fonts/MaterialIcons-Regular.otf" "$TARGET_DIR/editor-material-icons.otf"
cp "$SOURCE_DIR/assets/shaders/ink_sparkle.frag" "$TARGET_DIR/editor-ink-sparkle.frag"
cp "$SOURCE_DIR/assets/shaders/stretch_effect.frag" "$TARGET_DIR/editor-stretch-effect.frag"
cp "$SOURCE_DIR/assets/packages/cupertino_icons/assets/CupertinoIcons.ttf" "$TARGET_DIR/editor-cupertino-icons.ttf"

echo "文件遷移完成！"
echo ""
echo "注意："
echo "1. 這些文件已經複製到 assets/ 根目錄"
echo "2. 你需要手動修改 Flutter 應用的資源引用路徑"
echo "3. 或者重新構建 Flutter 應用，使用 --base-href /assets/ 參數"
echo ""
echo "下一步："
echo "1. 檢查 assets/ 目錄確認文件已複製"
echo "2. 使用 shopify theme push 上傳到 Shopify"
echo "3. 測試頁面是否正常載入"

