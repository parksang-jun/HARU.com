// 여행 회화 — 현지에서 화면을 보여 주며 쓰는 기본 문장 13개. 나라별 주 사용 언어로 보여 준다.
// 준비되지 않은 언어권은 영어로 대신한다 (화면에 그렇게 표시).

export const PHRASE_KEYS = ['hello', 'thanks', 'sorry', 'yes', 'no', 'howMuch', 'toilet', 'thisOne', 'bill', 'help', 'english', 'water', 'station'] as const
export type PhraseKey = (typeof PHRASE_KEYS)[number]
export type PhraseLang = 'ja' | 'zh-Hant' | 'zh-Hans' | 'th' | 'vi' | 'en' | 'fr' | 'es' | 'it' | 'de' | 'ko'

const list = (...v: string[]): Record<PhraseKey, string> => Object.fromEntries(PHRASE_KEYS.map((k, i) => [k, v[i]])) as Record<PhraseKey, string>

export const PHRASES: Record<PhraseLang, Record<PhraseKey, string>> = {
  ja: list('こんにちは', 'ありがとうございます', 'すみません', 'はい', 'いいえ', 'いくらですか？', 'トイレはどこですか？', 'これをください', 'お会計をお願いします', '助けてください', '英語を話せますか？', 'お水をください', '駅はどこですか？'),
  'zh-Hant': list('你好', '謝謝', '不好意思', '是', '不是', '多少錢？', '洗手間在哪裡？', '我要這個', '請幫我結帳', '請幫幫我', '你會說英文嗎？', '請給我水', '車站在哪裡？'),
  'zh-Hans': list('你好', '谢谢', '不好意思', '是', '不是', '多少钱？', '洗手间在哪里？', '我要这个', '请帮我结账', '请帮帮我', '你会说英语吗？', '请给我水', '车站在哪里？'),
  th: list('สวัสดี', 'ขอบคุณ', 'ขอโทษ', 'ใช่', 'ไม่ใช่', 'ราคาเท่าไหร่', 'ห้องน้ำอยู่ที่ไหน', 'เอาอันนี้', 'เช็คบิลด้วย', 'ช่วยด้วย', 'พูดภาษาอังกฤษได้ไหม', 'ขอน้ำเปล่า', 'สถานีอยู่ที่ไหน'),
  vi: list('Xin chào', 'Cảm ơn', 'Xin lỗi', 'Vâng', 'Không', 'Bao nhiêu tiền?', 'Nhà vệ sinh ở đâu?', 'Cho tôi cái này', 'Tính tiền giúp tôi', 'Giúp tôi với', 'Bạn nói tiếng Anh được không?', 'Cho tôi xin nước', 'Nhà ga ở đâu?'),
  en: list('Hello', 'Thank you', 'Excuse me', 'Yes', 'No', 'How much is this?', 'Where is the restroom?', 'I’ll take this one, please', 'The check, please', 'Please help me', 'Could you speak slowly, please?', 'Water, please', 'Where is the station?'),
  fr: list('Bonjour', 'Merci', 'Excusez-moi', 'Oui', 'Non', 'C’est combien ?', 'Où sont les toilettes ?', 'Je voudrais ceci, s’il vous plaît', 'L’addition, s’il vous plaît', 'Aidez-moi, s’il vous plaît', 'Parlez-vous anglais ?', 'De l’eau, s’il vous plaît', 'Où est la gare ?'),
  es: list('Hola', 'Gracias', 'Disculpe', 'Sí', 'No', '¿Cuánto cuesta?', '¿Dónde está el baño?', 'Quiero esto, por favor', 'La cuenta, por favor', 'Ayúdeme, por favor', '¿Habla inglés?', 'Agua, por favor', '¿Dónde está la estación?'),
  it: list('Buongiorno', 'Grazie', 'Mi scusi', 'Sì', 'No', 'Quanto costa?', 'Dov’è il bagno?', 'Vorrei questo, per favore', 'Il conto, per favore', 'Mi aiuti, per favore', 'Parla inglese?', 'Dell’acqua, per favore', 'Dov’è la stazione?'),
  de: list('Guten Tag', 'Danke', 'Entschuldigung', 'Ja', 'Nein', 'Wie viel kostet das?', 'Wo ist die Toilette?', 'Ich hätte gern das hier, bitte', 'Die Rechnung, bitte', 'Bitte helfen Sie mir', 'Sprechen Sie Englisch?', 'Wasser, bitte', 'Wo ist der Bahnhof?'),
  ko: list('안녕하세요', '감사합니다', '죄송합니다', '네', '아니요', '얼마예요?', '화장실이 어디예요?', '이거 주세요', '계산해 주세요', '도와주세요', '영어 할 수 있어요?', '물 주세요', '역이 어디예요?'),
}

const BY_COUNTRY: Record<string, PhraseLang> = {
  JP: 'ja', TW: 'zh-Hant', HK: 'zh-Hant', MO: 'zh-Hant', CN: 'zh-Hans', TH: 'th', VN: 'vi', KR: 'ko',
  FR: 'fr', ES: 'es', MX: 'es', IT: 'it', DE: 'de', AT: 'de', CH: 'de',
  US: 'en', GB: 'en', AU: 'en', NZ: 'en', CA: 'en', SG: 'en', PH: 'en', GU: 'en', MP: 'en',
}

/** 나라 → 회화 언어. 준비되지 않은 언어권이면 영어로 대신하고 fallback=true */
export function phraseLang(country: string): { lang: PhraseLang; fallback: boolean } {
  const lang = BY_COUNTRY[country]
  return lang ? { lang, fallback: false } : { lang: 'en', fallback: true }
}
