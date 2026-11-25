# 💣 Don't go far!

▶ **바로 플레이: <https://re100geek.github.io/dont-go-far/>** (모바일 권장)

대포로 크리처를 포획하는 3D 웹 게임 프로토타입 (Three.js r160, ES 모듈, 모바일 우선).
로블록스 이식을 염두에 두고 `Config / Systems / UI` 구조로 나눠 두었습니다.

---

## 1. 실행 방법

ES 모듈을 쓰기 때문에 `file://`로는 열리지 않습니다. 아무 정적 서버나 사용하세요.

```bash
cd dont-go-far
python3 -m http.server 8080
# 브라우저에서 http://localhost:8080
```

빌드 도구·의존성 설치 없음. `vendor/three.module.js`만 있으면 동작합니다.

---

## 2. 플레이 루프

| 단계 | 내용 |
| --- | --- |
| 기지 | 대포 + 마당(펫 파밍) + 보드게임판 |
| **캐릭터 발사** | 마당의 크리처를 장전 → 타이밍 게이지 → 탄착점 17m 반경 자동 포획(최대 4마리) → 귀환. 탄착지는 항상 야생 크리처로 채워지고, 멀리 쏠수록 장전한 크리처가 도망칠 확률이 생깁니다(60m부터, 최대 25%, 단 마지막 1마리는 안전). |
| **본인 발사** | 플레이어 본인을 발사 → 조이스틱으로 이동, 반경 17m 안의 크리처를 `테이밍` 버튼으로 포획. 위험도가 차오르고, 야생 크리처가 달려들어 체력을 깎습니다. |
| 위험/보상 | 기지에서 멀수록 바이옴이 바뀌고(초원→숲→사바나→화산→심연) 희귀 등급 출현 확률과 변이 확률이 올라갑니다. 위험도 100%에서 "야생의 역습", 체력 0이면 이번 탐험에서 잡은 크리처 절반을 잃고 기지로 끌려옵니다. |
| 마당 | 배치한 크리처가 초당 화약을 생산. 같은 종이라도 **노말 x1 / 골드 x2.5 / 다이아 x6** 변이가 붙어 수입이 달라집니다. 슬롯 6칸(최대 12칸, 화약으로 확장). |
| 보드게임 | 7x7 테두리 24칸. 주사위 → 화약/펫 알/버프/찬스/잭팟/위험/변이 칸. 알 칸에서 화약을 내고 펫을 뽑고, 펫은 장착(최대 3)해서 발사력·포획률·희귀 확률·이동속도·체력·위험 내성·수입을 올립니다. |
| 화약 | **단일 재화**. 대포 장약, 귀환 비용, 펫 알 구매에 모두 사용. |

### 조작 (모바일)
- 기지: 화면 드래그로 카메라 회전, 두 손가락 대신 버튼으로 모든 행동.
- 발사: 화약 슬라이더로 장약량 선택 → 초록 `MAX` 구간에서 `발사!`를 누르면 최대 비거리.
- 탐험: 좌하단 조이스틱 + 우하단 `테이밍` / `귀환`. 크리처에 노란 링이 생기면 사거리 안입니다.

---

## 3. 폴더 구조 (로블록스 1:1 대응)

```
dont-go-far/
├─ index.html                 # 화면 골격 (HUD/패널 DOM)
├─ styles/main.css            # 모바일 우선 UI (세로/가로 대응)
├─ vendor/three.module.js     # Three.js r160
└─ src/
   ├─ main.js                 # Game 부트스트랩 + 상태머신(base/aim/flight/field/board)
   ├─ Config/                 # ── ReplicatedStorage.Config (ModuleScript)
   │  ├─ GameConfig.js        #    밸런스 상수, 희귀도, 저장 키
   │  ├─ Biomes.js            #    거리 구간 5종 + 등장 가중치
   │  ├─ Creatures.js         #    크리처 20종 (희귀도/바이옴/조형 파라미터)
   │  ├─ Mutations.js         #    노말/골드/다이아 배율
   │  ├─ Pets.js              #    펫 12종 + 알 확률
   │  └─ BoardCells.js        #    24칸 보드 정의
   ├─ Systems/                # ── ServerScriptService / ServerStorage (ModuleScript)
   │  ├─ SaveSystem.js        #    DataStoreService 대응
   │  ├─ EconomySystem.js     #    화약 단일 재화 + 패시브 수입 누적
   │  ├─ YardSystem.js        #    마당 슬롯/배치/수입/판매가
   │  ├─ PetSystem.js         #    펫 보유/장착/알 뽑기/중복 처리
   │  ├─ TamingSystem.js      #    포획 확률/변이 판정/카드 생성
   │  ├─ CannonMath.js        #    사거리·게이지·비행 수학 (순수 함수)
   │  ├─ CannonSystem.js      #    게이지/발사/포물선/반동/연기
   │  ├─ BoardGame.js         #    24칸 보드 규칙 (순수 로직)
   │  ├─ BoardSystem.js       #    3D 토큰 이동 애니메이션 + 착지 처리
   │  ├─ WildSystem.js        #    야생 크리처 스트리밍 스폰/AI/포획 연출
   │  ├─ CreatureFactory.js   #    블록 조형(아키타입 8종 + 종별 디테일)
   │  ├─ WorldBuilder.js      #    하늘/섬 링/소품/기지/대포/보드판
   │  ├─ PlayerController.js  #    블록 캐릭터 + 카메라 기준 이동
   │  └─ Sfx.js               #    WebAudio 비프
   ├─ UI/                     # ── StarterGui (ScreenGui + LocalScript)
   │  ├─ UIManager.js         #    HUD/패널/시트/모달/토스트
   │  └─ Joystick.js          #    터치 조이스틱
   └─ Utils/
      └─ MergeGeometry.js     #    부위 병합 → 크리처 1 draw call
```

### Roblox 이식 매핑

| 웹 | Roblox | 비고 |
| --- | --- | --- |
| `Config/GameConfig.js` | `ReplicatedStorage.Config.GameConfig` | 숫자만 옮기면 됨 |
| `Config/Creatures.js` | `ReplicatedStorage.Config.Creatures` | 종별 조형 파라미터 유지 |
| `Systems/CannonMath.js` | `ServerScriptService.CannonMath` | 순수 함수 → Luau 그대로 |
| `Systems/BoardGame.js` | `ServerScriptService.BoardGame` | 순수 로직 → Luau 그대로 |
| `Systems/EconomySystem/YardSystem/PetSystem/TamingSystem` | 서버 ModuleScript | 권위는 서버, 클라는 표시만 |
| `Systems/SaveSystem.js` | `DataStoreService` + `ProfileStore` 패턴 | `state` 테이블 구조 그대로 저장 |
| `Systems/CreatureFactory.js` | `ModelFactory` + `ReplicatedStorage.Models` | Box/Part 조합이 1:1 |
| `Systems/WorldBuilder.js` | `Workspace.Island` (Model) | 링 지형 → Part 원판 5장 |
| `Systems/WildSystem.js` | 서버 스폰 루프 + `CollectionService` 태그 | 스트리밍 반경 동일 |
| `UI/UIManager.js` | `StarterGui.MainHud` (ScreenGui + LocalScript) | 버튼 배치·문구 그대로 |
| `main.js` | `ServerScriptService.Bootstrap` | 상태머신 이름 유지 |
| 화약 | `leaderstats.Gunpowder` | 단일 재화 |

---

## 4. 밸런스 튜닝 지점

- 사거리: `GameConfig.cannon`(기본 30 + 화약 1당 3.2m, 최대 300m)
- 게이지: `gaugeZoneStart/End`(0.80~0.95), 빗나가면 x0.55 / 근접 x0.8
- 위험도: `Biomes[].dangerPerSec` × 0.6(초당), 100에서 역습
- 변이 확률: `GameConfig.mutation` (거리 보정 포함)
- 마당 수입: `Creatures[].income × Mutations[].mult`
- 보드 보상: `BoardCells.js`의 `value` / `cost`
- 펫: `Pets.js`의 `stat` / `value`

---

## 5. 개발 노트

- 설계 데이터(크리처 20종·바이옴·변이, 펫 12종·보드 24칸)와 순수 수학/보드 모듈은 OpenRouter 무료 모델
  (`nvidia/nemotron-3-ultra-550b-a55b:free`)로 생성한 뒤 검수·수정해 통합했습니다. 호출 내역은 `OPENROUTER_LOG.md`.
- 공개 코드·화면에 개인 식별 정보 없음(예시 이름도 일반 명칭만 사용).
- 성능: 크리처를 1 draw call로 병합(`Utils/MergeGeometry.js`), 소품 90여 개도 1 draw call로 병합.
  세로 390×844 기준 draw call ~230 / 삼각형 ~15k.

### 검증 기록 (2026-11-25)

실제 Chromium(headless, SwiftShader)으로 로컬 HTTP 서버에 접속해 확인했습니다.

- 콘솔 에러 0건 (부팅·발사·탐험·보드·시트 전 구간)
- 세로 360×640 / 390×844 / 412×915, 가로 844×390 네 해상도에서 **UI 겹침 0건 · 화면 밖 요소 0건**
- 대포 발사 2모드, 타이밍 게이지 애니메이션, 자동 포획(15/30/45/60 화약에서 4/4/4/1마리), 수동 테이밍(포획·변이 판정), 위험도 상승·야생 반격, 기절/귀환, 보드 24칸 전 칸 처리, 펫 알·장착, 판매·슬롯 확장, localStorage 세이브/리로드 모두 통과
- 렌더 부하(390×844): draw call 약 230, 삼각형 약 15k

스크린샷은 저장소에 올리지 않았습니다. 로컬 검증 폴더 `screenshots/`에만 있습니다(`.gitignore`).

### 알려진 한계
- 사운드는 WebAudio 비프만 있고 BGM 없음.
- 세이브는 브라우저 `localStorage` 단일 슬롯.
- 멀티플레이·서버 권위 없음(프로토타입).
