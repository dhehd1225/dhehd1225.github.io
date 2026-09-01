// Vercel serverless function — 실제 Claude 기반 RAG 응답
// 배포 시 환경변수 ANTHROPIC_API_KEY 필요. 키 없으면 501 → 프론트가 데모모드로 폴백.
// 시크릿은 저장소에 넣지 말 것(.env.local / Vercel 환경변수 사용).

const KB = [
  { t: '영업시간', body: '평일(월–금) 08:00–22:00, 주말(토·일) 10:00–23:00. 라스트오더는 마감 30분 전.', keys: ['영업','시간','오픈','마감','문','몇시','열','닫','라스트오더','언제'] },
  { t: '주차', body: '전용 주차장 없음. 도보 3분 서울숲공영주차장 이용. 음료 2잔 이상 주문 시 1시간 주차권 제공.', keys: ['주차','파킹','차','주차권','발렛'] },
  { t: '예약', body: '2층 창가석·3층 모임공간 예약 가능. 홈페이지 예약 또는 전화(02-123-4567)로 하루 전까지. 6인 이상 단체 권장.', keys: ['예약','자리','좌석','테이블','부킹','단체','모임','룸'] },
  { t: '반려동물', body: '2층 테라스석에 한해 반려동물 동반 가능(소형견·목줄 착용). 실내·3층은 불가.', keys: ['반려','강아지','개','고양이','펫','애견','동물','댕댕'] },
  { t: '와이파이·작업', body: '전 좌석 무료 와이파이·콘센트. 노트북 작업 환영, 주말 오후 혼잡 시 2시간 이용 권장.', keys: ['와이파이','wifi','인터넷','콘센트','노트북','작업','공부','충전'] },
  { t: '메뉴·가격', body: '핸드드립 6,500원, 플랫화이트 5,000원, 아메리카노 4,500원, 바닐라 빈 라떼 5,800원, 원두 200g 18,000원.', keys: ['메뉴','가격','얼마','커피','아메리카노','라떼','원두','핸드드립','값'] },
  { t: '위치', body: '서울 성동구 서울숲2길. 수인분당선 서울숲역 3번 출구 도보 4분.', keys: ['위치','어디','주소','길','오시는','찾아','역','출구'] },
];

// 아주 가벼운 검색: 키워드 매칭으로 top-k 소스 선택 (데모 규모에 충분)
function retrieve(q, k = 2) {
  const s = String(q).toLowerCase();
  return KB
    .map(d => ({ d, score: d.keys.reduce((n, key) => n + (s.includes(key) ? 1 : 0), 0) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(x => x.d);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(501).json({ error: 'no api key (demo mode)' }); return; }

  let q = '';
  try { q = (req.body && req.body.q) || JSON.parse(req.body || '{}').q || ''; } catch (e) {}
  q = String(q).slice(0, 500).trim();
  if (!q) { res.status(400).json({ error: 'empty' }); return; }

  const hits = retrieve(q);
  const context = hits.length
    ? hits.map(h => `[${h.t}] ${h.body}`).join('\n')
    : '(관련 매장 정보 없음)';

  const system =
    '너는 카페 "그린빈 로스터스"의 고객 상담원이다. 아래 <매장정보>에 있는 내용만 근거로 정중하게 답하라. ' +
    '정보에 없는 질문은 지어내지 말고 "등록된 매장 정보에 없어 안내가 어렵다"고 답하라. 2~3문장 이내, 한국어.\n' +
    `<매장정보>\n${context}\n</매장정보>`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system,
        messages: [{ role: 'user', content: q }],
      }),
    });
    if (!r.ok) { res.status(502).json({ error: 'upstream ' + r.status }); return; }
    const data = await r.json();
    const answer = (data.content && data.content[0] && data.content[0].text) || '답변을 생성하지 못했습니다.';
    res.status(200).json({ answer, source: hits.length ? '매장정보 › ' + hits.map(h => h.t).join(', ') : null });
  } catch (e) {
    res.status(500).json({ error: 'server error' });
  }
};
