'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import Sidebar from './components/Sidebar'
import FileUpload from './components/FileUpload'
import AnalysisForm from './components/AnalysisForm'
import LoadingSpinner from './components/LoadingSpinner'
import ReportView from './components/ReportView'
import { AnalysisResult, PrepareData } from './types'

export default function Home() {
  const [apiKey, setApiKey] = useState('')
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini')
  const [file, setFile] = useState<File | null>(null)
  const [prepData, setPrepData] = useState<PrepareData | null>(null)
  const [selectedFranchise, setSelectedFranchise] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  // Load API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key')
    if (savedKey) setApiKey(savedKey)
  }, [])

  // Save API key to localStorage
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey)
    }
  }, [apiKey])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return
    
    setFile(uploadedFile)

    const formData = new FormData()
    formData.append('file', uploadedFile)

    try {
      const res = await axios.post('/api/prepare', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      setPrepData(res.data)
      setSelectedFranchise(res.data.franchises[0])
      setSelectedMonth(res.data.months[0])
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message
      alert(`파일 준비 중 오류가 발생했습니다: ${errorMsg}`)
    }
  }

  const handleAnalyze = async () => {
    if (!apiKey) {
      alert("API 키를 입력해주세요.")
      return
    }
    
    if (!file) {
      alert("파일을 먼저 업로드해주세요.")
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('franchise', selectedFranchise)
    formData.append('month', selectedMonth)
    formData.append('api_key', apiKey)
    formData.append('model', selectedModel)

    try {
      const res = await axios.post('/api/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      setResult(res.data)
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message
      alert("분석 중 오류가 발생했습니다: " + errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const resetResult = () => {
    setResult(null)
  }

  const resetAll = () => {
    setResult(null)
    setFile(null)
    setPrepData(null)
    setSelectedFranchise('')
    setSelectedMonth('')
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar
        apiKey={apiKey}
        setApiKey={setApiKey}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        hasResult={!!result}
        onReset={resetResult}
      />

      <main className="lg:ml-80 min-h-screen p-6 lg:p-12 max-w-7xl mx-auto">
        {!result ? (
          <div className="max-w-3xl mx-auto space-y-12 py-12 animate-fade-up">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm font-bold border border-blue-100 uppercase tracking-tight">
                AI 리포트 엔진 v2.0
              </div>
              <h1 className="text-6xl font-black text-slate-900 leading-[1.1] tracking-tighter">
                데이터에서 가맹점 <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">성장의 비책</span>을 찾으세요
              </h1>
              <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-xl mx-auto">
                업로드한 리뷰 엑셀 데이터를 AI가 정밀 분석하여 <br />
                강점, 개선점, 실행 계획을 도출합니다.
              </p>
            </div>

            <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl shadow-blue-900/5 border border-slate-100">
              <div className="space-y-10">
                <FileUpload 
                  file={file}
                  onFileUpload={handleFileUpload}
                  onReset={resetAll}
                />

                {file && prepData && (
                  <AnalysisForm
                    prepData={prepData}
                    selectedFranchise={selectedFranchise}
                    setSelectedFranchise={setSelectedFranchise}
                    selectedMonth={selectedMonth}
                    setSelectedMonth={setSelectedMonth}
                    onAnalyze={handleAnalyze}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          <ReportView result={result} />
        )}
      </main>
    </div>
  )
}

