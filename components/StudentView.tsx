
import React, { useState, useRef } from 'react';
import { User, Exam, Result, Submission } from '../types';
import QuizInterface from './QuizInterface';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StudentViewProps {
  user: User;
  exams: Exam[];
  results: Result[];
  submissions: Submission[];
  allStudents?: User[];
  onSubmitResult: (result: Result) => void;
  onSubmitTask: (submission: Submission) => void;
}

const StudentView: React.FC<StudentViewProps> = ({ user, exams, results, submissions, allStudents = [], onSubmitResult, onSubmitTask }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'profile'>('home');
  const [activeQuiz, setActiveQuiz] = useState<Exam | null>(null);
  const [isSubmitTaskOpen, setIsSubmitTaskOpen] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<'school' | 'class' | 'top_classes'>('school');
  
  const [taskSubject, setTaskSubject] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskFile, setTaskFile] = useState<{name: string, data: string, type: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStartExam = (exam: Exam) => {
    const myResults = results.filter(r => r.studentId === user.id);
    if (myResults.some(r => r.examId === exam.id)) {
      alert("Anda sudah mengerjakan ujian ini.");
      return;
    }
    setActiveQuiz(exam);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setTaskFile({ name: file.name, data: base64, type: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskSubject || !taskDesc) { alert("Harap isi mata pelajaran dan deskripsi."); return; }
    const newSub: Submission = {
      id: `sub-${Date.now()}`,
      studentId: user.id,
      studentName: user.name,
      studentClass: user.class || 'Umum',
      subject: taskSubject,
      description: taskDesc,
      attachment: taskFile || undefined,
      timestamp: Date.now(),
      status: 'pending'
    };
    onSubmitTask(newSub);
    setTaskSubject(''); setTaskDesc(''); setTaskFile(null);
    setIsSubmitTaskOpen(false);
    alert("Tugas berhasil dikirim ke Guru!");
  };

  if (activeQuiz) {
    return (
      <QuizInterface exam={activeQuiz} user={user} onCancel={() => setActiveQuiz(null)}
        onComplete={(res) => { onSubmitResult(res); setActiveQuiz(null); }} 
      />
    );
  }

  const myResults = results.filter(r => r.studentId === user.id);
  const mySubmissions = submissions.filter(s => s.studentId === user.id);
  const averageScore = myResults.length > 0 ? Math.round(myResults.reduce((acc, r) => acc + r.score, 0) / myResults.length) : 0;

  const chartData = [...myResults].sort((a, b) => a.timestamp - b.timestamp).map(res => ({
    name: new Date(res.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    nilai: res.score
  }));

  // === CALCULATE LEADERBOARDS ===
  const studentStats = allStudents.map(s => {
    const sRes = results.filter(r => r.studentId === s.id);
    const avg = sRes.length > 0 ? Math.round(sRes.reduce((acc, r) => acc + r.score, 0) / sRes.length) : 0;
    return { ...s, average: avg, totalExams: sRes.length };
  }).filter(s => s.totalExams > 0);

  const schoolRank = [...studentStats].sort((a, b) => b.average - a.average);
  const myClassRank = schoolRank.filter(s => s.class === user.class);
  const classNames = Array.from(new Set(allStudents.map(s => s.class).filter(Boolean))) as string[];
  const topClasses = classNames.map(clsName => {
    const clsStudents = studentStats.filter(s => s.class === clsName);
    const clsAvg = clsStudents.length > 0 ? Math.round(clsStudents.reduce((acc, s) => acc + s.average, 0) / clsStudents.length) : 0;
    return { name: clsName, average: clsAvg };
  }).sort((a, b) => b.average - a.average);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex gap-1 p-1 bg-gray-200/50 rounded-2xl w-fit">
        <button onClick={() => setActiveTab('home')} className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'home' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <i className="fas fa-th-large"></i> Beranda
        </button>
        <button onClick={() => setActiveTab('profile')} className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'profile' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <i className="fas fa-chart-line"></i> Statistik
        </button>
      </div>

      {activeTab === 'home' ? (
        <div className="space-y-8">
          <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl shadow-indigo-100">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-black mb-1 tracking-tighter uppercase">Halo, {user.name.split(' ')[0]}! 👋</h1>
                <p className="text-indigo-100 opacity-80 text-xs font-bold uppercase tracking-widest">Kelas: {user.class || 'Umum'}</p>
              </div>
              <div className="flex gap-3">
                 <button onClick={() => setIsSubmitTaskOpen(true)} className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-50 transition-all">
                   <i className="fas fa-paper-plane mr-2"></i> Kirim Tugas
                 </button>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-10">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                     <i className="fas fa-pencil-alt text-indigo-500"></i> Ujian Aktif
                   </h2>
                   <span className="bg-indigo-100 text-indigo-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">{exams.length} Tersedia</span>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {exams.length === 0 ? (
                    <div className="bg-white p-12 rounded-[2rem] border-2 border-dashed border-gray-100 text-center">
                       <i className="fas fa-coffee text-4xl text-gray-200 mb-4"></i>
                       <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Belum ada ujian aktif untuk kelas Anda.</p>
                    </div>
                  ) : (
                    exams.map(exam => {
                      const isTaken = myResults.some(r => r.examId === exam.id);
                      return (
                        <div key={exam.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:border-indigo-300 transition-all flex flex-col md:flex-row md:items-center gap-6 group">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${isTaken ? 'bg-gray-100 text-gray-400' : 'bg-indigo-50 text-indigo-600'}`}>
                            <i className="fas fa-file-invoice text-2xl"></i>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-black text-gray-800 uppercase tracking-tight">{exam.title}</h3>
                            <div className="flex flex-wrap gap-4 text-[10px] text-gray-400 font-bold uppercase mt-1">
                              <span className="flex items-center gap-1"><i className="far fa-clock"></i> {exam.duration} Menit</span>
                              <span className="flex items-center gap-1"><i className="far fa-list-alt"></i> {exam.questions.length} Soal</span>
                              <span className="text-indigo-500 font-black">{exam.subject}</span>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {isTaken ? (
                              <span className="px-6 py-3 bg-green-50 text-green-600 rounded-xl text-[10px] font-black border border-green-100 flex items-center gap-2 uppercase">
                                <i className="fas fa-check-circle"></i> Selesai
                              </span>
                            ) : (
                              <button onClick={() => handleStartExam(exam)} className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all text-[10px] uppercase tracking-widest">
                                Mulai Kerjakan
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-history text-indigo-500"></i> Nilai Terakhir
                  </h2>
                  <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                    {myResults.length === 0 ? (
                      <div className="p-10 text-center text-[10px] font-black text-gray-300 uppercase italic">Data kosong.</div>
                    ) : (
                      myResults.sort((a,b) => b.timestamp - a.timestamp).slice(0, 5).map(res => {
                        const ex = exams.find(e => e.id === res.examId);
                        return (
                          <div key={res.id} className="p-5 flex justify-between items-center hover:bg-gray-50 transition-colors">
                            <div>
                               <p className="font-black text-gray-700 text-xs uppercase pr-4">{ex?.title || "Ujian Digital"}</p>
                               <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">{new Date(res.timestamp).toLocaleDateString('id-ID')}</p>
                            </div>
                            <div className={`text-2xl font-black ${res.score >= (ex?.kkm || 75) ? 'text-green-500' : 'text-red-500'}`}>{res.score}</div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                    <i className="fas fa-paper-plane text-indigo-500"></i> Status Tugas
                  </h2>
                  <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                    {mySubmissions.length === 0 ? (
                      <div className="p-10 text-center text-[10px] font-black text-gray-300 uppercase italic">Data kosong.</div>
                    ) : (
                      mySubmissions.slice(0, 5).map(sub => (
                        <div key={sub.id} className="p-5 flex justify-between items-center hover:bg-gray-50 transition-colors">
                          <div className="pr-4">
                             <p className="font-black text-gray-700 text-xs uppercase">{sub.subject}</p>
                             <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">{new Date(sub.timestamp).toLocaleDateString('id-ID')}</p>
                          </div>
                          <div>
                             {sub.status === 'reviewed' ? (
                               <span className="text-[9px] font-black text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100 uppercase">Nilai: {sub.grade}</span>
                             ) : (
                               <span className="text-[9px] font-black text-amber-500 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 uppercase">Diproses</span>
                             )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 sticky top-24">
                <h3 className="font-black text-gray-800 text-[10px] uppercase tracking-widest mb-6 flex items-center gap-2">
                   <i className="fas fa-trophy text-yellow-500 text-sm"></i> Papan Skor nilai
                </h3>
                
                <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
                   <button onClick={() => setLeaderboardTab('school')} className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${leaderboardTab === 'school' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Sekolah</button>
                   <button onClick={() => setLeaderboardTab('class')} className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${leaderboardTab === 'class' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Kelas</button>
                   <button onClick={() => setLeaderboardTab('top_classes')} className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${leaderboardTab === 'top_classes' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Top Kelas</button>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                   {leaderboardTab === 'school' && schoolRank.slice(0, 10).map((s, i) => (
                      <div key={s.id} className="flex items-center justify-between p-2 rounded-xl transition-colors hover:bg-gray-50">
                         <div className="flex items-center gap-3">
                            <span className={`w-5 text-center font-black text-[10px] ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-300'}`}>{i+1}</span>
                            <div>
                               <p className="text-[10px] font-black text-gray-800 leading-none uppercase truncate w-24">{s.name.split(' ')[0]}</p>
                               <p className="text-[7px] text-gray-400 font-bold uppercase mt-1">{s.class}</p>
                            </div>
                         </div>
                         <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">{s.average}</span>
                      </div>
                   ))}

                   {leaderboardTab === 'class' && myClassRank.map((s, i) => (
                      <div key={s.id} className={`flex items-center justify-between p-2 rounded-xl transition-all ${s.id === user.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105' : 'hover:bg-gray-50'}`}>
                         <div className="flex items-center gap-3">
                            <span className={`w-5 text-center font-black text-[10px] ${s.id === user.id ? 'text-white' : i === 0 ? 'text-yellow-500' : 'text-gray-300'}`}>{i+1}</span>
                            <div>
                               <p className={`text-[10px] font-black leading-none uppercase truncate w-24 ${s.id === user.id ? 'text-white' : 'text-gray-800'}`}>{s.name.split(' ')[0]}</p>
                               {s.id === user.id && <p className="text-[7px] text-white/70 font-bold uppercase mt-1">Anda</p>}
                            </div>
                         </div>
                         <span className={`text-[9px] font-black px-2 py-1 rounded-lg border ${s.id === user.id ? 'bg-white/20 border-white/30 text-white' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>{s.average}</span>
                      </div>
                   ))}

                   {leaderboardTab === 'top_classes' && topClasses.map((c, i) => (
                      <div key={c.name} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors">
                         <div className="flex items-center gap-3">
                            <span className={`w-5 text-center font-black text-[10px] ${i === 0 ? 'text-yellow-500' : 'text-gray-300'}`}>{i+1}</span>
                            <p className="text-[10px] font-black text-gray-800 uppercase truncate w-24">{c.name}</p>
                         </div>
                         <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">{c.average}</span>
                            <p className="text-[6px] font-black text-gray-400 uppercase mt-1">Avg Score</p>
                         </div>
                      </div>
                   ))}

                   {(leaderboardTab === 'school' ? schoolRank : leaderboardTab === 'class' ? myClassRank : topClasses).length === 0 && (
                      <p className="text-[10px] text-gray-300 font-bold uppercase italic text-center py-10">Data tidak tersedia</p>
                   )}
                </div>
                
                <div className="mt-8 pt-6 border-t border-dashed border-gray-100">
                   <div className="bg-gray-50 p-4 rounded-2xl text-center">
                      <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Status Kehadiran</p>
                      <p className="text-[10px] font-black text-green-600 uppercase flex items-center justify-center gap-2">
                         <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Hadir Online
                      </p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-10 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[2rem] border shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Rata-rata Nilai</p>
              <p className={`text-5xl font-black ${averageScore >= 75 ? 'text-green-600' : 'text-red-600'}`}>{averageScore}</p>
              <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                 <div className={`h-full ${averageScore >= 75 ? 'bg-green-500' : 'bg-red-500'}`} style={{width:`${averageScore}%`}}></div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border shadow-sm">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Ujian Selesai</p>
               <p className="text-5xl font-black text-gray-800">{myResults.length}</p>
            </div>
            <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
               <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Peringkat Sekolah</p>
               <p className="text-5xl font-black">#{schoolRank.findIndex(s => s.id === user.id) + 1 || '-'}</p>
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-16 translate-x-16"></div>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[2.5rem] border shadow-sm">
             <h3 className="text-sm font-black text-gray-800 mb-8 uppercase tracking-widest">Visualisasi Capaian Belajar</h3>
             <div className="h-72 w-full">
               {chartData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                     <defs><linearGradient id="colStd" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/><stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/></linearGradient></defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 'bold'}} dy={15} />
                     <YAxis domain={[0, 100]} fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 'bold'}} />
                     <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }} />
                     <Area type="monotone" dataKey="nilai" stroke="#4f46e5" strokeWidth={4} fill="url(#colStd)" dot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 3 }} />
                   </AreaChart>
                 </ResponsiveContainer>
               ) : <div className="h-full flex items-center justify-center text-gray-300 font-black italic uppercase text-[10px]">Data tidak mencukupi.</div>}
             </div>
          </div>
        </div>
      )}

      {isSubmitTaskOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[600] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl animate-in zoom-in duration-300">
            <div className="p-8 border-b bg-gray-50 flex justify-between items-center">
               <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Submit Tugas Mandiri</h2>
               <button onClick={() => setIsSubmitTaskOpen(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 shadow-sm transition-all"><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleTaskSubmit} className="p-8 space-y-5">
              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Mata Pelajaran</label><input type="text" value={taskSubject} onChange={e => setTaskSubject(e.target.value)} placeholder="Mis: Sejarah..." className="w-full p-4 bg-gray-50 border rounded-2xl outline-none font-bold" required /></div>
              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Deskripsi Tugas</label><textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Tulis catatan..." className="w-full p-4 bg-gray-50 border rounded-2xl outline-none text-sm min-h-[120px]" required /></div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Lampiran Foto/File</label>
                {taskFile ? <div className="flex items-center justify-between bg-indigo-50 p-3 rounded-xl border border-indigo-100"><span className="text-[10px] font-bold text-indigo-600 truncate">{taskFile.name}</span><button type="button" onClick={() => setTaskFile(null)} className="text-red-500 text-xs"><i className="fas fa-trash"></i></button></div> :
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-white border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:text-indigo-500 transition-all flex flex-col items-center gap-1"><i className="fas fa-camera text-xl"></i><span className="text-[10px] font-black uppercase">Pilih Lampiran</span></button>}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,.pdf" />
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[1.8rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">Kirim Tugas <i className="fas fa-paper-plane ml-2"></i></button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentView;
