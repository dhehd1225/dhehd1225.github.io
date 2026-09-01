/* ---- 매장 지식베이스 (RAG 소스) ---- */
const KB = [
  {id:'hours',   t:'영업시간',    body:'평일(월–금)은 오전 8시부터 밤 10시까지, 주말(토·일)은 오전 10시부터 밤 11시까지 영업합니다. 라스트오더는 마감 30분 전입니다.',                           keys:['영업','시간','오픈','마감','문','몇시','열','닫','라스트오더','언제']},
  {id:'parking', t:'주차',        body:'전용 주차장은 없습니다. 도보 3분 거리 서울숲공영주차장을 이용하시면 되고, 음료 2잔 이상 주문 시 1시간 주차권을 드립니다.',                         keys:['주차','파킹','차','주차권','발렛']},
  {id:'reserve', t:'예약',        body:'2층 창가석과 3층 모임공간은 예약 가능합니다. 홈페이지 예약 버튼 또는 전화(02-123-4567)로 하루 전까지 예약해 주세요. 6인 이상 단체는 예약을 권장합니다.', keys:['예약','자리','좌석','테이블','부킹','단체','모임','룸']},
  {id:'pet',     t:'반려동물',    body:'2층 테라스석에 한해 반려동물 동반이 가능합니다. 실내 좌석과 3층은 동반이 어려운 점 양해 부탁드립니다. 소형견 기준이며 목줄 착용을 부탁드려요.',       keys:['반려','강아지','개','고양이','펫','애견','동물','댕댕']},
  {id:'wifi',    t:'와이파이·작업',body:'전 좌석 무료 와이파이와 콘센트를 제공합니다. 노트북 작업 환영이며, 혼잡한 주말 오후에는 2시간 이용을 권장드립니다.',                             keys:['와이파이','wifi','인터넷','콘센트','노트북','작업','공부','충전']},
  {id:'menu',    t:'메뉴·가격',   body:'핸드드립 싱글오리진 6,500원, 플랫화이트 5,000원, 시즌 블렌드 아메리카노 4,500원, 바닐라 빈 라떼 5,800원입니다. 원두 200g은 18,000원에 판매합니다.', keys:['메뉴','가격','얼마','커피','아메리카노','라떼','원두','핸드드립','값']},
  {id:'location',t:'위치',        body:'서울 성동구 서울숲2길에 있으며, 수인분당선 서울숲역 3번 출구에서 도보 4분 거리입니다.',                                                              keys:['위치','어디','주소','길','오시는','찾아','역','출구']}
];

const GREET   = '안녕하세요. 그린빈 로스터스 성수점입니다. 궁금하신 거 편하게 물어봐 주세요.';
const SUGGEST = ['영업시간이 어떻게 돼요?', '주차 되나요?', '강아지 데려가도 되나요?', '6명 예약하고 싶어요'];
const FALLBACK = '죄송합니다, 그 부분은 제가 바로 확인이 어렵네요. 매장(02-123-4567)으로 전화 주시면 바로 도와드릴게요.';

/* 키워드 검색 (API 폴백용) */
function retrieve(q) {
  const s = q.toLowerCase();
  let best = null, score = 0;
  for (const d of KB) {
    let hit = 0;
    for (const k of d.keys) { if (s.includes(k)) hit++; }
    if (hit > score) { score = hit; best = d; }
  }
  return score > 0 ? best : null;
}

/* DOM helpers */
function nowHHMM() {
  return new Date().toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit', hour12: false});
}

function cwBodyEl()  { return document.getElementById('cwBody'); }
function cwInputEl() { return document.getElementById('cwInput'); }
function scroll()    { const b = cwBodyEl(); b.scrollTop = b.scrollHeight; }

function addMsg(cls, text) {
  const wrap = document.createElement('div');
  wrap.className = 'msg-wrap';

  const msg = document.createElement('div');
  msg.className = 'msg ' + cls;
  msg.textContent = text;

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  meta.textContent = nowHHMM();

  wrap.appendChild(msg);
  wrap.appendChild(meta);
  cwBodyEl().appendChild(wrap);
  scroll();
}

function addTyping() {
  const wrap = document.createElement('div');
  wrap.className = 'msg-wrap';

  const msg = document.createElement('div');
  msg.className = 'msg a';

  const dots = document.createElement('div');
  dots.className = 'typing-dots';
  for (let i = 0; i < 3; i++) {
    dots.appendChild(document.createElement('span'));
  }

  msg.appendChild(dots);
  wrap.appendChild(msg);
  cwBodyEl().appendChild(wrap);
  scroll();
  return wrap;
}

function addChips() {
  const wrap = document.createElement('div');
  wrap.className = 'msg-wrap';

  const msg = document.createElement('div');
  msg.className = 'msg a';

  const chips = document.createElement('div');
  chips.className = 'chat-chips';

  SUGGEST.forEach(function(x) {
    const ch = document.createElement('button');
    ch.className = 'chat-chip';
    ch.textContent = x;
    ch.addEventListener('click', function() { cwSend(x); });
    chips.appendChild(ch);
  });

  msg.appendChild(chips);
  wrap.appendChild(msg);
  cwBodyEl().appendChild(wrap);
  scroll();
}

/* panel open / close */
let started = false;
const launcher = document.getElementById('cwLaunch');
const panel    = document.getElementById('cwPanel');

function cwOpen() {
  panel.classList.add('open');
  launcher.setAttribute('aria-expanded', 'true');
  launcher.setAttribute('aria-label', '상담 챗봇 닫기');
  if (!started) {
    started = true;
    addMsg('a', GREET);
    addChips();
  }
  requestAnimationFrame(function() { cwInputEl().focus(); });
}

function cwClose() {
  panel.classList.remove('open');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.setAttribute('aria-label', '상담 챗봇 열기');
  launcher.focus();
}

launcher.addEventListener('click', function() {
  panel.classList.contains('open') ? cwClose() : cwOpen();
});
document.getElementById('cwClose').addEventListener('click', cwClose);
document.getElementById('cwSendBtn').addEventListener('click', function() { cwSend(); });
cwInputEl().addEventListener('keydown', function(e) { if (e.key === 'Enter') cwSend(); });

/* send */
async function cwSend(preset) {
  const inp = cwInputEl();
  const q   = (preset || inp.value).trim();
  if (!q) return;
  inp.value = '';
  addMsg('u', q);
  const typingEl = addTyping();

  let answered = false;
  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({q: q})
    });
    if (r.ok) {
      const d = await r.json();
      typingEl.remove();
      addMsg('a', d.answer);
      answered = true;
    }
  } catch (e) {
    // fall through to demo-mode KB lookup
  }

  if (!answered) {
    typingEl.remove();
    const hit = retrieve(q);
    addMsg('a', hit ? hit.body : FALLBACK);
  }
}
