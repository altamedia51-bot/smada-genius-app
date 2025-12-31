import React, { useState } from 'react';
import { User, Role } from '../types';

interface LoginProps {
  onLogin: (user: User) => { success: boolean; message?: string };
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [role, setRole] = useState<Role>('student');
  const [name, setName] = useState('');
  const [nis, setNis] = useState('');
  const [teacherToken, setTeacherToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Kode Akses Guru Default
  const DEFAULT_TEACHER_TOKEN = "SMADA2024";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Harap masukkan nama lengkap Anda.');
      return;
    }

    if (role === 'teacher') {
      if (teacherToken !== DEFAULT_TEACHER_TOKEN) {
        setError('Kode Akses Guru salah. Silakan hubungi admin sekolah.');
        return;
      }
    }

    const response = onLogin({
      id: role === 'student' ? `S-${nis}` : `T-${Date.now()}`,
      name: name.trim(),
      role,
      nis: role === 'student' ? nis : undefined
    });

    if (!response.success) {
      setError(response.message || 'Terjadi kesalahan saat masuk.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/20">
        <div className="p-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center bg-indigo-50 p-5 rounded-[1.8rem] text-indigo-600 mb-4 shadow-inner">
              <i className="fas fa-graduation-cap text-4xl"></i>
            </div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tighter uppercase">SMADA GENIUS</h1>
            <div className="flex items-center justify-center gap-1 sm:gap-2 mt-2 px-2">
              <span className="h-[1px] w-4 sm:w-6 bg-gray-200"></span>
              <p className="text-[8px] sm:text-[10px] text-indigo-500 font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] whitespace-nowrap">Sistem Evaluasi Digital Terintegrasi</p>
              <span className="h-[1px] w-4 sm:w-6 bg-gray-200"></span>
            </div>
          </div>

          <div className="flex p-1.5 bg-gray-100 rounded-2xl mb-8 border border-gray-200/50">
            <button
              onClick={() => { setRole('student'); setError(null); }}
              className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${role === 'student' ? 'bg-white text-indigo-600 shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Siswa
            </button>
            <button
              onClick={() => { setRole('teacher'); setError(null); }}
              className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${role === 'teacher' ? 'bg-white text-indigo-600 shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Guru
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2">
              <i className="fas fa-exclamation-triangle text-red-500 mt-1"></i>
              <p className="text-[10px] text-red-700 font-black leading-relaxed uppercase">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                {role === 'teacher' ? 'Nama Pengajar' : 'Nama Lengkap Siswa'}
              </label>
              <div className="relative group">
                <i className="fas fa-user absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-500 transition-colors"></i>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] focus:border-indigo-500 focus:bg-white outline-none transition-all font-black text-gray-700 placeholder:font-bold placeholder:text-gray-300"
                  placeholder={role === 'teacher' ? "Masukkan nama Anda..." : "Nama sesuai absen"}
                />
              </div>
            </div>

            {role === 'student' ? (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nomor Induk Siswa (NIS)</label>
                <div className="relative group">
                  <i className="fas fa-id-card absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-500 transition-colors"></i>
                  <input
                    type="text"
                    required
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] focus:border-indigo-500 focus:bg-white outline-none transition-all font-mono font-black text-gray-700 placeholder:font-bold placeholder:text-gray-300"
                    placeholder="Contoh: 12345"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kode Akses Guru (Token)</label>
                <div className="relative group">
                  <i className="fas fa-key absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-500 transition-colors"></i>
                  <input
                    type="password"
                    required
                    value={teacherToken}
                    onChange={(e) => setTeacherToken(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] focus:border-indigo-500 focus:bg-white outline-none transition-all font-black text-gray-700 placeholder:font-bold placeholder:text-gray-300"
                    placeholder="Masukkan Kode Keamanan"
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white font-black py-5 rounded-[1.5rem] hover:bg-indigo-700 transform transition-all active:scale-95 shadow-2xl shadow-indigo-200 uppercase tracking-[0.2em] text-[10px]"
              >
                Masuk Sistem <i className="fas fa-arrow-right ml-2"></i>
              </button>
              <p className="text-center text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">
                Versi 2.1.4
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;