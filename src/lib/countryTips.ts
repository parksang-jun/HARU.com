// 나라별 여행 꿀팁 — 콘센트·전압, 팁 문화, 결제, 교통카드, 수돗물, 긴급 전화.
// 언어와 무관한 사실만 표로 두고 문장은 i18n 틀(tips.*)로 만든다. 모르는 항목은 비워 둔다(추측하지 않는다).
// 출처 대조 전 자료다 — 여행데이터팀(루틴 F)이 공식 자료와 대조한다 (ops/agent/state/data-checks.csv).

export type Tipping = 'none' | 'service' | 'optional' | 'expected'
export type Pay = 'card' | 'cash' | 'mobile'

export interface CountryFacts {
  /** 콘센트 모양 (IEC 유형 문자) */
  plugs: string[]
  volt: number
  tipping?: Tipping
  pay?: Pay
  /** 대표 교통카드·교통 앱 이름 (현지 표기) */
  transit?: string
  /** 수돗물을 그대로 마셔도 되는지 */
  tapWater?: boolean
  /** 긴급 전화: 경찰 / 구급 (같으면 하나만) */
  police?: string
  ambulance?: string
}

const f = (plugs: string, volt: number, rest: Omit<CountryFacts, 'plugs' | 'volt'> = {}): CountryFacts => ({ plugs: plugs.split(''), volt, ...rest })

export const COUNTRY_FACTS: Record<string, CountryFacts> = {
  KR: f('CF', 220, { tipping: 'none', pay: 'card', transit: 'T-money', tapWater: true, police: '112', ambulance: '119' }),
  JP: f('AB', 100, { tipping: 'none', pay: 'cash', transit: 'Suica · ICOCA', tapWater: true, police: '110', ambulance: '119' }),
  TW: f('AB', 110, { tipping: 'service', pay: 'cash', transit: 'EasyCard (悠遊卡)', tapWater: false, police: '110', ambulance: '119' }),
  CN: f('ACI', 220, { tipping: 'none', pay: 'mobile', tapWater: false, police: '110', ambulance: '120' }),
  HK: f('G', 220, { tipping: 'service', pay: 'card', transit: 'Octopus (八達通)', police: '999', ambulance: '999' }),
  MO: f('G', 220, { tipping: 'service', police: '999', ambulance: '999' }),
  TH: f('ABC', 220, { tipping: 'optional', pay: 'cash', transit: 'Rabbit Card (BTS)', tapWater: false, police: '191', ambulance: '1669' }),
  VN: f('AC', 220, { tipping: 'optional', pay: 'cash', transit: 'Grab', tapWater: false, police: '113', ambulance: '115' }),
  SG: f('G', 230, { tipping: 'service', pay: 'card', transit: 'EZ-Link · SimplyGo', tapWater: true, police: '999', ambulance: '995' }),
  MY: f('G', 240, { tipping: 'service', pay: 'card', transit: 'Touch ’n Go', police: '999', ambulance: '999' }),
  ID: f('CF', 230, { tipping: 'optional', pay: 'cash', tapWater: false }),
  PH: f('ABC', 220, { tipping: 'optional', pay: 'cash', tapWater: false, police: '911', ambulance: '911' }),
  KH: f('ACG', 230, { tipping: 'optional', pay: 'cash', tapWater: false }),
  LA: f('ABC', 230, { tipping: 'optional', pay: 'cash', tapWater: false }),
  US: f('AB', 120, { tipping: 'expected', pay: 'card', tapWater: true, police: '911', ambulance: '911' }),
  GU: f('AB', 110, { tipping: 'expected', pay: 'card', police: '911', ambulance: '911' }),
  MP: f('AB', 115, { tipping: 'expected', pay: 'card', police: '911', ambulance: '911' }),
  CA: f('AB', 120, { tipping: 'expected', pay: 'card', tapWater: true, police: '911', ambulance: '911' }),
  MX: f('AB', 127, { tipping: 'expected', pay: 'cash', tapWater: false, police: '911', ambulance: '911' }),
  GB: f('G', 230, { tipping: 'service', pay: 'card', transit: 'Oyster · contactless', tapWater: true, police: '999', ambulance: '999' }),
  FR: f('CE', 230, { tipping: 'service', pay: 'card', transit: 'Navigo', tapWater: true, police: '112', ambulance: '112' }),
  DE: f('CF', 230, { tipping: 'optional', pay: 'cash', tapWater: true, police: '112', ambulance: '112' }),
  IT: f('CFL', 230, { tipping: 'service', pay: 'card', tapWater: true, police: '112', ambulance: '112' }),
  ES: f('CF', 230, { tipping: 'optional', pay: 'card', tapWater: true, police: '112', ambulance: '112' }),
  PT: f('CF', 230, { tipping: 'optional', pay: 'card', tapWater: true, police: '112', ambulance: '112' }),
  NL: f('CF', 230, { tipping: 'optional', pay: 'card', tapWater: true, police: '112', ambulance: '112' }),
  AT: f('CF', 230, { tipping: 'optional', pay: 'card', tapWater: true, police: '112', ambulance: '112' }),
  CH: f('CJ', 230, { tipping: 'service', pay: 'card', tapWater: true, police: '112', ambulance: '112' }),
  CZ: f('CE', 230, { tipping: 'optional', pay: 'card', tapWater: true, police: '112', ambulance: '112' }),
  HU: f('CF', 230, { tipping: 'optional', pay: 'card', tapWater: true, police: '112', ambulance: '112' }),
  HR: f('CF', 230, { tipping: 'optional', pay: 'card', tapWater: true, police: '112', ambulance: '112' }),
  GR: f('CF', 230, { tipping: 'optional', pay: 'card', police: '112', ambulance: '112' }),
  FI: f('CF', 230, { tipping: 'none', pay: 'card', tapWater: true, police: '112', ambulance: '112' }),
  IS: f('CF', 230, { tipping: 'none', pay: 'card', tapWater: true, police: '112', ambulance: '112' }),
  TR: f('CF', 220, { tipping: 'optional', pay: 'card', tapWater: false, police: '112', ambulance: '112' }),
  AE: f('G', 220, { tipping: 'optional', pay: 'card', police: '999', ambulance: '998' }),
  EG: f('CF', 220, { tipping: 'expected', pay: 'cash', tapWater: false }),
  AU: f('I', 230, { tipping: 'none', pay: 'card', tapWater: true, police: '000', ambulance: '000' }),
  NZ: f('I', 230, { tipping: 'none', pay: 'card', tapWater: true, police: '111', ambulance: '111' }),
  MV: f('G', 230, { tipping: 'service', pay: 'card', tapWater: false }),
  MN: f('CE', 220, { tipping: 'optional', pay: 'cash', tapWater: false }),
  NP: f('CDM', 230, { tipping: 'optional', pay: 'cash', tapWater: false }),
}

export const factsFor = (country: string): CountryFacts | undefined => COUNTRY_FACTS[country]

/** 내 나라 플러그를 그대로 꽂을 수 있는지. 모르면 undefined.
 *  C형(둥근 2핀)은 E·F 콘센트에 맞고, A형(납작 2핀)은 B 콘센트에 맞는다 */
export function plugCompatible(home: string, dest: string): boolean | undefined {
  const h = COUNTRY_FACTS[home]
  const d = COUNTRY_FACTS[dest]
  if (!h || !d) return undefined
  const fits = (plug: string, socket: string) => plug === socket || (plug === 'C' && (socket === 'E' || socket === 'F')) || (plug === 'A' && socket === 'B') || (plug === 'F' && socket === 'E') || (plug === 'E' && socket === 'F')
  return h.plugs.some((p) => d.plugs.some((s) => fits(p, s)))
}

/** 전압대가 다른지 (100~127V ↔ 220~240V). 모르면 undefined */
export function voltageDiffers(home: string, dest: string): boolean | undefined {
  const h = COUNTRY_FACTS[home]
  const d = COUNTRY_FACTS[dest]
  if (!h || !d) return undefined
  return h.volt < 150 !== d.volt < 150
}
