// 샘플(목업) 모드의 점심·저녁 후보 — 실제 식당 자료가 없으므로 "그 나라 대표 메뉴"를 후보로 내고 지도 검색으로 연결한다.
// 실서비스에서는 AI 가 그날 동선 근처의 실제 식당을 고른다 (Edge Function generate-itinerary).
import type { DayMeals, LocalizedName, MealOption, Stop } from '../itinerary'

interface Dish {
  name: LocalizedName
  /** 설명 (ko / en / ja / zh) */
  desc: [string, string, string, string]
  cost: number
  veg?: boolean
  /** 지도 검색어 (현지에서 통하는 이름) */
  q: string
}

const d = (ko: string, en: string, ja: string, zh: string, desc: [string, string, string, string], cost: number, q: string, veg = false): Dish => ({ name: { ko, en, ja, zh }, desc, cost, q, veg })

/** 나라별 대표 메뉴: 앞 3개 점심, 뒤 3개 저녁 (비용은 현지 통화 1인 대략값) */
const DISHES: Record<string, Dish[]> = {
  KR: [
    d('칼국수', 'Kalguksu (knife-cut noodles)', 'カルグクス', '刀削麵', ['뜨끈한 손칼국수 한 그릇', 'A warm bowl of hand-cut noodle soup', '温かい手打ち麺のスープ', '熱騰騰的手工刀削湯麵'], 10000, '칼국수'),
    d('비빔밥', 'Bibimbap', 'ビビンバ', '拌飯', ['나물을 듬뿍 올린 비빔밥', 'Rice topped with seasoned vegetables', 'ナムルたっぷりのビビンバ', '鋪滿野菜的拌飯'], 11000, '비빔밥', true),
    d('시장 먹거리', 'Market street food', '市場グルメ', '市場小吃', ['시장에서 여러 가지를 조금씩', 'Graze through a traditional market', '市場で少しずつ食べ歩き', '在傳統市場邊走邊吃'], 12000, '전통시장 맛집'),
    d('고기구이', 'Korean BBQ', '韓国焼肉', '韓式烤肉', ['숯불에 굽는 삼겹살·갈비', 'Pork belly or ribs grilled at the table', '炭火で焼くサムギョプサルやカルビ', '炭火燒烤五花肉或排骨'], 22000, '고기집'),
    d('한정식', 'Korean set meal (hanjeongsik)', '韓定食', '韓定食', ['반찬이 한 상 가득한 정식', 'A full table of small Korean dishes', 'おかずが並ぶ韓国の定食', '擺滿小菜的韓式套餐'], 30000, '한정식', true),
    d('치킨과 맥주', 'Fried chicken & beer', 'チキンとビール', '炸雞配啤酒', ['바삭한 치킨에 시원한 맥주', 'Crispy fried chicken with cold beer', 'サクサクのチキンと冷たいビール', '酥脆炸雞配冰啤酒'], 18000, '치킨'),
  ],
  JP: [
    d('라멘', 'Ramen', 'ラーメン', '拉麵', ['진한 국물의 라멘 한 그릇', 'A rich bowl of ramen', '濃厚スープの一杯', '一碗濃郁湯頭的拉麵'], 1100, 'ラーメン'),
    d('우동·소바', 'Udon or soba', 'うどん・そば', '烏龍麵·蕎麥麵', ['가볍게 먹는 면 요리', 'A light noodle lunch', '軽めの麺ランチ', '清爽的麵食午餐'], 900, 'うどん', true),
    d('돈카츠 정식', 'Tonkatsu set', 'とんかつ定食', '炸豬排定食', ['바삭한 돈카츠와 밥·된장국', 'Crispy pork cutlet with rice and miso soup', 'サクサクのとんかつ定食', '酥脆豬排配飯與味噌湯'], 1600, 'とんかつ'),
    d('스시', 'Sushi', '寿司', '壽司', ['카운터에서 먹는 스시', 'Sushi at the counter', 'カウンターで味わう寿司', '坐在吧台享用壽司'], 4500, '寿司'),
    d('이자카야', 'Izakaya', '居酒屋', '居酒屋', ['여러 안주를 나눠 먹는 선술집', 'Small plates to share at a Japanese pub', 'いろいろつまめる居酒屋', '可以點多樣小菜的居酒屋'], 3500, '居酒屋'),
    d('야키니쿠', 'Yakiniku (grilled beef)', '焼肉', '燒肉', ['숯불에 굽는 일본식 고기구이', 'Japanese-style grilled beef', '炭火で焼く焼肉', '炭火燒烤的日式燒肉'], 5000, '焼肉'),
  ],
  TW: [
    d('우육면', 'Beef noodle soup', '牛肉麺', '牛肉麵', ['진한 국물의 우육면', 'Braised beef noodle soup', '濃厚スープの牛肉麺', '湯頭濃郁的牛肉麵'], 220, '牛肉麵'),
    d('샤오룽바오', 'Xiaolongbao', '小籠包', '小籠包', ['육즙 가득한 딤섬', 'Soup dumplings', '肉汁たっぷりの小籠包', '湯汁滿滿的小籠包'], 350, '小籠包'),
    d('루러우판', 'Braised pork rice', '魯肉飯', '滷肉飯', ['간단하게 먹는 덮밥', 'A quick bowl of braised pork rice', '手軽な豚肉ごはん', '簡單的滷肉飯'], 80, '滷肉飯'),
    d('야시장', 'Night market', '夜市', '夜市', ['야시장에서 이것저것 맛보기', 'Graze through a night market', '夜市で食べ歩き', '逛夜市吃小吃'], 400, '夜市'),
    d('훠궈', 'Hot pot', '火鍋', '火鍋', ['여럿이 둘러앉아 먹는 훠궈', 'Hot pot to share', 'みんなで囲む火鍋', '大家一起吃的火鍋'], 700, '火鍋', true),
    d('대만식 가정 요리', 'Taiwanese home-style dishes', '台湾家庭料理', '台菜', ['여러 접시를 나눠 먹는 대만 요리', 'Shared Taiwanese plates', '取り分けて食べる台湾料理', '多道合菜的台菜餐廳'], 600, '台菜餐廳'),
  ],
  TH: [
    d('팟타이', 'Pad thai', 'パッタイ', '泰式炒河粉', ['새콤달콤한 볶음 쌀국수', 'Sweet-and-sour stir-fried rice noodles', '甘酸っぱい炒め麺', '酸甜的炒河粉'], 120, 'pad thai', true),
    d('카오만까이', 'Khao man gai (chicken rice)', 'カオマンガイ', '海南雞飯', ['부드러운 닭고기 덮밥', 'Poached chicken on rice', 'やわらかい鶏ごはん', '軟嫩的雞肉飯'], 80, 'khao man gai'),
    d('쌀국수', 'Boat noodles', 'ボートヌードル', '船麵', ['진한 국물의 태국 쌀국수', 'Thai noodle soup with a rich broth', '濃厚スープのタイ麺', '湯頭濃郁的泰式湯麵'], 90, 'boat noodles'),
    d('똠얌꿍과 해산물', 'Tom yum & seafood', 'トムヤムクンとシーフード', '冬蔭功與海鮮', ['매콤새콤한 국물과 해산물', 'Hot-and-sour soup with seafood', '辛酸っぱいスープと海鮮', '酸辣湯配海鮮'], 450, 'tom yum seafood restaurant'),
    d('루프톱 다이닝', 'Rooftop dining', 'ルーフトップダイニング', '高空餐廳', ['야경을 보며 먹는 저녁', 'Dinner with a skyline view', '夜景を眺めながらディナー', '邊看夜景邊用餐'], 1500, 'rooftop restaurant'),
    d('야시장 먹거리', 'Night market food', 'ナイトマーケット', '夜市小吃', ['야시장에서 꼬치·과일·디저트', 'Skewers, fruit and desserts at a night market', '串焼きやフルーツ、デザート', '串燒、水果和甜點'], 250, 'night market'),
  ],
  VN: [
    d('쌀국수(포)', 'Pho', 'フォー', '河粉', ['맑은 국물의 쌀국수', 'Rice noodle soup with a clear broth', 'あっさりスープのフォー', '清湯河粉'], 60000, 'phở'),
    d('반미', 'Banh mi', 'バインミー', '越式法國麵包', ['바삭한 바게트 샌드위치', 'A crisp baguette sandwich', 'サクサクのバゲットサンド', '酥脆的法國麵包三明治'], 35000, 'bánh mì'),
    d('분짜', 'Bun cha', 'ブンチャー', '烤肉米線', ['숯불 고기와 쌀국수', 'Grilled pork with rice noodles', '炭火焼き豚と米麺', '炭烤豬肉配米線'], 70000, 'bún chả'),
    d('해산물 식당', 'Seafood restaurant', 'シーフードレストラン', '海鮮餐廳', ['그날 잡은 해산물 요리', 'The day’s catch, cooked to order', 'その日の魚介を料理', '現撈海鮮料理'], 350000, 'nhà hàng hải sản'),
    d('반쎄오', 'Banh xeo', 'バインセオ', '越式煎餅', ['바삭한 베트남식 부침개', 'Crispy Vietnamese pancakes', 'パリパリのベトナム風お好み焼き', '酥脆的越式煎餅'], 90000, 'bánh xèo'),
    d('채식 베트남 요리', 'Vegetarian Vietnamese', 'ベジタリアンベトナム料理', '越南素食', ['두부와 채소로 만든 현지 요리', 'Local dishes with tofu and vegetables', '豆腐と野菜の現地料理', '豆腐與蔬菜的在地料理'], 120000, 'quán chay', true),
  ],
}

/** 그 밖의 나라: 종류로 추천 */
const FALLBACK: Dish[] = [
  d('현지 인기 식당', 'Popular local restaurant', '地元で人気の食堂', '在地人氣餐廳', ['현지인이 줄 서는 대표 메뉴', 'The dish locals queue for', '地元の人が並ぶ名物', '在地人排隊的招牌菜'], 0, 'best local restaurant'),
  d('시장·길거리 음식', 'Market or street food', '市場・屋台グルメ', '市場·街頭小吃', ['시장에서 가볍게 여러 가지', 'A light graze through a food market', '市場で軽く食べ歩き', '在市場輕鬆吃幾樣'], 0, 'food market'),
  d('채식 가능한 카페', 'Vegetarian-friendly café', 'ベジ対応カフェ', '蔬食友善咖啡廳', ['샐러드·샌드위치로 가벼운 한 끼', 'Salads and sandwiches', 'サラダやサンドイッチ', '沙拉與三明治'], 0, 'vegetarian cafe', true),
  d('전통 요리 레스토랑', 'Traditional cuisine restaurant', '郷土料理レストラン', '傳統料理餐廳', ['그 지역 전통 요리 코스', 'A sit-down meal of regional classics', '郷土料理をゆっくり', '坐下來享用地方傳統菜'], 0, 'traditional restaurant'),
  d('전망 좋은 레스토랑', 'Restaurant with a view', '眺めのいいレストラン', '景觀餐廳', ['야경이나 강변을 보며 저녁', 'Dinner with a skyline or waterfront view', '夜景や水辺を眺めてディナー', '邊看夜景或水岸邊用餐'], 0, 'restaurant with a view'),
  d('캐주얼 다이닝', 'Casual dining', 'カジュアルダイニング', '休閒餐廳', ['숙소 근처에서 편하게', 'Something easy near your hotel', '宿の近くで気軽に', '在住宿附近輕鬆用餐'], 0, 'casual restaurant'),
]

const langIdx = (locale: string) => (locale === 'ko' ? 0 : locale === 'ja' ? 2 : locale === 'zh-TW' ? 3 : 1)

export interface MockMealCtx {
  country: string
  /** 지도 검색에 붙일 도시 이름 (영문) */
  cityEn: string
  currency: string
  locale: string
  vegetarian: boolean
  /** 며칠째인지 (후보를 날마다 돌려 가며 낸다) */
  dayIdx: number
}

/** 그날 일정에 맞춘 점심·저녁 후보 (끼니당 3곳, 채식 요청이면 채식 가능한 메뉴를 앞에) */
export function mockMeals(stops: Pick<Stop, 'area'>[], ctx: MockMealCtx): DayMeals {
  const dishes = DISHES[ctx.country] ?? FALLBACK
  const half = Math.floor(dishes.length / 2)
  const li = langIdx(ctx.locale)
  const midArea = stops[Math.min(2, stops.length - 1)]?.area ?? ''
  const lastArea = stops[stops.length - 1]?.area ?? midArea
  const build = (list: Dish[], area: string): MealOption[] => {
    const rotated = list.map((_, i) => list[(i + ctx.dayIdx) % list.length])
    const ordered = ctx.vegetarian ? [...rotated.filter((x) => x.veg), ...rotated.filter((x) => !x.veg)] : rotated
    return ordered.map((x) => {
      const m: MealOption = { name: x.name, desc: x.desc[li], area, query: `${x.q} ${area || ctx.cityEn}`.trim(), reserve: { provider: ctx.country === 'KR' ? 'naver' : 'google', query: `${x.q} ${area || ctx.cityEn}`.trim() } }
      if (x.cost > 0) {
        m.estCost = x.cost
        m.currency = ctx.currency
      }
      return m
    })
  }
  return { lunch: build(dishes.slice(0, half), midArea), dinner: build(dishes.slice(half), lastArea) }
}
