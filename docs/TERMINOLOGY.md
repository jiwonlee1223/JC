# Journey Creator 용어 정리

## 개요

Journey Creator는 사용자 여정 지도(User Journey Map)를 자동으로 생성하는 도구입니다.
시나리오 텍스트를 입력하면, AI가 핵심 요소를 추출하여 시공간 그리드 위에 시각화합니다.

---

## 핵심 개념

### 1. User (행위자)

시나리오에 등장하는 모든 행위자를 의미합니다.

| 속성 | 설명 | 예시 |
|------|------|------|
| `id` | 고유 식별자 | `user-0` |
| `name` | 행위자 이름 | "작업자 A", "AGV-01" |
| `type` | 유형 | `human`, `robot`, `system`, `other` |
| `color` | 고유 색상 (시각적 구분) | `#3b82f6` |
| `description` | 역할 설명 | "조립 라인 담당 작업자" |

**User Type:**
- `human`: 사람 (작업자, 관리자, 고객 등)
- `robot`: 로봇/기계 (AGV, 웨어러블 로봇 등)
- `system`: 시스템/소프트웨어 (MES, ERP 등)
- `other`: 기타

---

### 2. Phase (시간축)

시간 흐름에 따른 경험 단계입니다. **X축**을 구성합니다.

| 속성 | 설명 | 예시 |
|------|------|------|
| `id` | 고유 식별자 | `phase-0` |
| `name` | 단계 이름 | "준비", "작업", "점검" |
| `order` | 순서 (0부터 시작) | 0, 1, 2, ... |
| `duration` | 예상 소요 시간 | "10분", "1시간" |

```
Phase0      Phase1      Phase2      Phase3
준비    →   작업    →   점검    →   완료
(10분)      (2시간)     (30분)      (10분)
```

---

### 3. Context (공간축)

행위가 일어나는 물리적 공간/환경입니다. **Y축**을 구성합니다.

| 속성 | 설명 | 예시 |
|------|------|------|
| `id` | 고유 식별자 | `context-0` |
| `name` | 공간 이름 | "조립 라인", "자재 창고" |
| `description` | 환경 설명 | "메인 생산 라인" |
| `order` | 세로축 순서 (0부터) | 0, 1, 2, ... |

```
         Phase0    Phase1    Phase2
            ↓        ↓        ↓
Context0  ┌────────────────────────┐  조립 라인
          │                        │
Context1  ├────────────────────────┤  자재 창고
          │                        │
Context2  └────────────────────────┘  충전소
```

---

### 4. Node (노드)

**User의 특정 시점 상태**를 나타냅니다. 그래프의 **정점(Vertex)**입니다.

| 속성 | 설명 | 예시 |
|------|------|------|
| `id` | 고유 식별자 | `node-0` |
| `userId` | 어떤 User인지 | `user-0` |
| `phaseId` | 어느 Phase에 | `phase-1` |
| `contextId` | 어느 Context에 | `context-0` |
| `action` | 수행하는 행동 | "부품을 조립한다" |
| `emotion` | 감정 상태 | `positive`, `neutral`, `negative` |
| `emotionScore` | 감정 점수 (-1 ~ 1) | 0.7 |
| `painPoint` | 불편 사항 | "부품 대기 시간이 길다" |
| `opportunity` | 개선 기회 | "실시간 재고 알림 도입" |
| `position` | 화면 좌표 | `{ x: 300, y: 200 }` |

**시각적 표현:**
```
┌─────────────────────┐
│ 👤 작업자 A    😊   │
├─────────────────────┤
│ 부품을 조립한다     │
│                     │
│ ⚠️ 부품 대기 시간   │
│ 💡 재고 알림 도입   │
├─────────────────────┤
│ positive ████████░░ │
└─────────────────────┘
```

---

### 5. Connector (커넥터)

**Node 간 이동/전환**을 나타냅니다. 그래프의 **간선**입니다.
같은 User의 연속적인 Node들을 연결하여 **동선(Line)**을 형성합니다.

| 속성 | 설명 | 예시 |
|------|------|------|
| `id` | 고유 식별자 | `connector-0` |
| `fromNodeId` | 시작 Node | `node-0` |
| `toNodeId` | 도착 Node | `node-1` |
| `description` | 이동/전환 설명 | "부품 수령을 위해 창고로 이동" |

**시각적 표현:**
```
[Node0: 조립 라인]  ─────────────────→  [Node1: 자재 창고]
                    "부품 수령을 위해
                     창고로 이동"
```

**중요:** Connector는 같은 User의 Node들만 연결합니다.
```
작업자 A: [N0] ──→ [N1] ──→ [N2]     ← 작업자 A의 동선
AGV-01:        [N3] ──→ [N4]         ← AGV의 동선
```

---

### 6. Intersection (접점)

**여러 User가 만나는 지점**입니다. 협업, 핸드오프, 상호작용이 일어납니다.

| 속성 | 설명 | 예시 |
|------|------|------|
| `id` | 고유 식별자 | `intersection-0` |
| `phaseId` | 어느 Phase에서 | `phase-2` |
| `contextId` | 어느 Context에서 | `context-1` |
| `nodeIds` | 만나는 Node들의 ID | `["node-1", "node-4"]` |
| `description` | 상호작용 설명 | "AGV가 작업자에게 부품 전달" |

**시각적 표현 (원형 배치):**
```
          [작업자●]
             ↖
      [AGV■] ← ⭕ → [관리자◆]
              접점
             ↙
          [시스템▲]
```

---

### 7. Journey (여정)

모든 요소를 포함하는 **전체 데이터 구조**입니다.

| 속성 | 설명 |
|------|------|
| `id` | 고유 식별자 |
| `title` | 여정 제목 |
| `description` | 설명 |
| `scenario` | 원본 시나리오 텍스트 |
| `users` | User 배열 |
| `phases` | Phase 배열 |
| `contexts` | Context 배열 |
| `nodes` | Node 배열 |
| `connectors` | Connector 배열 |
| `intersections` | Intersection 배열 |
| `createdAt` | 생성 시간 |
| `updatedAt` | 수정 시간 |

---

## 시각적 구조

### 전체 레이아웃

```
              Phase0      Phase1      Phase2      Phase3
              (준비)      (작업)      (점검)      (완료)
                ↓          ↓          ↓          ↓
           ┌─────────────────────────────────────────────┐
Context0   │ [작업자●]────→[작업자●]         [작업자●]   │  조립 라인
(조립 라인) │                  ↘              ↗         │
           ├─────────────────────────────────────────────┤
Context1   │        [AGV■]──→ ⭕ ──→[AGV■]──→           │  자재 창고
(자재 창고) │                 접점                       │
           ├─────────────────────────────────────────────┤
Context2   │                        [AGV■]              │  충전소
(충전소)    │                                            │
           └─────────────────────────────────────────────┘
```

### 범례

| 기호 | 의미 |
|------|------|
| `●` `■` `◆` | 각 User (색상으로 구분) |
| `──→` | Connector (동선, User 색상과 동일) |
| `⭕` | Intersection (접점) |

---

## 데이터 흐름

```
1. 사용자가 시나리오 텍스트 입력
          ↓
2. GPT가 요소 추출 (Users, Phases, Contexts, Nodes, Connectors, Intersections)
          ↓
3. 백엔드에서 ID 할당 및 위치 계산
          ↓
4. 프론트엔드에서 React Flow로 시각화
          ↓
5. 사용자가 노드 드래그, 연결 편집 가능
```

---

## 관련 파일

| 파일 | 설명 |
|------|------|
| `backend/src/types/journey.ts` | 백엔드 타입 정의 |
| `frontend/src/types/journey.ts` | 프론트엔드 타입 정의 |
| `backend/src/services/openai.ts` | GPT 프롬프트 및 스키마 |
| `frontend/src/components/JourneyMap.tsx` | 시각화 컴포넌트 |
| `frontend/src/components/nodes/UserNode.tsx` | Node UI 컴포넌트 |
