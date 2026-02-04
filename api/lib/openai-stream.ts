import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

const EXTRACTION_SYSTEM_PROMPT = `당신은 사용자 여정 지도(User Journey Map) 전문가입니다.
시나리오 텍스트를 분석하여 다음 요소들을 **순서대로** 추출해주세요:

1. **users**: 행위자 (name, type, description)
2. **phases**: 시간 단계 (name, order, duration)
3. **contexts**: 공간/환경 (name, description, order)
4. **nodes**: 각 User의 특정 시점 상태
5. **connectors**: Node 간 이동/연결
6. **intersections**: 여러 User가 만나는 접점

JSON 형식으로 응답해주세요.`;

export async function extractJourneyElementsStream(
  scenario: string,
  onEvent: (type: string, data: unknown) => void
): Promise<void> {
  const openai = getOpenAIClient();

  const stream = await openai.responses.create({
    model: 'gpt-5.2',
    stream: true,
    input: [
      { role: 'developer', content: EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: `다음 시나리오를 분석하여 사용자 여정 지도 요소를 추출해주세요:\n\n${scenario}` },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'journey_extraction',
        schema: {
          type: 'object',
          properties: {
            users: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, type: { type: 'string', enum: ['human', 'robot', 'system', 'other'] }, description: { type: 'string' } }, required: ['name', 'type', 'description'], additionalProperties: false } },
            phases: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, order: { type: 'number' }, duration: { type: 'string' } }, required: ['name', 'order', 'duration'], additionalProperties: false } },
            contexts: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, order: { type: 'number' } }, required: ['name', 'description', 'order'], additionalProperties: false } },
            nodes: { type: 'array', items: { type: 'object', properties: { userName: { type: 'string' }, phaseName: { type: 'string' }, contextName: { type: 'string' }, action: { type: 'string' }, emotion: { type: 'string', enum: ['positive', 'neutral', 'negative'] }, emotionScore: { type: 'number' }, painPoint: { type: 'string' }, opportunity: { type: 'string' } }, required: ['userName', 'phaseName', 'contextName', 'action', 'emotion', 'emotionScore', 'painPoint', 'opportunity'], additionalProperties: false } },
            connectors: { type: 'array', items: { type: 'object', properties: { fromNodeIndex: { type: 'number' }, toNodeIndex: { type: 'number' }, description: { type: 'string' } }, required: ['fromNodeIndex', 'toNodeIndex', 'description'], additionalProperties: false } },
            intersections: { type: 'array', items: { type: 'object', properties: { phaseName: { type: 'string' }, contextName: { type: 'string' }, userNames: { type: 'array', items: { type: 'string' } }, description: { type: 'string' } }, required: ['phaseName', 'contextName', 'userNames', 'description'], additionalProperties: false } },
          },
          required: ['users', 'phases', 'contexts', 'nodes', 'connectors', 'intersections'],
          additionalProperties: false,
        },
      },
    },
  });

  let accumulatedText = '';
  const extractedKeys = new Set<string>();
  const keyOrder = ['users', 'phases', 'contexts', 'nodes', 'connectors', 'intersections'];

  for await (const event of stream) {
    if (event.type === 'response.output_text.delta') {
      accumulatedText += event.delta;
      
      for (const key of keyOrder) {
        if (extractedKeys.has(key)) continue;
        
        const keyMatch = accumulatedText.match(new RegExp(`"${key}"\\s*:\\s*\\[`));
        if (keyMatch) {
          const startIdx = accumulatedText.indexOf(`"${key}"`) + `"${key}"`.length;
          const arrayStartIdx = accumulatedText.indexOf('[', startIdx);
          
          if (arrayStartIdx !== -1) {
            let depth = 0, arrayEndIdx = -1;
            for (let i = arrayStartIdx; i < accumulatedText.length; i++) {
              if (accumulatedText[i] === '[') depth++;
              else if (accumulatedText[i] === ']') { depth--; if (depth === 0) { arrayEndIdx = i; break; } }
            }
            
            if (arrayEndIdx !== -1) {
              try {
                const parsed = JSON.parse(accumulatedText.substring(arrayStartIdx, arrayEndIdx + 1));
                extractedKeys.add(key);
                onEvent(key, parsed);
              } catch { /* not yet complete */ }
            }
          }
        }
      }
    }
    
    if (event.type === 'response.completed') onEvent('complete', null);
  }
}
