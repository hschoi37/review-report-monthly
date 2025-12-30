'use client'

import { ChevronRight } from 'lucide-react'
import { PrepareData } from '../types'

interface AnalysisFormProps {
  prepData: PrepareData
  selectedFranchise: string
  setSelectedFranchise: (value: string) => void
  selectedMonth: string
  setSelectedMonth: (value: string) => void
  onAnalyze: () => void
}

export default function AnalysisForm({
  prepData,
  selectedFranchise,
  setSelectedFranchise,
  selectedMonth,
  setSelectedMonth,
  onAnalyze
}: AnalysisFormProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-1">가맹점 / 지점 선택</label>
          <select
            value={selectedFranchise}
            onChange={(e) => setSelectedFranchise(e.target.value)}
            className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-800"
          >
            {prepData.franchises.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-1">분석 기간 선택</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-800"
          >
            {prepData.months.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={onAnalyze}
        className="w-full py-6 bg-blue-600 text-white rounded-[1.5rem] font-black text-2xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-2xl shadow-blue-500/40 flex items-center justify-center gap-4 group"
      >
        <span>🚀 분석 시작하기</span>
        <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  )
}

