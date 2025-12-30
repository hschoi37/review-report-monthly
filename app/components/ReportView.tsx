'use client'

import { useState, useRef } from 'react'
import { 
  TrendingUp, Star, MessageSquare, ThumbsUp, AlertTriangle, 
  CheckCircle2, Lightbulb, LayoutDashboard, Upload, FileText 
} from 'lucide-react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { cn } from '../lib/utils'
import { AnalysisResult } from '../types'

interface ReportViewProps {
  result: AnalysisResult
}

export default function ReportView({ result: initialResult }: ReportViewProps) {
  const [editableResult, setEditableResult] = useState<AnalysisResult>(initialResult)
  const [isEditComplete, setIsEditComplete] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  const handleEdit = (section: string, index: number | null, field: string | null, value: string) => {
    setEditableResult(prev => {
      const next = { ...prev }
      if (section === 'insight') {
        next.analysis.insight = value
      } else if (section === 'action_plan' && index !== null) {
        next.analysis.action_plan[index] = value
      } else if (index !== null && field) {
        (next.analysis[section as keyof typeof next.analysis] as any)[index][field] = value
      }
      return next
    })
  }

  const handleSaveImage = async () => {
    if (!reportRef.current) return

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 4,
        useCORS: true,
        backgroundColor: '#f8fafc',
        logging: false,
        allowTaint: false,
      })

      const image = canvas.toDataURL("image/png", 1.0)
      const link = document.createElement("a")
      link.href = image
      link.download = `${editableResult.meta.franchise}_분석리포트_${editableResult.meta.month}.png`
      link.click()
    } catch (err) {
      console.error("저장 실패:", err)
      alert("리포트 저장 중 오류가 발생했습니다.")
    }
  }

  const handleSavePDF = async () => {
    if (!reportRef.current) return

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 4,
        useCORS: true,
        backgroundColor: '#f8fafc',
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png', 1.0)
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      const imgWidth = 210
      const pageHeight = 297
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
        heightLeft -= pageHeight
      }

      pdf.save(`${editableResult.meta.franchise}_분석리포트_${editableResult.meta.month}.pdf`)
    } catch (err) {
      console.error("PDF 저장 실패:", err)
      alert("PDF 저장 중 오류가 발생했습니다.")
    }
  }

  const sentimentData = [
    { name: '긍정', value: editableResult.analysis.sentiment.positive, color: '#3b82f6' },
    { name: '중립', value: editableResult.analysis.sentiment.neutral, color: '#94a3b8' },
    { name: '부정', value: editableResult.analysis.sentiment.negative, color: '#ef4444' },
  ]

  return (
    <>
      {/* Save Buttons */}
      <div className="mb-6 flex flex-wrap gap-4 justify-end">
        {!isEditComplete && (
          <button
            onClick={() => {
              setIsEditComplete(true)
              alert("수정이 완료되었습니다. 이제 리포트를 저장할 수 있습니다.")
            }}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-500/30"
          >
            <CheckCircle2 className="w-5 h-5" />
            수정완료
          </button>
        )}
        {isEditComplete && (
          <>
            <button
              onClick={handleSaveImage}
              className="flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-500/30"
            >
              <Upload className="w-5 h-5 rotate-180" />
              이미지저장
            </button>
            <button
              onClick={handleSavePDF}
              className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 active:scale-95 transition-all shadow-lg shadow-rose-500/30"
            >
              <FileText className="w-5 h-5" />
              PDF저장
            </button>
          </>
        )}
      </div>

      <div className="space-y-10 animate-fade-up" ref={reportRef}>
        {/* Header */}
        <div className="bg-[#315ae7] rounded-2xl p-10 text-[#fbfff7] shadow-xl shadow-blue-900/10 mb-8">
          <div className="space-y-6">
            <div>
              <p className="text-sm font-bold opacity-80 mb-2">
                {editableResult.meta.month} 분석 리포트
              </p>
              <h2 className="text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                {editableResult.meta.franchise} 고객 리뷰 분석
              </h2>
            </div>

            <div className="flex items-center gap-8 pt-4 border-t border-[#fbfff7]/10">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 opacity-80" />
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold opacity-80">총</span>
                  <span className="text-2xl font-black">{editableResult.stats.total_comments}</span>
                  <span className="text-sm font-bold opacity-80">개의 리뷰</span>
                </div>
              </div>
              <div className="w-px h-8 bg-[#fbfff7]/20"></div>
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 opacity-80" />
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold opacity-80">일 평균</span>
                  <span className="text-2xl font-black">{editableResult.stats.daily_avg}</span>
                  <span className="text-sm font-bold opacity-80">개</span>
                </div>
              </div>
              <div className="w-px h-8 bg-[#fbfff7]/20"></div>
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 opacity-80" />
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold opacity-80">평점</span>
                  <span className="text-2xl font-black">{editableResult.stats.rating_avg}</span>
                  <span className="text-sm font-bold opacity-80">점</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sentiment Chart */}
          <div className="bg-white p-10 rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-50">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <ThumbsUp className="text-blue-600 w-8 h-8" /> 리뷰 평가 요약
              </h3>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
              <div className="w-full md:w-1/2 h-[250px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full md:w-1/2 space-y-4">
                {sentimentData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-8">
                    <div className="flex items-center gap-3 w-20">
                      <div className={cn("w-4 h-4 rounded-full")} style={{ backgroundColor: item.color }}></div>
                      <span className="text-lg font-bold text-slate-700">{item.name}</span>
                    </div>
                    <span className="text-lg font-bold text-slate-800">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl font-medium text-slate-600 leading-relaxed">
              {editableResult.analysis.summary}
            </div>
          </div>

          {/* Top Dates */}
          <div className="bg-white p-10 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-10">
              <TrendingUp className="text-blue-500 w-8 h-8" /> 리뷰가 가장 많았던 날
            </h3>
            <div className="space-y-4">
              {editableResult.stats.top_dates.map((d, i) => (
                <div key={i} className="flex justify-between items-center p-6 bg-slate-50 hover:bg-blue-50 rounded-xl transition-all duration-300 group border border-transparent hover:border-blue-100">
                  <div className="flex items-center gap-5">
                    <span className="w-12 h-12 flex items-center justify-center rounded-xl bg-white text-slate-400 font-black group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                      {i + 1}
                    </span>
                    <span className="text-xl font-bold text-slate-700">{d.date}</span>
                  </div>
                  <span className="text-3xl font-black text-blue-600">{d.count}<span className="text-base font-bold ml-1">건</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pros & Cons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8">
          {/* Pros */}
          <div className="bg-white p-10 rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-50">
            <div className="flex items-center gap-3 mb-8">
              <ThumbsUp className="text-blue-600 w-8 h-8" />
              <h3 className="text-2xl font-black text-slate-800">고객들이 칭찬했어요</h3>
            </div>
            <div className="space-y-8">
              {editableResult.analysis.pros.map((p, i) => (
                <div key={i} className="flex gap-4">
                  <div className="mt-1">
                    <CheckCircle2 className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="space-y-2 w-full">
                    <h4 className="text-xl font-black text-slate-800">{p.title}</h4>
                    <p className="text-slate-600 font-medium leading-relaxed">&quot;{p.content}&quot;</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cons */}
          <div className="bg-white p-10 rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-50">
            <div className="flex items-center gap-3 mb-8">
              <AlertTriangle className="text-rose-500 w-8 h-8" />
              <h3 className="text-2xl font-black text-slate-800">이런 점은 아쉬워요</h3>
            </div>
            <div className="space-y-6">
              {editableResult.analysis.cons.map((c, i) => (
                <div key={i} className="bg-rose-50/50 px-8 py-4 rounded-xl border border-rose-100">
                  <div className="w-full">
                    <input
                      type="text"
                      value={c.title}
                      onChange={(e) => handleEdit('cons', i, 'title', e.target.value)}
                      className="w-full bg-transparent border-b border-rose-200/0 hover:border-rose-300 focus:border-rose-500 text-xl font-black text-rose-700 mb-2 outline-none transition-colors"
                    />
                    <textarea
                      value={c.content}
                      onChange={(e) => handleEdit('cons', i, 'content', e.target.value)}
                      className="w-full bg-transparent resize-none border border-transparent hover:border-rose-200 focus:border-rose-400 rounded p-1 -ml-1 text-rose-600/80 font-medium outline-none transition-all h-auto min-h-[3.5rem]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Keywords */}
        <div className="bg-white p-12 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-12">
            <LayoutDashboard className="text-blue-500 w-8 h-8" /> 분석 가이드 키워드
          </h3>
          <div className="flex flex-wrap gap-3 overflow-visible">
            {editableResult.analysis.keywords.map((k, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.02 }}
                className={cn(
                  "pl-[24px] pr-[10px] py-3 rounded-full text-sm font-bold flex items-center gap-3 border transition-all cursor-default shadow-sm inline-flex min-h-[52px]",
                  k.is_positive
                    ? "bg-white text-blue-700 border-blue-100 shadow-blue-100/10"
                    : "bg-white text-rose-700 border-rose-100 shadow-rose-100/10"
                )}
              >
                <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", k.is_positive ? "bg-blue-500" : "bg-rose-500")} />
                <span className="flex-shrink-0 font-black whitespace-nowrap">#{k.tag.replace(/#/g, '')}</span>
                <input
                  type="text"
                  value={k.desc}
                  onChange={(e) => handleEdit('keywords', i, 'desc', e.target.value)}
                  className={cn(
                    "bg-transparent border-none outline-none text-sm font-bold py-1 leading-normal",
                    k.is_positive ? "text-blue-600/80" : "text-rose-600/80"
                  )}
                  style={{ 
                    width: `${Math.max(120, k.desc.length * 14)}px`,
                    minWidth: '120px'
                  }}
                  placeholder="내용을 입력하세요"
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Action Plan */}
        <div className="bg-[#0f172a] rounded-2xl p-12 text-white shadow-2xl shadow-slate-900/40 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent)]" />
          <div className="relative z-10 space-y-12">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Lightbulb className="w-8 h-8 text-yellow-400" />
                <h3 className="text-3xl font-black tracking-tight text-white">
                  이번 달 핵심 인사이트 & 실행방안
                </h3>
              </div>

              <div className="space-y-2">
                <p className="text-slate-400 font-bold text-sm uppercase tracking-wider">핵심 인사이트</p>
                <textarea
                  value={editableResult.analysis.insight || editableResult.analysis.summary}
                  onChange={(e) => handleEdit('insight', null, null, e.target.value)}
                  className="w-full bg-transparent text-lg text-slate-200 font-medium leading-relaxed opacity-90 resize-none border border-transparent hover:border-slate-600 rounded p-2 -ml-2 outline-none transition-all min-h-[5rem]"
                />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-slate-400 font-bold text-sm uppercase tracking-wider">실행방안</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {editableResult.analysis.action_plan.slice(0, 2).map((plan, i) => (
                  <div key={i} className="flex gap-5 p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all items-start">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-sm font-black text-white">{i + 1}</span>
                    </div>
                    <textarea
                      value={plan}
                      onChange={(e) => handleEdit('action_plan', i, null, e.target.value)}
                      className="w-full bg-transparent text-slate-200 font-bold leading-relaxed resize-none border border-transparent hover:border-slate-500 rounded p-1 outline-none transition-all h-full min-h-[4rem]"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Negative Reviews */}
        <div className="bg-rose-50/50 rounded-2xl p-16 border-2 border-rose-100">
          <h3 className="text-3xl font-black text-slate-800 flex items-center gap-4 mb-12">
            <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
              <MessageSquare className="w-7 h-7" />
            </div>
            주의 필요 댓글 리스트
          </h3>
          <p className="text-slate-500 font-medium text-lg mb-10">부정적 경험을 남긴 고객 <span className="text-rose-600 font-black">{editableResult.neg_reviews.length}분</span>의 목소리입니다.</p>

          <div className="space-y-8">
            {editableResult.neg_reviews.map((r, i) => (
              <div key={i} className="bg-white rounded-xl border border-rose-100 shadow-xl shadow-rose-900/5 overflow-hidden">
                <div className="p-8 border-b border-rose-50 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-6">
                    <div className="px-6 py-2.5 bg-rose-500 text-white rounded-2xl text-xl font-black flex items-center gap-2 shadow-lg shadow-rose-200">
                      <Star className="w-5 h-5 fill-white" /> {r.rating}
                    </div>
                    <div>
                      <p className="text-xl font-black text-slate-800">{r.rating < 1 ? '매우 불만족' : r.rating < 3 ? '불만족' : '아쉬움'} 피드백 확인</p>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">리뷰 작성일: {r.date}</p>
                    </div>
                  </div>
                </div>

                <div className="p-10 space-y-10">
                  {r.content_zh && (
                    <div className="space-y-4">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] pl-1">[중국어 원문]</label>
                      <div className="px-8 py-5 bg-slate-50 rounded-xl text-xs font-medium text-slate-500 leading-relaxed border border-slate-100">
                        &quot;{r.content_zh || '원본 내용 없음'}&quot;
                      </div>
                    </div>
                  )}

                  {r.content_ko && (
                    <div className="space-y-4">
                      <label className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] pl-1">[한글 번역]</label>
                      <div className="px-8 py-5 bg-blue-50/30 rounded-xl text-sm font-bold text-slate-700 leading-relaxed border border-blue-100/50">
                        &quot;{r.content_ko || '번역 내용 없음'}&quot;
                      </div>
                    </div>
                  )}

                  {r.reply_ko && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pl-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <label className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em]">[답글 현황]</label>
                      </div>
                      <div className="px-8 py-5 bg-emerald-50/30 rounded-xl text-xs font-medium text-slate-600 leading-relaxed border border-emerald-100/50">
                        {r.reply_ko || '등록된 답글 없음'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <footer className="text-center py-12 text-slate-400 text-sm font-bold uppercase tracking-[0.2em] border-t border-slate-200">
          © 2025 RE-REPORT 리포트 엔진 | 프리미엄 가맹점 솔루션
        </footer>
      </div>
    </>
  )
}

