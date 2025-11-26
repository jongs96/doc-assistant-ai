
import type { DocumentAnalysis } from "../types";

// Assuming the backend runs on port 3001 (standard pattern for React + Node setups)
// In production, this URL would come from an environment variable (e.g., VITE_API_URL)
const API_BASE_URL = "/api";

export interface UploadFile {
  base64Data: string;
  mimeType: string;
}

export const analyzeDocument = async (files: UploadFile[]): Promise<DocumentAnalysis> => {
  try {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "서버 통신 중 오류가 발생했습니다.");
    }

    const data = await response.json();
    return data as DocumentAnalysis;

  } catch (error) {
    console.error("Backend Analysis failed:", error);
    // Rethrow with a more user-friendly message if possible, or catch in App component
    throw error;
  }
};

export const chatWithDocument = async (
  history: { role: string; parts: { text: string }[] }[], 
  message: string, 
  documentContext: string
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        history, 
        message, 
        documentContext 
      }),
    });

    if (!response.ok) {
      throw new Error("채팅 서버 오류");
    }

    const data = await response.json();
    return data.text;

  } catch (error) {
    console.error("Backend Chat failed:", error);
    return "죄송합니다. 서버 연결에 실패하여 답변을 드릴 수 없습니다.";
  }
};
