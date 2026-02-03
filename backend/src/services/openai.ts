import OpenAI from 'openai';
import dotenv from 'dotenv';
import type { ExtractionResult } from '../types/journey.js';

// 환경 변수 로드 (ESM 모듈 로딩 순서 문제 해결)
dotenv.config();

// OpenAI 클라이언트 (lazy 초기화)
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.');
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

1. **Actors (주체)**: 여정에 참여하는 모든 주체들 (사람, 로봇, 시스템 등)
   - name: 이름 (예: "작업자", "행낭로봇", "관리자", "MES시스템")
   - type: 유형 (human/robot/system)
   - order: Swimlane 순서 (0부터 시작)

2. **Phases (단계)**: 여정의 시간적 단계 (예: 준비, 작업, 자재요청, 완료)

3. **Touchpoints (터치포인트)**: 각 주체가 수행하는 활동
   - actorId: 이 터치포인트를 수행하는 주체의 이름
   - phaseId: 속한 Phase 이름
   - channel: 채널/도구 (태블릿, MES, 충전스테이션 등)
   - action: 수행하는 행동
   - emotion: 상태 (positive/neutral/negative)
   - emotionScore: 상태 점수 (-1 ~ 1)
   - painPoint: 문제점 (없으면 빈 문자열)
   - opportunity: 개선 기회 (없으면 빈 문자열)

4. **Physical Evidences (물리적 증거)**: 각 터치포인트에서의 물리적/디지털 증거

5. **User Actions (상세 행동)**: 각 터치포인트에서의 상세 행동, 생각, 상태

6. **suggestedConnections**: 터치포인트 간 연결 (특히 다른 Actor 간 핸드오프)

JSON 형식으로 응답해주세요.`;

// GPT-5.2를 사용한 시나리오 분석
export async function extractJourneyElements(scenario: string): Promise<ExtractionResult> {
  try {
    const openai = getOpenAIClient();
    
    // GPT-5.2 Responses API 사용
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
              actors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string', enum: ['human', 'robot', 'system'] },
                    order: { type: 'number' },
                  },
                  required: ['name', 'type', 'order'],
                  additionalProperties: false,
                },
              },
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
              touchpoints: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    actorId: { type: 'string' },
                    phaseId: { type: 'string' },
                    channel: { type: 'string' },
                    action: { type: 'string' },
                    emotion: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
                    emotionScore: { type: 'number' },
                    painPoint: { type: 'string' },
                    opportunity: { type: 'string' },
                  },
                  required: ['actorId', 'phaseId', 'channel', 'action', 'emotion', 'emotionScore', 'painPoint', 'opportunity'],
                  additionalProperties: false,
                },
              },
              physicalEvidences: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    touchpointId: { type: 'string' },
                    type: { type: 'string', enum: ['digital', 'physical', 'human'] },
                    description: { type: 'string' },
                  },
                  required: ['touchpointId', 'type', 'description'],
                  additionalProperties: false,
                },
              },
              userActions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    touchpointId: { type: 'string' },
                    description: { type: 'string' },
                    thoughts: { type: 'string' },
                    feelings: { type: 'string' },
                  },
                  required: ['touchpointId', 'description', 'thoughts', 'feelings'],
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
                  },
                  required: ['fromIndex', 'toIndex'],
                  additionalProperties: false,
                },
              },
            },
            required: ['actors', 'phases', 'touchpoints', 'physicalEvidences', 'userActions', 'suggestedConnections'],
            additionalProperties: false,
          },
        },
      },
      reasoning: {
        effort: 'medium', // 분석 작업이므로 중간 수준의 추론
      },
    });

    // 응답에서 텍스트 추출
    const outputText = response.output_text;
    const result: ExtractionResult = JSON.parse(outputText);
    
    return result;
  } catch (error) {
    console.error('GPT-5.2 extraction error:', error);
    throw new Error('시나리오 분석 중 오류가 발생했습니다.');
  }
}
