import React from 'react';
import { ActionPriority, type DocumentAnalysis } from '../types';
import { AlertTriangle, CheckCircle, Clock, FileText, Info, Building } from 'lucide-react';

interface AnalysisViewProps {
  data: DocumentAnalysis;
}

const PriorityBadge = ({ priority }: { priority: ActionPriority }) => {
  switch (priority) {
    case ActionPriority.HIGH:
      return <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><AlertTriangle size={12} /> 긴급</span>;
    case ActionPriority.MEDIUM:
      return <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><Clock size={12} /> 중요</span>;
    case ActionPriority.LOW:
      return <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><Info size={12} /> 참고</span>;
    default:
      return null;
  }
};

export const AnalysisView: React.FC<AnalysisViewProps> = ({ data }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Summary Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className={`px-6 py-4 border-b ${data.sentiment === 'URGENT' ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-blue-600" size={20} />
              {data.documentType}
            </h2>
            {data.sentiment === 'URGENT' && (
              <span className="text-red-600 text-sm font-bold flex items-center gap-1 animate-pulse">
                <AlertTriangle size={16} /> 기한 임박 / 중요
              </span>
            )}
          </div>
          <p className="text-slate-700 leading-relaxed text-lg font-medium">
            {data.summary}
          </p>
        </div>
      </div>

      {/* Action Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <h3 className="text-lg font-bold text-slate-800 mt-2 flex items-center gap-2">
          <CheckCircle size={20} className="text-green-600" />
          해야 할 일 (행동 안내)
        </h3>

        {(!data.actions || data.actions.length === 0) ? (
          <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500">
            특별히 수행해야 할 행동이 감지되지 않았습니다.
          </div>
        ) : (
          data.actions.map((action, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:shadow-md hover:border-blue-300">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={action.priority} />
                  <span className="font-bold text-slate-800 text-lg">{action.description}</span>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                  {action.recipient && (
                    <div className="flex items-center gap-1">
                      <Building size={14} />
                      <span>제출/납부처: <span className="font-medium text-slate-900">{action.recipient}</span></span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 w-full md:w-auto min-w-[160px]">
                {action.amount && (
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg w-full md:w-auto justify-end">
                    <span className="text-xs text-slate-500 uppercase">금액</span>
                    <span className="text-xl font-bold text-slate-900">{action.amount}</span>
                  </div>
                )}
                {action.deadline && (
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end text-red-600">
                    <Clock size={16} />
                    <span className="font-bold">{action.deadline} 까지</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dictionary Section */}
      {data.keyTerms && data.keyTerms.length > 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
          <h3 className="text-md font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Info size={18} />
            어려운 용어 설명
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.keyTerms.map((term, idx) => (
              <div key={idx} className="text-sm bg-white p-3 rounded-lg border border-slate-100">
                <span className="font-bold text-blue-700 mr-2">{term.term}:</span>
                <span className="text-slate-600">{term.definition}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};