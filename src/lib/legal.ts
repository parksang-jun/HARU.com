// 법적 고지 본문 — en 기본, ko 제공. ja/zh-TW 는 en 으로 폴백. 출시 전 변호사 검토 권장(TODO)
export type LegalDoc = 'privacy' | 'terms' | 'ai'

type Section = { h: string; p: string[] }

const EFFECTIVE = '2027-01-01' // TODO: 실제 시행일로 변경

export const LEGAL: Record<LegalDoc, { en: Section[]; ko: Section[] }> = {
  privacy: {
    en: [
      { h: `Effective ${EFFECTIVE}`, p: ['Haru Korea ("we") provides AI trip planning, flight and hotel search for domestic and international trips. This policy explains what we collect and why.'] },
      {
        h: 'What we collect',
        p: [
          'Trip inputs you enter (cities, dates, interests, notes) and the itineraries and chat messages generated for you.',
          'An anonymous account identifier created on your device; no name or email is required.',
          'Usage events needed to operate the service: affiliate link clicks (partner, time) and sponsored-listing impressions and clicks.',
          'If you enable it, approximate location to show deals near you. Location is used on-device and is not stored.',
          'Advertising identifiers may be processed by Google AdMob only if you consent (see Consent).',
        ],
      },
      {
        h: 'How we use it',
        p: [
          'To generate and store your itineraries and answer your questions. Prompts are sent to our AI provider (Anthropic) via our server; they are not used to train models under our agreement.',
          'To measure and pay out affiliate and sponsored-listing performance.',
          'To enforce fair-use limits and prevent abuse.',
        ],
      },
      { h: 'Sharing', p: ['Supabase (database and authentication), Anthropic (AI generation), Google AdMob (ads, where enabled), and affiliate partners you choose to visit by tapping a link.'] },
      { h: 'Retention and deletion', p: ['Trips are kept until you delete them in the app. You can request full deletion of your anonymous account by contacting us.'] },
      { h: 'Consent and your choices', p: ['In the EEA/UK we ask for consent before personalized ads (Google UMP). On iOS we ask for App Tracking Transparency permission. You can decline; the app still works.'] },
      { h: 'Children', p: ['The service is intended for adults and travelers aged 14 and over. We do not knowingly collect data from children.'] },
      { h: 'Contact', p: ['TODO: operator name, address and contact email.'] },
    ],
    ko: [
      { h: `시행일 ${EFFECTIVE}`, p: ['Haru Korea(이하 "서비스")는 국내·해외 여행자에게 AI 여행 일정과 항공권·호텔 검색을 제공합니다. 본 방침은 수집 항목과 목적을 설명합니다.'] },
      {
        h: '수집 항목',
        p: [
          '입력한 여행 정보(도시, 날짜, 관심사, 메모)와 생성된 일정·대화 내용.',
          '기기에서 생성되는 익명 계정 식별자(이름·이메일 불필요).',
          '서비스 운영에 필요한 이용 기록: 제휴 링크 클릭(파트너, 시각), 광고(스폰서) 게재물의 노출·클릭.',
          '사용자가 허용한 경우 근처 혜택 표시를 위한 대략적 위치(기기 내 사용, 저장하지 않음).',
          '동의한 경우에 한해 Google AdMob 이 광고 식별자를 처리할 수 있습니다.',
        ],
      },
      {
        h: '이용 목적',
        p: ['일정 생성·보관과 질문 답변(프롬프트는 당사 서버를 거쳐 AI 제공사 Anthropic 에 전달되며, 계약상 모델 학습에 사용되지 않습니다).', '제휴·광고 성과 측정과 정산.', '공정 이용 한도 적용과 악용 방지.'],
      },
      { h: '제3자 제공·처리위탁', p: ['Supabase(DB·인증), Anthropic(AI 생성), Google AdMob(광고, 활성화 시), 사용자가 링크를 눌러 방문하는 제휴 파트너.'] },
      { h: '보유·파기', p: ['여행 데이터는 앱에서 삭제할 때까지 보관합니다. 익명 계정 전체 삭제는 문의로 요청할 수 있습니다.'] },
      { h: '동의와 선택권', p: ['EEA/영국에서는 맞춤 광고 전 동의(Google UMP)를 받습니다. iOS 에서는 앱 추적 투명성 권한을 요청하며 거부해도 앱은 정상 동작합니다.'] },
      { h: '아동', p: ['본 서비스는 성인 및 14세 이상 여행자를 대상으로 하며 아동 정보를 고의로 수집하지 않습니다.'] },
      { h: '문의', p: ['TODO: 운영자명, 주소, 문의 이메일.'] },
    ],
  },
  terms: {
    en: [
      { h: `Effective ${EFFECTIVE}`, p: ['By using Haru Korea you agree to these terms.'] },
      { h: 'Service', p: ['We provide AI-generated itineraries and travel information. Content may be inaccurate or outdated; verify opening hours, prices and availability before relying on it.'] },
      { h: 'Bookings and affiliate links', p: ['Bookings are made with third-party partners under their terms. We may earn a commission when you book through links in the app, at no extra cost to you.'] },
      { h: 'Sponsored listings', p: ['Deals marked "Sponsored" are paid placements from local businesses. Offers are provided by the business, which is responsible for honoring them.'] },
      { h: 'Fair use', p: ['AI generation is limited per day to keep the service available for everyone.'] },
      { h: 'Liability', p: ['To the extent permitted by law, we are not liable for losses arising from reliance on generated content or third-party services.'] },
      { h: 'Governing law', p: ['Republic of Korea. TODO: operator details.'] },
    ],
    ko: [
      { h: `시행일 ${EFFECTIVE}`, p: ['Haru Korea 를 이용하면 본 약관에 동의하는 것으로 봅니다.'] },
      { h: '서비스', p: ['AI 가 생성한 일정과 여행 정보를 제공합니다. 내용은 부정확하거나 오래되었을 수 있으므로 영업시간·가격·예약 가능 여부를 직접 확인하세요.'] },
      { h: '예약과 제휴 링크', p: ['예약은 제3자 파트너의 약관에 따라 이루어집니다. 앱 내 링크로 예약 시 당사가 수수료를 받을 수 있으며 이용자에게 추가 비용은 없습니다.'] },
      { h: '광고 게재물', p: ['"광고"로 표시된 혜택은 지역 사업자의 유료 게재물입니다. 혜택 이행 책임은 해당 사업자에게 있습니다.'] },
      { h: '공정 이용', p: ['서비스 안정을 위해 AI 생성 횟수를 하루 단위로 제한합니다.'] },
      { h: '책임 제한', p: ['법이 허용하는 범위에서 생성 콘텐츠나 제3자 서비스에 의존하여 발생한 손해에 대해 책임지지 않습니다.'] },
      { h: '준거법', p: ['대한민국 법. TODO: 사업자 정보.'] },
    ],
  },
  ai: {
    en: [
      { h: 'AI-generated content', p: ['Itineraries and concierge answers in this app are generated by an artificial-intelligence system (large language model). This notice is provided under the Korean AI Basic Act and Article 50 of the EU AI Act.'] },
      { h: 'Limits', p: ['The AI may produce mistakes, outdated facts or places that have closed. It does not have live availability or pricing. Always confirm with the venue or booking partner.'] },
      { h: 'No profiling', p: ['We do not use AI to make decisions with legal or similarly significant effects on you.'] },
      { h: 'Your data', p: ['Your trip inputs are sent to the AI provider only to produce your results. See the privacy policy.'] },
    ],
    ko: [
      { h: 'AI 생성 콘텐츠 안내', p: ['이 앱의 일정과 컨시어지 답변은 인공지능(대규모 언어모델)으로 생성됩니다. 본 고지는 「인공지능 발전과 신뢰 기반 조성 등에 관한 기본법」 및 EU AI Act 제50조에 따른 것입니다.'] },
      { h: '한계', p: ['AI 는 오류, 오래된 정보, 폐업한 장소를 제시할 수 있으며 실시간 예약 가능 여부나 가격을 알지 못합니다. 반드시 업체나 예약 파트너에 확인하세요.'] },
      { h: '프로파일링 없음', p: ['법적 효력이나 이에 준하는 중대한 영향을 주는 결정을 AI 로 내리지 않습니다.'] },
      { h: '데이터', p: ['여행 입력 정보는 결과 생성을 위해서만 AI 제공사에 전달됩니다. 개인정보 처리방침을 참고하세요.'] },
    ],
  },
}
