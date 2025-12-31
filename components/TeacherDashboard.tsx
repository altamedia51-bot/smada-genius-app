
import React, { useState, useRef, useMemo } from 'react';
import { Exam, Result, Question, User, Submission } from '../types';
import { generateQuestions, FilePart } from '../services/geminiService';
import StudentReportModal from './StudentReportModal';

interface TeacherDashboardProps {
  currentUser: User;
  exams: Exam[];
  results: Result[];
  students: User[];
  submissions: Submission[];
  onAddExam: (exam: Exam) => void;
  onUpdateExam?: (exam: Exam) => void;
  onDeleteExam: (id: string) => void;
  onUpdateStatus: (id: string, status: 'active' | 'draft' | 'closed') => void;
  onAddStudent: (student: User) => void;
  onAddBulkStudents: (students: User[]) => void;
  onUpdateStudent: (student: User) => void;
  onDeleteStudent: (id: string) => void;
  onUpdateResults?: (results: Result[]) => void;
  onUpdateSubmission?: (submission: Submission) => void;
  onUpdateTeacher?: (user: User) => void;
  onRestoreData?: (data: any) => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ 
  currentUser, exams, results, students, submissions, onAddExam, onUpdateExam, onDeleteExam, onUpdateStatus,
  onAddStudent, onAddBulkStudents, onUpdateStudent, onDeleteStudent, onUpdateResults, onUpdateSubmission, onUpdateTeacher, onRestoreData
}) => {
  const [activeTab, setActiveTab] = useState<'exams' | 'submissions' | 'students' | 'reports' | 'settings'>('exams');
  
  // Modals visibility
  const [isAddingExam, setIsAddingExam] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState<User | null>(null);
  const [selectedStudentReport, setSelectedStudentReport] = useState<{id: string, name: string} | null>(null);
  const [monitoringExam, setMonitoringExam] = useState<Exam | null>(null);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

  // Sidebar Report State
  const [selectedClassForReport, setSelectedClassForReport] = useState<string | null>(null);

  // Refs
  const bulkStudentInputRef = useRef<HTMLInputElement>(null);
  const materialInputRef = useRef<HTMLInputElement>(null);
  const questionImgInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  // Exam Form State
  const [examTitle, setExamTitle] = useState('');
  const [examSubject, setExamSubject] = useState('');
  const [examKkm, setExamKkm] = useState(75);
  const [examDuration, setExamDuration] = useState(60);
  const [examShuffle, setExamShuffle] = useState(true);
  const [examMaterialText, setExamMaterialText] = useState('');
  const [examQuestionCount, setExamQuestionCount] = useState(5);
  const [examTargetClasses, setExamTargetClasses] = useState<string[]>(['Umum']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tempQuestions, setTempQuestions] = useState<Question[]>([]);
  const [attachedMaterial, setAttachedMaterial] = useState<{name: string, data: string, type: string} | null>(null);

  // Manual Question State
  const [editingQIdx, setEditingQIdx] = useState<number | null>(null);
  const [manualQText, setManualQText] = useState('');
  const [manualOptions, setManualOptions] = useState<string[]>(['', '', '', '', '']);
  const [manualCorrect, setManualCorrect] = useState(0);
  const [manualQImage, setManualQImage] = useState<{data: string, type: string} | null>(null);

  // Other States
  const [gradeInput, setGradeInput] = useState('');
  const [teacherNameInput, setTeacherNameInput] = useState(currentUser.name);
  const [studentName, setStudentName] = useState('');
  const [studentNIS, setStudentNIS] = useState('');
  const [studentClass, setStudentClass] = useState('');

  // Memoized data for reports grouping
  const reportClasses = useMemo(() => {
    const classes = Array.from(new Set(students.map(s => s.class || 'Tanpa Kelas'))).sort();
    return classes;
  }, [students]);

  const studentsInSelectedClass = useMemo(() => {
    if (!selectedClassForReport) return [];
    return students.filter(s => (s.class || 'Tanpa Kelas') === selectedClassForReport);
  }, [students, selectedClassForReport]);

  const availableClasses = ['Umum', ...Array.from(new Set(students.map(s => s.class).filter(Boolean))) as string[]];

  const resetExamForm = () => {
    setIsAddingExam(false);
    setEditingExam(null);
    setExamTitle('');
    setExamSubject('');
    setExamMaterialText('');
    setTempQuestions([]);
    setExamTargetClasses(['Umum']);
    setExamKkm(75);
    setExamDuration(60);
    setExamShuffle(true);
    setAttachedMaterial(null);
    setExamQuestionCount(5);
    resetManualQForm();
  };

  const resetManualQForm = () => {
    setEditingQIdx(null);
    setManualQText('');
    setManualOptions(['', '', '', '', '']);
    setManualCorrect(0);
    setManualQImage(null);
  };

  const handleGenerateQuestions = async () => {
    if (!examMaterialText && !attachedMaterial) return alert("Input materi teks atau gambar materi dahulu.");
    setIsGenerating(true);
    try {
      const filePart: FilePart | undefined = attachedMaterial ? {
        inlineData: { data: attachedMaterial.data, mimeType: attachedMaterial.type }
      } : undefined;
      const qs = await generateQuestions(examTitle || "Ujian Baru", examQuestionCount, filePart, examMaterialText);
      setTempQuestions(prev => [...prev, ...qs]);
    } catch (err) { 
      alert("AI Gagal menganalisis materi."); 
    } finally { setIsGenerating(false); }
  };

  const handleSaveManualQuestion = () => {
    if (!manualQText || manualOptions.some(o => !o)) return alert("Lengkapi teks soal dan semua pilihan.");
    const newQ: Question = {
      id: editingQIdx !== null ? tempQuestions[editingQIdx].id : `q-manual-${Date.now()}`,
      text: manualQText,
      options: manualOptions,
      correctAnswer: manualCorrect,
      image: manualQImage || undefined
    };

    if (editingQIdx !== null) {
      setTempQuestions(prev => prev.map((q, i) => i === editingQIdx ? newQ : q));
    } else {
      setTempQuestions(prev => [...prev, newQ]);
    }
    resetManualQForm();
  };

  const handleSaveExam = () => {
    if (!examTitle || !examSubject || tempQuestions.length === 0) return alert("Lengkapi judul, mapel, dan minimal 1 soal.");
    const data: Exam = {
      id: editingExam?.id || `ex-${Date.now()}`,
      title: examTitle,
      subject: examSubject,
      duration: examDuration,
      questions: tempQuestions,
      status: editingExam?.status || 'draft',
      createdAt: editingExam?.createdAt || Date.now(),
      kkm: examKkm,
      targetClasses: examTargetClasses,
      shuffleQuestions: examShuffle
    };
    editingExam ? onUpdateExam?.(data) : onAddExam(data);
    resetExamForm();
  };

  const handleMaterialUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setAttachedMaterial({ name: file.name, data: base64, type: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleQuestionImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setManualQImage({ data: base64, type: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleExportData = () => {
    const dataToExport = { exams, results, students, submissions, teacher: currentUser.name };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BACKUP_SMADA_${new Date().getTime()}.json`;
    link.click();
  };

  const handleDownloadTemplate = () => {
    const headers = "name,nis,class\nAndi Pratama,12345,XII MIPA 1\nSiti Aminah,12346,XII MIPA 2";
    const blob = new Blob([headers], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TEMPLATE_SISWA_SMADA.csv`;
    link.click();
  };

  const handleSaveTeacherSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateTeacher && teacherNameInput.trim()) {
      onUpdateTeacher({ ...currentUser, name: teacherNameInput.trim() });
      alert("Profil guru berhasil diperbarui!");
    }
  };

  const handleBulkStudentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const rows = content.split('\n').filter(r => r.trim());
      const parsed: User[] = rows.slice(1).map(r => {
        const [n, ni, c] = r.split(',').map(x => x.trim());
        return { id: `S-${ni}`, name: n, nis: ni, class: c, role: 'student' as const };
      }).filter(s => s.name && s.nis);
      onAddBulkStudents(parsed);
      alert(`Berhasil impor ${parsed.length} siswa.`);
      if(bulkStudentInputRef.current) bulkStudentInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const handleGradeSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !gradeInput) return;
    onUpdateSubmission?.({ ...selectedSub, status: 'reviewed', grade: parseInt(gradeInput) });
    setSelectedSub(null); setGradeInput('');
    alert("Nilai tugas disimpan!");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Navigation */}
      <div className="flex gap-2 p-1.5 bg-gray-200/50 rounded-2xl w-fit flex-wrap no-print">
        {[
          { id: 'exams', icon: 'fa-file-signature', label: 'Ujian' },
          { id: 'submissions', icon: 'fa-paper-plane', label: 'Tugas Masuk' },
          { id: 'students', icon: 'fa-user-graduate', label: 'Siswa' },
          { id: 'reports', icon: 'fa-chart-bar', label: 'Raport' },
          { id: 'settings', icon: 'fa-cog', label: 'Pengaturan' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)} 
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <i className={`fas ${tab.icon}`}></i> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-h-[600px]">
        {/* VIEW: EXAMS */}
        {activeTab === 'exams' && (
          <div>
            <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
              <h2 className="font-black text-gray-800 text-xl tracking-tighter uppercase">Bank Ujian Digital</h2>
              <button onClick={() => { resetExamForm(); setIsAddingExam(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl shadow-indigo-100">
                <i className="fas fa-plus mr-2"></i> Buat Ujian Baru
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase border-b">
                  <tr><th className="px-8 py-5">Ujian</th><th className="px-8 py-5">Target Kelas</th><th className="px-8 py-5 text-center">Status</th><th className="px-8 py-5 text-center">Aksi</th></tr>
                </thead>
                <tbody className="divide-y">
                  {exams.map(e => (
                    <tr key={e.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-8 py-5">
                        <p className="font-black text-gray-800 leading-tight">{e.title}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">{e.subject} • {e.questions.length} Soal</p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-wrap gap-1">
                          {e.targetClasses.map(c => <span key={c} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded border border-indigo-100 uppercase">{c}</span>)}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${e.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{e.status}</span>
                      </td>
                      <td className="px-8 py-5 text-center space-x-2">
                        <button onClick={() => setMonitoringExam(e)} className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl"><i className="fas fa-eye"></i></button>
                        <button onClick={() => { 
                          setEditingExam(e); setExamTitle(e.title); setExamSubject(e.subject); setExamKkm(e.kkm); 
                          setExamDuration(e.duration); setExamShuffle(e.shuffleQuestions ?? true);
                          setExamTargetClasses(e.targetClasses); setTempQuestions(e.questions); setIsAddingExam(true); 
                        }} className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl"><i className="fas fa-pencil-alt"></i></button>
                        <button onClick={() => onUpdateStatus(e.id, e.status === 'active' ? 'draft' : 'active')} className={`w-10 h-10 rounded-xl ${e.status === 'active' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}><i className={`fas ${e.status === 'active' ? 'fa-pause' : 'fa-play'}`}></i></button>
                        <button onClick={() => onDeleteExam(e.id)} className="w-10 h-10 text-gray-200 hover:text-red-500"><i className="fas fa-trash"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW: SUBMISSIONS */}
        {activeTab === 'submissions' && (
          <div>
            <div className="p-8 border-b bg-gray-50/50">
               <h2 className="font-black text-gray-800 text-xl tracking-tighter uppercase">Review Tugas Mandiri</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase border-b">
                  <tr><th className="px-8 py-5">Siswa</th><th className="px-8 py-5">Mapel</th><th className="px-8 py-5 text-center">Status</th><th className="px-8 py-5 text-center">Aksi</th></tr>
                </thead>
                <tbody className="divide-y">
                  {submissions.map(sub => (
                    <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-8 py-5"><p className="font-black text-gray-800 leading-tight">{sub.studentName}</p><p className="text-[9px] text-gray-400 font-bold uppercase mt-1">{sub.studentClass}</p></td>
                      <td className="px-8 py-5 font-bold text-xs uppercase text-indigo-600">{sub.subject}</td>
                      <td className="px-8 py-5 text-center">
                        {sub.status === 'reviewed' ? <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-[9px] font-black uppercase">Nilai: {sub.grade}</span> : <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-black uppercase">Pending</span>}
                      </td>
                      <td className="px-8 py-5 text-center">
                        <button onClick={() => { setSelectedSub(sub); setGradeInput(sub.grade?.toString() || ''); }} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">Review Tugas</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW: STUDENTS */}
        {activeTab === 'students' && (
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-gray-800 text-xl tracking-tighter uppercase">Database Siswa</h2>
              <div className="flex gap-2">
                <button onClick={handleDownloadTemplate} className="bg-white border-2 border-amber-500 text-amber-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-amber-50 transition-all">
                  <i className="fas fa-download mr-2"></i> Unduh Template CSV
                </button>
                <button onClick={() => bulkStudentInputRef.current?.click()} className="bg-white border-2 border-indigo-600 text-indigo-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-indigo-50 transition-all">
                  <i className="fas fa-file-import mr-2"></i> Impor CSV
                </button>
                <input type="file" ref={bulkStudentInputRef} onChange={handleBulkStudentUpload} className="hidden" accept=".csv" />
                <button onClick={() => { setEditingStudent(null); setIsAddingStudent(true); }} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-indigo-100">
                  <i className="fas fa-plus mr-2"></i> Tambah Siswa
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase border-b">
                  <tr><th className="px-8 py-5">Nama</th><th className="px-8 py-5">NIS</th><th className="px-8 py-5">Kelas</th><th className="px-8 py-5 text-center">Aksi</th></tr>
                </thead>
                <tbody className="divide-y">
                  {students.map(s => (
                    <tr key={s.id} className="hover:bg-indigo-50/30 transition-all group">
                      <td className="px-8 py-5 font-black text-gray-800">{s.name}</td>
                      <td className="px-8 py-5 font-mono text-gray-400">{s.nis}</td>
                      <td className="px-8 py-5 font-black text-xs text-gray-600">{s.class}</td>
                      <td className="px-8 py-5 text-center space-x-2">
                        <button onClick={() => { setEditingStudent(s); setStudentName(s.name); setStudentNIS(s.nis || ''); setStudentClass(s.class || ''); setIsAddingStudent(true); }} className="p-2 text-indigo-400"><i className="fas fa-edit"></i></button>
                        <button onClick={() => onDeleteStudent(s.id)} className="p-2 text-gray-200 hover:text-red-500"><i className="fas fa-trash"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW: REPORTS (WITH CLASS SIDEBAR NAVIGATION) */}
        {activeTab === 'reports' && (
          <div className="flex h-[calc(100vh-250px)] min-h-[600px] overflow-hidden">
            {/* Sidebar Daftar Kelas */}
            <div className="w-64 border-r bg-gray-50/50 overflow-y-auto p-6 space-y-3 shrink-0 scrollbar-hide">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Pilih Kelas</h3>
              {reportClasses.map(cls => {
                const count = students.filter(s => (s.class || 'Tanpa Kelas') === cls).length;
                return (
                  <button 
                    key={cls}
                    onClick={() => setSelectedClassForReport(cls)}
                    className={`w-full text-left p-4 rounded-2xl transition-all border-2 flex flex-col gap-1 group ${selectedClassForReport === cls ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-transparent hover:border-indigo-100 text-gray-700'}`}
                  >
                    <span className="font-black text-xs uppercase tracking-tight">{cls}</span>
                    <span className={`text-[9px] font-bold ${selectedClassForReport === cls ? 'text-indigo-200' : 'text-gray-400'}`}>{count} Siswa Terdaftar</span>
                  </button>
                );
              })}
              {reportClasses.length === 0 && (
                <div className="text-center py-10">
                   <p className="text-[9px] font-black text-gray-300 uppercase">Belum ada data kelas</p>
                </div>
              )}
            </div>

            {/* Main Content: Siswa dalam kelas tersebut */}
            <div className="flex-1 overflow-y-auto p-8 bg-white scrollbar-hide">
              {selectedClassForReport ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex justify-between items-center border-b pb-6">
                    <div>
                      <h2 className="font-black text-gray-800 text-2xl tracking-tighter uppercase">Raport Kelas {selectedClassForReport}</h2>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Gunakan raport digital untuk melihat nilai ujian dan tugas.</p>
                    </div>
                    <div className="text-right">
                       <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-4 py-2 rounded-full border border-indigo-100 uppercase">{studentsInSelectedClass.length} Siswa</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {studentsInSelectedClass.map(s => {
                      const sResults = results.filter(r => r.studentId === s.id);
                      const avg = sResults.length > 0 ? Math.round(sResults.reduce((acc, r) => acc + r.score, 0) / sResults.length) : 0;
                      return (
                        <div key={s.id} className="bg-white border rounded-[2rem] p-6 hover:shadow-xl transition-all group flex flex-col justify-between h-56 border-gray-100 hover:border-indigo-200">
                          <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black group-hover:bg-indigo-600 group-hover:text-white transition-colors">{s.name.charAt(0)}</div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-gray-400 uppercase">Rerata</p>
                              <p className={`text-2xl font-black ${avg >= 75 ? 'text-green-600' : 'text-red-500'}`}>{avg}</p>
                            </div>
                          </div>
                          <div>
                            <h3 className="font-black text-gray-800 text-sm uppercase truncate mb-1">{s.name}</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-4">NIS {s.nis}</p>
                            <button 
                              onClick={() => setSelectedStudentReport({ id: s.id, name: s.name })} 
                              className="w-full py-3 bg-gray-50 border group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 rounded-xl font-black text-[10px] uppercase transition-all shadow-sm"
                            >
                              Buka Raport Digital
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center px-10">
                   <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-gray-200">
                      <i className="fas fa-arrow-left text-3xl text-gray-200"></i>
                   </div>
                   <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Pilih Kelas Terlebih Dahulu</h3>
                   <p className="text-xs text-gray-400 font-bold uppercase mt-2 max-w-xs leading-relaxed">Pilih salah satu kelas di panel sidebar kiri untuk mengelola capaian belajar siswa.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="p-8 space-y-12 max-w-4xl mx-auto">
             <div className="bg-white p-10 rounded-[2.5rem] border-2 border-gray-100 shadow-sm space-y-8">
                <h3 className="text-xl font-black text-gray-800 uppercase">Profil Guru</h3>
                <form onSubmit={handleSaveTeacherSettings} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nama Lengkap & Gelar</label>
                    <input type="text" value={teacherNameInput} onChange={(e) => setTeacherNameInput(e.target.value)} className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-gray-700 outline-none focus:border-indigo-500 transition-all" />
                  </div>
                  <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl">Simpan Perubahan</button>
                </form>
             </div>
             <div className="bg-amber-50 p-10 rounded-[2.5rem] border-2 border-amber-100 space-y-8">
                <h3 className="text-xl font-black text-amber-900 uppercase">Backup & Restore Data</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <button onClick={handleExportData} className="p-8 bg-white border border-amber-200 rounded-3xl text-center hover:bg-amber-100 transition-all">
                      <i className="fas fa-download text-3xl text-amber-600 mb-3"></i>
                      <p className="font-black text-xs uppercase text-amber-900">Ekspor Data (JSON)</p>
                   </button>
                   <button onClick={() => restoreInputRef.current?.click()} className="p-8 bg-white border border-indigo-200 rounded-3xl text-center hover:bg-indigo-100 transition-all">
                      <i className="fas fa-upload text-3xl text-indigo-600 mb-3"></i>
                      <p className="font-black text-xs uppercase text-indigo-900">Impor File Backup</p>
                   </button>
                   <input type="file" ref={restoreInputRef} onChange={(e) => {
                      const file = e.target.files?.[0];
                      if(!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        try { onRestoreData?.(JSON.parse(ev.target?.result as string)); } catch { alert("Format salah"); }
                      };
                      reader.readAsText(file);
                   }} className="hidden" accept=".json" />
                </div>
             </div>
          </div>
        )}
      </div>

      {/* MODAL: EXAM FORM (AI GENERATOR FEATURE INCLUDED) */}
      {isAddingExam && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[500] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-6xl h-[95vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
              <div className="p-8 border-b bg-gray-50 flex justify-between items-center shrink-0">
                 <h2 className="font-black text-gray-800 text-2xl uppercase tracking-tighter">{editingExam ? 'Edit Ujian' : 'Ujian Baru'}</h2>
                 <button onClick={resetExamForm} className="w-10 h-10 bg-white border rounded-full text-gray-400"><i className="fas fa-times"></i></button>
              </div>

              <div className="flex-1 flex overflow-hidden">
                 <div className="w-1/2 overflow-y-auto p-10 border-r space-y-10 scrollbar-hide">
                    <div className="space-y-6">
                      <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Pengaturan Utama</h3>
                      <div className="grid grid-cols-2 gap-4">
                         <input value={examTitle} onChange={e => setExamTitle(e.target.value)} className="col-span-2 w-full p-4 bg-gray-50 border rounded-2xl text-lg font-black outline-none" placeholder="Judul Ujian" />
                         <input value={examSubject} onChange={e => setExamSubject(e.target.value)} className="w-full p-4 bg-gray-50 border rounded-2xl font-bold outline-none" placeholder="Mapel" />
                         <div className="flex gap-2">
                            <input type="number" value={examKkm} onChange={e => setExamKkm(parseInt(e.target.value))} className="w-1/2 p-4 bg-indigo-50 border rounded-2xl font-black" placeholder="KKM" />
                            <input type="number" value={examDuration} onChange={e => setExamDuration(parseInt(e.target.value))} className="w-1/2 p-4 bg-amber-50 border rounded-2xl font-black" placeholder="Durasi" />
                         </div>
                         <div className="col-span-2 flex flex-wrap gap-2 pt-2">
                            <p className="w-full text-[10px] font-black text-gray-400 uppercase mb-1">Target Kelas:</p>
                            {availableClasses.map(cls => (
                               <button key={cls} onClick={() => setExamTargetClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls])} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${examTargetClasses.includes(cls) ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-400'}`}>{cls}</button>
                            ))}
                         </div>
                      </div>
                    </div>

                    <div className="bg-gray-900 p-8 rounded-[2rem] text-white space-y-6">
                       <h4 className="text-sm font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                         <i className="fas fa-bolt"></i> AI Generator Soal (Gemini)
                       </h4>
                       <div className="grid grid-cols-1 gap-4">
                          <div className="flex gap-4">
                            <button onClick={() => materialInputRef.current?.click()} className="w-20 h-20 border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center shrink-0">
                              {attachedMaterial ? <i className="fas fa-check text-green-400"></i> : <i className="fas fa-camera"></i>}
                            </button>
                            <textarea value={examMaterialText} onChange={e => setExamMaterialText(e.target.value)} className="flex-1 p-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-white outline-none min-h-[100px]" placeholder="Tempel materi teks atau upload gambar materi..."></textarea>
                          </div>
                       </div>
                       <input type="file" ref={materialInputRef} onChange={handleMaterialUpload} className="hidden" accept="image/*" />
                       <button onClick={handleGenerateQuestions} disabled={isGenerating} className="w-full bg-indigo-500 py-4 rounded-xl font-black text-xs uppercase shadow-xl disabled:bg-gray-700">{isGenerating ? 'AI Sedang Bekerja...' : 'Generate Soal AI'}</button>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] border-2 border-indigo-100 space-y-4">
                       <h3 className="text-sm font-black text-indigo-900 uppercase">Input Soal Manual</h3>
                       <textarea value={manualQText} onChange={e => setManualQText(e.target.value)} className="w-full p-4 bg-gray-50 border rounded-2xl text-sm font-bold min-h-[80px]" placeholder="Teks soal..."></textarea>
                       {manualOptions.map((opt, i) => (
                          <div key={i} className="flex gap-2">
                             <button onClick={() => setManualCorrect(i)} className={`w-10 h-10 rounded-xl font-black ${manualCorrect === i ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>{String.fromCharCode(65+i)}</button>
                             <input value={opt} onChange={e => { const n = [...manualOptions]; n[i] = e.target.value; setManualOptions(n); }} className="flex-1 p-2 bg-gray-50 border rounded-xl text-xs" placeholder={`Opsi ${String.fromCharCode(65+i)}`} />
                          </div>
                       ))}
                       <button onClick={handleSaveManualQuestion} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase">Simpan Soal</button>
                    </div>
                 </div>

                 <div className="w-1/2 overflow-y-auto p-10 bg-gray-50/50 space-y-6 scrollbar-hide">
                    <h3 className="font-black text-xs uppercase tracking-widest text-gray-400">Pratinjau Bank Soal ({tempQuestions.length})</h3>
                    {tempQuestions.map((q, i) => (
                       <div key={i} className="bg-white p-6 rounded-[2rem] border shadow-sm relative group">
                          <button onClick={() => setTempQuestions(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 text-red-400 opacity-0 group-hover:opacity-100"><i className="fas fa-trash"></i></button>
                          <p className="font-bold text-gray-800 text-sm mb-4">{i + 1}. {q.text}</p>
                          <div className="space-y-1">
                             {q.options.map((opt, oi) => <div key={oi} className={`text-[10px] p-2 rounded-lg ${q.correctAnswer === oi ? 'bg-green-50 text-green-700 font-black' : 'text-gray-400'}`}>{String.fromCharCode(65+oi)}. {opt}</div>)}
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="p-8 border-t bg-white flex justify-end gap-4 shrink-0">
                 <button onClick={resetExamForm} className="px-10 py-4 font-black text-gray-400 uppercase text-xs">Batal</button>
                 <button onClick={handleSaveExam} disabled={tempQuestions.length === 0} className="bg-indigo-600 text-white px-20 py-4 rounded-2xl font-black shadow-xl uppercase text-xs tracking-widest">Simpan Ujian</button>
              </div>
           </div>
        </div>
      )}

      {selectedStudentReport && (
        <StudentReportModal 
          studentId={selectedStudentReport.id} 
          studentName={selectedStudentReport.name} 
          results={results} 
          submissions={submissions} 
          exams={exams} 
          teacherName={currentUser.name} 
          onClose={() => setSelectedStudentReport(null)} 
          onUpdateResults={onUpdateResults} 
        />
      )}
    </div>
  );
};

export default TeacherDashboard;
