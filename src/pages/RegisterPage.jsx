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
  { value: 'matic', label: 'Matic / Scooter' },
  { value: 'bebek', label: 'Bebek / Cub / Ayago' },
  { value: 'kopling', label: 'Kopling / Sport' },
  { value: 'trail', label: 'Trail / Supermoto' },
  { value: 'klasik', label: 'Klasik / Gigi Tangan' },
  { value: 'lainnya', label: 'Lainnya' },
];

const MOTOR_CATALOG = {
  Honda: {
    matic: [
      'BeAT Karbu', 'BeAT FI', 'BeAT eSP', 'BeAT Pop', 'BeAT Street Old', 'BeAT Street New', 'BeAT Deluxe',
      'Vario 110 Karbu', 'Vario 110 Techno', 'Vario 110 eSP', 'Vario 125 Generasi 1 (Bohlam)', 'Vario 125 eSP (LED)', 'Vario 150 eSP', 'Vario 160',
      'Scoopy Karbu', 'Scoopy FI', 'Scoopy eSP (Starter Halus)', 'Scoopy LED / Prestige (Velg 12)',
      'PCX 125 CBU', 'PCX 150 CBU Thailand / Vietnam', 'PCX 150 Lokal', 'PCX 160', 'ADV 150', 'ADV 160',
      'Spacy Karbu', 'Spacy FI', 'Genio', 'Stylo 160', 'Forza 250', 'SH150i',
    ],
    bebek: [
      'C70 (Pitung)', 'Astrea 800', 'Astrea Star', 'Astrea Prima', 'Astrea Grand', 'Impressa', 'Legenda 1', 'Legenda 2',
      'Supra X 100', 'Supra V', 'Supra XX (Kopling)', 'Supra Fit Old', 'Supra Fit New', 'Supra X 125 Karbu', 'Supra X 125 PGM-FI', 'Supra X 125 Helm-In', 'Supra GTR 150',
      'Revo Lancip Generasi 1', 'Revo Absolute', 'Revo Fit', 'Revo FI', 'Revo X',
      'Karisma 125D', 'Karisma X', 'Kirana', 'Blade 110 Single Cakram', 'Blade 110 Double Cakram', 'Blade 125 FI', 'Sonic 125 CBU', 'Sonic 150R', 'Super Cub C125', 'CT125',
    ],
    kopling: [
      'CB 100', 'CB 125', 'CG 110', 'GL 100', 'GL Max Platina', 'GL Max Neotech', 'GL Pro Platina', 'GL Pro Neotech',
      'Tiger 2000', 'Tiger Revo (Tirev)', 'MegaPro Hiu', 'MegaPro Primus', 'MegaPro Monoshock Karbu', 'MegaPro Monoshock FI',
      'Verza 150', 'CB150 Verza', 'CB150R Old', 'CB150R Streetfire LED', 'CB150X',
      'CBR150R CBU Thailand', 'CBR150R K45A / Lokal Pertama', 'CBR150R K45G / LED', 'CBR150R K45R / USD', 'CBR250R 1 Silinder Thailand', 'CBR250RR 2 Silinder',
      'CS1 (City Sport 1)', 'NSR 150 R', 'NSR 150 RR', 'NSR 150 SP', 'Honda Monkey', 'Honda Dax',
    ],
    trail: ['CRF150L', 'CRF250L', 'CRF250 Rally'],
  },
  Yamaha: {
    matic: [
      'Mio Sporty', 'Mio Smile', 'Mio Soul Karbu', 'Mio J', 'Mio GT', 'Soul GT 115', 'Soul GT 125 Blue Core', 'Mio M3', 'Mio Z', 'Mio S',
      'NMAX 155 Old', 'NMAX 155 Connected', 'NMAX Turbo / Neo', 'Aerox 125 LC', 'Aerox 155 Old', 'Aerox 155 Connected', 'XMAX 250', 'Lexi 125', 'Lexi LX 155',
      'Nouvo (Lele)', 'Nouvo Z', 'Xeon Karbu', 'Xeon RC', 'Xeon GT 125', 'X-Ride 115', 'X-Ride 125', 'FreeGo', 'Gear 125', 'Fazzio', 'Grand Filano', 'Fino Karbu', 'Fino 115 FI', 'Fino 125',
    ],
    bebek: [
      'V80', 'Alfa', 'Sigma', 'Crypton', 'F1Z', 'F1ZR (Force 1 ZR)', 'Tiara 120', '125Z',
      'Vega Old', 'Vega R', 'Vega R New', 'Vega ZR', 'Vega RR', 'Vega Force',
      'Jupiter Old', 'Jupiter Z (Burhan)', 'Jupiter Z (Salib / Robot)', 'Jupiter Z1',
      'Jupiter MX 135 Old', 'Jupiter MX 135 New 4 Speed Non-Kopling', 'Jupiter MX 135 New 5 Speed Kopling', 'Jupiter MX King 150', 'MX 150', 'Lexam',
    ],
    kopling: [
      'RX 100', 'RX-Special', 'RX-King', 'RX-Z', 'RZR', 'TZM 150', 'Touch 125',
      'Vixion Old Lampu Bulat', 'Vixion Lightning (NVL)', 'Vixion Advance (NVA)', 'Vixion R',
      'Byson Karbu', 'Byson FI', 'MT-15', 'MT-25', 'R15 V2', 'R15 V3', 'R15 V4 / R15M', 'R25',
      'Scorpio G', 'Scorpio Z Steko', 'Scorpio Z Robot', 'Xabre', 'XSR 155',
    ],
    trail: ['WR155R'],
  },
  Suzuki: {
    matic: ['Spin 125', 'Skywave 125', 'Skydrive 125', 'Hayate 125', "Let's", 'Nex I', 'Nex II', 'Nex Crossover', 'Address FI', 'Address Playful', 'Avenis 125', 'Burgman 200', 'Burgman Street 125EX'],
    bebek: [
      'RC 100 (Bravo)', 'Crystal', 'Tornado GS', 'Tornado GX', 'Satria 120 Lumba-lumba', 'Satria 120 Hiu',
      'Shogun 110 (Kebo)', 'Shogun 125 R', 'Shogun 125 SP', 'Shogun 125 Axelo', 'Shogun 125 FI',
      'Smash Old', 'Smash SR', 'Smash Titan', 'Smash FI', 'Arashi 125',
      'Satria F150 CBU Thailand', 'Satria F150 CKD', 'Satria F150 Barong', 'Satria F150 Facelift', 'Satria F150 FI Injeksi', 'Raider 125',
    ],
    kopling: ['A 100', 'TRS', 'RGR 150', 'FXR 150', 'Thunder 125', 'Thunder 250', 'GSX-R150', 'GSX-S150', 'GSX-150 Bandit', 'Inazuma 250', 'V-Strom 250SX'],
  },
  Kawasaki: {
    kopling: [
      'Ninja 150 R', 'Ninja 150 VR', 'Ninja 150 SS', 'Ninja 150 RR (ZX150)',
      'Ninja 250 Karbu', 'Ninja 250 FI', 'Ninja 250 SL / RR Mono', 'Ninja ZX-25R', 'Ninja ZX-25RR', 'Z250', 'Z250 SL',
      'Binter Merzy', 'W175 Standard', 'W175 Cafe', 'W175 TR', 'Estrella W250',
    ],
    trail: ['KLX 150 S', 'KLX 150 L', 'KLX 150 BF', 'KLX 150 G', 'KLX 150 SM', 'KLX 230 S', 'KLX 230 SE', 'KLX 230 SM', 'KLX 250', 'D-Tracker 150', 'D-Tracker 250', 'KSR 110', 'KSR Pro'],
    bebek: ['Kaze R', 'Kaze VR', 'Blitz R', 'Blitz Joy', 'ZX130', 'Edge', 'Athlete Old', 'Athlete Pro'],
  },
  'Vespa / Piaggio': {
    matic: ['Vespa LX 125', 'Vespa LX 150', 'Vespa S 125', 'Vespa S 150', 'Vespa Sprint 150', 'Vespa Sprint S 150', 'Vespa Primavera 150', 'Vespa Primavera S 150', 'Vespa GTS 150', 'Vespa GTS 300', 'Piaggio Zip', 'Piaggio Liberty', 'Piaggio Medley', 'Vespa Corsa Matic 2-Tak'],
    klasik: ['Vespa PX 150', 'Vespa PS 150', 'Vespa Super', 'Vespa Sprint Lama', 'Vespa Excel 150', 'Vespa Excel 200', 'Vespa Spartan'],
  },
  Bajaj: { kopling: ['Pulsar 135 LS', 'Pulsar 180 UG3', 'Pulsar 180 UG4', 'Pulsar 200', 'Pulsar 220F', 'Pulsar 200NS Kawasaki-Bajaj'] },
  TVS: { matic: ['Ntorq 125', 'Callisto', 'Dazz'], bebek: ['Neo', 'Rockz', 'Max 125'], kopling: ['Apache RTR 160', 'Apache RTR 200'] },
  Minerva: { kopling: ['R150', 'R150VX', 'Megelli 250 R', 'Megelli 250 RE', 'Megelli 250 RV', 'X-Road 150'] },
  Viar: { trail: ['Cross X 150', 'Cross X 200', 'Cross X 250'], bebek: ['Karya Motor Roda Tiga / Triseda'], klasik: ['Vintech'] },
  'Kymco & SYM': { matic: ['Kymco Trend', 'Kymco Free MX', 'SYM Joyride', 'SYM Attila'] },
};

const MERK_MOTOR = [...Object.keys(MOTOR_CATALOG), 'Lainnya'];
const OTHER_VALUE = '__LAINNYA__';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nama: '',
    no_telepon: '',
    jenis_motor: '',
    merk_motor: '',
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
                <Select value={form.merk_motor} onValueChange={setMerk}>
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