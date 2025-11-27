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

## 🛠️ 기술 스택 (Tech Stack)

### **Frontend**
*   **Framework**: React (Vite)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS (Responsive Design)
*   **Icons**: Lucide React

### **Backend**
*   **Runtime**: Node.js (Express)
*   **AI Model**: **Google Gemini 2.5 Flash** (Multimodal Analysis)
*   **HWP Processing**: 
    *   **Python (`pyhwp`)**: `hwp5html`을 사용하여 HWP 파일을 **HTML로 변환**, 표(Table) 구조를 완벽하게 보존하여 분석 정확도 극대화.
    *   **Hybrid Architecture**: Node.js 서버에서 Python 프로세스를 제어하는 하이브리드 구조.
*   **DOCX Processing**: `mammoth.js`
*   **Search Grounding**: Google Search를 통해 문서에 없는 정보(관할 부서, 최신 규정 등)를 실시간으로 보완 및 검증.

### **Deployment**
*   **Container**: Docker (Node.js 20-slim + Python 3 + pyhwp)
*   **Cloud**: Google Cloud Run (Serverless)
*   **CI/CD**: Google Cloud Build

## 💡 주요 기능 (Key Features)

1.  **모든 공공 문서 분석 (All-in-One Analysis)**
    *   **HWP(한글)**, PDF, DOCX, 이미지(JPG/PNG) 등 포맷에 상관없이 업로드 가능.
    *   특히 난해한 **HWP 표 데이터**를 구조적으로 인식하여 정확한 납부 금액과 기한을 추출.

2.  **핵심 행동 요약 (Actionable Insights)**
    *   "그래서 내가 뭘 해야 해?"에 대한 명확한 답을 제시.
    *   **납부 기한**, **금액**, **입금 계좌**, **담당 부서**를 카드 형태로 시각화.
    *   긴급한 고지서(독촉장 등)는 '긴급(Urgent)' 태그로 경고.

3.  **지능형 팩트 체크 (RAG & Grounding)**
    *   문서 내용을 최우선으로 하되, 문서에 없는 정보는 **신뢰할 수 있는 출처(공공기관 등)**를 검색하여 보완.
    *   할루시네이션(거짓 정보) 방지를 위해 검색 결과가 없으면 솔직하게 "정보 없음"을 안내.

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
