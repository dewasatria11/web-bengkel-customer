import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Loader2 } from 'lucide-react';

const JENIS_MOTOR = [
  { value: 'matic', label: 'Matic (Automatic)' },
  { value: 'gigi', label: 'Gigi (Bebek)' },
  { value: 'kopling', label: 'Kopling (Manual)' },
];

const MERK_MOTOR = [
  'Honda',
  'Yamaha',
  'Suzuki',
  'Kawasaki',
  'TVS',
  'Royal Enfield',
  'Viar',
  'Gesits',
  'Piaggio / Vespa',
  'Benelli',
  'KTM',
  'Triumph',
  'BMW',
  'Lainnya',
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nama: '',
    no_telepon: '',
    jenis_motor: '',
    merk_motor: '',
    plat_nomor: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const setSelect = (field) => (value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validate = () => {
    const e = {};
    if (!form.nama.trim()) e.nama = 'Nama wajib diisi';
    if (!form.no_telepon.trim()) e.no_telepon = 'Nomor telepon wajib diisi';
    else if (!/^0\d{8,12}$/.test(form.no_telepon.trim()))
      e.no_telepon = 'Format: 08xxxxxxxxxx';
    if (!form.jenis_motor) e.jenis_motor = 'Pilih jenis motor';
    if (!form.merk_motor) e.merk_motor = 'Pilih merk motor';
    if (!form.plat_nomor.trim()) e.plat_nomor = 'Plat nomor wajib diisi';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setApiError('');
    try {
      await register({
        ...form,
        plat_nomor: form.plat_nomor.toUpperCase().trim(),
      });
      navigate('/home');
    } catch (err) {
      setApiError(err.message || 'Gagal mendaftar, coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-4">
      <div className="w-full max-w-md">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground mb-4">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Daftar Akun</h1>
          <p className="text-muted-foreground">
            Lengkapi data diri & kendaraan Anda
          </p>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Registrasi</CardTitle>
            <CardDescription>Buat akun baru untuk melanjutkan</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* API Error */}
              {apiError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                  ⚠️ {apiError}
                </div>
              )}

              {/* Nama */}
              <div className="space-y-2">
                <Label htmlFor="reg-nama">Nama Lengkap</Label>
                <Input
                  id="reg-nama"
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={form.nama}
                  onChange={set('nama')}
                  autoComplete="name"
                  className={errors.nama ? 'border-destructive' : ''}
                />
                {errors.nama && (
                  <p className="text-sm text-destructive">{errors.nama}</p>
                )}
              </div>

              {/* No Telepon */}
              <div className="space-y-2">
                <Label htmlFor="reg-telp">Nomor Telepon</Label>
                <Input
                  id="reg-telp"
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={form.no_telepon}
                  onChange={set('no_telepon')}
                  autoComplete="tel"
                  className={errors.no_telepon ? 'border-destructive' : ''}
                />
                {errors.no_telepon && (
                  <p className="text-sm text-destructive">{errors.no_telepon}</p>
                )}
              </div>

              {/* Jenis Motor */}
              <div className="space-y-2">
                <Label htmlFor="reg-jenis">Jenis Motor</Label>
                <Select
                  value={form.jenis_motor}
                  onValueChange={setSelect('jenis_motor')}
                >
                  <SelectTrigger
                    id="reg-jenis"
                    className={errors.jenis_motor ? 'border-destructive' : ''}
                  >
                    <SelectValue placeholder="-- Pilih Jenis Motor --" />
                  </SelectTrigger>
                  <SelectContent>
                    {JENIS_MOTOR.map((j) => (
                      <SelectItem key={j.value} value={j.value}>
                        {j.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.jenis_motor && (
                  <p className="text-sm text-destructive">{errors.jenis_motor}</p>
                )}
              </div>

              {/* Merk Motor */}
              <div className="space-y-2">
                <Label htmlFor="reg-merk">Merk Motor</Label>
                <Select
                  value={form.merk_motor}
                  onValueChange={setSelect('merk_motor')}
                >
                  <SelectTrigger
                    id="reg-merk"
                    className={errors.merk_motor ? 'border-destructive' : ''}
                  >
                    <SelectValue placeholder="-- Pilih Merk Motor --" />
                  </SelectTrigger>
                  <SelectContent>
                    {MERK_MOTOR.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.merk_motor && (
                  <p className="text-sm text-destructive">{errors.merk_motor}</p>
                )}
              </div>

              {/* Plat Nomor */}
              <div className="space-y-2">
                <Label htmlFor="reg-plat">Nomor Plat</Label>
                <Input
                  id="reg-plat"
                  type="text"
                  placeholder="Contoh: B 1234 ABC"
                  value={form.plat_nomor}
                  onChange={set('plat_nomor')}
                  className={
                    errors.plat_nomor
                      ? 'border-destructive uppercase'
                      : 'uppercase'
                  }
                />
                {errors.plat_nomor && (
                  <p className="text-sm text-destructive">{errors.plat_nomor}</p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mendaftar...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Daftar Sekarang
                  </>
                )}
              </Button>
            </form>

            {/* Switch to Login */}
            <p className="text-center text-sm text-muted-foreground mt-4">
              Sudah punya akun?{' '}
              <Link
                to="/login"
                className="font-medium text-primary hover:underline"
              >
                Login di sini
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
