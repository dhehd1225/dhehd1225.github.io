// Vercel serverless function — Claude 기반 한국어 마케팅 카피 생성
// 배포 시 환경변수 ANTHROPIC_API_KEY 필요. 키 없으면 501 → 프론트가 목 모드로 폴백.
// 시크릿은 저장소에 넣지 말 것(.env.local / Vercel 환경변수 사용).

const TYPE_INSTRUCTIONS = {
  product: '상품 상세설명 — 제품의 특징, 소재, 사용법, 구매 이유를 구체적으로 서술하는 마케팅 문구. 800자 내외.',
  blog: '블로그 글 — 제목(한 줄) + 본문 3~4개 단락. 정보성·공감형으로 읽기 쉽게. 600자 내외.',
  ad: '광고 카피 — 핵심 메시지를 짧고 강렬하게. 서로 다른 스타일의 카피 3가지를 번호 없이 "---" 구분선으로 분리해서 제시. 각 50자 내외.',
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(501).json({ error: 'no api key (demo mode)' }); return; }

  let body = {};
  try { body = req.body || (typeof req.body === 'string' ? JSON.parse(req.body) : {}); } catch (e) {}

  const type  = String(body.type  || '').slice(0, 20).trim();
  const topic = String(body.topic || '').slice(0, 200).trim();
  const keywords = String(body.keywords || '').slice(0, 200).trim();
  const tone  = String(body.tone  || '').slice(0, 50).trim();

  if (!type || !topic) { res.status(400).json({ error: '유형과 주제를 입력해 주세요.' }); return; }

  const instruction = TYPE_INSTRUCTIONS[type] || TYPE_INSTRUCTIONS.product;
  const prompt =
    `아래 정보를 바탕으로 한국어 마케팅 콘텐츠를 작성해 줘. 자연스럽고 실제 브랜드가 쓸 법한 문체로. AI 느낌 나는 진부한 표현("오늘 소개할", "알아보겠습니다") 금지.\n\n` +
    `[콘텐츠 유형] ${instruction}\n` +
    `[상품·주제] ${topic}\n` +
    `[핵심 키워드] ${keywords || '없음'}\n` +
    `[톤] ${tone || '친근한'}\n\n` +
    `콘텐츠만 출력하고 설명이나 메타 텍스트는 붙이지 마.`;

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
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!r.ok) { res.status(502).json({ error: 'upstream ' + r.status }); return; }
    const data = await r.json();
    const raw = (data.content && data.content[0] && data.content[0].text) || '';
    if (!raw) { res.status(500).json({ error: '결과가 비어 있습니다.' }); return; }

    // ad-copy: 구분선으로 분리해 배열로
    if (type === 'ad') {
      const variants = raw.split(/\n---\n/).map(s => s.trim()).filter(Boolean);
      res.status(200).json({ type, variants });
    } else {
      res.status(200).json({ type, result: raw.trim() });
    }
  } catch (e) {
    res.status(500).json({ error: 'server error' });
  }
};
