import type { Journey, Actor, Phase, Touchpoint, PhysicalEvidence, UserAction, Connection } from '../types/journey';

export interface StreamEvent {
  type: 'start' | 'actors' | 'phases' | 'touchpoints' | 'physicalEvidences' | 'userActions' | 'connections' | 'complete' | 'error';
  data: unknown;
}

export interface StreamCallbacks {
  onStart?: (data: { journeyId: string; title: string }) => void;
  onActors?: (actors: Actor[]) => void;
  onPhases?: (phases: Phase[]) => void;
  onTouchpoints?: (touchpoints: Touchpoint[]) => void;
  onPhysicalEvidences?: (evidences: PhysicalEvidence[]) => void;
  onUserActions?: (actions: UserAction[]) => void;
  onConnections?: (connections: Connection[]) => void;
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
    
    // SSE 이벤트 파싱 (data: {...}\n\n 형식)
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || ''; // 마지막 불완전한 라인은 버퍼에 유지

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event: StreamEvent = JSON.parse(line.substring(6));
          
          switch (event.type) {
            case 'start':
              callbacks.onStart?.(event.data as { journeyId: string; title: string });
              break;
            case 'actors':
              callbacks.onActors?.(event.data as Actor[]);
              break;
            case 'phases':
              callbacks.onPhases?.(event.data as Phase[]);
              break;
            case 'touchpoints':
              callbacks.onTouchpoints?.(event.data as Touchpoint[]);
              break;
            case 'physicalEvidences':
              callbacks.onPhysicalEvidences?.(event.data as PhysicalEvidence[]);
              break;
            case 'userActions':
              callbacks.onUserActions?.(event.data as UserAction[]);
              break;
            case 'connections':
              callbacks.onConnections?.(event.data as Connection[]);
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
