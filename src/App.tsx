
import React, { useState, useRef } from 'react';
import { Upload, FileText, ShieldCheck, Loader2, FileType, X, Check, AlertCircle, Trash2, Camera } from 'lucide-react';
import { analyzeDocument, type UploadFile } from './services/geminiService';
import { AppStatus, type DocumentAnalysis } from './types';
import { AnalysisView } from './components/AnalysisView';
import { ChatInterface } from './components/ChatInterface';

// --- Types & Interfaces ---
interface FilePreview {
  id: string;
  name: string;
  size: string;
  type: string;
  data: string; // Base64
  isImage: boolean;
  fileObject: File;
}

interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

// --- Sub-components (Internal for App.tsx) ---

// 1. Toast Notification Component
const ToastContainer = ({ toasts, removeToast }: { toasts: ToastMessage[], removeToast: (id: number) => void }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in-up transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' :
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'
            }`}
        >
          {toast.type === 'success' && <Check size={16} />}
          {toast.type === 'error' && <AlertCircle size={16} />}
          {toast.type === 'info' && <Loader2 size={16} className="animate-spin" />}
          {toast.message}
          <button onClick={() => removeToast(toast.id)} className="ml-2 opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

// 2. Privacy Agreement Modal
const PrivacyModal = ({ isOpen, onClose, onAgree }: { isOpen: boolean, onClose: () => void, onAgree: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full mb-4 mx-auto">
            <ShieldCheck size={24} />
          </div>
          <h3 className="text-xl font-bold text-center text-slate-900">개인정보 보호 및 이용 안내</h3>
        </div>
        <div className="p-6 space-y-4 text-sm text-slate-600 leading-relaxed max-h-[60vh] overflow-y-auto">
          <p>
            <strong>GovDoc AI</strong>는 사용자의 편의를 위해 문서를 분석하는 자동화 도구입니다.
            실제 서비스 이용을 위해 다음 사항을 확인해주세요.
          </p>
          <ul className="list-disc pl-5 space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <li>업로드된 문서는 AI 분석 목적으로만 일시적으로 사용됩니다.</li>
            <li>주민등록번호 등 <strong>고유식별정보는 마스킹(가림) 처리</strong> 후 업로드하는 것을 권장합니다.</li>
            <li>AI 분석 결과는 참고용이며, 법적 효력이 없습니다. 중요 사항은 반드시 원본 문서를 확인하세요.</li>
          </ul>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-white transition-colors"
          >
            취소
          </button>
          <button
            onClick={onAgree}
            className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
          >
            동의하고 시작하기
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysis | null>(null);

  // Multi-file state
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [newFilesBuffer, setNewFilesBuffer] = useState<File[]>([]); // Files waiting for privacy agreement

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // --- Toast Logic ---
  const addToast = (type: ToastMessage['type'], message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- File Handling Helpers ---
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getMimeType = (file: File): string => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'hwp') return 'application/x-hwp';
    if (ext === 'hwpx') return 'application/x-hwp';
    if (ext === 'doc') return 'application/msword';
    if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (ext === 'pdf') return 'application/pdf';
    return file.type || 'application/octet-stream';
  };

  // --- Event Handlers ---

  // 1. File Selection (Add to list)
  const handleFilesSelect = (files: FileList | File[]) => {
    const validFiles: File[] = [];
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      // Validation: Check file size (max 10MB per file)
      if (file.size > 10 * 1024 * 1024) {
        addToast('error', `${file.name}: 파일 크기는 10MB를 초과할 수 없습니다.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setNewFilesBuffer(validFiles);
      if (filePreviews.length === 0) {
        setShowPrivacyModal(true);
      } else {
        processFiles(validFiles);
      }
    }
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      handleFilesSelect(event.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // 2. Drag & Drop
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelect(e.dataTransfer.files);
    }
  };

  // 3. Privacy Agreed -> Process
  const handlePrivacyAgree = () => {
    setShowPrivacyModal(false);
    if (newFilesBuffer.length > 0) {
      processFiles(newFilesBuffer);
      setNewFilesBuffer([]);
    }
  };

  const processFiles = async (files: File[]) => {
    const newPreviews: FilePreview[] = [];
    let hasConversion = false;

    for (const file of files) {
      try {
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const mimeType = getMimeType(file);
        const isImage = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(file.name.split('.').pop()?.toLowerCase() || '');

        if (mimeType.includes('hwp') || mimeType.includes('word') || mimeType.includes('msword')) {
          hasConversion = true;
        }

        newPreviews.push({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: formatSize(file.size),
          type: mimeType,
          data: base64String,
          isImage: isImage,
          fileObject: file
        });
      } catch (error) {
        addToast('error', `${file.name} 파일을 읽는 중 오류가 발생했습니다.`);
      }
    }

    setFilePreviews(prev => [...prev, ...newPreviews]);
    if (hasConversion) {
      addToast('info', '문서(HWP/DOC)가 감지되었습니다. 자동 변환하여 분석합니다.');
    }
  };

  const removeFile = (id: string) => {
    setFilePreviews(prev => prev.filter(f => f.id !== id));
  };

  const runAnalysis = async () => {
    if (filePreviews.length === 0) return;

    setStatus(AppStatus.ANALYZING);
    setErrorMessage(null);

    const hasHwp = filePreviews.some(f => f.type.includes('hwp') || f.type.includes('word'));
    if (hasHwp) {
      // Give visual feedback that conversion is happening
      addToast('info', '파일 변환 중입니다... 잠시만 기다려주세요.');
    }

    const filesPayload: UploadFile[] = filePreviews.map(f => ({
      base64Data: f.data.split(',')[1],
      mimeType: f.type
    }));

    try {
      const result = await analyzeDocument(filesPayload);
      setAnalysisResult(result);
      setStatus(AppStatus.RESULTS);
      addToast('success', '문서 분석이 완료되었습니다.');
    } catch (error: any) {
      console.error(error);
      setStatus(AppStatus.ERROR);
      // Display specific server error message
      setErrorMessage(error.message || "분석에 실패했습니다. 파일이 손상되지 않았는지 확인해주세요.");
    }
  };

  const resetApp = () => {
    setStatus(AppStatus.IDLE);
    setAnalysisResult(null);
    setFilePreviews([]);
    setNewFilesBuffer([]);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 flex flex-col">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Privacy Modal */}
      <PrivacyModal
        isOpen={showPrivacyModal}
        onClose={() => {
          setShowPrivacyModal(false);
          setNewFilesBuffer([]);
        }}
        onAgree={handlePrivacyAgree}
      />

      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={resetApp}>
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg group-hover:bg-indigo-700 transition-colors">
              <FileText size={20} strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold tracking-tight">GovDoc<span className="text-indigo-600">AI</span></span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
              <ShieldCheck size={14} /> SSL 보안 적용됨
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-12 pb-20 flex-1 w-full">

        {status === AppStatus.IDLE && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
            <div className="text-center mb-12 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-bold mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                New: 2025년 최신 세법 반영
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight">
                복잡한 공공문서<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">
                  AI가 3초 만에 정리합니다
                </span>
              </h1>
              <p className="text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
                주민세, 재산세 고지서부터 복잡한 등기우편까지.<br />
                <span className="font-bold text-slate-800">사진 여러 장</span>을 찍어 올려도 한 번에 분석해드립니다.
              </p>
            </div>

            {/* Upload Area */}
            <div className="w-full max-w-lg space-y-6">
              {/* File List (if any) */}
              {filePreviews.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">업로드된 파일 ({filePreviews.length})</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {filePreviews.map((file) => (
                      <div key={file.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {file.isImage ? (
                            <img src={file.data} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <FileType className="text-slate-400" size={20} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{file.name}</p>
                          <p className="text-xs text-slate-500">{file.size}</p>
                        </div>
                        <button
                          onClick={() => removeFile(file.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inputs */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.hwp,.hwpx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/x-hwp,application/haansofthwp,application/vnd.hancom.hwp"
                className="hidden"
              />
              <input
                type="file"
                ref={cameraInputRef}
                onChange={onFileChange}
                accept="image/*"
                capture="environment"
                className="hidden"
              />

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* File Upload Button */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={`
                    group relative overflow-hidden rounded-3xl p-6 cursor-pointer transition-all duration-300
                    flex flex-col items-center justify-center gap-3 border-2 border-dashed min-h-[180px]
                    ${isDragging
                      ? 'bg-indigo-50 border-indigo-400 scale-105 shadow-xl'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-1'
                    }
                  `}
                >
                  <div className={`
                    p-4 rounded-2xl transition-colors duration-300
                    ${isDragging ? 'bg-indigo-200 text-indigo-700' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'}
                  `}>
                    <Upload size={32} strokeWidth={2} />
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold block text-slate-800">파일 업로드</span>
                    <p className="text-slate-400 text-xs mt-1">PDF, HWP, 이미지</p>
                  </div>
                </div>

                {/* Camera Button */}
                <div
                  onClick={() => cameraInputRef.current?.click()}
                  className="
                    group relative overflow-hidden rounded-3xl p-6 cursor-pointer transition-all duration-300
                    flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 min-h-[180px]
                    bg-white hover:border-indigo-300 hover:shadow-lg hover:-translate-y-1
                  "
                >
                  <div className="p-4 rounded-2xl bg-slate-50 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors duration-300">
                    <Camera size={32} strokeWidth={2} />
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold block text-slate-800">카메라 촬영</span>
                    <p className="text-slate-400 text-xs mt-1">고지서/문서 즉시 촬영</p>
                  </div>
                </div>
              </div>

              {/* Analyze Button */}
              {filePreviews.length > 0 && (
                <button
                  onClick={runAnalysis}
                  className="w-full py-4 rounded-2xl bg-slate-900 text-white text-lg font-bold shadow-lg hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 animate-fade-in-up"
                >
                  <span className="relative flex h-3 w-3 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                  </span>
                  {filePreviews.length}개 문서 분석 시작하기
                </button>
              )}

              {/* Features Grid (only show if no files) */}
              {filePreviews.length === 0 && (
                <div className="mt-8 grid grid-cols-3 gap-4">
                  {[
                    { step: '01', title: '자동 분류', desc: '고지서/안내문 구분' },
                    { step: '02', title: '핵심 요약', desc: '어려운 용어 풀이' },
                    { step: '03', title: '행동 가이드', desc: '납부기한/계좌 추출' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center text-center space-y-1">
                      <span className="text-xs font-bold text-indigo-200">{item.step}</span>
                      <span className="font-bold text-slate-700 text-sm">{item.title}</span>
                      <span className="text-xs text-slate-400">{item.desc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {status === AppStatus.ANALYZING && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-75"></div>
              <div className="relative bg-white p-6 rounded-full shadow-lg border border-indigo-100">
                <Loader2 size={40} className="text-indigo-600 animate-spin" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">문서를 분석하고 있습니다</h2>
            <p className="text-slate-500 mb-10 text-center max-w-xs">
              AI가 {filePreviews.length}개의 파일을 읽고<br />중요한 정보를 추출 중입니다.
            </p>

            {/* File Stack Preview */}
            <div className="flex -space-x-4 overflow-hidden py-4">
              {filePreviews.slice(0, 3).map((file, i) => (
                <div key={file.id} className="w-16 h-20 bg-white rounded-lg shadow-md border border-slate-200 flex items-center justify-center overflow-hidden relative z-0" style={{ zIndex: 10 - i, transform: `rotate(${i * 5 - 5}deg)` }}>
                  {file.isImage ? (
                    <img src={file.data} className="w-full h-full object-cover" />
                  ) : (
                    <FileType className="text-slate-300" />
                  )}
                </div>
              ))}
              {filePreviews.length > 3 && (
                <div className="w-16 h-20 bg-slate-800 text-white rounded-lg shadow-md border border-slate-200 flex items-center justify-center z-0 relative font-bold">
                  +{filePreviews.length - 3}
                </div>
              )}
            </div>
          </div>
        )}

        {status === AppStatus.RESULTS && analysisResult && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in h-auto lg:h-[calc(100vh-100px)]">
            {/* Left Column: Analysis Result */}
            <div className="lg:col-span-8 space-y-6 overflow-y-auto lg:overflow-visible">
              <div className="flex items-center justify-between">
                <button onClick={resetApp} className="text-sm font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors">
                  &larr; 처음으로 돌아가기
                </button>
                <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">
                  AI 분석 결과
                </span>
              </div>

              <AnalysisView data={analysisResult} />
            </div>

            {/* Right Column: Chat & Original File */}
            <div className="lg:col-span-4 space-y-6 flex flex-col h-full">
              <div className="sticky top-24 space-y-6 flex-1 flex flex-col">
                {/* Chat Widget */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px] w-full">
                  <ChatInterface documentSummary={JSON.stringify(analysisResult)} />
                </div>

                {/* Original Files List (Compact) */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm shrink-0 max-h-[200px] overflow-y-auto">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center sticky top-0">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">참고한 파일들 ({filePreviews.length})</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {filePreviews.map((f) => (
                      <div key={f.id} className="p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                        <div className="w-8 h-8 bg-slate-100 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                          {f.isImage ? <img src={f.data} className="w-full h-full object-cover" /> : <FileType size={14} className="text-slate-400" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-700 truncate">{f.name}</p>
                          <p className="text-[10px] text-slate-400">{f.size}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {status === AppStatus.ERROR && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
            <div className="bg-red-50 p-6 rounded-full text-red-500 mb-6 shadow-sm">
              <AlertCircle size={48} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">분석할 수 없습니다</h2>
            <p className="mt-3 text-red-600 font-medium max-w-lg mx-auto mb-8 leading-relaxed bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm">
              {errorMessage || "문서의 내용이 너무 흐리거나, 지원하지 않는 형식일 수 있습니다."}
            </p>
            <button
              onClick={resetApp}
              className="bg-slate-900 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              다시 시도하기
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
