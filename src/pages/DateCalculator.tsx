import {
  CalendarDays,
  CalendarRange,
  Clock,
  Briefcase,
  Cake,
  Copy,
  Check,
  Plus,
  Minus,
  ArrowRight,
  PartyPopper,
  Moon,
  Heart,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Chip,
  Field,
  Input,
  Progress,
  Select,
} from '@/components/ui/primitives'
import { Tabs, useToast } from '@/components/ui/overlays'
import { PageHeader } from '@/components/ui/blocks'
import {
  calculateAgeMilestones,
  calculateDateDiff,
  calculateProjectDeadline,
  addSubtractDate,
  formatIndoDate,
  getDayNameIndo,
  parseLocalDate,
  toInputDateFormat,
} from '@/services/date-calc.service'

type TabType = 'diff' | 'addsub' | 'deadline' | 'age'

export function DateCalculatorPage() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('diff')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast({ title: 'Tersalin ke clipboard', description: text, tone: 'success' })
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // =========================================================================
  // 1. TAB: SELISIH DUA TANGGAL
  // =========================================================================
  const todayStr = useMemo(() => toInputDateFormat(new Date()), [])
  const [startDateStr, setStartDateStr] = useState(todayStr)
  const defaultEndDateStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return toInputDateFormat(d)
  }, [])
  const [endDateStr, setEndDateStr] = useState(defaultEndDateStr)
  const [inclusive, setInclusive] = useState(false)

  const dateDiffResult = useMemo(() => {
    if (!startDateStr || !endDateStr) return null
    try {
      const s = parseLocalDate(startDateStr)
      const e = parseLocalDate(endDateStr)
      return calculateDateDiff(s, e, { inclusive })
    } catch {
      return null
    }
  }, [startDateStr, endDateStr, inclusive])

  // Presets untuk selisih tanggal
  const setDiffPreset = (daysOffset: number) => {
    const s = new Date()
    const e = new Date()
    e.setDate(e.getDate() + daysOffset)
    setStartDateStr(toInputDateFormat(s))
    setEndDateStr(toInputDateFormat(e))
  }

  const setDiffThisYear = () => {
    const now = new Date()
    const s = new Date(now.getFullYear(), 0, 1)
    const e = new Date(now.getFullYear(), 11, 31)
    setStartDateStr(toInputDateFormat(s))
    setEndDateStr(toInputDateFormat(e))
  }

  // =========================================================================
  // 2. TAB: TAMBAH / KURANG TANGGAL
  // =========================================================================
  const [calcBaseDateStr, setCalcBaseDateStr] = useState(todayStr)
  const [direction, setDirection] = useState<'add' | 'subtract'>('add')
  const [yearsDelta, setYearsDelta] = useState(0)
  const [monthsDelta, setMonthsDelta] = useState(0)
  const [weeksDelta, setWeeksDelta] = useState(0)
  const [daysDelta, setDaysDelta] = useState(7)
  const [workdaysOnly, setWorkdaysOnly] = useState(false)

  const addSubResult = useMemo(() => {
    if (!calcBaseDateStr) return null
    try {
      const base = parseLocalDate(calcBaseDateStr)
      const target = addSubtractDate(
        base,
        {
          years: yearsDelta,
          months: monthsDelta,
          weeks: weeksDelta,
          days: daysDelta,
          direction,
        },
        { workdaysOnly, workdaysPerWeek: 5 }
      )
      return {
        targetDate: target,
        formatted: formatIndoDate(target),
        dayName: getDayNameIndo(target),
        iso: toInputDateFormat(target),
      }
    } catch {
      return null
    }
  }, [calcBaseDateStr, direction, yearsDelta, monthsDelta, weeksDelta, daysDelta, workdaysOnly])

  const applyAddSubPreset = (days: number, months = 0, years = 0) => {
    setDaysDelta(days)
    setMonthsDelta(months)
    setYearsDelta(years)
    setWeeksDelta(0)
  }

  // =========================================================================
  // 3. TAB: DEADLINE & HARI KERJA PROYEK
  // =========================================================================
  const [projStartDateStr, setProjStartDateStr] = useState(todayStr)
  const [workdaysRequired, setWorkdaysRequired] = useState(20)
  const [workSystem, setWorkSystem] = useState<'5' | '6'>('5')
  const [skipIndoHolidays, setSkipIndoHolidays] = useState(true)

  const deadlineResult = useMemo(() => {
    if (!projStartDateStr || workdaysRequired <= 0) return null
    try {
      const s = parseLocalDate(projStartDateStr)
      return calculateProjectDeadline(s, workdaysRequired, {
        workdaysPerWeek: workSystem === '6' ? 6 : 5,
        holidays: skipIndoHolidays ? [] : undefined,
      })
    } catch {
      return null
    }
  }, [projStartDateStr, workdaysRequired, workSystem, skipIndoHolidays])

  // =========================================================================
  // 4. TAB: USIA & MILESTONE
  // =========================================================================
  const [birthDateStr, setBirthDateStr] = useState('1998-08-17')
  const ageResult = useMemo(() => {
    if (!birthDateStr) return null
    try {
      const b = parseLocalDate(birthDateStr)
      return calculateAgeMilestones(b)
    } catch {
      return null
    }
  }, [birthDateStr])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kalkulator Tanggal"
        description="Hitung selisih hari, tambah/kurang kalender, estimasi deadline hari kerja, dan milestone usia secara presisi."
        icon={<CalendarDays className="size-5" />}
        color="var(--mod-productivity)"
      />

      <Tabs<TabType>
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'diff', label: 'Selisih Dua Tanggal', icon: <CalendarRange className="size-4" /> },
          { id: 'addsub', label: 'Tambah / Kurang Hari', icon: <Clock className="size-4" /> },
          { id: 'deadline', label: 'Deadline & Hari Kerja', icon: <Briefcase className="size-4" /> },
          { id: 'age', label: 'Kalkulator Usia', icon: <Cake className="size-4" /> },
        ]}
      />

      {/* =====================================================================
          1. TAB: SELISIH DUA TANGGAL
          ===================================================================== */}
      {activeTab === 'diff' && (
        <div className="grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
          {/* Form Input */}
          <div className="space-y-4">
            <Card>
              <CardHeader
                title="Pilih Rentang Tanggal"
                subtitle="Masukkan tanggal awal dan akhir untuk mengukur durasi"
                icon={<CalendarRange className="size-4 text-primary" />}
              />
              <div className="space-y-4 p-4 pt-0">
                <Field label="Tanggal Mulai">
                  <Input
                    type="date"
                    value={startDateStr}
                    onChange={(e) => setStartDateStr(e.target.value)}
                  />
                </Field>

                <Field label="Tanggal Akhir">
                  <Input
                    type="date"
                    value={endDateStr}
                    onChange={(e) => setEndDateStr(e.target.value)}
                  />
                </Field>

                <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-foreground select-none">
                  <Checkbox
                    checked={inclusive}
                    onChange={(v) => setInclusive(v)}
                  />
                  <span>Hitung hari terakhir (Inklusif +1 hari)</span>
                </label>

                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-medium text-muted">Pintasan Cepat:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <Chip onClick={() => setDiffPreset(7)}>+7 Hari</Chip>
                    <Chip onClick={() => setDiffPreset(14)}>+2 Minggu</Chip>
                    <Chip onClick={() => setDiffPreset(30)}>+30 Hari</Chip>
                    <Chip onClick={() => setDiffPreset(90)}>+3 Bulan</Chip>
                    <Chip onClick={() => setDiffPreset(365)}>+1 Tahun</Chip>
                    <Chip onClick={setDiffThisYear}>1 Tahun Penuh</Chip>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Hasil Perhitungan */}
          <div className="space-y-4">
            {dateDiffResult ? (
              <>
                <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-surface to-surface">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Total Rentang Waktu
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={copiedKey === 'diff-sum' ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                        onClick={() => handleCopy(dateDiffResult.formattedSummary, 'diff-sum')}
                      >
                        Salin Ringkasan
                      </Button>
                    </div>

                    <div className="mt-2 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                      {dateDiffResult.formattedSummary}
                    </div>

                    <div className="mt-2 text-sm text-muted">
                      {formatIndoDate(parseLocalDate(startDateStr))} <ArrowRight className="inline size-3.5 mx-1" /> {formatIndoDate(parseLocalDate(endDateStr))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-border/60">
                      <div className="flex justify-between text-xs text-muted mb-1.5">
                        <span>Porsi terhadap 1 Tahun ({dateDiffResult.percentageOfYear}%)</span>
                        <span>{dateDiffResult.totalDays} / 365 hari</span>
                      </div>
                      <Progress value={Math.min(100, dateDiffResult.percentageOfYear)} />
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <StatItem
                    label="Total Hari"
                    value={`${dateDiffResult.totalDays.toLocaleString('id-ID')} hari`}
                    hint={`${dateDiffResult.weeks} minggu + ${dateDiffResult.remainingDaysAfterWeeks} hari`}
                  />
                  <StatItem
                    label="Hari Kerja"
                    value={`${dateDiffResult.workdays.toLocaleString('id-ID')} hari`}
                    hint="Senin s/d Jumat"
                    tone="text-emerald-500"
                  />
                  <StatItem
                    label="Akhir Pekan"
                    value={`${dateDiffResult.weekends.toLocaleString('id-ID')} hari`}
                    hint="Sabtu & Minggu"
                    tone="text-amber-500"
                  />
                  <StatItem
                    label="Total Jam"
                    value={`${dateDiffResult.totalHours.toLocaleString('id-ID')} jam`}
                    hint="24 jam / hari"
                  />
                  <StatItem
                    label="Total Menit"
                    value={`${dateDiffResult.totalMinutes.toLocaleString('id-ID')} mnt`}
                    hint="60 mnt / jam"
                  />
                  <StatItem
                    label="Total Detik"
                    value={`${dateDiffResult.totalSeconds.toLocaleString('id-ID')} dtk`}
                    hint="Presisi waktu"
                  />
                </div>
              </>
            ) : (
              <Card className="p-8 text-center text-muted">
                Pilih tanggal yang valid untuk melihat selisih hari.
              </Card>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          2. TAB: TAMBAH / KURANG TANGGAL
          ===================================================================== */}
      {activeTab === 'addsub' && (
        <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Card>
              <CardHeader
                title="Atur Penambahan / Pengurangan"
                subtitle="Hitung tanggal masa depan atau masa lalu dari tanggal patokan"
                icon={<Clock className="size-4 text-primary" />}
              />
              <div className="space-y-4 p-4 pt-0">
                <Field label="Tanggal Awal">
                  <Input
                    type="date"
                    value={calcBaseDateStr}
                    onChange={(e) => setCalcBaseDateStr(e.target.value)}
                  />
                </Field>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant={direction === 'add' ? 'primary' : 'secondary'}
                    icon={<Plus className="size-4" />}
                    onClick={() => setDirection('add')}
                  >
                    Tambah (+)
                  </Button>
                  <Button
                    className="flex-1"
                    variant={direction === 'subtract' ? 'primary' : 'secondary'}
                    icon={<Minus className="size-4" />}
                    onClick={() => setDirection('subtract')}
                  >
                    Kurang (-)
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tahun">
                    <Input
                      type="number"
                      min={0}
                      value={yearsDelta}
                      onChange={(e) => setYearsDelta(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </Field>
                  <Field label="Bulan">
                    <Input
                      type="number"
                      min={0}
                      value={monthsDelta}
                      onChange={(e) => setMonthsDelta(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </Field>
                  <Field label="Minggu">
                    <Input
                      type="number"
                      min={0}
                      value={weeksDelta}
                      onChange={(e) => setWeeksDelta(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </Field>
                  <Field label="Hari">
                    <Input
                      type="number"
                      min={0}
                      value={daysDelta}
                      onChange={(e) => setDaysDelta(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </Field>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-foreground select-none">
                  <Checkbox
                    checked={workdaysOnly}
                    onChange={(v) => setWorkdaysOnly(v)}
                  />
                  <span>Hanya hitung hari kerja (Lewati Sabtu & Minggu)</span>
                </label>

                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-medium text-muted">Pintasan Cepat:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <Chip onClick={() => applyAddSubPreset(7)}>7 Hari</Chip>
                    <Chip onClick={() => applyAddSubPreset(14)}>14 Hari</Chip>
                    <Chip onClick={() => applyAddSubPreset(30)}>30 Hari</Chip>
                    <Chip onClick={() => applyAddSubPreset(0, 1)}>1 Bulan</Chip>
                    <Chip onClick={() => applyAddSubPreset(0, 3)}>3 Bulan</Chip>
                    <Chip onClick={() => applyAddSubPreset(0, 6)}>6 Bulan</Chip>
                    <Chip onClick={() => applyAddSubPreset(0, 0, 1)}>1 Tahun</Chip>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            {addSubResult ? (
              <Card className="border-primary/30 p-6 bg-gradient-to-br from-primary/10 via-surface to-surface">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Tanggal Hasil Perhitungan
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={copiedKey === 'addsub' ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                    onClick={() => handleCopy(addSubResult.formatted, 'addsub')}
                  >
                    Salin
                  </Button>
                </div>

                <div className="mt-3 text-3xl font-extrabold text-foreground md:text-4xl">
                  {addSubResult.formatted}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="info">Hari {addSubResult.dayName}</Badge>
                  <Badge tone="neutral">ISO: {addSubResult.iso}</Badge>
                  {workdaysOnly && <Badge tone="warning">Mode Hari Kerja Aktif</Badge>}
                </div>

                <div className="mt-6 rounded-lg border border-border bg-surface-2/40 p-4 text-sm text-muted">
                  <p>
                    <strong>Operasi:</strong> {direction === 'add' ? 'Ditambah' : 'Dikurangi'}{' '}
                    {[
                      yearsDelta ? `${yearsDelta} tahun` : '',
                      monthsDelta ? `${monthsDelta} bulan` : '',
                      weeksDelta ? `${weeksDelta} minggu` : '',
                      daysDelta ? `${daysDelta} hari` : '',
                    ]
                      .filter(Boolean)
                      .join(', ') || '0 hari'}{' '}
                    dari tanggal{' '}
                    <span className="font-semibold text-foreground">
                      {formatIndoDate(parseLocalDate(calcBaseDateStr))}
                    </span>
                    .
                  </p>
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center text-muted">Masukkan data untuk menghitung tanggal.</Card>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          3. TAB: DEADLINE & HARI KERJA PROYEK
          ===================================================================== */}
      {activeTab === 'deadline' && (
        <div className="grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Card>
              <CardHeader
                title="Parameter Proyek / Sprint"
                subtitle="Hitung kapan tugas atau proyek selesai berdasarkan beban hari kerja"
                icon={<Briefcase className="size-4 text-primary" />}
              />
              <div className="space-y-4 p-4 pt-0">
                <Field label="Tanggal Mulai Pengerjaan">
                  <Input
                    type="date"
                    value={projStartDateStr}
                    onChange={(e) => setProjStartDateStr(e.target.value)}
                  />
                </Field>

                <Field
                  label="Target Hari Kerja (Workdays)"
                  hint="Jumlah hari kerja efektif yang dibutuhkan tim"
                >
                  <Input
                    type="number"
                    min={1}
                    value={workdaysRequired}
                    onChange={(e) => setWorkdaysRequired(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </Field>

                <Field label="Sistem Hari Kerja">
                  <Select value={workSystem} onChange={(e) => setWorkSystem(e.target.value as '5' | '6')}>
                    <option value="5">5 Hari Kerja (Senin – Jumat)</option>
                    <option value="6">6 Hari Kerja (Senin – Sabtu)</option>
                  </Select>
                </Field>

                <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-foreground select-none">
                  <Checkbox
                    checked={skipIndoHolidays}
                    onChange={(v) => setSkipIndoHolidays(v)}
                  />
                  <span>Lewati Libur Nasional Tetap Indonesia</span>
                </label>

                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-medium text-muted">Pintasan Hari Kerja:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <Chip onClick={() => setWorkdaysRequired(5)}>1 Minggu (5 hari)</Chip>
                    <Chip onClick={() => setWorkdaysRequired(10)}>Sprint 2 Mgg (10 hari)</Chip>
                    <Chip onClick={() => setWorkdaysRequired(20)}>1 Bulan Kerja (20 hari)</Chip>
                    <Chip onClick={() => setWorkdaysRequired(40)}>2 Bulan Kerja (40 hari)</Chip>
                    <Chip onClick={() => setWorkdaysRequired(60)}>Quarter (60 hari)</Chip>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            {deadlineResult ? (
              <>
                <Card className="border-primary/30 p-6 bg-gradient-to-br from-primary/10 via-surface to-surface">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Perkiraan Tanggal Selesai (Deadline)
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={copiedKey === 'deadline' ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                      onClick={() => handleCopy(deadlineResult.targetDateFormatted, 'deadline')}
                    >
                      Salin Deadline
                    </Button>
                  </div>

                  <div className="mt-3 text-3xl font-extrabold text-foreground md:text-4xl">
                    {deadlineResult.targetDateFormatted}
                  </div>

                  <div className="mt-2 text-sm text-muted">
                    Jatuh pada hari <span className="font-semibold text-foreground">{deadlineResult.dayName}</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge tone="success">{deadlineResult.workdaysCount} Hari Kerja Terpenuhi</Badge>
                    <Badge tone="neutral">{deadlineResult.totalCalendarDays} Hari Kalender Total</Badge>
                    <Badge tone="warning">{deadlineResult.weekendDaysCount} Hari Libur Akhir Pekan</Badge>
                    {deadlineResult.holidaysSkipped > 0 && (
                      <Badge tone="danger">{deadlineResult.holidaysSkipped} Libur Nasional Dilewati</Badge>
                    )}
                  </div>
                </Card>

                {deadlineResult.skippedHolidayNames.length > 0 && (
                  <Card className="p-4 border-amber-500/30 bg-amber-500/5">
                    <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      Libur Nasional Yang Terlewati:
                    </div>
                    <ul className="mt-1 list-disc list-inside text-xs text-muted space-y-0.5">
                      {deadlineResult.skippedHolidayNames.map((name, i) => (
                        <li key={i}>{name}</li>
                      ))}
                    </ul>
                  </Card>
                )}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <StatItem
                    label="Hari Kerja Efektif"
                    value={`${deadlineResult.workdaysCount} hari`}
                    hint="Senin s/d Jumat"
                    tone="text-emerald-500"
                  />
                  <StatItem
                    label="Akhir Pekan Dilewati"
                    value={`${deadlineResult.weekendDaysCount} hari`}
                    hint="Sabtu & Minggu"
                    tone="text-amber-500"
                  />
                  <StatItem
                    label="Total Durasi Kalender"
                    value={`${deadlineResult.totalCalendarDays} hari`}
                    hint="Dari hari mulai"
                  />
                </div>
              </>
            ) : (
              <Card className="p-8 text-center text-muted">Masukkan data sprint untuk menghitung deadline.</Card>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          4. TAB: USIA & MILESTONE
          ===================================================================== */}
      {activeTab === 'age' && (
        <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Card>
              <CardHeader
                title="Masukkan Tanggal Lahir"
                subtitle="Hitung usia presisi, ulang tahun berikutnya, dan milestone hidup"
                icon={<Cake className="size-4 text-primary" />}
              />
              <div className="space-y-4 p-4 pt-0">
                <Field label="Tanggal Lahir">
                  <Input
                    type="date"
                    value={birthDateStr}
                    onChange={(e) => setBirthDateStr(e.target.value)}
                  />
                </Field>

                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-medium text-muted">Contoh Cepat:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <Chip onClick={() => setBirthDateStr('1990-01-01')}>1990 (36 thn)</Chip>
                    <Chip onClick={() => setBirthDateStr('1998-08-17')}>1998 (28 thn)</Chip>
                    <Chip onClick={() => setBirthDateStr('2000-12-12')}>2000 (25 thn)</Chip>
                    <Chip onClick={() => setBirthDateStr('2005-05-05')}>2005 (21 thn)</Chip>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            {ageResult ? (
              <>
                <Card className="border-primary/30 p-6 bg-gradient-to-br from-primary/10 via-surface to-surface">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Usia Anda Saat Ini
                    </span>
                    <Badge tone="info">{ageResult.generation}</Badge>
                  </div>

                  <div className="mt-3 text-3xl font-extrabold text-foreground md:text-4xl">
                    {ageResult.years} tahun, {ageResult.months} bulan, {ageResult.days} hari
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted">
                    <span>Lahir pada hari: <strong className="text-foreground">{ageResult.birthDayName}</strong></span>
                    <span>•</span>
                    <span>
                      Zodiak: <strong className="text-foreground">{ageResult.zodiac.icon} {ageResult.zodiac.sign}</strong> ({ageResult.zodiac.range})
                    </span>
                  </div>

                  <div className="mt-6 rounded-lg border border-border bg-surface-2/40 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <PartyPopper className="size-4 text-amber-500" />
                      Ulang Tahun Berikutnya
                    </div>
                    <div className="mt-1 text-sm text-muted">
                      {ageResult.daysToNextBirthday === 0 ? (
                        <span className="font-bold text-emerald-500">🎉 Selamat Ulang Tahun Hari Ini! 🎉</span>
                      ) : (
                        <span>
                          Sisa <strong className="text-foreground">{ageResult.daysToNextBirthday} hari lagi</strong>, jatuh pada hari{' '}
                          <strong className="text-foreground">{ageResult.nextBirthdayDayName}</strong> ({formatIndoDate(ageResult.nextBirthday)}).
                        </span>
                      )}
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatItem
                    label="Total Hari Hidup"
                    value={`${ageResult.totalDays.toLocaleString('id-ID')} hari`}
                    hint="Sejak lahir"
                  />
                  <StatItem
                    label="Total Jam Hidup"
                    value={`${ageResult.totalHours.toLocaleString('id-ID')} jam`}
                    hint="24 jam / hari"
                  />
                  <StatItem
                    label="Estimasi Denyut Jantung"
                    value={`~${(ageResult.approximateHeartbeats / 1_000_000).toFixed(1)} Juta`}
                    hint="Detak (~72 bpm)"
                    icon={<Heart className="size-3.5 text-rose-500 inline mr-1" />}
                  />
                  <StatItem
                    label="Estimasi Waktu Tidur"
                    value={`~${(ageResult.approximateSleepDays / 365).toFixed(1)} Tahun`}
                    hint="~8 jam per hari"
                    icon={<Moon className="size-3.5 text-indigo-400 inline mr-1" />}
                  />
                </div>
              </>
            ) : (
              <Card className="p-8 text-center text-muted">Masukkan tanggal lahir untuk melihat statistik usia.</Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatItem({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string
  value: string
  hint?: string
  tone?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/50 p-3.5">
      <div className="text-xs text-muted flex items-center">{icon}{label}</div>
      <div className={`mt-1 font-mono text-base font-bold sm:text-lg ${tone || 'text-foreground'}`}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-muted">{hint}</div>}
    </div>
  )
}
