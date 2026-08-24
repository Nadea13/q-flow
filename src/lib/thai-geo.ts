import geoHierarchyData from '@/data/geo-hierarchy.json'

export interface SubdistrictItem {
  subdistrict: string
  zipcode: string
  lat?: number | null
  lng?: number | null
}

export interface ThaiAddress {
  addressDetail: string
  province: string
  district: string
  subdistrict: string
  zipcode: string
}

export interface ZipcodeLocation {
  province: string
  district: string
  subdistrict: string
  zipcode: string
}

type GeoHierarchyType = Record<
  string,
  {
    districts: Record<string, SubdistrictItem[]>
  }
>

const data = geoHierarchyData as unknown as GeoHierarchyType

// Pre-build index for instant O(1) Zipcode lookups
const zipcodeMap = new Map<string, ZipcodeLocation[]>()

for (const province of Object.keys(data)) {
  const districts = data[province].districts || {}
  for (const district of Object.keys(districts)) {
    for (const sub of districts[district]) {
      if (sub.zipcode) {
        const list = zipcodeMap.get(sub.zipcode) || []
        list.push({
          province,
          district,
          subdistrict: sub.subdistrict,
          zipcode: sub.zipcode,
        })
        zipcodeMap.set(sub.zipcode, list)
      }
    }
  }
}

/**
 * Returns all 77 Thai provinces sorted.
 */
export function getProvinces(): string[] {
  return Object.keys(data)
}

/**
 * Returns all districts for a given province.
 */
export function getDistricts(province: string): string[] {
  if (!province || !data[province]) return []
  return Object.keys(data[province].districts || {})
}

/**
 * Returns all subdistricts for a given province and district.
 */
export function getSubdistricts(province: string, district: string): SubdistrictItem[] {
  if (!province || !district || !data[province]?.districts?.[district]) return []
  return data[province].districts[district] || []
}

/**
 * Returns the zipcode for a given subdistrict, district, and province.
 */
export function getZipcode(province: string, district: string, subdistrict: string): string {
  const subs = getSubdistricts(province, district)
  const found = subs.find((s) => s.subdistrict === subdistrict)
  return found?.zipcode || ''
}

/**
 * Look up all locations (province, district, subdistrict) for a given 5-digit zipcode.
 */
export function lookupByZipcode(zipcode: string): ZipcodeLocation[] {
  const cleanZip = zipcode.trim()
  if (cleanZip.length !== 5) return []
  return zipcodeMap.get(cleanZip) || []
}

/**
 * Formats structured address fields into a standardized Thai address string.
 */
export function formatThaiAddress(addr: ThaiAddress): string {
  const parts: string[] = []
  
  if (addr.addressDetail?.trim()) {
    parts.push(addr.addressDetail.trim())
  }

  const isBKK = addr.province === 'กรุงเทพมหานคร'

  if (addr.subdistrict?.trim()) {
    parts.push(isBKK ? `แขวง${addr.subdistrict.trim()}` : `ต.${addr.subdistrict.trim()}`)
  }

  if (addr.district?.trim()) {
    parts.push(isBKK ? `เขต${addr.district.trim()}` : `อ.${addr.district.trim()}`)
  }

  if (addr.province?.trim()) {
    parts.push(isBKK ? addr.province.trim() : `จ.${addr.province.trim()}`)
  }

  if (addr.zipcode?.trim()) {
    parts.push(addr.zipcode.trim())
  }

  return parts.join(' ')
}

/**
 * Parses an existing full address string into structured parts if possible.
 */
export function parseThaiAddress(fullAddress: string): ThaiAddress {
  const result: ThaiAddress = {
    addressDetail: '',
    province: '',
    district: '',
    subdistrict: '',
    zipcode: '',
  }

  if (!fullAddress) return result

  // 1. Extract 5-digit zipcode at end
  const zipMatch = fullAddress.match(/\b\d{5}\b/)
  if (zipMatch) {
    result.zipcode = zipMatch[0]
  }

  // 2. Find province
  const provinces = getProvinces()
  let remaining = fullAddress
  for (const p of provinces) {
    if (fullAddress.includes(p)) {
      result.province = p
      remaining = remaining.replace(new RegExp(`(จ\\.|จังหวัด)?\\s*${p}`, 'g'), '')
      break
    }
  }

  // 3. Find district if province was found
  if (result.province) {
    const districts = getDistricts(result.province)
    for (const d of districts) {
      if (fullAddress.includes(d)) {
        result.district = d
        remaining = remaining.replace(new RegExp(`(อ\\.|อำเภอ|เขต)?\\s*${d}`, 'g'), '')
        break
      }
    }
  }

  // 4. Find subdistrict if district was found
  if (result.province && result.district) {
    const subs = getSubdistricts(result.province, result.district)
    for (const s of subs) {
      if (fullAddress.includes(s.subdistrict)) {
        result.subdistrict = s.subdistrict
        if (!result.zipcode && s.zipcode) {
          result.zipcode = s.zipcode
        }
        remaining = remaining.replace(new RegExp(`(ต\\.|ตำบล|แขวง)?\\s*${s.subdistrict}`, 'g'), '')
        break
      }
    }
  }

  // Remove zipcode from remaining to get addressDetail
  if (result.zipcode) {
    remaining = remaining.replace(result.zipcode, '')
  }

  result.addressDetail = remaining.replace(/\s+/g, ' ').trim()

  return result
}
