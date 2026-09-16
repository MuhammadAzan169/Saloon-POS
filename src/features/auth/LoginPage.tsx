import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Lock, Mail, Store, UserCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { DEMO_ACCOUNTS } from '@/mock/shops';
import { homeFor } from '@/app/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const schema = z.object({
  email: z.string().min(1, 'Enter your email address').email('That does not look like an email address'),
  password: z.string().min(1, 'Enter your password'),
});

type FormValues = z.infer<typeof schema>;

interface LocationState {
  from?: string;
}

export function LoginPage(): JSX.Element {
  const login = useAuthStore((s) => s.login);
  const loggingIn = useAuthStore((s) => s.loggingIn);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  // Clear a stale failure the moment the form is touched again.
  useEffect(() => () => clearError(), [clearError]);

  const submit = async (values: FormValues): Promise<void> => {
    const user = await login(values.email, values.password).catch(() => null);
    if (!user) return;
    // Send them where they were heading, unless that belongs to the other portal.
    const home = homeFor(user.role);
    const target = from && from.startsWith(home) ? from : home;
    navigate(target, { replace: true });
  };

  const quickFill = (account: { email: string; password: string }): void => {
    setValue('email', account.email, { shouldValidate: true });
    setValue('password', account.password, { shouldValidate: true });
    void submit(account);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ---------- Brand panel ---------- */}
      {/*
        The poster carries its own wordmark and tagline baked in at a fixed
        position, so using it as a foreground image made the headline collide
        with that tagline at some window sizes. It is therefore ambience —
        blurred and scrimmed — while the identity is redrawn live from the ring
        mark plus real type, which stays sharp and reflows at any size.
      */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-brand-panel p-10 text-white lg:flex xl:p-12">
        <img
          src="/aura-brand.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-[11px]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-brand-panel/55 via-brand-panel/70 to-brand-panel/90"
        />

        <div className="relative flex items-center gap-3">
          <img
            src="/aura-mark.jpg"
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 rounded-2xl object-cover ring-1 ring-accent-bright/40"
          />
          <span>
            <span className="block font-display text-lg font-semibold leading-tight">Aura by HS</span>
            <span className="block text-[11px] uppercase tracking-[0.14em] text-accent-bright/80">
              Bridal · Salon · Photography
            </span>
          </span>
        </div>

        <div className="relative max-w-md">
          <h1 className="font-display text-[2.5rem] font-semibold leading-[1.1]">
            Every chair, every till, every branch.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/75">
            Bookings that respect your stylists' rotas, a point of sale built for a busy Saturday,
            and numbers you can actually act on — across all three salons.
          </p>

          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-white/15 pt-6">
            {[
              { value: '3', label: 'Branches' },
              { value: '16', label: 'Stylists' },
              { value: '40', label: 'Services' },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block font-display text-2xl font-semibold text-accent-bright">
                    {stat.value}
                  </span>
                  <span className="mt-0.5 block text-xs uppercase tracking-wide text-white/55">
                    {stat.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="relative text-xs text-white/45">
          Demo build — all data is generated and stored in your browser.
        </p>
      </section>

      {/* ---------- Form panel ---------- */}
      <section className="flex items-center justify-center bg-canvas px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <img
              src="/aura-mark.jpg"
              alt=""
              width={52}
              height={52}
              className="mb-4 h-[52px] w-[52px] rounded-2xl object-cover shadow-card ring-1 ring-accent/30"
            />
            <p className="font-display text-xl font-semibold text-ink">Aura by HS</p>
            <p className="mt-0.5 text-xs text-subtle">
              Bridal make-up · Saloon services · Photography studio
            </p>
          </div>

          <h2 className="font-display text-2xl font-semibold text-ink">Welcome back</h2>
          <p className="mt-1 text-sm text-muted">Sign in to manage your salon.</p>

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-3"
            >
              <AlertCircle className="mt-px h-4 w-4 shrink-0 text-danger" aria-hidden />
              <p className="text-[13px] leading-snug text-danger">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(submit)} className="mt-6 space-y-4" noValidate>
            <Input
              label="Email address"
              type="email"
              autoComplete="username"
              placeholder="you@aurabyhs.pk"
              leftIcon={<Mail />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              leftIcon={<Lock />}
              error={errors.password?.message}
              {...register('password')}
            />

            <Button type="submit" fullWidth size="lg" loading={loggingIn} rightIcon={<ArrowRight />}>
              Sign in
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" aria-hidden />
            <span className="text-xs font-medium text-subtle">Or try a demo account</span>
            <span className="h-px flex-1 bg-line" aria-hidden />
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <Button
              variant="outline"
              leftIcon={<UserCircle2 />}
              disabled={loggingIn}
              onClick={() => quickFill(DEMO_ACCOUNTS.admin)}
            >
              Login as Admin
            </Button>
            <Button
              variant="outline"
              leftIcon={<Store />}
              disabled={loggingIn}
              onClick={() => quickFill(DEMO_ACCOUNTS.shop)}
            >
              Login as Shop
            </Button>
          </div>

          <dl className="mt-6 space-y-2 rounded-xl border border-line bg-surface p-4 text-xs">
            <p className="mb-2 font-semibold text-ink">Demo credentials</p>

            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted">Owners</dt>
              <dd className="text-right font-mono text-[11px] text-ink">
                {DEMO_ACCOUNTS.admin.email} / {DEMO_ACCOUNTS.admin.password}
              </dd>
            </div>

            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted">Branch</dt>
              <dd className="text-right font-mono text-[11px] text-ink">
                {DEMO_ACCOUNTS.shop.email} / {DEMO_ACCOUNTS.shop.password}
              </dd>
            </div>

            <p className="pt-1 text-[11px] leading-snug text-subtle">
              The other branches sign in with <span className="font-mono">dha@</span> or{' '}
              <span className="font-mono">clifton@aurabyhs.pk</span>, same password.
            </p>
          </dl>
        </div>
      </section>
    </div>
  );
}
