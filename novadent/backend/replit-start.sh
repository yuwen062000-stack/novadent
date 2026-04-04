#!/bin/bash
set -e

cd /home/runner/workspace/novadent

echo "=== 建置前端 ==="
npm run build

echo "=== 啟動 Novadent API ==="
cd /home/runner/workspace/novadent/backend
NODE_ENV=production node dist/src/main.js
