'use client'

import { Upload, FileText } from 'lucide-react'

interface FileUploadProps {
  file: File | null
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onReset: () => void
}

export default function FileUpload({ file, onFileUpload, onReset }: FileUploadProps) {
  if (file) {
    return (
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
          onClick={onReset}
          className="px-4 py-2 bg-white border-2 border-slate-200 text-slate-500 rounded-xl font-bold text-sm hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          다른 파일 업로드
        </button>
      </div>
    )
  }

  return (
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
      <input 
        type="file" 
        className="hidden" 
        accept=".xlsx,.xls" 
        onChange={onFileUpload} 
      />
    </label>
  )
}

