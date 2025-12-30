'use client'

import { LogIn, Settings, LayoutDashboard, RefreshCcw } from 'lucide-react'

interface SidebarProps {
  apiKey: string
  setApiKey: (key: string) => void
  selectedModel: string
  setSelectedModel: (model: string) => void
  hasResult: boolean
  onReset: () => void
}

export default function Sidebar({
  apiKey,
  setApiKey,
  selectedModel,
  setSelectedModel,
  hasResult,
  onReset
}: SidebarProps) {
  return (
    <div className="fixed left-0 top-0 h-full w-80 bg-white border-r border-slate-200 p-8 z-40 hidden lg:block">
      <div className="flex items-center gap-3 mb-12">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
          <LayoutDashboard className="text-white w-6 h-6" />
        </div>
        <span className="text-xl font-black tracking-tight text-slate-900">RE-REPORT</span>
      </div>

      <div className="space-y-8">
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">환경 설정</h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <LogIn className="w-4 h-4 text-blue-500" /> API 키 입력
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                placeholder="OpenAI API Key (sk-...)"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-500" /> 분석 모델 선택
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl outline-none transition-all text-sm font-medium appearance-none cursor-not-allowed text-slate-500"
                disabled
              >
                <option value="gpt-4o-mini">GPT-4o Mini (고정됨)</option>
              </select>
            </div>
          </div>
        </section>

        {hasResult && (
          <button
            onClick={onReset}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-200"
          >
            <RefreshCcw className="w-5 h-5" /> 새 리포트 작성
          </button>
        )}
      </div>
    </div>
  )
}

