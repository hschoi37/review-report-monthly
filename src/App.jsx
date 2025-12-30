import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Upload, Settings, LogIn, TrendingUp, Star, MessageSquare,
  ChevronRight, Lightbulb, AlertCircle, FileText, CheckCircle2, AlertTriangle,
  RefreshCcw, Sparkles, LayoutDashboard, ThumbsUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';


// API 백엔드 (Railway) URL - 프론트엔드(Vercel)와 백엔드(Railway) 완전 분리
const API_BASE = import.meta.env.PROD 
  ? "https://review-report-monthly-production.up.railway.app" 
  : "http://localhost:8000";

// 환경 변수 또는 로컬 스토리지에서 키를 가져오도록 변경 (보안 강화)
const DEFAULT_ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY || '';
const DEFAULT_OPENAI_KEY = import.meta.env.VITE_OPENAI_KEY || '';

const App = () => {
  const [apiKey, setApiKey] = useState(DEFAULT_ANTHROPIC_KEY);
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [file, setFile] = useState(null);
  const [prepData, setPrepData] = useState(null);
  const [selectedFranchise, setSelectedFranchise] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState(null);
  const [editableResult, setEditableResult] = useState(null);
  const [isEditComplete, setIsEditComplete] = useState(false);
  const reportRef = React.useRef(null);



  const handleSaveImage = async () => {
    if (!reportRef.current) return;

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 4,
        useCORS: true,
        backgroundColor: '#f8fafc',
        logging: false,
        letterRendering: true,
        allowTaint: false,
        onclone: (clonedDoc) => {
          // 애니메이션 제거
          const elements = clonedDoc.querySelectorAll('.animate-fade-up');
          elements.forEach(el => {
            el.style.animation = 'none';
            el.style.opacity = '1';
            el.style.transform = 'none';
          });
          
          // input 태그를 일반 텍스트로 변환 (잘림 및 밀림 방지 최적화)
          const inputs = clonedDoc.querySelectorAll('input[type="text"]');
          inputs.forEach(input => {
            const parent = input.parentNode;
            if (parent) {
              const textSpan = clonedDoc.createElement('span');
              textSpan.innerText = input.value || input.placeholder;
              
              // 스타일 선별 복사 (밀림 방지 핵심)
              const sourceStyle = window.getComputedStyle(input);
              textSpan.style.color = sourceStyle.color;
              textSpan.style.fontSize = sourceStyle.fontSize;
              textSpan.style.fontWeight = sourceStyle.fontWeight;
              textSpan.style.fontFamily = sourceStyle.fontFamily;
              
              // 레이아웃 강제 교정
              textSpan.style.display = 'inline';
              textSpan.style.width = 'auto';
              textSpan.style.height = 'auto';
              textSpan.style.lineHeight = '1';
              textSpan.style.margin = '0';
              textSpan.style.padding = '0';
              textSpan.style.verticalAlign = 'middle';
              
              parent.replaceChild(textSpan, input);
              
              // 부모 컨테이너(motion.div) 레이아웃 재확인
              if (parent.classList.contains('rounded-full')) {
                parent.style.display = 'flex';
                parent.style.alignItems = 'center';
              }
            }
          });

          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility !important; }
            .text-slate-500 { color: #475569 !important; }
            .text-slate-400 { color: #334155 !important; }
          `;
          clonedDoc.head.appendChild(style);
        }
      });

      const image = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.href = image;
      link.download = `${editableResult.meta.franchise}_분석리포트_${editableResult.meta.month}.png`;
      link.click();
    } catch (err) {
      console.error("저장 실패:", err);
      alert("리포트 저장 중 오류가 발생했습니다.");
    }
  };

  const handleSavePDF = async () => {
    if (!reportRef.current) return;

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 4,
        useCORS: true,
        backgroundColor: '#f8fafc',
        logging: false,
        letterRendering: true,
        onclone: (clonedDoc) => {
          const elements = clonedDoc.querySelectorAll('.animate-fade-up');
          elements.forEach(el => {
            el.style.animation = 'none';
            el.style.opacity = '1';
            el.style.transform = 'none';
          });

          const inputs = clonedDoc.querySelectorAll('input[type="text"]');
          inputs.forEach(input => {
            const parent = input.parentNode;
            if (parent) {
              const textSpan = clonedDoc.createElement('span');
              textSpan.innerText = input.value || input.placeholder;
              
              const sourceStyle = window.getComputedStyle(input);
              textSpan.style.color = sourceStyle.color;
              textSpan.style.fontSize = sourceStyle.fontSize;
              textSpan.style.fontWeight = sourceStyle.fontWeight;
              textSpan.style.fontFamily = sourceStyle.fontFamily;
              
              textSpan.style.display = 'inline';
              textSpan.style.width = 'auto';
              textSpan.style.height = 'auto';
              textSpan.style.lineHeight = '1';
              textSpan.style.margin = '0';
              textSpan.style.padding = '0';
              textSpan.style.verticalAlign = 'middle';
              
              parent.replaceChild(textSpan, input);
              
              if (parent.classList.contains('rounded-full')) {
                parent.style.display = 'flex';
                parent.style.alignItems = 'center';
              }
            }
          });

          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility !important; }
            .text-slate-500 { color: #475569 !important; }
            .text-slate-400 { color: #334155 !important; }
          `;
          clonedDoc.head.appendChild(style);
        }
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      pdf.save(`${editableResult.meta.franchise}_분석리포트_${editableResult.meta.month}.pdf`);
    } catch (err) {
      console.error("PDF 저장 실패:", err);
      alert("PDF 저장 중 오류가 발생했습니다.");
    }
  };

  const handleCompleteEdit = () => {
    setIsEditComplete(true);
    alert("수정이 완료되었습니다. 이제 리포트를 저장할 수 있습니다.");
  };

  // 텍스트 수정 핸들러
  const handleEdit = (section, index, field, value) => {
    setEditableResult(prev => {
      const next = { ...prev };
      if (section === 'insight') {
        next.analysis.insight = value;
      } else if (section === 'action_plan') {
        next.analysis.action_plan[index] = value;
      } else {
        next.analysis[section][index][field] = value;
      }
      return next;
    });
  };

  // 모델 변경 시 자동으로 적절한 API Key로 전환
  useEffect(() => {
    if (selectedModel.startsWith('gpt')) {
      // OpenAI 모델 선택 시
      if (apiKey === DEFAULT_ANTHROPIC_KEY || !apiKey) {
        setApiKey(DEFAULT_OPENAI_KEY);
      }
    } else {
      // Claude 모델 선택 시
      if (apiKey === DEFAULT_OPENAI_KEY || !apiKey) {
        setApiKey(DEFAULT_ANTHROPIC_KEY);
      }
    }
  }, [selectedModel]);

  useEffect(() => {
    // 사용자가 직접 입력한 키가 아니라면 로컬 스토리지 업데이트 방지 고려 가능하나,
    // 여기서는 단순함을 위해 상태 변경 시 저장 유지
    if (apiKey) localStorage.setItem('ant_api_key', apiKey);
  }, [apiKey]);

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      const res = await axios.post(`${API_BASE}/api/prepare`, formData);
      setPrepData(res.data);
      setSelectedFranchise(res.data.franchises[0]);
      setSelectedMonth(res.data.months[0]);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message;
      alert(`파일 준비 중 오류가 발생했습니다: ${errorMsg}`);
    }
  };

  const handleAnalyze = async () => {
    if (!apiKey) return alert("API 키를 입력해주세요.");
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('franchise', selectedFranchise);
    formData.append('month', selectedMonth);
    formData.append('api_key', apiKey);
    formData.append('model', selectedModel);

    try {
      const res = await axios.post(`${API_BASE}/api/analyze`, formData);
      setResult(res.data);
      setEditableResult(JSON.parse(JSON.stringify(res.data)));
    } catch (err) {
      alert("분석 중 오류가 발생했습니다: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // 결과만 초기화 (파일 및 설정 유지)
  const resetResult = () => {
    setResult(null);
    setEditableResult(null);
  };

  // 전체 초기화 (처음으로 돌아가기)
  const resetAll = () => {
    setResult(null);
    setEditableResult(null);
    setFile(null);
    setPrepData(null);
    setSelectedFranchise('');
    setSelectedMonth('');
  };

  if (loading) {
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
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar - Settings */}
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
                  placeholder="API Key 입력 (sk-ant-... 또는 sk-...)"
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

          {result && (
            <button
              onClick={resetResult}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-200"
            >
              <RefreshCcw className="w-5 h-5" /> 새 리포트 작성
            </button>
          )}
        </div>
      </div>

      <main className="lg:ml-80 min-h-screen p-6 lg:p-12 max-w-7xl mx-auto">
        {!editableResult ? (
          <div className="max-w-3xl mx-auto space-y-12 py-12 animate-fade-up">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm font-bold border border-blue-100 uppercase tracking-tight">
                AI 리포트 엔진 v2.1
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
                {!file ? (
                  <label className="block w-full cursor-pointer group">
                    <div className="border-4 border-dashed border-slate-100 group-hover:border-blue-500/30 group-hover:bg-blue-50 rounded-[2rem] p-16 transition-all duration-500 flex flex-col items-center gap-6">
                      <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-xl shadow-blue-500/10">
                        <Upload className="w-10 h-10" />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-2xl font-black text-slate-800">댓글 엑셀 파일 업로드</p>
                        <p className="text-slate-400 font-medium">클릭하거나 파일을 여기로 끌어다 놓으세요 (.xlsx, .xls)</p>
                      </div>
                    </div>
                    <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
                  </label>
                ) : (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-200">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                          <FileText className="w-7 h-7" />
                        </div>
                        <div>
                          <p className="text-lg font-black text-slate-800">{file.name}</p>
                          <p className="text-blue-600 text-sm font-bold uppercase tracking-wider">파일이 성공적으로 업로드되었습니다</p>
                        </div>
                      </div>
                      <button
                        onClick={resetAll}
                        className="px-4 py-2 bg-white border-2 border-slate-200 text-slate-500 rounded-xl font-bold text-sm hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        다른 파일 업로드
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-1">가맹점 / 지점 선택</label>
                        <select
                          value={selectedFranchise}
                          onChange={(e) => setSelectedFranchise(e.target.value)}
                          className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-800"
                        >
                          {prepData?.franchises.map(f => (
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
                          {prepData?.months.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handleAnalyze}
                      className="w-full py-6 bg-blue-600 text-white rounded-[1.5rem] font-black text-2xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-2xl shadow-blue-500/40 flex items-center justify-center gap-4 group"
                    >
                      <span>🚀 분석 시작하기</span>
                      <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Save Buttons */}
            <div className="mb-6 flex flex-wrap gap-4 justify-end">
              {!isEditComplete && (
                <button
                  onClick={handleCompleteEdit}
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


              {/* Row 1: Charts & Stats */}
              < div className="grid grid-cols-1 lg:grid-cols-2 gap-8" >
                <div className="bg-white p-10 rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-50">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                      <ThumbsUp className="text-blue-600 w-8 h-8" /> 리뷰 평가 요약
                    </h3>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
                    {/* Left: Donut Chart */}
                    <div className="w-full md:w-1/2 h-[250px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: '긍정', value: editableResult.analysis.sentiment.positive, color: '#3b82f6' },
                              { name: '중립', value: editableResult.analysis.sentiment.neutral, color: '#94a3b8' },
                              { name: '부정', value: editableResult.analysis.sentiment.negative, color: '#ef4444' },
                            ]}
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={5}
                            cornerRadius={0}
                            dataKey="value"
                            stroke="none"
                          >
                            {[
                              { name: '긍정', value: editableResult.analysis.sentiment.positive, color: '#3b82f6' },
                              { name: '중립', value: editableResult.analysis.sentiment.neutral, color: '#94a3b8' },
                              { name: '부정', value: editableResult.analysis.sentiment.negative, color: '#ef4444' },
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Right: Legend */}
                    <div className="w-full md:w-1/2 space-y-4">
                      <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3 w-20">
                          <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                          <span className="text-lg font-bold text-slate-700">긍정</span>
                        </div>
                        <span className="text-lg font-bold text-slate-800">{editableResult.analysis.sentiment.positive}%</span>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3 w-20">
                          <div className="w-4 h-4 rounded-full bg-slate-400"></div>
                          <span className="text-lg font-bold text-slate-700">중립</span>
                        </div>
                        <span className="text-lg font-bold text-slate-800">{editableResult.analysis.sentiment.neutral}%</span>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3 w-20">
                          <div className="w-4 h-4 rounded-full bg-rose-500"></div>
                          <span className="text-lg font-bold text-slate-700">부정</span>
                        </div>
                        <span className="text-lg font-bold text-slate-800">{editableResult.analysis.sentiment.negative}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-2xl font-medium text-slate-600 leading-relaxed">
                    {editableResult.analysis.summary}
                  </div>
                </div>

                {/* Top Dates Card */}
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
              </div >

              {/* Pros & Cons Section */}
              < div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8" >
                {/* Pros */}
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
                          <p className="text-slate-600 font-medium leading-relaxed">"{p.content}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cons */}
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
              </div >

              {/* Keyword Tags Section */}
              < div className="bg-white p-12 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100" >
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-12">
                  <LayoutDashboard className="text-blue-500 w-8 h-8" /> 분석 가이드 키워드
                </h3>
                <div className="flex flex-wrap gap-3 overflow-visible">
                  {editableResult.analysis.keywords.map((k, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.02 }}
                      className={clsx(
                        "pl-[24px] pr-[10px] py-3 rounded-full text-sm font-bold flex items-center gap-3 border transition-all cursor-default shadow-sm inline-flex min-h-[52px]",
                        k.is_positive
                          ? "bg-white text-blue-700 border-blue-100 shadow-blue-100/10"
                          : "bg-white text-rose-700 border-rose-100 shadow-rose-100/10"
                      )}
                    >
                      <div className={clsx("w-2.5 h-2.5 rounded-full flex-shrink-0", k.is_positive ? "bg-blue-500" : "bg-rose-500")} />
                      <span className="flex-shrink-0 font-black whitespace-nowrap">#{k.tag.replace(/#/g, '')}</span>
                      <input
                        type="text"
                        value={k.desc}
                        onChange={(e) => handleEdit('keywords', i, 'desc', e.target.value)}
                        className={clsx(
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
              </div >

              {/* Action Plan Section */}
              <div className="bg-[#0f172a] rounded-2xl p-12 text-white shadow-2xl shadow-slate-900/40 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent)]" />
                <div className="relative z-10 space-y-12">
                  {/* Title & Insight */}
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

                  {/* Action Plan Grid */}
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

              {/* Negative Reviews Detail */}
              < div className="bg-rose-50/50 rounded-2xl p-16 border-2 border-rose-100" >
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
                        {/* 중국어 원문 */}
                        {r.content_zh !== undefined && (
                          <div className="space-y-4">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] pl-1">[중국어 원문]</label>
                            <div className="px-8 py-5 bg-slate-50 rounded-xl text-xs font-medium text-slate-500 leading-relaxed border border-slate-100">
                              "{r.content_zh || '원본 내용 없음'}"
                            </div>
                          </div>
                        )}

                        {/* 한글 번역 */}
                        {r.content_ko !== undefined && (
                          <div className="space-y-4">
                            <label className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] pl-1">[한글 번역]</label>
                            <div className="px-8 py-5 bg-blue-50/30 rounded-xl text-sm font-bold text-slate-700 leading-relaxed border border-blue-100/50">
                              "{r.content_ko || '번역 내용 없음'}"
                            </div>
                          </div>
                        )}

                        {/* 답글 현황 */}
                        {r.reply_ko !== undefined && (
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
              </div >

              <footer className="text-center py-12 text-slate-400 text-sm font-bold uppercase tracking-[0.2em] border-t border-slate-200">
                © 2025 RE-REPORT 리포트 엔진 | 프리미엄 가맹점 솔루션
              </footer>
            </div>

          </>
        )}
      </main>
    </div>
  );
};

export default App;
