import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import logoGarage from '../assets/logoGarage.svg';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [noTelepon, setNoTelepon] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = noTelepon.trim();
    if (!val) {
      setError('Masukkan nomor telepon Anda');
      return;
    }
    if (!/^\d{4,15}$/.test(val)) {
      setError('Format: masukkan nomor telepon yang valid');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await login(val);
      navigate('/home');
    } catch (err) {
      setError(err.message || 'Login gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-4">
      <div className="w-full max-w-md">
        {/* Hero Section */}
        <div className="text-center mb-8">
          {/* Ticker / Running Text */}
          <div className="overflow-hidden rounded-md bg-primary/5 border border-border/30 py-2 mb-6">
            <p
              className="whitespace-nowrap text-sm font-medium text-primary/80 inline-block"
              style={{ animation: 'ticker 28s linear infinite' }}
            >
              🛠️ Selamat datang di Web Garage &nbsp;·&nbsp; Cek status antrean servis secara real-time &nbsp;·&nbsp; Pesan layanan kapan saja &nbsp;·&nbsp; Bayar mudah via QRIS &nbsp;·&nbsp; Teknisi berpengalaman & terpercaya &nbsp;·&nbsp; Selamat datang di Web Garage
            </p>
            <style>{`@keyframes ticker { from { transform: translateX(100%); } to { transform: translateX(-100%); } }`}</style>
          </div>
          <div className="flex justify-center mb-6">
            <img
              src={logoGarage}
              alt="Logo Garage"
              className="h-48 w-auto object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold mb-2">Masuk Akun</h1>
          <p className="text-muted-foreground">
            Masukkan nomor telepon yang terdaftar
          </p>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Silakan login untuk melanjutkan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                  ⚠️ {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="login-telp">Nomor Telepon</Label>
                <Input
                  id="login-telp"
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={noTelepon}
                  onChange={(e) => setNoTelepon(e.target.value)}
                  autoComplete="tel"
                  autoFocus
                  className={error ? 'border-destructive' : ''}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Masuk...
                  </>
                ) : (
                  <>
                    <img
                      src={logoGarage}
                      alt=""
                      aria-hidden="true"
                      className="mr-2 h-5 w-5 rounded-full object-cover"
                    />
                    Masuk
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Belum punya akun?{' '}
              <Link
                to="/register"
                className="font-medium text-primary hover:underline"
              >
                Daftar di sini
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
