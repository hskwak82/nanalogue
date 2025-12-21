// Daily inspirational quotes that change each day
// Uses day of year to select a quote, ensuring same quote shows all day

const quotes = [
  { text: '오늘 하루도 감사하며 시작해보세요.', author: null },
  { text: '작은 것에서 행복을 찾는 하루 되세요.', author: null },
  { text: '당신의 이야기는 소중합니다.', author: null },
  { text: '지금 이 순간에 집중해보세요.', author: null },
  { text: '매일 조금씩 성장하는 나를 응원해요.', author: null },
  { text: '오늘의 나에게 칭찬 한마디 해주세요.', author: null },
  { text: '좋은 하루를 만드는 건 나 자신입니다.', author: null },
  { text: '작은 습관이 큰 변화를 만듭니다.', author: null },
  { text: '오늘 하루, 나답게 살아보세요.', author: null },
  { text: '지금 느끼는 감정을 소중히 여겨주세요.', author: null },
  { text: '내일의 나를 위한 오늘을 보내세요.', author: null },
  { text: '잠시 멈추고 깊은 숨을 쉬어보세요.', author: null },
  { text: '당신은 충분히 잘하고 있어요.', author: null },
  { text: '오늘 하루도 의미 있게 보내세요.', author: null },
  { text: '작은 기쁨들을 모아 큰 행복을 만들어요.', author: null },
  { text: '나를 위한 시간을 가져보세요.', author: null },
  { text: '오늘의 감정을 글로 표현해보세요.', author: null },
  { text: '매 순간이 새로운 시작입니다.', author: null },
  { text: '당신의 하루가 빛나길 바랍니다.', author: null },
  { text: '오늘도 한 걸음 더 나아가보세요.', author: null },
  { text: '지금 이 순간을 즐겨보세요.', author: null },
  { text: '나 자신을 믿어주세요.', author: null },
  { text: '오늘의 작은 노력이 내일의 큰 결실이 됩니다.', author: null },
  { text: '당신의 존재 자체가 특별합니다.', author: null },
  { text: '오늘 하루, 스스로에게 친절하세요.', author: null },
  { text: '변화는 작은 시작에서 옵니다.', author: null },
  { text: '지금 할 수 있는 것에 집중하세요.', author: null },
  { text: '나의 속도로 걸어가도 괜찮아요.', author: null },
  { text: '오늘의 나에게 감사해보세요.', author: null },
  { text: '행복은 먼 곳이 아닌 지금 여기에 있어요.', author: null },
  { text: '당신의 이야기를 들려주세요.', author: null },
  // Famous quotes with authors
  { text: '삶이 있는 한 희망은 있다.', author: '키케로' },
  { text: '오늘 할 수 있는 일에 최선을 다하라.', author: '링컨' },
  { text: '행복은 습관이다. 그것을 몸에 지녀라.', author: '허버드' },
  { text: '인생은 가까이서 보면 비극이지만, 멀리서 보면 희극이다.', author: '채플린' },
  { text: '가장 큰 영광은 한 번도 실패하지 않음이 아니라, 실패할 때마다 다시 일어서는 데에 있다.', author: '공자' },
  { text: '네가 할 수 있다고 믿든, 할 수 없다고 믿든, 네 믿음은 옳다.', author: '헨리 포드' },
  { text: '천 리 길도 한 걸음부터.', author: '노자' },
  { text: '시작이 반이다.', author: '아리스토텔레스' },
  { text: '오늘 심은 씨앗이 내일의 꽃이 된다.', author: null },
  { text: '매일매일이 새로운 기회입니다.', author: null },
  { text: '나를 변화시킬 수 있는 사람은 나뿐이다.', author: null },
  { text: '작은 진전도 진전이다.', author: null },
  { text: '포기하지 않는 한 실패는 없다.', author: null },
  { text: '오늘의 노력이 미래의 나를 만든다.', author: null },
  { text: '긍정적인 생각이 긍정적인 하루를 만든다.', author: null },
  { text: '나 자신을 사랑하는 것부터 시작하세요.', author: null },
  { text: '과거는 바꿀 수 없지만, 미래는 만들 수 있다.', author: null },
  { text: '작은 변화가 큰 차이를 만든다.', author: null },
  { text: '오늘 하루도 소중한 선물입니다.', author: null },
  { text: '꿈을 향해 한 걸음씩 나아가세요.', author: null },
  { text: '나의 가능성을 믿어보세요.', author: null },
  { text: '지금 이 순간이 가장 좋은 때입니다.', author: null },
  { text: '어제보다 나은 오늘을 만들어보세요.', author: null },
  { text: '당신은 생각보다 강합니다.', author: null },
  { text: '희망을 잃지 마세요.', author: null },
  { text: '오늘의 고난이 내일의 힘이 됩니다.', author: null },
  { text: '나만의 빛으로 세상을 밝혀주세요.', author: null },
  { text: '매 순간 최선을 다하는 것이 성공입니다.', author: null },
  { text: '당신의 미소가 누군가의 하루를 밝힐 수 있어요.', author: null },
  { text: '인생은 짧으니, 행복하게 살아요.', author: null },
  { text: '오늘도 좋은 일이 일어날 거예요.', author: null },
  { text: '나 자신과의 약속을 지켜보세요.', author: null },
  { text: '작은 성취에도 스스로를 축하해주세요.', author: null },
]

// Get day of year (1-365/366)
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}

export interface DailyQuote {
  text: string
  author: string | null
}

export function getDailyQuote(date?: Date): DailyQuote {
  const targetDate = date || new Date()
  const dayOfYear = getDayOfYear(targetDate)
  const index = dayOfYear % quotes.length
  return quotes[index]
}
