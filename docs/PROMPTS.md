# Journey Creator - 프롬프트 문서

이 문서는 Journey Creator 앱에서 사용되는 LLM 프롬프트를 정리한 것입니다.

## 개요

| 항목 | 값 |
|------|-----|
| **모델** | GPT-5.2 |
| **API** | OpenAI Responses API |
| **응답 형식** | JSON Schema (Structured Output) |

---

## 시스템 프롬프트

### 기본 프롬프트 (일반 요청)

**파일 위치**: `api/lib/openai.ts`

```
당신은 사용자 여정 지도(User Journey Map) 전문가입니다.
시나리오 텍스트를 분석하여 다음 요소들을 추출해주세요:

1. **users**: 행위자 (name, type: human/robot/system/other, description)
2. **phases**: 시간 단계 (name, order, duration)
3. **contexts**: 공간/환경 (name, description, order)
4. **nodes**: 각 User의 특정 시점 상태 (userName, phaseName, contextName, action, emotion, emotionScore, painPoint, opportunity)
5. **edges**: Node 간 이동 (fromNodeIndex, toNodeIndex, description)
6. **intersections**: 여러 User가 만나는 접점 (phaseName, contextName, userNames, description)

JSON 형식으로 응답해주세요.
```

### 스트리밍 프롬프트

**파일 위치**: `api/lib/openai-stream.ts`

```
당신은 사용자 여정 지도(User Journey Map) 전문가입니다.
시나리오 텍스트를 분석하여 다음 요소들을 **순서대로** 추출해주세요:

1. **users**: 행위자 (name, type, description)
2. **phases**: 시간 단계 (name, order, duration)
3. **contexts**: 공간/환경 (name, description, order)
4. **nodes**: 각 User의 특정 시점 상태
5. **edges**: Node 간 이동
6. **intersections**: 여러 User가 만나는 접점

JSON 형식으로 응답해주세요.
```

> **참고**: 스트리밍 프롬프트에는 "순서대로"라는 지시가 추가되어 있습니다. 이는 점진적 파싱(Incremental Parsing)을 위해 JSON 키가 일정한 순서로 출력되도록 유도하기 위함입니다.

---

## 사용자 메시지 템플릿

```
다음 시나리오를 분석하여 사용자 여정 지도 요소를 추출해주세요:

{사용자가 입력한 시나리오 텍스트}
```

---

## JSON Schema (Structured Output)

GPT에게 정확한 JSON 형식으로 응답하도록 강제하는 스키마입니다.

### 전체 스키마

```json
{
  "type": "object",
  "properties": {
    "users": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "type": { "type": "string", "enum": ["human", "robot", "system", "other"] },
          "description": { "type": "string" }
        },
        "required": ["name", "type", "description"]
      }
    },
    "phases": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "order": { "type": "number" },
          "duration": { "type": "string" }
        },
        "required": ["name", "order", "duration"]
      }
    },
    "contexts": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "description": { "type": "string" },
          "order": { "type": "number" }
        },
        "required": ["name", "description", "order"]
      }
    },
    "nodes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "userName": { "type": "string" },
          "phaseName": { "type": "string" },
          "contextName": { "type": "string" },
          "action": { "type": "string" },
          "emotion": { "type": "string", "enum": ["positive", "neutral", "negative"] },
          "emotionScore": { "type": "number" },
          "painPoint": { "type": "string" },
          "opportunity": { "type": "string" }
        },
        "required": ["userName", "phaseName", "contextName", "action", "emotion", "emotionScore", "painPoint", "opportunity"]
      }
    },
    "edges": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "fromNodeIndex": { "type": "number" },
          "toNodeIndex": { "type": "number" },
          "description": { "type": "string" }
        },
        "required": ["fromNodeIndex", "toNodeIndex", "description"]
      }
    },
    "intersections": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "phaseName": { "type": "string" },
          "contextName": { "type": "string" },
          "userNames": { "type": "array", "items": { "type": "string" } },
          "description": { "type": "string" }
        },
        "required": ["phaseName", "contextName", "userNames", "description"]
      }
    }
  },
  "required": ["users", "phases", "contexts", "nodes", "edges", "intersections"]
}
```

---

## 추출 요소 설명

### 1. Users (행위자)

시나리오에 등장하는 모든 행위자를 추출합니다.

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `name` | string | 행위자 이름 | "작업자 A", "AGV-01" |
| `type` | enum | 행위자 유형 | human, robot, system, other |
| `description` | string | 역할 설명 | "조립 라인 담당 작업자" |

### 2. Phases (시간 단계)

시간 흐름에 따른 경험 단계 (X축)

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `name` | string | 단계 이름 | "출근", "작업", "휴식" |
| `order` | number | 순서 (0부터) | 0, 1, 2 |
| `duration` | string | 예상 소요 시간 | "30분", "2시간" |

### 3. Contexts (공간/환경)

행위가 일어나는 물리적 공간 (Y축)

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `name` | string | 공간 이름 | "로커룸", "조립 라인" |
| `description` | string | 환경 설명 | "작업자 휴게 공간" |
| `order` | number | 배치 순서 | 0, 1, 2 |

### 4. Nodes (노드)

각 User의 특정 시점 상태 (그래프의 정점)

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `userName` | string | 행위자 이름 | "작업자 A" |
| `phaseName` | string | 단계 이름 | "작업" |
| `contextName` | string | 공간 이름 | "조립 라인" |
| `action` | string | 수행 행동 | "부품 조립" |
| `emotion` | enum | 감정 상태 | positive, neutral, negative |
| `emotionScore` | number | 감정 점수 (-1 ~ 1) | 0.5, -0.3 |
| `painPoint` | string | 불편 사항 | "무거운 부품" |
| `opportunity` | string | 개선 기회 | "보조 장치 도입" |

### 5. Edges (엣지)

Node 간 이동/전환 (그래프의 간선)

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `fromNodeIndex` | number | 시작 노드 인덱스 | 0 |
| `toNodeIndex` | number | 도착 노드 인덱스 | 1 |
| `description` | string | 이동 설명 | "작업 완료 후 이동" |

### 6. Intersections (접점)

여러 User가 만나는 지점

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `phaseName` | string | 단계 이름 | "자재 요청" |
| `contextName` | string | 공간 이름 | "조립 라인" |
| `userNames` | string[] | 만나는 행위자들 | ["작업자", "AGV"] |
| `description` | string | 상호작용 설명 | "자재 전달" |

---

## 스트리밍 + 점진적 파싱

### 동작 방식

1. GPT가 JSON을 스트리밍으로 생성
2. 서버에서 텍스트를 누적하며 점진적으로 파싱
3. 각 배열(`users`, `phases` 등)이 완성되면 즉시 클라이언트에 전송
4. 클라이언트에서 실시간 진행 상황 표시

### 점진적 파싱 알고리즘

```typescript
// 대괄호 depth 추적으로 배열 완료 감지
for (let i = arrayStartIdx; i < accumulatedText.length; i++) {
  if (accumulatedText[i] === '[') depth++;
  else if (accumulatedText[i] === ']') {
    depth--;
    if (depth === 0) {
      arrayEndIdx = i;
      break;
    }
  }
}
```

### 순서

```
users → phases → contexts → nodes → edges → intersections → complete
```

---

## 입력 예시

```
작업자가 출근하여 로커룸에서 웨어러블 로봇 슈트를 착용합니다.
슈트 상태를 태블릿으로 점검하고, 배터리와 센서가 정상인지 확인합니다.
생산 라인에 도착하면 MES 시스템에서 오늘의 작업 지시를 받습니다.
무거운 부품을 웨어러블 로봇의 힘 보조로 들어올려 조립 작업을 수행합니다.
```

## 출력 예시

```json
{
  "users": [
    { "name": "작업자", "type": "human", "description": "조립 라인 작업자" },
    { "name": "웨어러블 로봇 슈트", "type": "robot", "description": "힘 보조 장치" },
    { "name": "태블릿", "type": "system", "description": "점검 및 확인용 디바이스" },
    { "name": "MES 시스템", "type": "system", "description": "작업 지시 시스템" }
  ],
  "phases": [
    { "name": "출근 및 착용", "order": 0, "duration": "15분" },
    { "name": "상태 점검", "order": 1, "duration": "5분" },
    { "name": "작업 지시", "order": 2, "duration": "5분" },
    { "name": "조립 작업", "order": 3, "duration": "2시간" }
  ],
  ...
}
```
