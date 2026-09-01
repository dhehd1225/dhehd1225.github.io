# RAG CS 챗봇 (임베드형 데모)

업체 문서를 근거로만 답하는 홈페이지 임베드 상담봇. 문서 밖 질문은 지어내지 않고 "정보 없음"으로 안내(환각 방지).

- `index.html` — 가상 카페 랜딩 + 우하단 챗봇 위젯
- `admin.html` — 관리자 콘솔(색인 상태 · 답변 로그)
- `api/chat.js` — Vercel 서버리스: 문서 검색 + Claude 응답

## 실행
```
# 데모모드(키 없이, 내장 지식베이스로 답변) — 스크린샷용
python3 -m http.server 8080        # → http://localhost:8080

# 실제 Claude 연결 (배포/로컬)
export ANTHROPIC_API_KEY=sk-...     # 저장소에 커밋 금지
vercel dev                          # 또는 Vercel 배포 시 환경변수 등록
```

프론트는 `/api/chat` 호출에 실패하면 자동으로 데모모드로 폴백하므로, 키 없이도 화면은 완전히 동작합니다.
