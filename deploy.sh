#!/usr/bin/env bash
set -euo pipefail

# ============================================
# JPEG 압축 서비스 - Production 배포 스크립트
# 사용법: ./deploy.sh [version]
#   version: 생략 시 VERSION 파일 참조
# ============================================

cd "$(dirname "$0")"

# 버전 결정
if [ $# -ge 1 ]; then
  VERSION="$1"
  echo "$VERSION" > VERSION
else
  VERSION=$(cat VERSION 2>/dev/null || echo "unknown")
fi

TAG="jpegdownload-app:${VERSION}"
echo "▶ Deploying version: ${VERSION}"

# 1. 이미지 빌드
echo "▶ Building ${TAG} ..."
docker build -f Dockerfile.prod \
  -t "${TAG}" \
  -t jpegdownload-app:latest \
  .

# 2. .env 파일 확인
if [ ! -f backend/.env ]; then
  echo "⚠ backend/.env 파일이 없습니다. backend/.env.example을 참고하세요."
fi

# 3. 배포 (이전 컨테이너 교체)
echo "▶ Deploying ..."
VERSION_TAG="${VERSION}" docker compose -f docker-compose.prod.yml up -d

# 4. 헬스 체크
echo "▶ Health check ..."
sleep 3
if curl -sf http://localhost/health > /dev/null 2>&1; then
  echo "✅ Deploy complete! (version: ${VERSION})"
else
  echo "⚠ Health check failed. Check logs: docker compose logs app"
fi
