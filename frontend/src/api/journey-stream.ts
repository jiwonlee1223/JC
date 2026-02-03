import type { Journey, User, Phase, Context, JourneyNode, JourneyEdge, Intersection } from '../types/journey';

export interface StreamEvent {
  type: 'start' | 'users' | 'phases' | 'contexts' | 'nodes' | 'edges' | 'intersections' | 'complete' | 'error';
  data: unknown;
}

export interface StreamCallbacks {
  onStart?: (data: { journeyId: string; title: string }) => void;
  onUsers?: (users: User[]) => void;
  onPhases?: (phases: Phase[]) => void;
  onContexts?: (contexts: Context[]) => void;
  onNodes?: (nodes: JourneyNode[]) => void;
  onEdges?: (edges: JourneyEdge[]) => void;
  onIntersections?: (intersections: Intersection[]) => void;
  onComplete?: (journey: Journey) => void;
  onError?: (error: { message: string }) => void;
}

// 스트리밍 여정 생성
export async function createJourneyStream(
  scenario: string,
  title: string | undefined,
  callbacks: StreamCallbacks
): Promise<void> {
  const response = await fetch('/api/journeys/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ scenario, title }),
  });

  if (!response.ok) {
    throw new Error('Failed to start streaming');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event: StreamEvent = JSON.parse(line.substring(6));
          
          switch (event.type) {
            case 'start':
              callbacks.onStart?.(event.data as { journeyId: string; title: string });
              break;
            case 'users':
              callbacks.onUsers?.(event.data as User[]);
              break;
            case 'phases':
              callbacks.onPhases?.(event.data as Phase[]);
              break;
            case 'contexts':
              callbacks.onContexts?.(event.data as Context[]);
              break;
            case 'nodes':
              callbacks.onNodes?.(event.data as JourneyNode[]);
              break;
            case 'edges':
              callbacks.onEdges?.(event.data as JourneyEdge[]);
              break;
            case 'intersections':
              callbacks.onIntersections?.(event.data as Intersection[]);
              break;
            case 'complete':
              callbacks.onComplete?.(event.data as Journey);
              break;
            case 'error':
              callbacks.onError?.(event.data as { message: string });
              break;
          }
        } catch (e) {
          console.error('Failed to parse SSE event:', e);
        }
      }
    }
  }
}
