import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Home, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/store/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'praveen@uniquehavenhomes.com',
      password: 'owner123',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await login(data.email, data.password);
      toast.success('Signed in successfully! Welcome to Haven CRM.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid login credentials');
    }
  };

  const setDemoAccount = (email: string, pass: string) => {
    setValue('email', email);
    setValue('password', pass);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Visual Showcase Left Column */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-haven-950">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-65"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1400&q=85)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-haven-950 via-haven-950/60 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
              <Home size={22} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight">Haven CRM</div>
              <div className="text-white/60 text-xs">The Unique Haven Homes Pvt. Ltd.</div>
            </div>
          </div>

          {/* Editorial quote */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4 max-w-md"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-haven-500/30 border border-haven-400/40 text-haven-200 text-xs font-semibold tracking-wide">
              <Sparkles size={13} /> Multi-Property Hospitality ERP
            </div>
            <h2 className="font-display text-4xl xl:text-5xl font-semibold leading-tight text-white">
              Effortless Stays,
              <br />
              <span className="text-haven-300 italic font-serif">Unmatched Hospitality</span>
            </h2>
            <p className="text-white/70 text-sm leading-relaxed">
              Managing 17+ signature properties across Lucknow with unified live calendar, automatic booking synchronization, guest intelligence, and audit-grade GST billing.
            </p>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/15">
              <div>
                <div className="text-2xl font-bold font-display text-white">17+</div>
                <div className="text-xs text-white/60">Properties</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-white">4.94★</div>
                <div className="text-xs text-white/60">Guest Rating</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-white">₹3.8L+</div>
                <div className="text-xs text-white/60">Monthly Rev</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Column Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md space-y-8"
        >
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-haven-500 flex items-center justify-center">
              <Home size={18} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-foreground text-sm">Haven CRM</span>
              <div className="text-xs text-muted-foreground">The Unique Haven Homes</div>
            </div>
          </div>

          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Welcome Back</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Sign in to manage bookings, guest register, and property finances.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <Input
                {...register('email')}
                type="email"
                placeholder="praveen@uniquehavenhomes.com"
                className={cn(errors.email && 'border-destructive')}
              />
              {errors.email && (
                <p className="text-destructive text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => toast.info('Default demo password: owner123')}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={cn('pr-10', errors.password && 'border-destructive')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-destructive text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-10 font-semibold" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Signing in...
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </Button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="p-4 rounded-xl bg-muted/60 border border-border space-y-3">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Quick One-Click Demo Logins:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoAccount('praveen@uniquehavenhomes.com', 'owner123')}
                className="p-2 rounded-lg border border-border bg-card text-left hover:border-primary transition-colors"
              >
                <div className="font-bold text-foreground">👑 Owner</div>
                <div className="text-[10px] text-muted-foreground">Full ERP Access</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoAccount('admin@uniquehavenhomes.com', 'admin123')}
                className="p-2 rounded-lg border border-border bg-card text-left hover:border-primary transition-colors"
              >
                <div className="font-bold text-foreground">🛡️ Admin</div>
                <div className="text-[10px] text-muted-foreground">Operations</div>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
