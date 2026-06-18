#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR/server"
echo "========================================"
echo "  Neon Tank Battle - 启动中..."
echo "========================================"
echo ""
echo "游戏将在浏览器中自动打开"
echo "如果未自动打开，请访问:"
echo "  http://localhost:3000"
echo ""
node index.js
echo ""
echo "按 Enter 键退出..."
read
