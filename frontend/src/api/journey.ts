import type { Journey } from '../types/journey';

const API_BASE = '/api';

export interface CreateJourneyRequest {
  scenario: string;
  title?: string;
  persona?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  error?: string;
  journey?: T;
  journeys?: T[];
}

// 새 여정 생성
export async function createJourney(request: CreateJourneyRequest): Promise<Journey> {
  const response = await fetch(`${API_BASE}/journeys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const data: ApiResponse<Journey> = await response.json();
  
  if (!data.success || !data.journey) {
    throw new Error(data.error || '여정 생성에 실패했습니다.');
  }

  return data.journey;
}

// 모든 여정 조회
export async function getJourneys(): Promise<Journey[]> {
  const response = await fetch(`${API_BASE}/journeys`);
  const data: ApiResponse<Journey> = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || '여정 목록 조회에 실패했습니다.');
  }

  return data.journeys || [];
}

// 특정 여정 조회
export async function getJourney(id: string): Promise<Journey> {
  const response = await fetch(`${API_BASE}/journeys/${id}`);
  const data: ApiResponse<Journey> = await response.json();
  
  if (!data.success || !data.journey) {
    throw new Error(data.error || '여정 조회에 실패했습니다.');
  }

  return data.journey;
}

// 여정 업데이트
export async function updateJourney(id: string, updates: Partial<Journey>): Promise<Journey> {
  const response = await fetch(`${API_BASE}/journeys/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  const data: ApiResponse<Journey> = await response.json();
  
  if (!data.success || !data.journey) {
    throw new Error(data.error || '여정 업데이트에 실패했습니다.');
  }

  return data.journey;
}

// 여정 삭제
export async function deleteJourney(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/journeys/${id}`, {
    method: 'DELETE',
  });

  const data: ApiResponse<Journey> = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || '여정 삭제에 실패했습니다.');
  }
}
