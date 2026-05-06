'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Scissors } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { getErrorMessage } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha obrigatória'),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAdminAuthStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      const result = await authApi.login(data.email, data.password);
      login(result.token, result.admin);
      router.replace('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e1b2e] to-[#2a2740] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#C9A4A0]/20 border border-[#C9A4A0]/30 mb-4">
            <Scissors className="w-8 h-8 text-[#C9A4A0]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Studio Fernanda Correa</h1>
          <p className="text-[#a8a3c4] text-sm mt-1">Painel Administrativo</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Entrar</h2>
          <p className="text-sm text-gray-500 mb-6">Acesso restrito a administradores.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="admin@studio.com.br"
                className="w-full h-10 px-3 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] focus:border-transparent"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full h-10 px-3 pr-10 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 bg-[#C9A4A0] hover:bg-[#b8918d] disabled:opacity-60 text-white font-medium rounded-md text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            Acesso exclusivo para equipe interna.<br />
            Entre em contato com o administrador para obter suas credenciais.
          </p>
        </div>
      </div>
    </div>
  );
}
