'use client'

import { useState, useEffect } from 'react'
import { MapPin, Check, Sparkles, Zap } from 'lucide-react'
import {
  getProvinces,
  getDistricts,
  getSubdistricts,
  getZipcode,
  lookupByZipcode,
  formatThaiAddress,
  parseThaiAddress,
  type ThaiAddress,
  type ZipcodeLocation
} from '@/lib/thai-geo'
import { CustomDropdown } from '@/components/CustomDropdown'

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
  const [zipcodeMatches, setZipcodeMatches] = useState<ZipcodeLocation[]>([])

  const provinces = getProvinces()
  const districts = addressState.province ? getDistricts(addressState.province) : []

  // If we have matching subdistricts from zipcode, we can highlight them
  const rawSubdistricts = addressState.province && addressState.district
    ? getSubdistricts(addressState.province, addressState.district)
    : []

  // Filter subdistricts by zipcode if a 5-digit zipcode is present
  const subdistricts = addressState.zipcode?.length === 5 && zipcodeMatches.length > 0
    ? rawSubdistricts.filter(s => s.zipcode === addressState.zipcode)
    : rawSubdistricts

  // When initialAddress changes externally, parse it
  useEffect(() => {
    if (initialAddress) {
      setFreeformText(initialAddress)
      const parsed = parseThaiAddress(initialAddress)
      if (parsed.province) {
        setAddressState(parsed)
      }
    }
  }, [initialAddress])

  // Handle Zipcode Typing & Reverse Auto-Lookup
  function handleZipcodeChange(zip: string) {
    const cleanZip = zip.replace(/\D/g, '').slice(0, 5)

    let nextState: ThaiAddress = {
      ...addressState,
      zipcode: cleanZip,
    }

    if (cleanZip.length === 5) {
      const matches = lookupByZipcode(cleanZip)
      setZipcodeMatches(matches)

      if (matches.length > 0) {
        const first = matches[0]

        // Check if all matches belong to the same province
        const allSameProvince = matches.every(m => m.province === first.province)
        const allSameDistrict = matches.every(m => m.district === first.district)

        nextState = {
          ...nextState,
          province: allSameProvince ? first.province : nextState.province,
          district: allSameDistrict ? first.district : nextState.district,
          subdistrict: matches.length === 1 ? first.subdistrict : (
            matches.some(m => m.subdistrict === nextState.subdistrict) ? nextState.subdistrict : ''
          ),
        }
      }
    } else {
      setZipcodeMatches([])
    }

    setAddressState(nextState)
    const formatted = formatThaiAddress(nextState)
    setFreeformText(formatted)
    onChange(formatted, nextState)
  }

  function handleSelectZipcodeMatch(match: ZipcodeLocation) {
    const nextState: ThaiAddress = {
      ...addressState,
      province: match.province,
      district: match.district,
      subdistrict: match.subdistrict,
      zipcode: match.zipcode,
    }
    setAddressState(nextState)
    const formatted = formatThaiAddress(nextState)
    setFreeformText(formatted)
    onChange(formatted, nextState)
  }

  function handleProvinceChange(p: string) {
    const nextState: ThaiAddress = {
      ...addressState,
      province: p,
      district: '',
      subdistrict: '',
      zipcode: '',
    }
    setZipcodeMatches([])
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
    setZipcodeMatches([])
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

  function handleFreeformChange(text: string) {
    setFreeformText(text)
    const parsed = parseThaiAddress(text)
    onChange(text, parsed)
  }

  const isBKK = addressState.province === 'กรุงเทพมหานคร'

  return (
    <div className="space-y-3 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
      {/* Header with Mode Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
          <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>{lang === 'th' ? 'เลือกที่อยู่ / พิกัดสาขา' : 'Select Branch Location & Address'}</span>
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px]">
          <button
            type="button"
            onClick={() => setMode('structured')}
            className={`px-2 py-0.5 rounded-md font-semibold transition ${mode === 'structured'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
          >
            {lang === 'th' ? 'เลือกตามลำดับ' : 'Structured'}
          </button>
          <button
            type="button"
            onClick={() => setMode('freeform')}
            className={`px-2 py-0.5 rounded-md font-semibold transition ${mode === 'freeform'
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
          {/* Quick Zipcode Search / Auto-fill Helper Banner */}
          <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-xl space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{lang === 'th' ? 'กรอกรหัสไปรษณีย์เพื่อค้นหาอัตโนมัติ (Zipcode Auto-Fill):' : 'Enter 5-digit Zipcode to auto-fill:'}</span>
              </label>

              <div className="w-full sm:w-44">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={5}
                  placeholder="เช่น 10330, 50200"
                  value={addressState.zipcode}
                  onChange={(e) => handleZipcodeChange(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono font-bold tracking-wider placeholder:font-normal focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                />
              </div>
            </div>

            {/* If 5-digit zipcode entered, show quick matched subdistrict pill suggestions */}
            {zipcodeMatches.length > 0 && (
              <div className="pt-2 border-t border-indigo-100/80 dark:border-indigo-900/40">
                <div className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 mb-1.5 flex items-center gap-1">
                  <span>⚡ {lang === 'th' ? `พบ ${zipcodeMatches.length} พื้นที่สำหรับรหัส ${addressState.zipcode} (แตะเพื่อเลือก):` : `Found ${zipcodeMatches.length} locations:`}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {zipcodeMatches.map((m, idx) => {
                    const isSelected = addressState.subdistrict === m.subdistrict && addressState.district === m.district
                    const prefixSub = m.province === 'กรุงเทพมหานคร' ? 'แขวง' : 'ต.'
                    const prefixDist = m.province === 'กรุงเทพมหานคร' ? 'เขต' : 'อ.'
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectZipcodeMatch(m)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition active:scale-95 flex items-center gap-1 border ${isSelected
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs font-bold'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-indigo-200/80 dark:border-indigo-800/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                          }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{prefixSub}{m.subdistrict} ({prefixDist}{m.district}, {m.province})</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

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

          {/* 3 Cascading Modern Dropdowns: Province -> District -> Subdistrict */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Province */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                {lang === 'th' ? 'จังหวัด' : 'Province'}
              </label>
              <CustomDropdown
                value={addressState.province}
                onChange={handleProvinceChange}
                placeholder={lang === 'th' ? 'เลือกจังหวัด' : 'Select Province'}
                searchable={true}
                searchPlaceholder="พิมพ์ค้นหาจังหวัด..."
                dropdownWidth="w-full sm:w-60"
                className="w-full"
                options={provinces.map((p) => ({
                  value: p,
                  label: p,
                }))}
              />
            </div>

            {/* District */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                {isBKK ? (lang === 'th' ? 'เขต' : 'District (Khet)') : (lang === 'th' ? 'อำเภอ' : 'District (Amphoe)')}
              </label>
              <CustomDropdown
                value={addressState.district}
                onChange={handleDistrictChange}
                disabled={!addressState.province}
                searchable={true}
                searchPlaceholder={isBKK ? "พิมพ์ค้นหาเขต..." : "พิมพ์ค้นหาอำเภอ..."}
                placeholder={
                  addressState.province
                    ? (isBKK ? (lang === 'th' ? 'เลือกเขต' : 'Select Khet') : (lang === 'th' ? 'เลือกอำเภอ' : 'Select Amphoe'))
                    : (lang === 'th' ? 'เลือกจังหวัดก่อน' : 'Select Province First')
                }
                dropdownWidth="w-full sm:w-60"
                className="w-full"
                options={districts.map((d) => ({
                  value: d,
                  label: d,
                }))}
              />
            </div>

            {/* Subdistrict */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                {isBKK ? (lang === 'th' ? 'แขวง' : 'Subdistrict (Khwaeng)') : (lang === 'th' ? 'ตำบล' : 'Subdistrict (Tambon)')}
              </label>
              <CustomDropdown
                value={addressState.subdistrict}
                onChange={handleSubdistrictChange}
                disabled={!addressState.district}
                searchable={true}
                searchPlaceholder={isBKK ? "พิมพ์ค้นหาแขวง..." : "พิมพ์ค้นหาตำบล..."}
                placeholder={
                  addressState.district
                    ? (isBKK ? (lang === 'th' ? 'เลือกแขวง' : 'Select Khwaeng') : (lang === 'th' ? 'เลือกตำบล' : 'Select Tambon'))
                    : (lang === 'th' ? 'เลือกอำเภอ/เขตก่อน' : 'Select District First')
                }
                dropdownWidth="w-full sm:w-60"
                className="w-full"
                options={subdistricts.map((s) => ({
                  value: s.subdistrict,
                  label: s.subdistrict,
                  sublabel: s.zipcode ? `รหัส ${s.zipcode}` : undefined,
                }))}
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
