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

1. **Users (행위자)**: 시나리오에 등장하는 모든 행위자
   - name: 행위자 이름 (예: "작업자 A", "AGV-01", "MES 시스템")
   - type: "human" (사람), "robot" (로봇/기계), "system" (시스템/소프트웨어), "other"
   - description: 역할 설명

2. **Phases (단계)**: 시간 흐름에 따른 경험 단계 (X축)
   - name: 단계 이름 (예: "준비", "작업", "점검", "완료")
   - order: 순서 (0부터 시작)
   - duration: 예상 소요 시간

3. **Contexts (공간/환경)**: 행위가 일어나는 물리적 공간 (Y축)
   - name: 공간 이름 (예: "조립 라인", "자재 창고", "충전소")
   - description: 환경 설명
   - order: 세로축 배치 순서 (0부터 시작)

4. **Nodes (노드)**: 각 User의 특정 시점 상태 (그래프의 정점)
   - userName: User 이름 (users에서 매칭)
   - phaseName: Phase 이름 (phases에서 매칭)
   - contextName: Context 이름 (contexts에서 매칭)
   - action: 해당 시점에서 수행하는 행동
   - emotion: 감정 상태 (positive/neutral/negative)
   - emotionScore: 감정 점수 (-1 ~ 1)
   - painPoint: 불편 사항 (없으면 빈 문자열)
   - opportunity: 개선 기회 (없으면 빈 문자열)

5. **Edges (엣지)**: Node 간 이동/전환 (그래프의 간선)
   - fromNodeIndex: 시작 Node 인덱스 (nodes 배열 기준)
   - toNodeIndex: 도착 Node 인덱스
   - description: 이동/전환 설명 (예: "부품 수령을 위해 창고로 이동")
   ※ 같은 User의 연속적인 Node들을 연결 (동선)

6. **Intersections (접점)**: 여러 User가 만나는 지점
   - phaseName: Phase 이름
   - contextName: Context 이름
   - userNames: 만나는 User들의 이름 배열
   - description: 접점에서 일어나는 상호작용 설명

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
              users: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string', enum: ['human', 'robot', 'system', 'other'] },
                    description: { type: 'string' },
                  },
                  required: ['name', 'type', 'description'],
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
              nodes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    userName: { type: 'string' },
                    phaseName: { type: 'string' },
                    contextName: { type: 'string' },
                    action: { type: 'string' },
                    emotion: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
                    emotionScore: { type: 'number' },
                    painPoint: { type: 'string' },
                    opportunity: { type: 'string' },
                  },
                  required: ['userName', 'phaseName', 'contextName', 'action', 'emotion', 'emotionScore', 'painPoint', 'opportunity'],
                  additionalProperties: false,
                },
              },
              edges: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    fromNodeIndex: { type: 'number' },
                    toNodeIndex: { type: 'number' },
                    description: { type: 'string' },
                  },
                  required: ['fromNodeIndex', 'toNodeIndex', 'description'],
                  additionalProperties: false,
                },
              },
              intersections: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    phaseName: { type: 'string' },
                    contextName: { type: 'string' },
                    userNames: { type: 'array', items: { type: 'string' } },
                    description: { type: 'string' },
                  },
                  required: ['phaseName', 'contextName', 'userNames', 'description'],
                  additionalProperties: false,
                },
              },
            },
            required: ['users', 'phases', 'contexts', 'nodes', 'edges', 'intersections'],
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
