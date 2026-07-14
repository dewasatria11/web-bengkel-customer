import React, { useMemo, useState } from 'react';
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
  { value: 'matic', label: 'Matic' },
  { value: 'bebek', label: 'Bebek' },
  { value: 'kopling', label: 'Kopling / Sport' },
];

const MOTOR_CATALOG = {
  Yamaha: {
    matic: [
      'NMAX 155 Turbo / Neo',
      'NMAX 155 Connected / ABS',
      'NMAX 155 Old',
      'Aerox 155 Connected / Cyber City',
      'Aerox 155 Old (V1)',
      'Lexi LX 155',
      'Lexi 125',
      'XMAX 250 Tech MAX / Connected',
      'XMAX 250 Old',
      'Fazzio Hybrid',
      'Grand Filano Hybrid',
      'Gear 125',
      'FreeGo 125',
      'Mio M3 125',
      'Mio Sporty / Smile',
      'Mio J / GT / Teen',
      'Soul GT 125 / 115',
      'Fino 125 / Fino Karbu',
      'X-Ride 125 / 115',
      'Xeon RC / GT 125',
      'Nouvo Z / Nouvo Lele',
    ],
    bebek: [
      'MX King 150',
      'Jupiter MX 135 (New 5-Speed / Kopling)',
      'Jupiter MX 135 (New 4-Speed / Non-Kopling)',
      'Jupiter MX 135 Old',
      'Jupiter Z1 (Injeksi)',
      'Jupiter Z (Burhan / Robot / Salib)',
      'Jupiter Old',
      'Vega Force',
      'Vega ZR / RR',
      'Vega R / Vega R New / Vega Old',
      'F1ZR / F1Z (2-Tak)',
      'Crypton',
      'Alfa / Sigma / V80 (Klasik)',
      'Lexam (Bebek Matic)',
    ],
    kopling: [
      'WR 155 R',
      'XSR 155',
      'R15 V4 / R15M',
      'R15 V3',
      'R15 V2',
      'R25',
      'MT-15',
      'MT-25',
      'Vixion R 155 VVA',
      'Vixion Advance (NVA) / Lightning (NVL)',
      'Vixion Old (Lampu Bulat)',
      'Byson FI / Byson Karbu',
      'Scorpio Z (Steko / Robot)',
      'Scorpio G',
      'Xabre',
      'RX-King / RX-Special (2-Tak)',
      'RX-Z / RZR (2-Tak)',
      'TZM 150 (2-Tak)',
    ],
  },
};

const MERK_MOTOR = ['Yamaha'];
const OTHER_VALUE = '__LAINNYA__';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nama: '',
    no_telepon: '',
    jenis_motor: '',
    merk_motor: 'Yamaha',
    model_motor: '',
    model_motor_lainnya: '',
    plat_nomor: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const availableModels = useMemo(() => {
    if (!form.merk_motor || form.merk_motor === 'Lainnya' || !form.jenis_motor) return [];
    return MOTOR_CATALOG[form.merk_motor]?.[form.jenis_motor] || [];
  }, [form.jenis_motor, form.merk_motor]);

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const setJenis = (value) =>
    setForm((prev) => ({
      ...prev,
      jenis_motor: value,
      model_motor: '',
      model_motor_lainnya: '',
    }));

  const setMerk = (value) =>
    setForm((prev) => ({
      ...prev,
      merk_motor: value,
      model_motor: '',
      model_motor_lainnya: '',
    }));

  const setModel = (value) =>
    setForm((prev) => ({
      ...prev,
      model_motor: value,
      model_motor_lainnya: value === OTHER_VALUE ? prev.model_motor_lainnya : '',
    }));

  const getFinalMotorName = () => {
    const model =
      form.model_motor === OTHER_VALUE
        ? form.model_motor_lainnya.trim()
        : form.model_motor;
    if (form.merk_motor === 'Lainnya') return model || 'Lainnya';
    return model ? `${form.merk_motor} ${model}` : form.merk_motor;
  };

  const validate = () => {
    const e = {};
    if (!form.nama.trim()) e.nama = 'Nama wajib diisi';
    if (!form.no_telepon.trim()) e.no_telepon = 'Nomor telepon wajib diisi';
    else if (!/^0\d{8,12}$/.test(form.no_telepon.trim()))
      e.no_telepon = 'Format: 08xxxxxxxxxx';
    if (!form.jenis_motor) e.jenis_motor = 'Pilih jenis motor';
    if (!form.merk_motor) e.merk_motor = 'Pilih merk motor';
    if (!form.model_motor) e.model_motor = 'Pilih tipe / model motor';
    if (form.model_motor === OTHER_VALUE && !form.model_motor_lainnya.trim())
      e.model_motor_lainnya = 'Isi tipe / model motor';
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
        nama: form.nama,
        no_telepon: form.no_telepon,
        jenis_motor: form.jenis_motor,
        merk_motor: getFinalMotorName(),
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
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground mb-4">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Daftar Akun</h1>
          <p className="text-muted-foreground">
            Lengkapi data diri & kendaraan Anda
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registrasi</CardTitle>
            <CardDescription>Buat akun baru untuk melanjutkan</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {apiError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                  ⚠️ {apiError}
                </div>
              )}

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

              <div className="space-y-2">
                <Label htmlFor="reg-jenis">Jenis Motor</Label>
                <Select value={form.jenis_motor} onValueChange={setJenis}>
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

              <div className="space-y-2">
                <Label htmlFor="reg-merk">Merk Motor</Label>
                <Select value={form.merk_motor} onValueChange={setMerk} disabled>
                  <SelectTrigger
                    id="reg-merk"
                    className={errors.merk_motor ? 'border-destructive' : ''}
                  >
                    <SelectValue placeholder="Yamaha" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yamaha">Yamaha</SelectItem>
                  </SelectContent>
                </Select>
                {errors.merk_motor && (
                  <p className="text-sm text-destructive">{errors.merk_motor}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-model">Tipe / Model Motor</Label>
                <Select
                  value={form.model_motor}
                  onValueChange={setModel}
                  disabled={!form.jenis_motor || !form.merk_motor}
                >
                  <SelectTrigger
                    id="reg-model"
                    className={errors.model_motor ? 'border-destructive' : ''}
                  >
                    <SelectValue placeholder="-- Pilih Tipe / Model Motor --" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                    <SelectItem value={OTHER_VALUE}>Lainnya / Input Manual</SelectItem>
                  </SelectContent>
                </Select>
                {errors.model_motor && (
                  <p className="text-sm text-destructive">{errors.model_motor}</p>
                )}
              </div>

              {(form.model_motor === OTHER_VALUE || form.merk_motor === 'Lainnya') && (
                <div className="space-y-2">
                  <Label htmlFor="reg-model-lainnya">Model Motor Lainnya</Label>
                  <Input
                    id="reg-model-lainnya"
                    type="text"
                    placeholder="Contoh: Honda Win 100"
                    value={form.model_motor_lainnya}
                    onChange={set('model_motor_lainnya')}
                    className={errors.model_motor_lainnya ? 'border-destructive' : ''}
                  />
                  {errors.model_motor_lainnya && (
                    <p className="text-sm text-destructive">
                      {errors.model_motor_lainnya}
                    </p>
                  )}
                </div>
              )}

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