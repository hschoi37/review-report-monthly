'use client'

import { Sparkles } from 'lucide-react'

export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-8">
      <div className="relative">
        <div className="w-24 h-24 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-blue-600 animate-pulse" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">AI 고객 분석 중...</h2>
        <p className="text-slate-500 font-medium animate-pulse">데이터의 바다에서 보물을 찾고 있습니다.</p>
      </div>
    </div>
  )
}

