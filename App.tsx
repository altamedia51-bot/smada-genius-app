
import React, { useState, useEffect, useCallback } from 'react';
import { Role, User, Exam, Result, Submission } from './types';
import Login from './components/Login';
import TeacherDashboard from './components/TeacherDashboard';
import StudentView from './components/StudentView';
import { cloudStorage } from './services/storageService';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCloudActive, setIsCloudActive] = useState(cloudStorage.isCloudActive());
  
  const [user, setUser] = useState<User | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<User[]>([]);

  // Inisialisasi Data & Berlangganan Real-time Sync
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initApp = async () => {
      try {
        // 1. Muat Sesi Login
        const savedUser = localStorage.getItem('current_user');
        if (savedUser) setUser(JSON.parse(savedUser));

        // 2. Ambil Snapshot Data Awal
        const data = await cloudStorage.getAllData();
        setExams(data.exams);
        setResults(data.results);
        setSubmissions(data.submissions);
        setStudents(data.students);
        
        // 3. Aktifkan Listener Real-time (Inti dari Multi-Device Sync)
        if (cloudStorage.isCloudActive()) {
          unsubscribe = cloudStorage.subscribeToData((cloudData) => {
            if (cloudData.exams) setExams(cloudData.exams);
            if (cloudData.results) setResults(cloudData.results);
            if (cloudData.submissions) setSubmissions(cloudData.submissions);
            if (cloudData.students) setStudents(cloudData.students);
            console.log("SMADA Sync: Data diperbarui otomatis dari Cloud.");
          });
        }

        // 4. Data Default (Hanya jika database benar-benar kosong)
        if (data.students.length === 0 && !savedUser) {
          // Fix: Explicitly type 'defaults' as User[] to resolve 'string' vs 'Role' type mismatch
          const defaults: User[] = [
            { id: 'S-12345', name: 'Andi Pratama', role: 'student', nis: '12345', class: 'XII MIPA 1' },
            { id: 'S-12346', name: 'Siti Aminah', role: 'student', nis: '12346', class: 'XII MIPA 2' }
          ];
          setStudents(defaults);
          await cloudStorage.saveData('students', defaults);
        }
      } catch (error) {
        console.error("Initialization Error:", error);
      } finally {
        setTimeout(() => setIsLoading(false), 500);
      }
    };

    initApp();
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // Helper untuk menyimpan data ke Cloud secara asinkron
  const syncToCloud = useCallback(async (key: string, data: any) => {
    setIsSyncing(true);
    await cloudStorage.saveData(key, data);
    setTimeout(() => setIsSyncing(false), 500);
  }, []);

  // Login Logic
  const handleLogin = (userData: User): { success: boolean; message?: string } => {
    if (userData.role === 'student') {
      const found = students.find(s => s.nis === userData.nis);
      if (found) {
        setUser(found);
        localStorage.setItem('current_user', JSON.stringify(found));
        return { success: true };
      }
      return { success: false, message: 'NIS tidak terdaftar di server.' };
    }
    setUser(userData);
    localStorage.setItem('current_user', JSON.stringify(userData));
    return { success: true };
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('current_user');
  };

  // HANDLERS (Tetap menggunakan logika existing namun diteruskan ke Cloud)
  const addExam = async (newE: Exam) => {
    const updated = [newE, ...exams];
    setExams(updated);
    await syncToCloud('exams', updated);
  };

  const updateExam = async (upE: Exam) => {
    const updated = exams.map(e => e.id === upE.id ? upE : e);
    setExams(updated);
    await syncToCloud('exams', updated);
  };

  const deleteExam = async (id: string) => {
    const updatedExams = exams.filter(e => e.id !== id);
    const updatedResults = results.filter(r => r.examId !== id);
    setExams(updatedExams); setResults(updatedResults);
    await syncToCloud('exams', updatedExams);
    await syncToCloud('results', updatedResults);
  };

  const updateExamStatus = async (id: string, status: 'active' | 'draft' | 'closed') => {
    const updated = exams.map(e => e.id === id ? { ...e, status } : e);
    setExams(updated);
    await syncToCloud('exams', updated);
  };

  const addStudent = async (newS: User) => {
    const updated = [...students, newS];
    setStudents(updated);
    await syncToCloud('students', updated);
  };

  const addBulkStudents = async (newS: User[]) => {
    const existingNIS = new Set(students.map(s => s.nis));
    const uniqueNew = newS.filter(s => !existingNIS.has(s.nis));
    const updated = [...students, ...uniqueNew];
    setStudents(updated);
    await syncToCloud('students', updated);
  };

  const updateStudent = async (upS: User) => {
    const updated = students.map(s => s.id === upS.id ? upS : s);
    setStudents(updated);
    await syncToCloud('students', updated);
  };

  const deleteStudent = async (id: string) => {
    const updated = students.filter(s => s.id !== id);
    setStudents(updated);
    await syncToCloud('students', updated);
  };

  const submitResult = async (res: Result) => {
    const updated = [res, ...results];
    setResults(updated);
    await syncToCloud('results', updated);
  };

  const updateResults = async (updatedList: Result[]) => {
    const newResults = [...results];
    updatedList.forEach(updated => {
      const idx = newResults.findIndex(r => r.id === updated.id);
      if (idx !== -1) newResults[idx] = updated;
    });
    setResults(newResults);
    await syncToCloud('results', newResults);
  };

  const addSubmission = async (sub: Submission) => {
    const updated = [sub, ...submissions];
    setSubmissions(updated);
    await syncToCloud('submissions', updated);
  };

  const updateSubmission = async (upS: Submission) => {
    const updated = submissions.map(s => s.id === upS.id ? upS : s);
    setSubmissions(updated);
    await syncToCloud('submissions', updated);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-6">
        <div className="w-14 h-14 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="font-black text-gray-800 text-xl tracking-tighter uppercase mb-1">SMADA GENIUS</h2>
        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.4em] animate-pulse">Menghubungkan ke Database Cloud...</p>
      </div>
    );
  }

  if (!user) return <Login onLogin={handleLogin} />;

  const filteredExamsForStudent = exams.filter(exam => 
    exam.status === 'active' && 
    (user.class ? (exam.targetClasses.includes(user.class) || exam.targetClasses.includes('Umum')) : true)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-100">
            <i className="fas fa-graduation-cap"></i>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black text-gray-800 tracking-tighter uppercase leading-none">SMADA GENIUS</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isCloudActive ? 'bg-green-500' : 'bg-amber-500'}`}></span>
              <span className={`text-[7px] font-black uppercase tracking-widest ${isCloudActive ? 'text-green-600' : 'text-amber-600'}`}>
                {isCloudActive ? 'Database Cloud Aktif' : 'Mode Offline Lokal'}
              </span>
            </div>
          </div>
          {isSyncing && (
            <div className="ml-4 px-3 py-1 bg-indigo-50 rounded-lg flex items-center gap-2 border border-indigo-100 animate-in fade-in slide-in-from-left-2">
              <div className="w-1 h-1 bg-indigo-500 rounded-full animate-ping"></div>
              <span className="text-[8px] font-black text-indigo-600 uppercase">Menyimpan...</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-gray-800 uppercase tracking-tight">{user.name}</p>
            <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">{user.role}{user.class ? ` • ${user.class}` : ''}</p>
          </div>
          <button onClick={handleLogout} className="w-10 h-10 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300 shadow-sm shadow-red-100">
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 sm:p-8">
        {user.role === 'teacher' ? (
          <TeacherDashboard 
            currentUser={user}
            exams={exams} results={results} students={students} submissions={submissions}
            onAddExam={addExam} onUpdateExam={updateExam} onDeleteExam={deleteExam} onUpdateStatus={updateExamStatus}
            onAddStudent={addStudent} onAddBulkStudents={addBulkStudents} onUpdateStudent={updateStudent} onDeleteStudent={deleteStudent}
            onUpdateResults={updateResults} onUpdateSubmission={updateSubmission} onUpdateTeacher={(u) => { setUser(u); localStorage.setItem('current_user', JSON.stringify(u)); }}
            onRestoreData={async (data) => {
               if(data.exams) await syncToCloud('exams', data.exams);
               if(data.results) await syncToCloud('results', data.results);
               if(data.students) await syncToCloud('students', data.students);
               if(data.submissions) await syncToCloud('submissions', data.submissions);
               alert("Sinkronisasi Cloud Selesai!");
            }}
          />
        ) : (
          <StudentView 
            user={user} exams={filteredExamsForStudent} results={results} submissions={submissions}
            allStudents={students} onSubmitResult={submitResult} onSubmitTask={addSubmission}
          />
        )}
      </main>
    </div>
  );
};

export default App;
