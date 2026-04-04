#!/bin/bash
# Replit 啟動腳本
# 1. 安裝前端依賴並 build
# 2. 安裝後端依賴
# 3. 啟動後端（同時 serve 前端）

echo "=== 安裝前端依賴 ==="
cd /home/runner/novadent
npm install

echo "=== 建置前端 ==="
npm run build

echo "=== 安裝後端依賴 ==="
cd /home/runner/novadent/backend
npm install

echo "=== 建立/更新資料庫表格（drizzle-kit push）==="
npx drizzle-kit push --yes

echo "=== 啟動 Novadent API ==="
npm run start:prod
