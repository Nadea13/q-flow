'use client'

import { useState, useEffect } from 'react'
import { MapPin, Check, Sparkles, Building, Hash } from 'lucide-react'
import { 
  getProvinces, 
  getDistricts, 
  getSubdistricts, 
  getZipcode, 
  formatThaiAddress, 
  parseThaiAddress,
  type ThaiAddress 
} from '@/lib/thai-geo'

interface ThaiAddressSelectorProps {
  initialAddress?: string
  onChange: (fullAddress: string, structured: ThaiAddress) => void
  lang?: 'th' | 'en'
}

export function ThaiAddressSelector({
  initialAddress = '',
  onChange,
  lang = 'th',
}: ThaiAddressSelectorProps) {
  const [addressState, setAddressState] = useState<ThaiAddress>(() => {
    return parseThaiAddress(initialAddress)
  })

  const [mode, setMode] = useState<'structured' | 'freeform'>('structured')
  const [freeformText, setFreeformText] = useState(initialAddress)

  const provinces = getProvinces()
  const districts = addressState.province ? getDistricts(addressState.province) : []
  const subdistricts = addressState.province && addressState.district 
    ? getSubdistricts(addressState.province, addressState.district) 
    : []

  // When initialAddress changes externally, parse it
  useEffect(() => {
    if (initialAddress && initialAddress !== formatThaiAddress(addressState)) {
      setFreeformText(initialAddress)
      const parsed = parseThaiAddress(initialAddress)
      if (parsed.province) {
        setAddressState(parsed)
      }
    }
  }, [initialAddress])

  function handleProvinceChange(p: string) {
    const nextState: ThaiAddress = {
      ...addressState,
      province: p,
      district: '',
      subdistrict: '',
      zipcode: '',
    }
    setAddressState(nextState)
    const formatted = formatThaiAddress(nextState)
    setFreeformText(formatted)
    onChange(formatted, nextState)
  }

  function handleDistrictChange(d: string) {
    const nextState: ThaiAddress = {
      ...addressState,
      district: d,
      subdistrict: '',
      zipcode: '',
    }
    setAddressState(nextState)
    const formatted = formatThaiAddress(nextState)
    setFreeformText(formatted)
    onChange(formatted, nextState)
  }

  function handleSubdistrictChange(s: string) {
    const zip = getZipcode(addressState.province, addressState.district, s)
    const nextState: ThaiAddress = {
      ...addressState,
      subdistrict: s,
      zipcode: zip || addressState.zipcode,
    }
    setAddressState(nextState)
    const formatted = formatThaiAddress(nextState)
    setFreeformText(formatted)
    onChange(formatted, nextState)
  }

  function handleDetailChange(detail: string) {
    const nextState: ThaiAddress = {
      ...addressState,
      addressDetail: detail,
    }
    setAddressState(nextState)
    const formatted = formatThaiAddress(nextState)
    setFreeformText(formatted)
    onChange(formatted, nextState)
  }

  function handleZipcodeChange(zip: string) {
    const nextState: ThaiAddress = {
      ...addressState,
      zipcode: zip,
    }
    setAddressState(nextState)
    const formatted = formatThaiAddress(nextState)
    setFreeformText(formatted)
    onChange(formatted, nextState)
  }

  function handleFreeformChange(text: string) {
    setFreeformText(text)
    const parsed = parseThaiAddress(text)
    onChange(text, parsed)
  }

  const isBKK = addressState.province === 'กรุงเทพมหานคร'

  return (
    <div className="space-y-3 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
          <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>{lang === 'th' ? 'เลือกที่อยู่ / พิกัดสาขา' : 'Select Branch Location & Address'}</span>
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px]">
          <button
            type="button"
            onClick={() => setMode('structured')}
            className={`px-2 py-0.5 rounded-md font-semibold transition ${
              mode === 'structured'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {lang === 'th' ? 'เลือกตามลำดับ' : 'Structured'}
          </button>
          <button
            type="button"
            onClick={() => setMode('freeform')}
            className={`px-2 py-0.5 rounded-md font-semibold transition ${
              mode === 'freeform'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {lang === 'th' ? 'พิมพ์อิสระ' : 'Freeform'}
          </button>
        </div>
      </div>

      {mode === 'structured' ? (
        <div className="space-y-3 pt-1">
          {/* Detail: House number, Street, Building */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              {lang === 'th' ? 'บ้านเลขที่ / อาคาร / ซอย / ถนน' : 'House No., Building, Street, Soi'}
            </label>
            <input
              type="text"
              placeholder={lang === 'th' ? 'เช่น 123/45 สยามสแควร์ ซอย 3' : 'e.g. 123/45 Siam Square Soi 3'}
              value={addressState.addressDetail}
              onChange={(e) => handleDetailChange(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* 4 Cascading Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Province */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                {lang === 'th' ? 'จังหวัด' : 'Province'}
              </label>
              <select
                value={addressState.province}
                onChange={(e) => handleProvinceChange(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">{lang === 'th' ? '-- เลือกจังหวัด --' : '-- Select Province --'}</option>
                {provinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* District */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                {isBKK ? (lang === 'th' ? 'เขต' : 'District (Khet)') : (lang === 'th' ? 'อำเภอ' : 'District (Amphoe)')}
              </label>
              <select
                disabled={!addressState.province}
                value={addressState.district}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50"
              >
                <option value="">
                  {addressState.province 
                    ? (isBKK ? (lang === 'th' ? '-- เลือกเขต --' : '-- Select Khet --') : (lang === 'th' ? '-- เลือกอำเภอ --' : '-- Select Amphoe --'))
                    : (lang === 'th' ? '-- กรุณาเลือกจังหวัดก่อน --' : '-- Select Province First --')}
                </option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Subdistrict */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                {isBKK ? (lang === 'th' ? 'แขวง' : 'Subdistrict (Khwaeng)') : (lang === 'th' ? 'ตำบล' : 'Subdistrict (Tambon)')}
              </label>
              <select
                disabled={!addressState.district}
                value={addressState.subdistrict}
                onChange={(e) => handleSubdistrictChange(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50"
              >
                <option value="">
                  {addressState.district 
                    ? (isBKK ? (lang === 'th' ? '-- เลือกแขวง --' : '-- Select Khwaeng --') : (lang === 'th' ? '-- เลือกตำบล --' : '-- Select Tambon --'))
                    : (lang === 'th' ? '-- กรุณาเลือกอำเภอ/เขตก่อน --' : '-- Select District First --')}
                </option>
                {subdistricts.map((s) => (
                  <option key={s.subdistrict} value={s.subdistrict}>
                    {s.subdistrict} ({s.zipcode})
                  </option>
                ))}
              </select>
            </div>

            {/* Zipcode */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1 flex items-center justify-between">
                <span>{lang === 'th' ? 'รหัสไปรษณีย์' : 'Postal Code'}</span>
                {addressState.zipcode && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                    ✓ {lang === 'th' ? 'กรอกให้อัตโนมัติ' : 'Auto-filled'}
                  </span>
                )}
              </label>
              <input
                type="text"
                placeholder="10330"
                value={addressState.zipcode}
                onChange={(e) => handleZipcodeChange(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      ) : (
        <div>
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
            {lang === 'th' ? 'พิมพ์ที่อยู่แบบเต็ม' : 'Full Address Text'}
          </label>
          <textarea
            rows={3}
            placeholder={lang === 'th' ? 'เช่น สยามสแควร์ ซอย 3 แขวงปทุมวัน เขตปทุมวัน กรุงเทพมหานคร 10330' : 'Full address...'}
            value={freeformText}
            onChange={(e) => handleFreeformChange(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      )}

      {/* Formatted Address Preview */}
      {(addressState.province || freeformText) && (
        <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900 dark:text-white mr-1">
              {lang === 'th' ? 'ที่อยู่ที่แสดงบนหน้าร้าน:' : 'Formatted Address:'}
            </span>
            <span>{mode === 'structured' ? formatThaiAddress(addressState) : freeformText}</span>
          </div>
        </div>
      )}
    </div>
  )
}
