import {
  BookmarkPlus,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  Link2,
  Mail,
  MessageCircle,
  Palette,
  Printer,
  QrCode,
  ScanLine,
  Trash2,
  Type,
  UserSquare2,
  Wifi,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildEmailPayload,
  buildVCardPayload,
  buildWhatsAppPayload,
  buildWifiPayload,
  generateQrMatrix,
  renderQrToCanvas,
  renderQrToSvg,
  renderWifiPosterToBlob,
  type QrEcLevel,
  type QrModuleStyle,
} from '@/services/qr.service'
import { Badge, Button, Card, CardHeader, Field, Input, Select, Textarea } from '@/components/ui/primitives'
import { Dropzone, PageHeader } from '@/components/ui/blocks'
import { useToast } from '@/components/ui/overlays'
import { cn } from '@/lib/cn'

type QrPayloadType = 'url' | 'text' | 'wifi' | 'vcard' | 'whatsapp' | 'email'
type QrStudioTab = 'generate' | 'scan-presets'

interface SavedQrPreset {
  id: string
  name: string
  type: QrPayloadType
  payload: string
  fgColor: string
  bgColor: string
  caption: string
  createdAt: string
}

const PRESETS_STORAGE_KEY = 'sk-qr-presets'

const COLOR_THEMES = [
  { id: 'classic', label: 'Klasik', fg: '#0f172a', bg: '#ffffff' },
  { id: 'sikomputer', label: 'SiKomputer', fg: '#0052CC', bg: '#f8fafc' },
  { id: 'emerald', label: 'Emerald', fg: '#065f46', bg: '#ecfdf5' },
  { id: 'crimson', label: 'Crimson', fg: '#9f1239', bg: '#fff1f2' },
  { id: 'dark', label: 'Dark Mode', fg: '#e2e8f0', bg: '#0b1120' },
]

export function QrStudioPage() {
  const toast = useToast()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [studioTab, setStudioTab] = useState<QrStudioTab>('generate')
  const [payloadType, setPayloadType] = useState<QrPayloadType>('url')

  // Payload States
  const [urlVal, setUrlVal] = useState('https://dorobokun16.github.io/SiKomputer/')
  const [textVal, setTextVal] = useState('SiKomputer Workstation Offline — Cepat & Privat')
  const [wifiSsid, setWifiSsid] = useState('WiFi-Kantor-SiKomputer')
  const [wifiPass, setWifiPass] = useState('SiKomputer2026!')
  const [wifiEnc, setWifiEnc] = useState<'WPA' | 'WEP' | 'nopass'>('WPA')
  const [wifiHidden, setWifiHidden] = useState(false)
  const [showWifiPass, setShowWifiPass] = useState(false)
  const [includeWifiPassOnCard, setIncludeWifiPassOnCard] = useState(true)

  const [vcName, setVcName] = useState('Iwan Kurniawan')
  const [vcOrg, setVcOrg] = useState('SiKomputer Automation')
  const [vcTitle, setVcTitle] = useState('RPA Developer')
  const [vcPhone, setVcPhone] = useState('+6281234567890')
  const [vcEmail, setVcEmail] = useState('dorobokun16@gmail.com')
  const [vcUrl, setVcUrl] = useState('https://github.com/dorobokun16/SiKomputer')

  const [waPhone, setWaPhone] = useState('081234567890')
  const [waMsg, setWaMsg] = useState('Halo, saya menghubungi melalui QR SiKomputer.')

  const [mailTo, setMailTo] = useState('dorobokun16@gmail.com')
  const [mailSubj, setMailSubj] = useState('Laporan SiKomputer')
  const [mailBody, setMailBody] = useState('Halo tim,\nBerikut detail informasi:')

  // Visual Customization States
  const [fgColor, setFgColor] = useState('#0f172a')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [moduleStyle, setModuleStyle] = useState<QrModuleStyle>('square')
  const [finderStyle, setFinderStyle] = useState<'square' | 'rounded'>('square')
  const [resolution, setResolution] = useState<'256' | '512' | '1024'>('512')
  const [ecLevel, setEcLevel] = useState<QrEcLevel>('M')
  const [logoMode, setLogoMode] = useState<'none' | 'sikomputer' | 'custom'>('none')
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')

  // Scanner & Saved Presets States
  const [scannedText, setScannedText] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [presets, setPresets] = useState<SavedQrPreset[]>(() => {
    try {
      const raw = localStorage.getItem(PRESETS_STORAGE_KEY)
      return raw ? (JSON.parse(raw) as SavedQrPreset[]) : []
    } catch {
      return []
    }
  })

  const rawPayload = useMemo(() => {
    switch (payloadType) {
      case 'url':
        return urlVal.trim() || 'https://dorobokun16.github.io/SiKomputer/'
      case 'text':
        return textVal || 'SiKomputer'
      case 'wifi':
        return buildWifiPayload({
          ssid: wifiSsid || 'MyWiFi',
          password: wifiPass,
          encryption: wifiEnc,
          hidden: wifiHidden,
        })
      case 'vcard':
        return buildVCardPayload({
          fullName: vcName || 'SiKomputer User',
          org: vcOrg,
          title: vcTitle,
          phone: vcPhone,
          email: vcEmail,
          url: vcUrl,
        })
      case 'whatsapp':
        return buildWhatsAppPayload(waPhone, waMsg)
      case 'email':
        return buildEmailPayload(mailTo, mailSubj, mailBody)
    }
  }, [payloadType, urlVal, textVal, wifiSsid, wifiPass, wifiEnc, wifiHidden, vcName, vcOrg, vcTitle, vcPhone, vcEmail, vcUrl, waPhone, waMsg, mailTo, mailSubj, mailBody])

  const activeLogoSrc = useMemo(() => {
    if (logoMode === 'sikomputer') return `${import.meta.env.BASE_URL}logo.png`
    if (logoMode === 'custom') return customLogoUrl
    return null
  }, [logoMode, customLogoUrl])

  const effectiveEcLevel: QrEcLevel = activeLogoSrc ? 'H' : ecLevel

  const qrGeneration = useMemo(() => {
    try {
      const matrix = generateQrMatrix(rawPayload, effectiveEcLevel)
      return { matrix, error: null as string | null }
    } catch (err: unknown) {
      return { matrix: null, error: err instanceof Error ? err.message : 'Gagal membuat matriks QR.' }
    }
  }, [rawPayload, effectiveEcLevel])

  // Render preview ke Canvas
  useEffect(() => {
    if (!canvasRef.current || !qrGeneration.matrix || studioTab !== 'generate') return
    void renderQrToCanvas(canvasRef.current, qrGeneration.matrix, {
      size: Number(resolution),
      margin: 4,
      fgColor,
      bgColor,
      moduleStyle,
      finderStyle,
      caption,
      logoSrc: activeLogoSrc,
    })
  }, [qrGeneration.matrix, resolution, fgColor, bgColor, moduleStyle, finderStyle, caption, activeLogoSrc, studioTab])

  const handleDownloadPng = () => {
    if (!canvasRef.current || !qrGeneration.matrix) return
    canvasRef.current.toBlob((blob) => {
      if (!blob) return
      const u = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = u
      a.download = `qrcode-${payloadType}-${Date.now()}.png`
      a.click()
      window.setTimeout(() => URL.revokeObjectURL(u), 2000)
      toast({ title: 'QR Code PNG berhasil diunduh', tone: 'success' })
    }, 'image/png')
  }

  const handleDownloadSvg = () => {
    if (!qrGeneration.matrix) return
    const svg = renderQrToSvg(qrGeneration.matrix, {
      size: Number(resolution),
      margin: 4,
      fgColor,
      bgColor,
      moduleStyle,
      caption,
    })
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const u = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = u
    a.download = `qrcode-${payloadType}-${Date.now()}.svg`
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(u), 2000)
    toast({ title: 'QR Code SVG vektor berhasil diunduh', tone: 'success' })
  }

  const handleCopyImage = async () => {
    if (!canvasRef.current) return
    try {
      const blob = await new Promise<Blob | null>((res) => canvasRef.current?.toBlob(res, 'image/png'))
      if (!blob) throw new Error('Canvas kosong')
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        toast({ title: 'Gambar QR Code disalin ke clipboard', tone: 'success' })
      } else {
        await navigator.clipboard.writeText(rawPayload)
        toast({ title: 'Browser tidak mendukung salin gambar; teks payload disalin', tone: 'info' })
      }
    } catch {
      await navigator.clipboard.writeText(rawPayload)
      toast({ title: 'Teks payload QR disalin ke clipboard', tone: 'info' })
    }
  }

  const handleDownloadWifiCard = async () => {
    if (!qrGeneration.matrix) return
    try {
      const blob = await renderWifiPosterToBlob(
        qrGeneration.matrix,
        {
          ssid: wifiSsid || 'Wi-Fi',
          password: wifiPass,
          encryption: wifiEnc,
          includePassword: includeWifiPassOnCard,
        },
        {
          fgColor,
          moduleStyle,
          finderStyle,
          logoSrc: activeLogoSrc,
        },
      )
      const u = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = u
      a.download = `kartu-wifi-${(wifiSsid || 'guest').replace(/[^a-z0-9_-]/gi, '_')}.png`
      a.click()
      window.setTimeout(() => URL.revokeObjectURL(u), 2000)
      toast({ title: 'Kartu Akses Wi-Fi siap cetak berhasil diunduh!', tone: 'success' })
    } catch (err: unknown) {
      toast({
        title: 'Gagal membuat kartu Wi-Fi',
        description: err instanceof Error ? err.message : undefined,
        tone: 'danger',
      })
    }
  }

  const handleSavePreset = () => {
    const labelMap: Record<QrPayloadType, string> = {
      url: urlVal.slice(0, 32) || 'QR URL',
      text: textVal.slice(0, 32) || 'QR Teks',
      wifi: `Wi-Fi: ${wifiSsid || 'Jaringan'}`,
      vcard: `vCard: ${vcName || 'Kontak'}`,
      whatsapp: `WhatsApp: ${waPhone}`,
      email: `Email: ${mailTo}`,
    }
    const next: SavedQrPreset[] = [
      {
        id: 'qr-' + Date.now(),
        name: caption.trim() || labelMap[payloadType],
        type: payloadType,
        payload: rawPayload,
        fgColor,
        bgColor,
        caption,
        createdAt: new Date().toISOString(),
      },
      ...presets.slice(0, 19),
    ]
    setPresets(next)
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(next))
    toast({ title: 'Preset QR disimpan ke penyimpanan lokal', tone: 'success' })
  }

  const handleDeletePreset = (id: string) => {
    const next = presets.filter((p) => p.id !== id)
    setPresets(next)
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(next))
    toast({ title: 'Preset dihapus', tone: 'info' })
  }

  const handleScanQrImage = async (file: File) => {
    setScannedText(null)
    setScanError(null)
    try {
      const DetectorCtor = (
        window as unknown as {
          BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (img: ImageBitmap) => Promise<Array<{ rawValue?: string }>> }
        }
      ).BarcodeDetector
      if (!DetectorCtor) {
        setScanError(
          'Browser ini belum mendukung BarcodeDetector API secara native. Gunakan Google Chrome / Microsoft Edge / Android WebView untuk memindai QR langsung dari gambar.',
        )
        return
      }
      const bitmap = await createImageBitmap(file)
      const detector = new DetectorCtor({ formats: ['qr_code'] })
      const results = await detector.detect(bitmap)
      bitmap.close?.()
      if (results.length > 0 && results[0].rawValue) {
        setScannedText(results[0].rawValue)
        toast({ title: 'QR Code berhasil dibaca!', tone: 'success' })
      } else {
        setScanError('Tidak ditemukan QR Code yang dapat terbaca pada gambar tersebut.')
      }
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : 'Gagal memindai gambar QR Code.')
    }
  }

  const payloadTypes: { id: QrPayloadType; label: string; icon: typeof Link2 }[] = [
    { id: 'url', label: 'URL / Link', icon: Link2 },
    { id: 'text', label: 'Teks', icon: Type },
    { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
    { id: 'vcard', label: 'vCard Kontak', icon: UserSquare2 },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'email', label: 'Email', icon: Mail },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="QR Code Studio"
        description="Buat QR Code untuk URL, Teks, Wi-Fi, vCard, WhatsApp & Email dengan kustomisasi logo/warna, cetak Kartu Wi-Fi, atau pindai gambar QR 100% offline."
        icon={<QrCode className="size-5" />}
        color="var(--mod-dev)"
        actions={
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={studioTab === 'generate' ? 'primary' : 'secondary'}
              icon={<QrCode className="size-3.5" />}
              onClick={() => setStudioTab('generate')}
            >
              Generator QR
            </Button>
            <Button
              size="sm"
              variant={studioTab === 'scan-presets' ? 'primary' : 'secondary'}
              icon={<ScanLine className="size-3.5" />}
              onClick={() => setStudioTab('scan-presets')}
            >
              Pindai &amp; Preset ({presets.length})
            </Button>
          </div>
        }
      />

      {studioTab === 'generate' ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          {/* KIRI: INPUT & KUSTOMISASI */}
          <div className="space-y-5 min-w-0">
            <Card>
              <CardHeader
                title="1. Jenis & Konten QR Code"
                subtitle="Pilih tipe payload agar langsung dikenali kamera smartphone"
                icon={<QrCode className="size-4" />}
              />
              <div className="space-y-4 p-4 pt-0">
                <div className="flex flex-wrap gap-1.5">
                  {payloadTypes.map((pt) => {
                    const Icon = pt.icon
                    const active = payloadType === pt.id
                    return (
                      <button
                        key={pt.id}
                        type="button"
                        onClick={() => setPayloadType(pt.id)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                          active
                            ? 'border-primary/40 bg-primary/10 text-primary font-semibold'
                            : 'border-border/70 bg-surface-2/40 text-muted hover:bg-surface-2 hover:text-text',
                        )}
                      >
                        <Icon className="size-3.5 shrink-0" />
                        {pt.label}
                      </button>
                    )
                  })}
                </div>

                {payloadType === 'url' && (
                  <Field label="Alamat URL / Tautan Website">
                    <Input
                      value={urlVal}
                      onChange={(e) => setUrlVal(e.target.value)}
                      placeholder="https://contoh.com"
                      className="font-mono text-xs"
                    />
                  </Field>
                )}

                {payloadType === 'text' && (
                  <Field label="Teks Bebas">
                    <Textarea
                      rows={4}
                      value={textVal}
                      onChange={(e) => setTextVal(e.target.value)}
                      placeholder="Tulis pesan, serial number, token, atau catatan apa saja..."
                    />
                  </Field>
                )}

                {payloadType === 'wifi' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Nama Wi-Fi (SSID)">
                        <Input
                          value={wifiSsid}
                          onChange={(e) => setWifiSsid(e.target.value)}
                          placeholder="Nama_WiFi_Anda"
                        />
                      </Field>
                      <Field label="Keamanan / Enkripsi">
                        <Select value={wifiEnc} onChange={(e) => setWifiEnc(e.target.value as 'WPA' | 'WEP' | 'nopass')}>
                          <option value="WPA">WPA / WPA2 / WPA3</option>
                          <option value="WEP">WEP</option>
                          <option value="nopass">Tanpa Password (Terbuka)</option>
                        </Select>
                      </Field>
                    </div>

                    {wifiEnc !== 'nopass' && (
                      <Field label="Kata Sandi Wi-Fi">
                        <div className="relative">
                          <Input
                            type={showWifiPass ? 'text' : 'password'}
                            value={wifiPass}
                            onChange={(e) => setWifiPass(e.target.value)}
                            placeholder="Password Wi-Fi..."
                            className="pr-10 font-mono text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowWifiPass(!showWifiPass)}
                            className="absolute right-2.5 top-2 text-muted hover:text-text cursor-pointer"
                            title={showWifiPass ? 'Sembunyikan' : 'Tampilkan'}
                          >
                            {showWifiPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </Field>
                    )}

                    <div className="flex flex-wrap gap-4 text-xs text-muted">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={wifiHidden}
                          onChange={(e) => setWifiHidden(e.target.checked)}
                          className="rounded border-border accent-primary"
                        />
                        Jaringan tersembunyi (Hidden SSID)
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={includeWifiPassOnCard}
                          onChange={(e) => setIncludeWifiPassOnCard(e.target.checked)}
                          className="rounded border-border accent-primary"
                        />
                        Cetak password pada Kartu Akses Wi-Fi
                      </label>
                    </div>
                  </div>
                )}

                {payloadType === 'vcard' && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Nama Lengkap">
                      <Input value={vcName} onChange={(e) => setVcName(e.target.value)} />
                    </Field>
                    <Field label="Nomor Telepon / HP">
                      <Input value={vcPhone} onChange={(e) => setVcPhone(e.target.value)} />
                    </Field>
                    <Field label="Email">
                      <Input value={vcEmail} onChange={(e) => setVcEmail(e.target.value)} />
                    </Field>
                    <Field label="Perusahaan / Organisasi">
                      <Input value={vcOrg} onChange={(e) => setVcOrg(e.target.value)} />
                    </Field>
                    <Field label="Jabatan">
                      <Input value={vcTitle} onChange={(e) => setVcTitle(e.target.value)} />
                    </Field>
                    <Field label="Website">
                      <Input value={vcUrl} onChange={(e) => setVcUrl(e.target.value)} />
                    </Field>
                  </div>
                )}

                {payloadType === 'whatsapp' && (
                  <div className="space-y-3">
                    <Field label="Nomor WhatsApp (otomatis konversi awalan 0 → 62)">
                      <Input value={waPhone} onChange={(e) => setWaPhone(e.target.value)} placeholder="0812..." />
                    </Field>
                    <Field label="Pesan Otomatis">
                      <Textarea rows={3} value={waMsg} onChange={(e) => setWaMsg(e.target.value)} />
                    </Field>
                  </div>
                )}

                {payloadType === 'email' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Email Tujuan">
                        <Input value={mailTo} onChange={(e) => setMailTo(e.target.value)} />
                      </Field>
                      <Field label="Subjek Email">
                        <Input value={mailSubj} onChange={(e) => setMailSubj(e.target.value)} />
                      </Field>
                    </div>
                    <Field label="Isi Pesan">
                      <Textarea rows={3} value={mailBody} onChange={(e) => setMailBody(e.target.value)} />
                    </Field>
                  </div>
                )}

                <div className="rounded-md border border-border bg-surface-2/40 p-2.5 text-[11px]">
                  <span className="font-semibold text-muted block mb-1">Payload QR Aktual:</span>
                  <code className="break-all font-mono text-text">{rawPayload}</code>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="2. Tampilan, Warna & Logo Tengah"
                subtitle="Sesuaikan gaya visual QR Code Anda"
                icon={<Palette className="size-4" />}
              />
              <div className="space-y-4 p-4 pt-0">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-muted mr-1">Tema Warna:</span>
                  {COLOR_THEMES.map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => {
                        setFgColor(th.fg)
                        setBgColor(th.bg)
                      }}
                      className="inline-flex items-center gap-1.5 rounded border border-border bg-surface-2/60 px-2 py-1 text-[11px] hover:border-primary/60 cursor-pointer"
                    >
                      <span className="size-3 rounded-full border border-border" style={{ background: th.fg }} />
                      {th.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="Warna QR">
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="h-9 w-full rounded border border-border bg-surface p-1 cursor-pointer"
                    />
                  </Field>
                  <Field label="Background">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="h-9 w-full rounded border border-border bg-surface p-1 cursor-pointer"
                    />
                  </Field>
                  <Field label="Gaya Modul">
                    <Select value={moduleStyle} onChange={(e) => setModuleStyle(e.target.value as QrModuleStyle)}>
                      <option value="square">Kotak Klasik</option>
                      <option value="rounded">Membulat</option>
                      <option value="dots">Titik (Dots)</option>
                    </Select>
                  </Field>
                  <Field label="Resolusi">
                    <Select value={resolution} onChange={(e) => setResolution(e.target.value as '256' | '512' | '1024')}>
                      <option value="256">256 × 256 px</option>
                      <option value="512">512 × 512 px</option>
                      <option value="1024">1024 × 1024 px</option>
                    </Select>
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field label="Gaya Sudut Finder">
                    <Select value={finderStyle} onChange={(e) => setFinderStyle(e.target.value as 'square' | 'rounded')}>
                      <option value="square">Tajam (Standar)</option>
                      <option value="rounded">Membulat Halus</option>
                    </Select>
                  </Field>
                  <Field label="Koreksi Error (ECC)">
                    <Select
                      value={effectiveEcLevel}
                      disabled={Boolean(activeLogoSrc)}
                      onChange={(e) => setEcLevel(e.target.value as QrEcLevel)}
                    >
                      <option value="L">L (7% - Padat)</option>
                      <option value="M">M (15% - Seimbang)</option>
                      <option value="Q">Q (25% - Kuat)</option>
                      <option value="H">H (30% - Maksimal)</option>
                    </Select>
                  </Field>
                  <Field label="Logo Tengah">
                    <Select
                      value={logoMode}
                      onChange={(e) => setLogoMode(e.target.value as 'none' | 'sikomputer' | 'custom')}
                    >
                      <option value="none">Tanpa Logo</option>
                      <option value="sikomputer">Logo SiKomputer</option>
                      <option value="custom">Unggah Logo Sendiri…</option>
                    </Select>
                  </Field>
                </div>

                {logoMode === 'custom' && (
                  <Field label="Pilih Gambar Logo (.png/.jpg/.svg)">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (!f) return
                        const reader = new FileReader()
                        reader.onload = () => {
                          if (typeof reader.result === 'string') setCustomLogoUrl(reader.result)
                        }
                        reader.readAsDataURL(f)
                      }}
                      className="text-xs text-muted file:mr-3 file:rounded-md file:border file:border-border file:bg-surface-2 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-text cursor-pointer"
                    />
                  </Field>
                )}

                <Field label="Teks Label di Bawah QR (Opsional)">
                  <Input
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Contoh: Scan Wi-Fi Tamu / Buka Aplikasi"
                  />
                </Field>
              </div>
            </Card>
          </div>

          {/* KANAN: PRATINJAU & UNDUHAN */}
          <div className="space-y-5 min-w-0">
            <Card>
              <CardHeader
                title="3. Pratinjau & Unduh QR Code"
                icon={<QrCode className="size-4" />}
                action={
                  qrGeneration.matrix && (
                    <Badge tone="success">
                      V{qrGeneration.matrix.version} ({qrGeneration.matrix.size}×{qrGeneration.matrix.size}) · ECC {qrGeneration.matrix.ecLevel}
                    </Badge>
                  )
                }
              />
              <div className="space-y-4 p-4 pt-0">
                {qrGeneration.error ? (
                  <div className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-xs text-danger">
                    {qrGeneration.error}
                  </div>
                ) : (
                  <>
                    <div className="flex justify-center rounded-xl border border-border bg-surface-2/40 p-5">
                      <canvas
                        ref={canvasRef}
                        className="max-w-full h-auto rounded-lg shadow-md"
                        style={{ maxHeight: 320, width: 'auto' }}
                      />
                    </div>

                    {qrGeneration.matrix && (
                      <div className="flex flex-wrap justify-center gap-2 text-[11px] text-muted">
                        <Badge tone="neutral">{qrGeneration.matrix.byteLength} bytes</Badge>
                        <Badge tone="neutral">{resolution}×{resolution} px</Badge>
                        {activeLogoSrc && <Badge tone="info">Auto ECC-H (Logo Aman Dipindai)</Badge>}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="primary" icon={<Download className="size-4" />} onClick={handleDownloadPng}>
                        Unduh PNG
                      </Button>
                      <Button variant="secondary" icon={<Download className="size-4" />} onClick={handleDownloadSvg}>
                        Unduh SVG
                      </Button>
                      <Button variant="secondary" icon={<Copy className="size-4" />} onClick={handleCopyImage}>
                        Salin Gambar
                      </Button>
                      <Button variant="secondary" icon={<BookmarkPlus className="size-4" />} onClick={handleSavePreset}>
                        Simpan Preset
                      </Button>
                    </div>

                    {payloadType === 'wifi' && (
                      <Button
                        variant="primary"
                        className="w-full"
                        icon={<Printer className="size-4" />}
                        onClick={handleDownloadWifiCard}
                      >
                        Unduh Kartu Cetak Akses Wi-Fi (.png)
                      </Button>
                    )}
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* TAB 2: SCANNER GAMBAR QR & PRESET TERSIMPAN */
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Pindai / Dekode QR dari Gambar"
              subtitle="Unggah tangkapan layar atau foto QR Code untuk membaca isinya secara offline"
              icon={<ScanLine className="size-4" />}
            />
            <div className="space-y-4 p-4 pt-0">
              <Dropzone
                title="Tarik gambar QR (.png/.jpg/.webp) atau klik di sini"
                hint="Diproses langsung di browser perangkat Anda"
                accept="image/*"
                onFile={handleScanQrImage}
                compact
              />

              {scanError && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  {scanError}
                </div>
              )}

              {scannedText && (
                <div className="space-y-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs">
                  <div className="flex items-center justify-between gap-2 font-semibold text-emerald-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Check className="size-4" />
                      Hasil Pembacaan QR:
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Copy className="size-3.5" />}
                      onClick={() => {
                        void navigator.clipboard.writeText(scannedText)
                        toast({ title: 'Teks hasil scan disalin', tone: 'success' })
                      }}
                    >
                      Salin
                    </Button>
                  </div>
                  <p className="break-all rounded bg-surface p-2.5 font-mono text-text border border-border">
                    {scannedText}
                  </p>
                  {/^https?:\/\//i.test(scannedText) && (
                    <a
                      href={scannedText}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
                    >
                      Buka Tautan URL ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title={`Preset QR Tersimpan (${presets.length})`}
              subtitle="Simpan template QR yang sering Anda bagikan di perangkat lokal"
              icon={<BookmarkPlus className="size-4" />}
            />
            <div className="space-y-2.5 p-4 pt-0">
              {presets.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted">
                  Belum ada preset QR tersimpan. Klik &quot;Simpan Preset&quot; di tab Generator QR untuk menyimpannya di sini.
                </div>
              ) : (
                presets.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/40 p-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge tone="neutral">{p.type.toUpperCase()}</Badge>
                        <span className="font-semibold text-text truncate">{p.name}</span>
                      </div>
                      <p className="mt-1 truncate font-mono text-[11px] text-muted">{p.payload}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setPayloadType('text')
                          setTextVal(p.payload)
                          setFgColor(p.fgColor)
                          setBgColor(p.bgColor)
                          setCaption(p.caption)
                          setStudioTab('generate')
                          toast({ title: 'Preset dimuat ke editor QR', tone: 'info' })
                        }}
                      >
                        Muat
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleDeletePreset(p.id)}
                        className="rounded p-1.5 text-muted hover:bg-surface hover:text-danger cursor-pointer"
                        title="Hapus Preset"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
