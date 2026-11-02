// 목업 컨시어지 답변 — 키워드 기반 고정 응답 (데모 모드)
const ANSWERS: { keys: string[]; answer: string }[] = [
  {
    keys: ['t-money', 'tmoney', 't money', 'card', 'transport', 'subway', 'bus', 'metro'],
    answer:
      'Get a T-money card at any convenience store (about 3,000–4,000 KRW) and top it up with cash. It works on subways, buses and most taxis nationwide. Tap in and tap out on buses; transfers within 30 minutes are discounted.',
  },
  {
    keys: ['taxi', 'kakao', 'uber'],
    answer:
      'Use the Kakao T app (English available) or Uber, which dispatches Kakao taxis. Regular taxis start around 4,800 KRW in Seoul. Show the address in Korean to the driver; tipping is not expected.',
  },
  {
    keys: ['eat', 'food', 'order', 'restaurant', 'menu', 'vegetarian'],
    answer:
      'Try bibimbap, galbi, samgyeopsal, tteokbokki and a market bindaetteok. Say “juseyo” (please give) after a dish name. Many places have picture menus; for vegetarian, ask “gogi ppaego juseyo” (without meat).',
  },
  {
    keys: ['phrase', 'korean', 'say', 'thank', 'hello'],
    answer:
      'Useful phrases: Annyeonghaseyo (hello), Gamsahamnida (thank you), Igeo juseyo (this one, please), Eolmayeyo? (how much?), Hwajangsil eodiyeyo? (where is the restroom?).',
  },
  {
    keys: ['tip', 'etiquette', 'manner', 'rude'],
    answer:
      'Tipping is not customary. Remove shoes when entering homes and some restaurants, use two hands when giving or receiving items, and keep voices low on public transport.',
  },
  {
    keys: ['wifi', 'sim', 'esim', 'internet'],
    answer:
      'Buy an eSIM before arrival or a SIM at the airport. Free Wi-Fi is common in cafés and subways. Naver Map and Kakao Map work better than Google Maps for directions.',
  },
  {
    keys: ['flight', 'airfare', 'plane', 'ticket', '항공', '비행기', '航空', '機票'],
    answer:
      'Open the Book tab → Flights. Pick your airports and dates, compare fares, then book on the partner site (Trip.com, Skyscanner, Aviasales). Mid-week departures and booking 1–3 months ahead are usually cheaper; check whether checked baggage is included on low-cost carriers.',
  },
  {
    keys: ['hotel', 'stay', 'accommodation', 'where to stay', '호텔', '숙소', 'ホテル', '飯店'],
    answer:
      'Open the Book tab → Hotels, or tap "Hotels in …" at the top of your itinerary: dates and guests are filled in for each city. Staying near a main station or airport rail line saves time; filter by free cancellation if your plans may change.',
  },
  {
    keys: ['visa', 'passport', 'entry', 'esta', 'immigration', '비자', '여권', 'ビザ', '簽證'],
    answer:
      'Entry rules depend on your passport and change often. Check the destination government’s official site or your embassy before booking (for example, the US requires an approved ESTA for visa-waiver travelers). Keep at least six months of passport validity to be safe.',
  },
  {
    keys: ['currency', 'exchange', 'cash', 'money', 'atm', '환전', '현금', '両替', '換錢'],
    answer:
      'A no-foreign-fee card covers most cities; keep a little local cash for markets, street food and small taxis. Withdraw from bank ATMs rather than airport exchange counters, and pay in the local currency when a card terminal offers a choice.',
  },
]

export function mockChatAnswer(question: string): string {
  const q = question.toLowerCase()
  const hit = ANSWERS.find((a) => a.keys.some((k) => q.includes(k)))
  if (hit) return hit.answer
  return 'Good question. In demo mode I can answer about flights, hotels, visas, money, transport (T-money, taxis), food, phrases, etiquette and connectivity. Connect Supabase and an API key to enable the full concierge for any destination.'
}
