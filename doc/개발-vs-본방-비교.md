# 📋 이미지 압축 서비스 — 개발 환경 vs 본방 환경 비교

> **최종 업데이트**: 2026-05-27

---

## 1. 환경별 Docker Compose 파일

| 환경 | 파일 | 용도 |
|------|------|------|
| **개발** | `docker-compose.yml` | 로컬 개발, 핫 리로드, 빠른 디버깅 |
| **본방** | `docker-compose.prod.yml` | 실 서비스, 안정성, 성능 최적화 |

---

## 2. 항목별 상세 비교

### 2.1 API 서버 (FastAPI)

| 항목 | 개발 | 본방 |
|------|------|------|
| **런타임** | `uvicorn app.main:app --reload` | `gunicorn + uvicorn.workers.UvicornWorker` |
| **워커 수** | 1 (단일 프로세스) | 4 (멀티 프로세스) |
| **핫 리로드** | ✅ 코드 변경 시 자동 재시작 | ❌ (보안/성능 이유로 제거) |
| **타임아웃** | 기본값 | 120초 |
| **액세스 로그** | 콘솔 | stdout (-) |

**본방 Dockerfile**: `backend/Dockerfile.prod`
```dockerfile
CMD ["gunicorn", "app.main:app", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--max-requests", "10000", \
     "--max-requests-jitter", "500", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
```

---

### 2.2 프론트엔드 (React)

| 항목 | 개발 | 본방 |
|------|------|------|
| **서빙 방식** | Vite Dev Server (`npm run dev`) | Nginx 정적 파일 서빙 |
| **포트** | 5173 | 80 |
| **핫 리로드** | ✅ 실시간 반영 | ❌ (빌드 후 정적 파일) |
| **빌드** | 실시간 (메모리) | 사전 빌드 (`npm run build`) |
| **Dockerfile** | `Dockerfile.dev` | `Dockerfile.prod` (멀티스테이지) |
| **Nginx 설정** | 없음 (Vite 내장) | `nginx.conf.prod` |

**본방 Nginx 설정**: `frontend/nginx.conf.prod`
```nginx
# 정적 파일 서빙
location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "public, max-age=3600";
}

# API 리버스 프록시
location /api {
    proxy_pass http://backend_api;
    client_max_body_size 25M;
    proxy_read_timeout 120s;
}
```

---

### 2.3 포트 노출 방식

| 서비스 | 개발 | 본방 |
|--------|------|------|
| **backend** | `ports: "8000:8000"` (직접 노출) | `expose: "8000"` (내부 전용) |
| **worker** | `ports: 없음` | `expose: 없음` |
| **redis** | `ports: "6379:6379"` (직접 노출) | `expose: "6379"` (내부 전용) |
| **frontend** | `ports: "5173:5173"` | `ports: "80:80"` (유일한 외부 포트) |

> **본방 원칙**: 프론트엔드(80번 포트)만 외부에 노출. API, Redis 등은 Docker 내부 네트워크로만 통신.

---

### 2.4 Redis

| 항목 | 개발 | 본방 |
|------|------|------|
| **AOF(Append Only File)** | ❌ 비활성화 | ✅ 활성화 (`--appendonly yes`) |
| **메모리 제한** | 없음 (무제한) | 256MB (`--maxmemory 256mb`) |
| **메모리 정책** | 기본 (noeviction) | LRU (`allkeys-lru`) |
| **볼륨** | 없음 (데이터 휘발) | `redis-data:/data` (영속성) |

---

### 2.5 Celery Worker

| 항목 | 개발 | 본방 |
|------|------|------|
| **Concurrency** | 4 | 2 (리소스 고려) |
| **리소스 제한** | 없음 | CPU 2코어, Memory 1GB |
| **소스 마운트** | ✅ 볼륨 마운트 (코드 실시간 반영) | ❌ (빌드 시점 고정) |

---

### 2.6 환경변수 관리

| 항목 | 개발 | 본방 |
|------|------|------|
| **방식** | `environment:` 필드에 직접 작성 | `env_file: .env` 로 외부 파일 사용 |
| **.gitignore** | `.env` 제외 | `.env` 제외 |
| **템플릿** | 없음 | `.env.example` 제공 |

---

### 2.7 리소스 제한

| 서비스 | 개발 | 본방 |
|--------|------|------|
| **backend** | 제한 없음 | CPU 1.0코어 / Memory 512MB |
| **worker** | 제한 없음 | CPU 2.0코어 / Memory 1GB |
| **redis** | 제한 없음 | Memory 512MB |
| **frontend** | 제한 없음 | Memory 128MB |

---

### 2.8 재시작 정책

| 환경 | 정책 |
|------|------|
| **개발** | 기본 (컨테이너 중단 시 재시작 안 함) |
| **본방** | `restart: unless-stopped` (명시적 중단 전까지 자동 재시작) |

---

### 2.9 MinIO

| 항목 | 개발 | 본방 |
|------|------|------|
| **포함 여부** | ✅ `docker-compose.yml`에 포함 | ❌ 제거 |
| **이유** | 계획 단계에서 고려 | 로컬 스토리지로 충분 |

---

## 3. 실행 명령어 비교

### 개발 환경 실행
```bash
# 전체 서비스 시작
docker compose up -d

# 특정 서비스만 재빌드
docker compose up -d --build backend

# 로그 확인
docker compose logs -f
```

### 본방 환경 실행
```bash
# 전체 서비스 시작 (프로덕션 파일 지정)
docker compose -f docker-compose.prod.yml up -d --build

# 특정 서비스만 재빌드
docker compose -f docker-compose.prod.yml up -d --build backend

# 로그 확인
docker compose -f docker-compose.prod.yml logs -f

# 전체 중지
docker compose -f docker-compose.prod.yml down
```

---

## 4. 필요한 파일 목록

### 개발 환경에 필요한 파일

```
docker-compose.yml
backend/
├── Dockerfile
├── Dockerfile.prod       (본방 준비용)
├── requirements.txt
├── .env                  (로컬 개발용)
├── .env.example          (설정 템플릿)
└── app/
frontend/
├── Dockerfile
├── Dockerfile.dev
├── Dockerfile.prod       (본방 준비용)
├── nginx.conf.prod       (본방 준비용)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── src/
```

### 본방 서버에 필요한 파일

```
docker-compose.prod.yml
.env                      (서버에서 직접 생성)
backend/
├── Dockerfile.prod
├── requirements.txt
└── app/
frontend/
├── Dockerfile.prod
├── nginx.conf.prod
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── src/
```

---

## 5. 배포 전 체크리스트

- [ ] `docker-compose.prod.yml` 확인 (버전, 포트, 볼륨)
- [ ] `.env` 파일 생성 및 민감 정보 설정
- [ ] `nginx.conf.prod`의 `server_name` 도메인 변경
- [ ] 방화벽에서 80/443 포트만 허용 (6379, 8000 등 차단)
- [ ] SSL 인증서 설정 (Caddy 또는 Certbot)
- [ ] Git 클론 또는 소스 업로드
- [ ] `docker compose -f docker-compose.prod.yml up -d --build` 실행
- [ ] 헬스 체크 확인 (`curl http://localhost/health`)
- [ ] 실제 이미지 업로드 테스트
- [ ] 로그 모니터링 (`docker compose -f docker-compose.prod.yml logs -f`)
