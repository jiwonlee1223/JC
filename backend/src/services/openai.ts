import OpenAI from 'openai';
import dotenv from 'dotenv';
import type { ExtractionResult } from '../types/journey.js';

// 환경 변수 로드
dotenv.config();

// OpenAI 클라이언트 (lazy 초기화)
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

// 시나리오에서 여정 요소 추출을 위한 시스템 프롬프트
const EXTRACTION_SYSTEM_PROMPT = `당신은 사용자 여정 지도(User Journey Map) 전문가입니다.
사용자가 제공하는 시나리오 텍스트를 분석하여 다음 요소들을 추출해주세요:

1. **Phases (단계)**: 시간 흐름에 따른 경험 단계
   - name: 단계 이름 (예: "준비", "작업", "점검", "완료")
   - order: 순서 (0부터 시작)
   - duration: 예상 소요 시간

2. **Contexts (컨텍스트)**: 서비스 경험이 일어나는 물리적 공간/환경
   - name: 공간 이름 (예: "공장 라인", "자재 창고", "휴게실")
   - description: 환경 설명
   - order: 세로축 배치 순서 (0부터 시작)

3. **Artifacts (아티팩트)**: Context 내 구체적 접점 (Physical Evidence)
   - name: 접점 이름 (예: "웨어러블 로봇", "MES 앱", "충전 스테이션")
   - type: "tangible" (유형: 제품, 기기 등) 또는 "intangible" (무형: 앱, 서비스 등)
   - description: 설명

4. **Touchpoints (터치포인트)**: 사용자 경험의 핵심 구성 요소
   - phaseId: 속한 Phase 이름
   - contextId: 속한 Context 이름
   - artifactId: 사용되는 Artifact 이름
   - action: 사용자 행동/경험 설명
   - emotion: 감정 상태 (positive/neutral/negative)
   - emotionScore: 감정 점수 (-1 ~ 1)
   - painPoint: 불편 사항 (없으면 빈 문자열)
   - opportunity: 개선 기회 (없으면 빈 문자열)

5. **suggestedConnections**: 터치포인트 간 연결
   - fromIndex: 시작 터치포인트 인덱스
   - toIndex: 도착 터치포인트 인덱스
   - label: 연결 설명 (예: "이동", "전달", "알림")

JSON 형식으로 응답해주세요.`;

// GPT-5.2를 사용한 시나리오 분석
export async function extractJourneyElements(scenario: string): Promise<ExtractionResult> {
  try {
    const openai = getOpenAIClient();
    
    const response = await openai.responses.create({
      model: 'gpt-5.2',
      input: [
        {
          role: 'developer',
          content: EXTRACTION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `다음 시나리오를 분석하여 사용자 여정 지도 요소를 추출해주세요:\n\n${scenario}`,
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'journey_extraction',
          schema: {
            type: 'object',
            properties: {
              phases: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    order: { type: 'number' },
                    duration: { type: 'string' },
                  },
                  required: ['name', 'order', 'duration'],
                  additionalProperties: false,
                },
              },
              contexts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    order: { type: 'number' },
                  },
                  required: ['name', 'description', 'order'],
                  additionalProperties: false,
                },
              },
              artifacts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string', enum: ['tangible', 'intangible'] },
                    description: { type: 'string' },
                  },
                  required: ['name', 'type', 'description'],
                  additionalProperties: false,
                },
              },
              touchpoints: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    phaseId: { type: 'string' },
                    contextId: { type: 'string' },
                    artifactId: { type: 'string' },
                    action: { type: 'string' },
                    emotion: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
                    emotionScore: { type: 'number' },
                    painPoint: { type: 'string' },
                    opportunity: { type: 'string' },
                  },
                  required: ['phaseId', 'contextId', 'artifactId', 'action', 'emotion', 'emotionScore', 'painPoint', 'opportunity'],
                  additionalProperties: false,
                },
              },
              suggestedConnections: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    fromIndex: { type: 'number' },
                    toIndex: { type: 'number' },
                    label: { type: 'string' },
                  },
                  required: ['fromIndex', 'toIndex', 'label'],
                  additionalProperties: false,
                },
              },
            },
            required: ['phases', 'contexts', 'artifacts', 'touchpoints', 'suggestedConnections'],
            additionalProperties: false,
          },
        },
      },
      reasoning: {
        effort: 'medium',
      },
    });

    const outputText = response.output_text;
    const result: ExtractionResult = JSON.parse(outputText);
    
    return result;
  } catch (error) {
    console.error('GPT-5.2 extraction error:', error);
    throw new Error('Scenario analysis failed');
  }
}
