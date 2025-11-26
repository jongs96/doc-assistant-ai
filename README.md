# GovDocAI (공공기관 문서 AI 도우미)

> **복잡한 행정 문서, AI가 쉽고 빠르게 분석해드립니다.**  
> HWP, DOCX, PDF 등 다양한 형식의 공공기관 문서를 분석하여 핵심 내용 요약, 납부 정보, 중요 기한을 한눈에 파악할 수 있는 서비스입니다.

## 프로젝트 소개

**GovDocAI**는 고지서, 안내문, 법적 통지서 등 이해하기 어려운 행정 문서를 누구나 쉽게 이해할 수 있도록 돕는 웹 애플리케이션입니다.  
Google Gemini AI를 활용하여 문서를 분석하고, 사용자가 취해야 할 행동(납부, 신청 등)을 명확하게 제시합니다.

### ※ 주요 기능

*   **다양한 파일 지원**: PDF, 이미지(JPG, PNG)는 물론, **HWP(한글)**, **DOCX(워드)** 파일까지 완벽하게 지원합니다.
*   **핵심 요약**: 문서의 종류를 자동으로 식별하고, 가장 중요한 내용을 3줄 요약으로 제공합니다.
*   **액션 아이템 추출**: 납부 금액, 기한, 계좌번호 등 사용자가 수행해야 할 구체적인 행동을 추출합니다.
*   **용어 설명**: 어려운 행정/법률 용어를 쉬운 말로 풀어서 설명해줍니다.
*   **AI 챗봇 상담**: 문서를 기반으로 궁금한 점을 AI에게 질문하고 실시간으로 답변을 받을 수 있습니다.

---

## ※ 기술 스택 (Tech Stack)

### Frontend
*   **React**: 최신 리액트 기능을 활용한 사용자 인터페이스 구축
*   **TypeScript**: 정적 타입 시스템을 통한 안정적인 코드 작성
*   **Vite**: 빠르고 가벼운 빌드 도구
*   **Tailwind CSS** (Optional): 스타일링 (프로젝트 설정에 따라 다름)

### Backend
*   **Node.js & Express**: 가볍고 유연한 백엔드 서버 구축
*   **Google Gemini API (gemini-2.5-flash)**: 고성능 AI 모델을 이용한 문서 분석 및 챗봇 구현
*   **pyhwp**: HWP 파일 텍스트 추출 (Python 라이브러리)
*   **mammoth**: DOCX 파일 텍스트 추출 (Node.js 라이브러리)

---

## 시작하기 (Getting Started)

이 프로젝트를 로컬 환경에서 실행하려면 다음 단계들을 따라주세요.

### 사전 요구사항 (Prerequisites)
*   **Node.js** (v18 이상)
*   **Python** (v3.8 이상, HWP 변환용)
*   **Google Gemini API Key**

### 설치 (Installation)

1.  **패키지 설치**
    ```bash
    npm install
    ```

2.  **Python 라이브러리 설치 (HWP 지원)**
    ```bash
    pip install pyhwp
    ```

3.  **환경 변수 설정**
    최상위 디렉토리에 `.env` 파일을 생성하고 API 키를 입력하세요.
    .env
    API_KEY=gemini api key를 발급받아 넣어주세요.
    PORT=3001

### 실행 (Running)

1.  **백엔드 서버 실행**
    ```bash
    npm run server
    ```
    (서버는 `http://localhost:3001`에서 실행됩니다.)

2.  **프론트엔드 개발 서버 실행** (새 터미널에서)
    ```bash
    npm run dev
    ```
    (브라우저에서 `http://localhost:5173`으로 접속하세요.)

---

## 프로젝트 구조

```
ai-doc-assistant_v2/
├── public/             # 정적 파일
├── src/                # React 소스 코드
│   ├── components/     # UI 컴포넌트
│   ├── App.tsx         # 메인 앱 컴포넌트
│   └── main.tsx        # 진입점
├── server.js           # Express 백엔드 서버 (API & 파일 처리)
├── package.json        # 프로젝트 의존성 및 스크립트
└── README.md           # 프로젝트 설명서
```
