import { Router, Request, Response } from 'express';
import type { CreateJourneyRequest, CreateJourneyResponse } from '../types/journey.js';
import {
  createJourneyFromScenario,
  getJourney,
  getAllJourneys,
  updateJourney,
  deleteJourney,
} from '../services/journey.js';

const router = Router();

// POST /api/journeys - 새 여정 생성
router.post('/', async (req: Request, res: Response) => {
  try {
    const request: CreateJourneyRequest = req.body;

    if (!request.scenario || request.scenario.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '시나리오 텍스트를 입력해주세요.',
      } as CreateJourneyResponse);
    }

    const journey = await createJourneyFromScenario(request);

    return res.status(201).json({
      success: true,
      journey,
    } as CreateJourneyResponse);
  } catch (error) {
    console.error('Journey creation error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '여정 생성 중 오류가 발생했습니다.',
    } as CreateJourneyResponse);
  }
});

// GET /api/journeys - 모든 여정 목록 조회
router.get('/', (_req: Request, res: Response) => {
  const journeys = getAllJourneys();
  return res.json({ success: true, journeys });
});

// GET /api/journeys/:id - 특정 여정 조회
router.get('/:id', (req: Request, res: Response) => {
  const journey = getJourney(req.params.id);
  
  if (!journey) {
    return res.status(404).json({
      success: false,
      error: '여정을 찾을 수 없습니다.',
    });
  }

  return res.json({ success: true, journey });
});

// PUT /api/journeys/:id - 여정 업데이트
router.put('/:id', (req: Request, res: Response) => {
  const updated = updateJourney(req.params.id, req.body);

  if (!updated) {
    return res.status(404).json({
      success: false,
      error: '여정을 찾을 수 없습니다.',
    });
  }

  return res.json({ success: true, journey: updated });
});

// DELETE /api/journeys/:id - 여정 삭제
router.delete('/:id', (req: Request, res: Response) => {
  const deleted = deleteJourney(req.params.id);

  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: '여정을 찾을 수 없습니다.',
    });
  }

  return res.json({ success: true });
});

export default router;
