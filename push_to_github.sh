#!/bin/bash

# Lấy thời gian hiện tại
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

echo "🚀 Bắt đầu quá trình đẩy code lên GitHub..."

# Thêm tất cả thay đổi
git add .

# Commit với message là thời gian hiện tại
git commit -m "Auto-sync: $TIMESTAMP"

# Push lên repository
git push origin main

echo "✅ Đã đẩy code thành công lúc $TIMESTAMP"
