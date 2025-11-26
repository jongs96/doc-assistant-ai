
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { exec } from 'child_process';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { pathToFileURL } from 'url';
import mammoth from 'mammoth';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files from the React app
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'dist')));


// Initialize Gemini
if (!process.env.API_KEY) {
  console.error("Error: API_KEY is missing in environment variables.");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = "gemini-2.5-flash";

// --- Text Extraction Logic ---

const getTempFilePath = (ext) => {
  const randomName = crypto.randomBytes(8).toString('hex');
  return path.resolve(os.tmpdir(), `govdoc_${randomName}.${ext}`);
};

const extractTextFromHwp = (base64Data) => {
  return new Promise(async (resolve, reject) => {
    const inputPath = getTempFilePath('hwp');
    const outputPath = getTempFilePath('txt');

    try {
      const buffer = Buffer.from(base64Data, 'base64');
      await fsPromises.writeFile(inputPath, buffer);

      // Use hwp5txt command directly (installed via pip)
      const command = `hwp5txt --output "${outputPath}" "${inputPath}"`;

      console.log(`[Server] Extracting HWP text: ${command}`);

      exec(command, { timeout: 30000 }, async (error, stdout, stderr) => {
        // Cleanup input
        await fsPromises.unlink(inputPath).catch(() => { });

        if (error) {
          console.error("[Server] hwp5txt Error:", error);
          console.error("[Server] Stderr:", stderr);
          return reject(new Error(`HWP 텍스트 추출 실패 (pyhwp 오류): ${stderr || error.message}`));
        }

        if (fs.existsSync(outputPath)) {
          const text = await fsPromises.readFile(outputPath, 'utf-8');
          await fsPromises.unlink(outputPath).catch(() => { });
          resolve(text);
        } else {
          reject(new Error("HWP 텍스트 추출 결과 파일이 없습니다."));
        }
      });
    } catch (err) {
      await fsPromises.unlink(inputPath).catch(() => { });
      reject(err);
    }
  });
};

const extractTextFromDocx = async (base64Data) => {
  const buffer = Buffer.from(base64Data, 'base64');
  try {
    const result = await mammoth.extractRawText({ buffer: buffer });
    return result.value;
  } catch (error) {
    console.error("[Server] Mammoth Error:", error);
    throw new Error("DOCX 텍스트 추출 실패");
  }
};

// --- Schema & Prompts ---

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "A simplified, easy-to-read summary based on document type. If it's a bill, start with 'You need to pay...'.",
    },
    documentType: {
      type: Type.STRING,
      description: "Specific document classification (e.g., 'Value-Added Tax Notice', 'Traffic Fine', 'Housing Subscription Notice').",
    },
    sentiment: {
      type: Type.STRING,
      enum: ["URGENT", "NEUTRAL", "GOOD_NEWS"],
      description: "The urgency of the document.",
    },
    actions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING, description: "Action description (e.g., 'Pay Income Tax')." },
          deadline: { type: Type.STRING, description: "Specific date (YYYY-MM-DD) or 'Immediately'. Return null if none." },
          amount: { type: Type.STRING, description: "Monetary amount with currency (e.g., '87,000 KRW'). Return null if none." },
          recipient: { type: Type.STRING, description: "Institution name (e.g., 'National Tax Service'). Return null if none." },
          priority: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"], description: "Urgency level." },
        },
        required: ["description", "priority"],
      },
    },
    keyTerms: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING, description: "Difficult term found in text." },
          definition: { type: Type.STRING, description: "Easy explanation of the term." },
        },
      },
    },
  },
  required: ["summary", "documentType", "actions", "sentiment"],
};

const cleanJsonString = (text) => {
  try {
    const firstOpen = text.indexOf('{');
    const lastClose = text.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
      return text.substring(firstOpen, lastClose + 1);
    }
    return text;
  } catch (e) {
    return text;
  }
};

// --- API Routes ---

app.post('/api/analyze', async (req, res) => {
  try {
    const { files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "File data is required" });
    }

    const parts = [];

    // 1. Process files
    for (const file of files) {
      const mimeType = file.mimeType;

      if (mimeType === 'application/pdf' || mimeType.startsWith('image/')) {
        // Keep PDF/Image as inlineData
        parts.push({
          inlineData: {
            data: file.base64Data,
            mimeType: mimeType,
          },
        });
      } else if (mimeType.includes('hwp') || mimeType.includes('hancom')) {
        // Extract Text from HWP
        try {
          const text = await extractTextFromHwp(file.base64Data);
          parts.push({ text: `\n[Document Content (HWP)]: \n${text}\n` });
        } catch (e) {
          console.error("HWP Extraction Error:", e);
          // Fallback: Try sending as binary? No, Gemini might not understand raw HWP.
          // Just report error or skip.
          throw new Error(`HWP 변환 오류: ${e.message}`);
        }
      } else if (mimeType.includes('word') || mimeType.includes('officedocument')) {
        // Extract Text from DOCX
        try {
          const text = await extractTextFromDocx(file.base64Data);
          parts.push({ text: `\n[Document Content (DOCX)]: \n${text}\n` });
        } catch (e) {
          console.error("DOCX Extraction Error:", e);
          throw new Error(`DOCX 변환 오류: ${e.message}`);
        }
      } else {
        // Unknown text file?
        if (mimeType.startsWith('text/')) {
          const text = Buffer.from(file.base64Data, 'base64').toString('utf-8');
          parts.push({ text: `\n[Document Content (Text)]: \n${text}\n` });
        } else {
          console.warn(`Unsupported file type: ${mimeType}, skipping.`);
        }
      }
    }

    // 2. Construct Prompt
    const prompt = `
      You are an expert AI assistant for Korean administrative and legal documents.
      You are provided with document contents (either as images/PDFs or extracted text).
      Your goal is to help users (freelancers, elderly, office workers) understand complex official documents instantly.

      **Task Instructions:**
      1. **Identify Document Type**: Determine if this is a Tax Notice (국세/지방세), Utility Bill (공과금), Legal Notice (등기/공문), or Application Guide (청약/지원금).
      
      2. **Tailored Summary**:
         - **For Tax/Bills**: "You have to pay [Amount] for [Reason] by [Date]. If late, extra fees apply."
         - **For Legal/Warnings**: "This is a warning about [Topic]. You must [Action] by [Date] to avoid [Penalty]."
         - **For Applications**: "You can apply for [Benefit] if you meet [Criteria] between [Start Date] and [End Date]."
         - **For General**: Summarize the core message simply.
      
      3. **Extract Specific Actions (Critical)**:
         - **Separation**: If the document contains multiple payments (e.g., Income Tax AND Local Tax), create SEPARATE action items for each.
         - **Accuracy**: Extract exact amounts and deadlines from ALL provided files/text. 
         - **Priority**: Mark as HIGH if the deadline is within 7 days or if terms like "Seizure(압류)", "Warning(독촉)" are present.

      4. **Terminology**: Identify difficult legal/administrative terms and provide clear, simple definitions.

      5. **Language**: Output strictly in **Korean**.
      
      Input Data: ${parts.length} part(s) provided.
    `;

    // Add prompt as the first part
    parts.unshift({ text: prompt });

    console.log("Sending request to Gemini...");

    // 3. Call Gemini
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        role: "user",
        parts: parts,
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.1,
      },
    });

    const text = response.text;
    if (!text) throw new Error("AI did not return any text response");

    console.log("Gemini response received.");

    try {
      const cleanedText = cleanJsonString(text);
      const parsedData = JSON.parse(cleanedText);
      res.json(parsedData);
    } catch (jsonError) {
      console.error("JSON Parse Failed:", text);
      throw new Error("AI 응답을 분석할 수 없습니다 (JSON Parsing Error).");
    }

  } catch (error) {
    console.error("Analysis Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { history, message, documentContext } = req.body;

    const systemInstruction = `
      당신은 대한민국 공공기관 행정 문서 전문가입니다. 
      아래 제공된 [문서 분석 데이터]를 기반으로 답변하되, 문서에 없는 내용은 **Google Search**를 통해 보완하여 답변해야 합니다.

      [문서 분석 데이터]:
      ${documentContext}

      [답변 원칙 (Priority)]:
      1. **제 1원칙: 문서 우선 (Ground Truth)**
         - 사용자의 질문에 대한 답이 [문서 분석 데이터]에 있다면, 무조건 그 내용을 최우선으로 답변하세요.

      2. **제 2원칙: 관련성 높은 검색 (Strictly Relevant Search)**
         - 문서에 없는 내용(예: 구체적인 납부 기한, 담당 부서 연락처)을 물어볼 때만 검색하세요.
         - **검색 키워드**: 문서에 명시된 **'정확한 사업명', '공고 번호', '기관명'** 등을 포함하여 구체적으로 검색해야 합니다. (예: "2025년 청년도약계좌 신청기간" O, "청년 적금 기간" X)
         - **일반론 금지**: 질문과 직접적으로 관련 없는 일반적인 법령(예: "국가연구개발혁신법에 따르면...")이나 다른 유사 사업의 사례를 나열하지 마세요. 사용자는 **이 문서**에 대한 답을 원합니다.

      3. **제 3원칙: 모르면 모른다고 하기 (Compact Failure)**
         - 문서에도 없고, **이 문서와 직접 관련된** 검색 결과도 없다면, 억지로 정보를 끼워 맞추지 마세요.
         - **답변 양식**: "죄송하지만 문서 내용에 없으며, 관련 검색 결과(공고문 등)에서도 정확한 정보를 찾을 수 없습니다."라고 **한 문장으로 간결하게** 답변하세요.
         - 불필요한 배경 지식이나 TMI(Too Much Information)를 덧붙이지 마세요.

      4. **답변 스타일**:
         - **친절하고 명확하게**: 전문 용어는 쉽게 풀어서 설명하고, 중요한 정보(날짜, 금액, 기관명)는 **굵게(Bold)** 표시하세요.
         - **출처 명시**: 문서에 있는 내용은 "문서에 따르면...", 검색한 내용은 "검색 결과(출처)에 따르면..."이라고 명확히 구분해서 말해주세요.
    `;

    const chat = ai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }]
      },
      history: history.map(h => ({
        role: h.role,
        parts: h.parts
      }))
    });

    const result = await chat.sendMessage({ message });
    res.json({ text: result.text });

  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: "Failed to generate chat response" });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Text extraction enabled: HWP (pyhwp), DOCX (mammoth)`);
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
