FROM python:3.12-slim

# Node.js 설치 (Vite dev server용)
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs npm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python 의존성 설치
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt supervisor

# 프론트 의존성 설치 (개발용)
COPY frontend/package.json /frontend/
RUN cd /frontend && npm install

# 소스 코드 복사 (dev 볼륨 마운트로 오버라이드됨)
COPY backend/ .
COPY frontend/ /frontend/

# Supervisor 설정
COPY supervisord.dev.conf /etc/supervisor/supervisord.conf

EXPOSE 8000 5173

CMD ["supervisord", "-c", "/etc/supervisor/supervisord.conf"]
