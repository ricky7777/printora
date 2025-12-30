# Flutter Editor 遷移指南

## 問題說明

Shopify 的 `assets/` 目錄是**扁平結構**，不支持子目錄。當你嘗試訪問 `assets/editor/flutter_bootstrap.js` 時，Shopify 會返回 404 錯誤。

## 解決方案

需要將所有 `assets/editor/` 下的文件移到 `assets/` 根目錄，並加上 `editor-` 前綴。

## 執行步驟

### 1. 運行遷移腳本

```bash
cd /Users/ricky/Documents/PrintOra
./migrate_editor_files.sh
```

這個腳本會將所有文件複製到 `assets/` 根目錄並加上前綴。

### 2. 檢查文件

確認以下文件已存在於 `assets/` 根目錄：
- `editor-flutter_bootstrap.js`
- `editor-main.dart.js`
- `editor-flutter.js`
- `editor-flutter_service_worker.js`
- `editor-manifest.json`
- `editor-favicon.png`
- `editor-icon-192.png`
- `editor-icon-512.png`
- `editor-canvaskit.js`
- `editor-canvaskit.wasm`
- 等等...

### 3. 上傳到 Shopify

```bash
shopify theme push
```

### 4. 測試

訪問：`https://www.printora.co.nz/pages/custom-editor?price=35&type=standard-print`

## 重要注意事項

⚠️ **Flutter 應用內部的資源引用問題**

Flutter 應用內部的資源引用是相對路徑（如 `main.dart.js`、`canvaskit/canvaskit.js`）。如果只是移動文件，Flutter 應用仍然會嘗試從相對路徑載入資源，這會導致問題。

### 解決方案 A：重新構建 Flutter 應用（推薦）

1. 在 Flutter 專案中，使用以下命令重新構建：

```bash
flutter build web --base-href /assets/ --release
```

2. 然後將構建輸出的所有文件移到 `assets/` 根目錄並加上 `editor-` 前綴

### 解決方案 B：使用 JavaScript 重寫路徑（臨時方案）

如果無法重新構建，可以在模板中添加 JavaScript 來重寫資源路徑。但這不是最佳實踐。

## 文件對應表

| 原始路徑 | 新路徑 |
|---------|--------|
| `assets/editor/flutter_bootstrap.js` | `assets/editor-flutter_bootstrap.js` |
| `assets/editor/main.dart.js` | `assets/editor-main.dart.js` |
| `assets/editor/flutter.js` | `assets/editor-flutter.js` |
| `assets/editor/canvaskit/canvaskit.js` | `assets/editor-canvaskit.js` |
| `assets/editor/icons/Icon-192.png` | `assets/editor-icon-192.png` |
| ... | ... |

完整清單請參考 `migrate_editor_files.sh` 腳本。

