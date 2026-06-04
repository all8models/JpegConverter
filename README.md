# 📦 이미지 압축 웹서비스 (Image Compression Service)

사용자가 웹페이지에 이미지를 업로드하면, JPEG 압축 원리를 기반으로 원하는 크기와 품질로 압축하여 다운로드할 수 있는 웹 서비스입니다. 

## 🚀 주요 기능

- **빠르고 간편한 이미지 압축**: 웹 브라우저에서 드래그 앤 드롭으로 파일 업로드
- **맞춤형 압축 설정**: 
  - 압축 품질(Quality) 1~100 조절 가능
  - 최대 너비/높이 리사이즈 지원
  - 메타데이터(EXIF) 제거 기능 지원
- **프라이버시 보장**: 압축 처리가 완료된 이미지는 일정 시간 후 자동 삭제되며, 영구 보관되지 않음
- **비동기 큐잉 시스템**: Celery와 Redis를 통해 여러 명의 사용자가 대용량 파일을 업로드해도 안정적으로 순차 처리

## 🛠 기술 스택

- **Backend**: FastAPI (Python), Pillow (이미지 처리)
- **Frontend**: React + Vite (FastAPI가 정적 파일 직접 서빙)
- **Async Task / Message Broker**: Celery, Redis
- **Process Manager**: Supervisor (FastAPI + Celery Worker 동일 컨테이너)
- **Infra / Deployment**: Docker, Docker Compose

## 🏗 시스템 아키텍처

```text
┌──────────────────────────────────────────┐
│              app 컨테이너                  │
│                                          │
│  ┌─────────────┐    ┌─────────────┐      │
│  │   FastAPI   │    │   Celery    │      │
│  │  (+정적서빙) │    │   Worker    │      │
│  └──────┬──────┘    └──────┬──────┘      │
│         │                  │              │
│         ▼                  ▼              │
│  ┌─────────────┐    ┌─────────────┐      │
│  │  React SPA  │    │  /tmp/results│      │
│  │  (정적파일)  │    │  (결과저장)  │      │
│  └─────────────┘    └─────────────┘      │
└──────────────────────────────────────────┘
         │                        │
         ▼                        ▼
  ┌─────────────┐         ┌─────────────┐
  │    Redis    │         │   Volume    │
  │  (Broker)   │         │  results-   │
  └─────────────┘         │   data      │
                          └─────────────┘
```

## 💻 설치 및 실행 방법

### 1. 소스 코드 준비
```bash
git clone <repository-url>
cd JpegDownload
```

### 2. Docker를 이용한 실행 및 정지 (권장)

가장 빠르고 간편하게 전체 서비스를 실행하는 방법입니다. 로컬에 Docker가 설치되어 있어야 합니다.
단 **2개 컨테이너**(app + redis)만으로 모든 서비스가 동작합니다.

**처음 실행하거나 코드를 변경하여 다시 빌드해야 할 때:**
```bash
docker compose up -d --build
```

**이미 생성된 컨테이너를 단순히 다시 기동할 때:**
```bash
docker compose start
```

**서비스 정지:**
```bash
docker compose stop
```
*(컨테이너와 네트워크를 완전히 삭제하려면 `docker compose down`을 사용합니다.)*

### 3. 수동으로 실행 및 정지 (로컬 개발용)

Docker 없이 직접 실행하려면 Python(3.12 권장), Node.js(22 권장) 및 로컬 Redis 서버가 준비되어 있어야 합니다. (정지할 때는 각각 실행 중인 터미널에서 `Ctrl + C`를 누르세요.)

**[Terminal 1] 백엔드 (FastAPI) 기동:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**[Terminal 2] 비동기 워커 (Celery) 기동:**
```bash
cd backend
celery -A app.tasks.image_tasks.celery_app worker --loglevel=info
```

**[Terminal 3] 프론트엔드 (React) 기동:**
```bash
cd frontend
npm install
npm run dev
```

### 4. 서비스 접속
- **프론트엔드 (웹 UI)**: `http://localhost` (Docker 실행 시) 또는 `http://localhost:5173` (수동 실행 시)
- **백엔드 API 문서**: `http://localhost:8000/docs`
  - Docker 실행 시 FastAPI가 프론트엔드 정적 파일도 함께 서빙하므로, `http://localhost:8000`으로도 웹 UI에 접속할 수 있습니다.

## 📖 문서 가이드

개발 및 운영에 도움이 되는 상세 문서가 포함되어 있습니다:
- [이미지압축서비스.md](./doc/이미지압축서비스.md): 프로젝트 기획 및 전체 아키텍처 설계서
- [본방-배포-가이드.md](./doc/본방-배포-가이드.md): 운영 서버(Production) 배포 시 필요한 설정 및 가이드
- [개발-vs-본방-비교.md](./doc/개발-vs-본방-비교.md): 로컬 개발 환경과 실제 배포 환경의 차이점 요약
- [시퀀스-다이어그램.md](./doc/시퀀스-다이어그램.md): 클라이언트와 서버 간의 데이터 흐름 다이어그램
- [트러블슈팅-로그.md](./doc/트러블슈팅-로그.md) & [디버깅-전과정-해설.md](./doc/디버깅-전과정-해설.md): 개발 중 발생할 수 있는 이슈 및 해결 과정

## 🛡 보안 및 제한사항

- **최대 파일 크기**: 25MB 이하
- **지원 포맷**: `image/jpeg`, `image/png`, `image/webp` (출력은 JPEG로 통일)
- 압축된 파일은 작업 완료 후 `/tmp/results` (Docker volume)에 임시 저장되었다가 다운로드 이후 또는 스케줄러에 의해 삭제됩니다.

## 🤝 기여 방법
이슈와 풀 리퀘스트(PR)는 언제나 환영합니다. 코드 기여 시, 기존 포맷터/린터 규칙을 준수해 주세요.
