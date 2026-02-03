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

1. **actors** (먼저): 여정에 참여하는 모든 주체들
2. **phases** (두번째): 여정의 시간적 단계
3. **touchpoints** (세번째): 각 주체가 수행하는 활동
4. **physicalEvidences** (네번째): 물리적/디지털 증거
5. **userActions** (다섯번째): 상세 행동
6. **suggestedConnections** (마지막): 터치포인트 간 연결

JSON 형식으로 응답해주세요.`;

// 스트리밍 추출 - 이벤트 콜백으로 점진적 데이터 전달
export async function extractJourneyElementsStream(
  scenario: string,
  onEvent: (type: string, data: unknown) => void
): Promise<void> {
  const openai = getOpenAIClient();

  try {
    // 스트리밍 응답 요청
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
        effort: 'medium',
      },
    });

    // 스트림에서 텍스트 누적
    let accumulatedText = '';
    const extractedKeys = new Set<string>();
    
    // 추출할 키 순서
    const keyOrder = ['actors', 'phases', 'touchpoints', 'physicalEvidences', 'userActions', 'suggestedConnections'];

    for await (const event of stream) {
      // 텍스트 델타 이벤트 처리
      if (event.type === 'response.output_text.delta') {
        accumulatedText += event.delta;
        
        // 점진적 파싱 시도 - 각 키가 완성되었는지 확인
        for (const key of keyOrder) {
          if (extractedKeys.has(key)) continue;
          
          // 해당 키의 배열이 완성되었는지 확인
          const keyPattern = new RegExp(`"${key}"\\s*:\\s*\\[`);
          const keyMatch = accumulatedText.match(keyPattern);
          
          if (keyMatch) {
            // 배열 시작점 찾기
            const startIdx = accumulatedText.indexOf(`"${key}"`) + `"${key}"`.length;
            const colonIdx = accumulatedText.indexOf(':', startIdx);
            const arrayStartIdx = accumulatedText.indexOf('[', colonIdx);
            
            if (arrayStartIdx !== -1) {
              // 배열 끝 찾기 (중첩 브라켓 고려)
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
              
              // 배열이 완성되었으면 파싱하여 이벤트 전송
              if (arrayEndIdx !== -1) {
                const arrayStr = accumulatedText.substring(arrayStartIdx, arrayEndIdx + 1);
                try {
                  const parsed = JSON.parse(arrayStr);
                  extractedKeys.add(key);
                  onEvent(key, parsed);
                } catch {
                  // 아직 완전하지 않음, 다음 델타에서 재시도
                }
              }
            }
          }
        }
      }
      
      // 완료 이벤트
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
