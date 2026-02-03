import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

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

const EXTRACTION_SYSTEM_PROMPT = `당신은 사용자 여정 지도(User Journey Map) 전문가입니다.
사용자가 제공하는 시나리오 텍스트를 분석하여 다음 요소들을 **순서대로** 추출해주세요.
반드시 아래 순서대로 JSON 객체의 키를 작성해주세요:

1. **users** (첫번째): 시나리오에 등장하는 모든 행위자
   - name: 행위자 이름 (예: "작업자 A", "AGV-01")
   - type: "human" / "robot" / "system" / "other"
   - description: 역할 설명

2. **phases** (두번째): 시간 흐름에 따른 경험 단계 (X축)
   - name: 단계 이름
   - order: 순서 (0부터)
   - duration: 예상 소요 시간

3. **contexts** (세번째): 행위가 일어나는 물리적 공간 (Y축)
   - name: 공간 이름
   - description: 환경 설명
   - order: 세로축 배치 순서 (0부터)

4. **nodes** (네번째): 각 User의 특정 시점 상태 (그래프의 정점)
   - userName: User 이름 (users에서 매칭)
   - phaseName: Phase 이름 (phases에서 매칭)
   - contextName: Context 이름 (contexts에서 매칭)
   - action: 해당 시점에서 수행하는 행동
   - emotion: positive / neutral / negative
   - emotionScore: -1 ~ 1
   - painPoint: 불편 사항 (없으면 빈 문자열)
   - opportunity: 개선 기회 (없으면 빈 문자열)

5. **edges** (다섯번째): Node 간 이동/전환 (그래프의 간선)
   - fromNodeIndex: 시작 Node 인덱스 (nodes 배열 기준)
   - toNodeIndex: 도착 Node 인덱스
   - description: 이동/전환 설명 (예: "부품 수령을 위해 창고로 이동")
   ※ 같은 User의 연속적인 Node들을 연결

6. **intersections** (마지막): 여러 User가 만나는 접점
   - phaseName: Phase 이름
   - contextName: Context 이름
   - userNames: 만나는 User들의 이름 배열
   - description: 접점에서 일어나는 상호작용 설명

JSON 형식으로 응답해주세요.`;

// 스트리밍 추출 - 이벤트 콜백으로 점진적 데이터 전달
export async function extractJourneyElementsStream(
  scenario: string,
  onEvent: (type: string, data: unknown) => void
): Promise<void> {
  const openai = getOpenAIClient();

  try {
    const stream = await openai.responses.create({
      model: 'gpt-5.2',
      stream: true,
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

    // 스트림에서 텍스트 누적
    let accumulatedText = '';
    const extractedKeys = new Set<string>();
    
    // 추출할 키 순서
    const keyOrder = ['users', 'phases', 'contexts', 'nodes', 'edges', 'intersections'];

    for await (const event of stream) {
      if (event.type === 'response.output_text.delta') {
        accumulatedText += event.delta;
        
        // 점진적 파싱 시도
        for (const key of keyOrder) {
          if (extractedKeys.has(key)) continue;
          
          const keyPattern = new RegExp(`"${key}"\\s*:\\s*\\[`);
          const keyMatch = accumulatedText.match(keyPattern);
          
          if (keyMatch) {
            const startIdx = accumulatedText.indexOf(`"${key}"`) + `"${key}"`.length;
            const colonIdx = accumulatedText.indexOf(':', startIdx);
            const arrayStartIdx = accumulatedText.indexOf('[', colonIdx);
            
            if (arrayStartIdx !== -1) {
              let depth = 0;
              let arrayEndIdx = -1;
              
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
              
              if (arrayEndIdx !== -1) {
                const arrayStr = accumulatedText.substring(arrayStartIdx, arrayEndIdx + 1);
                try {
                  const parsed = JSON.parse(arrayStr);
                  extractedKeys.add(key);
                  onEvent(key, parsed);
                } catch {
                  // 아직 완전하지 않음
                }
              }
            }
          }
        }
      }
      
      if (event.type === 'response.completed') {
        onEvent('complete', null);
      }
    }

  } catch (error) {
    console.error('GPT-5.2 streaming error:', error);
    onEvent('error', { message: 'Streaming extraction failed' });
    throw error;
  }
}
