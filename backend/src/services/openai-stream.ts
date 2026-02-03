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

1. **phases** (먼저): 시간 흐름에 따른 경험 단계
2. **contexts** (두번째): 서비스 경험이 일어나는 물리적 공간/환경
3. **artifacts** (세번째): Context 내 구체적 접점 (Physical Evidence)
4. **touchpoints** (네번째): 사용자 경험의 핵심 구성 요소
5. **suggestedConnections** (마지막): 터치포인트 간 연결

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

    // 스트림에서 텍스트 누적
    let accumulatedText = '';
    const extractedKeys = new Set<string>();
    
    // 추출할 키 순서
    const keyOrder = ['phases', 'contexts', 'artifacts', 'touchpoints', 'suggestedConnections'];

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
