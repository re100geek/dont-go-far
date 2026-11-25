# OpenRouter 사용 기록 — Don't go far!

모델: `nvidia/nemotron-3-ultra-550b-a55b:free` (무료), 보조 시도 `google/gemma-4-31b-it:free`
엔드포인트: `https://openrouter.ai/api/v1/chat/completions` · 총 비용 **$0** (free 티어)

| # | 시각 | 요청 | 결과 |
| --- | --- | --- | --- |
| 1 | 20:21 | 크리처 20종 · 바이옴 5종 · 변이 3종 JSON | ✅ 9,169자 → `Config/Creatures.js` · `Biomes.js` · `Mutations.js` |
| 2 | 20:23 | 펫 12종 · 보드 24칸 JSON | ⚠️ 출력 0자 (추론 토큰이 예산 소진) |
| 3 | 20:24 | 대포 수학 모듈 (사거리·게이지·포물선) | ✅ 1,870자 → `Systems/CannonMath.js` (거의 그대로 사용) |
| 4 | 20:26 | 보드 규칙 모듈 | ⚠️ 출력 0자 (동일 원인) |
| 5 | 20:28 | 보드 규칙 모듈 (gemma 대체 시도) | ❌ HTTP 429 (무료 모델 레이트리밋) |
| 6 | 20:31 | 보드 규칙 모듈 재시도 (토큰 예산 14k) | ✅ 3,560자 → `Systems/BoardGame.js` (free egg 처리 추가) |
| 7 | 20:35 | 펫·보드 JSON 재시도 (토큰 예산 12k) | ✅ 4,069자 → `Config/Pets.js` · `BoardCells.js` |

- 요청 7회 (성공 4회 / 추론만 하고 끝난 2회 / 429 1회), 실패 3회는 모두 재시도로 해결.
- 생성물은 전부 검수 후 통합: 크리처 목록에 늑대·미믹을 추가하고, 바이옴 색·펫 수치·보드 보상은 모바일 가독성/밸런스에 맞게 조정.
- 나머지 구현(대포 연출, 야생 AI, 마당, 변이, UI, 월드 빌더)은 직접 작성·검수.
