
import React, { useState, useEffect, useCallback } from 'react';
import { Exam, User, Result } from '../types';

interface QuizInterfaceProps {
  exam: Exam;
  user: User;
  onComplete: (result: Result) => void;
  onCancel: () => void;
}

const QuizInterface: React.FC<QuizInterfaceProps> = ({ exam, user, onComplete, onCancel }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(exam.duration * 60);
  const [isFinished, setIsFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);

  const [shuffledIndices] = useState(() => {
    const indices = exam.questions.map((_, i) => i);
    if (exam.shuffleQuestions !== false) {
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
    }
    return indices;
  });

  const enterFullscreen = useCallback(() => {
    const elem = document.documentElement as any;
    try {
      const promise = (elem.requestFullscreen || elem.webkitRequestFullscreen || elem.msRequestFullscreen)?.call(elem);
      if (promise && promise.catch) {
        promise.catch((err: any) => {
          console.warn("Fullscreen diblokir oleh browser/sandbox:", err);
          setFullscreenError(true);
        });
      }
    } catch (e) { 
      console.error("Fullscreen failed", e);
      setFullscreenError(true);
    }
  }, []);

  const exitFullscreen = () => {
    const doc = document as any;
    try {
      if (doc.exitFullscreen) doc.exitFullscreen();
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      else if (doc.msExitFullscreen) doc.msExitFullscreen();
    } catch (e) { /* ignore */ }
  };

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    let correctCount = 0;
    exam.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / exam.questions.length) * 100);
    
    const result: Result = {
      id: `res-${Date.now()}`,
      studentId: user.id,
      studentName: user.name,
      examId: exam.id,
      score,
      totalQuestions: exam.questions.length,
      timestamp: Date.now(),
      violations: violationCount
    };

    exitFullscreen();
    
    setTimeout(() => {
      setIsFinished(true);
      onComplete(result);
    }, 1500);
  }, [exam.questions, answers, user, violationCount, onComplete, isSubmitting]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [handleSubmit]);

  useEffect(() => {
    // Jalankan fullscreen segera setelah mount
    enterFullscreen();

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isFinished) {
        e.preventDefault(); e.returnValue = 'Ujian sedang berlangsung!';
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !isFinished && !isSubmitting) {
        setViolationCount(prev => prev + 1);
        setShowWarning(true);
      }
    };

    const handleBlur = () => {
      if (!isFinished && !isSubmitting) {
        setViolationCount(prev => prev + 1);
        setShowWarning(true);
      }
    };

    const handleFullscreenChange = () => {
      const doc = document as any;
      const isFull = doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement;
      // Hanya tampilkan peringatan jika fitur Fullscreen didukung dan aktif
      if (!isFull && !isFinished && !isSubmitting && !fullscreenError) {
        setViolationCount(prev => prev + 1);
        setShowWarning(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFinished, isSubmitting, enterFullscreen, fullscreenError]);

  const handleSelect = (optionIdx: number) => {
    if (isSubmitting) return;
    const originalIdx = shuffledIndices[currentIdx];
    setAnswers(prev => ({ ...prev, [originalIdx]: optionIdx }));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isFinished) {
    return (
      <div className="fixed inset-0 bg-white z-[500] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="bg-green-100 text-green-600 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-100">
          <i className="fas fa-check text-5xl"></i>
        </div>
        <h2 className="text-3xl font-black text-gray-800 tracking-tighter uppercase">Ujian Selesai!</h2>
        <p className="text-gray-500 mt-2 font-medium">Nilai Anda sedang diproses oleh SMADA GENIUS.</p>
      </div>
    );
  }

  const currentQuestion = exam.questions[shuffledIndices[currentIdx]];

  return (
    <div className="fixed inset-0 bg-gray-50 z-[100] flex flex-col overflow-hidden select-none">
      
      {showFinishConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[400] flex items-center justify-center p-6">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center space-y-6 animate-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Kirim Jawaban?</h2>
            <p className="text-sm text-gray-500 mt-2 font-medium leading-relaxed">Pastikan semua soal terjawab. Anda tidak dapat kembali setelah mengirim.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowFinishConfirm(false)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase text-xs">Cek Lagi</button>
              <button onClick={() => { setShowFinishConfirm(false); handleSubmit(); }} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl uppercase text-xs">Ya, Kirim</button>
            </div>
          </div>
        </div>
      )}

      {showWarning && (
        <div className="fixed inset-0 bg-red-600/95 backdrop-blur-xl z-[300] flex items-center justify-center p-6">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-md text-center space-y-6 animate-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter text-red-600">Terdeteksi Keluar Layar!</h2>
            <p className="text-sm text-gray-500 font-medium">Aktivitas mencurigakan dicatat sebagai pelanggaran ({violationCount}x). Tetap fokus pada layar ujian!</p>
            <button onClick={() => { setShowWarning(false); enterFullscreen(); }} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black shadow-xl uppercase text-xs tracking-widest">Saya Mengerti</button>
          </div>
        </div>
      )}

      <div className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 text-white p-2 rounded-lg"><i className="fas fa-lock text-sm"></i></div>
          <div>
            <h2 className="font-bold text-gray-800 text-base leading-tight">{exam.title}</h2>
            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">{exam.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           {fullscreenError && (
             <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 uppercase">
               <i className="fas fa-exclamation-circle mr-1"></i> Sandbox Mode: Anti-Cheat Terbatas
             </span>
           )}
           <div className={`px-4 py-2 rounded-xl font-mono font-bold border ${timeLeft < 300 ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
             <i className="fas fa-clock mr-2"></i>{formatTime(timeLeft)}
           </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 lg:p-12 scrollbar-hide">
          <div className="max-w-3xl mx-auto space-y-8 pb-20">
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em]">Butir Soal {currentIdx + 1} / {exam.questions.length}</span>
              
              {currentQuestion.image && (
                <div className="mb-6 rounded-3xl overflow-hidden border-2 border-indigo-100 shadow-lg bg-white p-2">
                   <img src={`data:${currentQuestion.image.type};base64,${currentQuestion.image.data}`} className="w-full h-auto max-h-[300px] object-contain mx-auto" alt="Soal Visual" />
                </div>
              )}

              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 leading-relaxed">{currentQuestion.text}</h3>
            </div>

            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => {
                const originalIdx = shuffledIndices[currentIdx];
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center gap-5 group ${
                      answers[originalIdx] === idx 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.01]' 
                        : 'bg-white border-gray-100 text-gray-700 hover:border-indigo-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-colors ${answers[originalIdx] === idx ? 'bg-white/20' : 'bg-gray-100 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="font-bold">{option}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-8 flex justify-between items-center border-t border-gray-100">
              <button disabled={currentIdx === 0} onClick={() => setCurrentIdx(prev => prev - 1)} className="px-6 py-3 font-bold text-gray-400 disabled:opacity-30 hover:text-indigo-600 transition-colors uppercase text-[10px] tracking-widest"><i className="fas fa-arrow-left mr-2"></i> Sebelumnya</button>
              {currentIdx === exam.questions.length - 1 ? (
                <button onClick={() => setShowFinishConfirm(true)} className="px-10 py-4 bg-green-600 text-white font-black rounded-2xl shadow-xl shadow-green-100 hover:bg-green-700 transition-all flex items-center gap-2 uppercase text-xs tracking-widest"><i className="fas fa-check-double"></i> Selesai</button>
              ) : (
                <button onClick={() => setCurrentIdx(prev => prev + 1)} className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 uppercase text-xs tracking-widest">Selanjutnya <i className="fas fa-arrow-right ml-1"></i></button>
              )}
            </div>
          </div>
        </div>

        <div className="w-80 bg-white border-l p-8 hidden xl:flex flex-col shadow-inner overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
            <h4 className="font-black text-gray-800 text-[10px] uppercase tracking-widest mb-6">Navigasi Soal</h4>
            <div className="grid grid-cols-4 gap-3">
              {shuffledIndices.map((originalIdx, visualIdx) => (
                <button
                  key={visualIdx}
                  onClick={() => setCurrentIdx(visualIdx)}
                  className={`w-full aspect-square rounded-xl flex items-center justify-center font-black text-xs border-2 transition-all ${
                    currentIdx === visualIdx ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-110 z-10' : 
                    answers[originalIdx] !== undefined ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 border-transparent hover:border-gray-200'
                  }`}
                >
                  {visualIdx + 1}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setShowFinishConfirm(true)} className="w-full mt-8 py-4 bg-amber-500 text-white rounded-2xl font-black shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"><i className="fas fa-flag-checkered"></i> Selesai</button>
        </div>
      </div>
    </div>
  );
};

export default QuizInterface;
