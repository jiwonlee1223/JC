import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface ScenarioInputProps {
  onSubmit: (scenario: string, title?: string) => Promise<void>;
  isLoading: boolean;
}

export function ScenarioInput({ onSubmit, isLoading }: ScenarioInputProps) {
  const [scenario, setScenario] = useState('');
  const [title, setTitle] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenario.trim() || isLoading) return;
    await onSubmit(scenario, title || undefined);
  };

  const exampleScenario = `작업자가 출근하여 로커룸에서 웨어러블 로봇 슈트를 착용합니다. 
슈트 상태를 태블릿으로 점검하고, 배터리와 센서가 정상인지 확인합니다.
생산 라인에 도착하면 MES 시스템에서 오늘의 작업 지시를 받습니다.
무거운 부품을 웨어러블 로봇의 힘 보조로 들어올려 조립 작업을 수행합니다.
부품이 부족하면 태블릿으로 자재를 요청하고, 행낭 로봇(AGV)이 자재 창고에서 부품을 가져옵니다.
행낭 로봇은 최적 경로로 이동하며 장애물을 자동 회피합니다.
작업자는 부품을 받아 조립을 완료하고 품질 검사 스테이션으로 이동합니다.
점심시간에 웨어러블 로봇을 충전 스테이션에 도킹하고 휴식을 취합니다.
오후 작업 후 슈트를 반납하고 작업 리포트를 시스템에 제출합니다.`;

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary-500" />
        시나리오 입력
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Online Shopping Journey"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="scenario" className="block text-sm font-medium text-gray-700 mb-1">
            시나리오 텍스트
          </label>
          <textarea
            id="scenario"
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder="Fill in the scenario..."
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition resize-none"
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!scenario.trim() || isLoading}
            className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                분석 중...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                여정 지도 생성
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={() => setScenario(exampleScenario)}
            className="px-4 py-2.5 text-primary-600 font-medium rounded-lg hover:bg-primary-50 transition"
            disabled={isLoading}
          >
            예시 불러오기
          </button>
        </div>
      </form>
    </div>
  );
}
