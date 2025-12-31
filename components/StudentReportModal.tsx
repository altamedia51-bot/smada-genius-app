
import React, { useState, useEffect } from 'react';
import { Result, Exam, User, Submission } from '../types';
import { generateStudentFeedback } from '../services/geminiService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StudentReportModalProps {
  studentId: string;
  studentName: string;
  results: Result[];
  submissions: Submission[];
  exams: Exam[];
  teacherName?: string;
  onClose: () => void;
  onUpdateResults?: (results: Result[]) => void;
}

const StudentReportModal: React.FC<StudentReportModalProps> = ({ 
  studentId, studentName, results, submissions, exams, teacherName, onClose, onUpdateResults 
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'report' | 'edit'>('profile');
  const [feedback, setFeedback] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // States for editable branding & metadata
  const [reportHeader, setReportHeader] = useState<string>(() => localStorage.getItem('school_name') || 'SMADA GENIUS ACADEMY');
  const [reportSubHeader, setReportSubHeader] = useState<string>(() => localStorage.getItem('school_slogan') || 'Sistem Evaluasi Digital Terintegrasi');
  const [reportPeriod, setReportPeriod] = useState<string>(() => localStorage.getItem('report_period') || 'Semester Ganjil 2024');
  
  // New States for Date and Signer Title
  const [reportDateText, setReportDateText] = useState<string>(() => 
    localStorage.getItem('report_date_text') || `Semarang, 1 Januari 2026`
  );
  const [reportSignerTitle, setReportSignerTitle] = useState<string>(() => 
    localStorage.getItem('report_signer_title') || 'Wali Kelas'
  );
  
  // Local state for results and tasks
  const [editableResults, setEditableResults] = useState<Result[]>([]);
  const [studentSubmissions, setStudentSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    const studentResults = results.filter(r => r.studentId === studentId);
    const studentSubs = submissions.filter(s => s.studentId === studentId);
    
    setEditableResults(JSON.parse(JSON.stringify(studentResults)));
    setStudentSubmissions(studentSubs);
    
    const lastWithFeedback = [...studentResults].reverse().find(r => r.feedback);
    if (lastWithFeedback) setFeedback(lastWithFeedback.feedback || '');
  }, [results, submissions, studentId]);

  const examScoresArr = editableResults.map(r => r.score);
  const reviewedTasks = studentSubmissions.filter(s => s.status === 'reviewed');
  const taskScoresArr = reviewedTasks.map(s => s.grade || 0);
  const allScoresArr = [...examScoresArr, ...taskScoresArr];
  const currentAverage = allScoresArr.length > 0 
    ? Math.round(allScoresArr.reduce((acc, val) => acc + val, 0) / allScoresArr.length) 
    : 0;

  const chartData = [...editableResults]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(res => ({
      name: new Date(res.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      nilai: res.score
    }));

  const handleGenerateFeedback = async () => {
    setIsGenerating(true);
    const performanceStr = `Ujian: ${examScoresArr.join(', ')}. Tugas: ${taskScoresArr.join(', ')}.`;
    
    try {
      const text = await generateStudentFeedback(studentName, performanceStr);
      setFeedback(text);
    } catch (e) {
      setFeedback("Siswa menunjukkan performa yang stabil. Teruslah belajar untuk mencapai hasil maksimal.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAll = () => {
    localStorage.setItem('school_name', reportHeader);
    localStorage.setItem('school_slogan', reportSubHeader);
    localStorage.setItem('report_period', reportPeriod);
    localStorage.setItem('report_date_text', reportDateText);
    localStorage.setItem('report_signer_title', reportSignerTitle);

    if (onUpdateResults) {
      const finalResults = editableResults.map((r, idx) => {
        return { ...r, feedback: idx === editableResults.length - 1 ? feedback : r.feedback };
      });
      onUpdateResults(finalResults);
    }
    setActiveTab('profile');
    alert("Seluruh data laporan berhasil diperbarui.");
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[500] flex items-center justify-center p-4 overflow-hidden" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-gray-50 w-full max-w-5xl h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
        
        {/* TOP PROFILE HEADER */}
        <div className="bg-white px-10 py-8 border-b flex flex-col md:flex-row justify-between items-center gap-6 shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-indigo-600 rounded-[1.8rem] flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-100">
              {studentName.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">{studentName}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full border">NIS: {studentId.replace('S-', '')}</span>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Siswa Aktif</span>
              </div>
            </div>
          </div>
          
          <div className="flex bg-gray-100 p-1.5 rounded-2xl">
            <button onClick={() => setActiveTab('profile')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>Performa</button>
            <button onClick={() => setActiveTab('report')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'report' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>Raport Digital</button>
            <button onClick={() => setActiveTab('edit')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'edit' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>Pengaturan</button>
          </div>

          <button onClick={onClose} className="w-12 h-12 bg-white border-2 border-gray-100 text-gray-400 rounded-2xl hover:text-red-500 transition-all flex items-center justify-center">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* CONTENT SCROLL AREA */}
        <div className="flex-1 overflow-y-auto p-10 scrollbar-hide">
          
          {activeTab === 'profile' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Rata-rata</p>
                  <p className={`text-5xl font-black ${currentAverage >= 75 ? 'text-green-600' : 'text-red-600'}`}>{currentAverage}</p>
                  <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${currentAverage >= 75 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${currentAverage}%` }}></div>
                  </div>
                  <p className="text-[8px] font-bold text-gray-400 mt-2 uppercase">Ujian & Tugas Mandiri</p>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Ujian Selesai</p>
                  <p className="text-5xl font-black text-gray-800">{editableResults.length}</p>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tugas Dinilai</p>
                  <p className="text-5xl font-black text-indigo-600">{reviewedTasks.length}</p>
                </div>
                <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Capaian Kelas</p>
                  <p className="text-5xl font-black">TOP</p>
                </div>
              </div>

              {/* CHART */}
              <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <h3 className="text-lg font-black text-gray-800 mb-8 uppercase tracking-tighter">Grafik Progres Nilai</h3>
                <div className="h-72 w-full">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs><linearGradient id="colorProfile" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/><stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 'bold'}} dy={15} />
                        <YAxis domain={[0, 100]} fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 'bold'}} />
                        <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }} />
                        <Area type="monotone" dataKey="nilai" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorProfile)" dot={{ r: 6, fill: '#4f46e5', strokeWidth: 3, stroke: '#fff' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <div className="h-full flex items-center justify-center text-gray-300 font-bold italic">Belum ada data.</div>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'report' && (
            <div className="bg-white p-12 rounded-[2.5rem] border-2 border-gray-100 shadow-xl max-w-4xl mx-auto animate-in fade-in duration-500">
              <div className="text-center border-b-4 border-double border-gray-900 pb-8 mb-10">
                <h1 className="text-2xl font-black uppercase tracking-[0.2em] text-gray-900">{reportHeader}</h1>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{reportSubHeader}</p>
              </div>

              <div className="flex justify-between items-end mb-12">
                <div className="space-y-1">
                  <p className="text-[11px]"><span className="font-black w-28 inline-block uppercase text-gray-400">Nama Siswa</span>: <span className="font-black text-gray-800 uppercase">{studentName}</span></p>
                  <p className="text-[11px]"><span className="font-black w-28 inline-block uppercase text-gray-400">NIS</span>: <span className="font-bold text-gray-600 font-mono">{studentId}</span></p>
                  <p className="text-[11px]"><span className="font-black w-28 inline-block uppercase text-gray-400">Periode</span>: <span className="font-bold text-gray-600">{reportPeriod}</span></p>
                </div>
                <div className="text-center px-6 py-4 bg-gray-50 rounded-2xl border-2 border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Rerata Akhir</p>
                  <p className={`text-4xl font-black ${currentAverage >= 75 ? 'text-green-600' : 'text-red-600'}`}>{currentAverage}</p>
                </div>
              </div>

              <table className="w-full border-collapse mb-10">
                <thead>
                  <tr className="bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest">
                    <th className="p-4 text-left">Nama Ujian / Kompetensi</th>
                    <th className="p-4 text-center">KKM</th>
                    <th className="p-4 text-center">Nilai</th>
                    <th className="p-4 text-center">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y border">
                  {/* SECTION: EXAMS */}
                  <tr className="bg-gray-50"><td colSpan={4} className="p-2 text-[8px] font-black uppercase text-gray-400 tracking-widest pl-4">A. Ujian Harian Digital</td></tr>
                  {editableResults.map((r) => {
                    const exam = exams.find(e => e.id === r.examId);
                    const kkmVal = exam?.kkm || 75;
                    const passed = r.score >= kkmVal;
                    return (
                      <tr key={r.id}>
                        <td className="p-4 text-xs font-bold text-gray-700">{exam?.title || 'Ujian Digital'}</td>
                        <td className="p-4 text-center text-xs font-black text-gray-400">{kkmVal}</td>
                        <td className="p-4 text-center text-lg font-black">{r.score}</td>
                        <td className="p-4 text-center"><span className={`text-[9px] font-black uppercase ${passed ? 'text-green-600' : 'text-red-600'}`}>{passed ? 'TUNTAS' : 'REMIDI'}</span></td>
                      </tr>
                    );
                  })}
                  
                  {/* SECTION: TASKS */}
                  <tr className="bg-gray-50"><td colSpan={4} className="p-2 text-[8px] font-black uppercase text-gray-400 tracking-widest pl-4">B. Tugas Mandiri Terstruktur</td></tr>
                  {reviewedTasks.map((s) => (
                    <tr key={s.id}>
                      <td className="p-4 text-xs font-bold text-gray-700">{s.subject} (Tugas)</td>
                      <td className="p-4 text-center text-xs font-black text-gray-400">75</td>
                      <td className="p-4 text-center text-lg font-black">{s.grade}</td>
                      <td className="p-4 text-center"><span className={`text-[9px] font-black uppercase ${(s.grade || 0) >= 75 ? 'text-green-600' : 'text-red-600'}`}>{(s.grade || 0) >= 75 ? 'DITERIMA' : 'PERBAIKAN'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-4 pt-4 mb-16">
                <div className="flex justify-between items-center border-b-2 border-gray-900 pb-2">
                  <h3 className="font-black text-gray-800 uppercase text-[10px] tracking-widest">Catatan Evaluasi Guru</h3>
                </div>
                <div className="p-8 bg-gray-50 rounded-3xl border-2 border-gray-100 italic text-gray-700 text-sm leading-relaxed text-center">
                  "{feedback || 'Siswa menunjukkan partisipasi yang aktif. Terus tingkatkan kedisiplinan belajar.'}"
                </div>
              </div>

              {/* Tanda Tangan Section */}
              <div className="flex justify-between items-start mt-16 px-10">
                <div className="text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-16">Mengetahui,<br/>Orang Tua/Wali</p>
                  <p className="border-b-2 border-gray-300 w-32 mx-auto"></p>
                </div>
                <div className="text-center">
                  {/* Display Dynamic Date and Signer Title */}
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-16">{reportDateText}<br/>{reportSignerTitle}</p>
                  <p className="font-black text-gray-900 uppercase underline">{teacherName || 'GURU KELAS'}</p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">SMADA GENIUS ACADEMY</p>
                </div>
              </div>

              <div className="flex justify-center mt-12 gap-4 no-print">
                <button onClick={() => window.print()} className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-200"><i className="fas fa-print mr-2"></i> Cetak Raport</button>
              </div>
            </div>
          )}

          {activeTab === 'edit' && (
            <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in duration-500">
              <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-xl"><i className="fas fa-university"></i></div>
                  <div>
                    <h3 className="text-lg font-black text-gray-800 leading-none uppercase">Profil Sekolah & Raport</h3>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 col-span-1 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Sekolah</label>
                    <input type="text" value={reportHeader} onChange={(e) => setReportHeader(e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-gray-700 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Periode Raport</label>
                    <input type="text" value={reportPeriod} onChange={(e) => setReportPeriod(e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-500 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tempat & Tanggal Raport</label>
                    <input type="text" value={reportDateText} onChange={(e) => setReportDateText(e.target.value)} placeholder="Contoh: Semarang, 1 Januari 2026" className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-500 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jabatan Penandatangan</label>
                    <input type="text" value={reportSignerTitle} onChange={(e) => setReportSignerTitle(e.target.value)} placeholder="Contoh: Wali Kelas" className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-500 outline-none" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-xl"><i className="fas fa-comment-dots"></i></div>
                      <h3 className="text-lg font-black text-gray-800 leading-none uppercase">Komentar Wali Kelas</h3>
                    </div>
                    <button onClick={handleGenerateFeedback} disabled={isGenerating} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:bg-gray-200">
                       {isGenerating ? 'Loading...' : 'Gunakan AI'}
                    </button>
                 </div>
                 <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} className="w-full p-6 bg-gray-50 border-2 border-gray-100 rounded-[2rem] text-sm italic min-h-[150px] outline-none" placeholder="Tulis komentar..." />
              </div>

              <div className="flex gap-4">
                 <button onClick={() => setActiveTab('profile')} className="flex-1 py-5 bg-white border-2 border-gray-100 text-gray-400 rounded-[2rem] font-black text-xs uppercase">Batal</button>
                 <button onClick={handleSaveAll} className="flex-1 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase shadow-xl shadow-indigo-100">Simpan Perubahan</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentReportModal;
