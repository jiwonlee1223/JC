import { MapPin, Clock, Box, Cloud, Layers } from 'lucide-react';
import type { Journey } from '../types/journey';

interface JourneyDetailsProps {
  journey: Journey;
}

export function JourneyDetails({ journey }: JourneyDetailsProps) {
  const emotionStats = {
    positive: journey.touchpoints.filter(t => t.emotion === 'positive').length,
    neutral: journey.touchpoints.filter(t => t.emotion === 'neutral').length,
    negative: journey.touchpoints.filter(t => t.emotion === 'negative').length,
  };

  const tangibleCount = journey.artifacts.filter(a => a.type === 'tangible').length;
  const intangibleCount = journey.artifacts.filter(a => a.type === 'intangible').length;

  return (
    <div className="bg-gray-50 rounded-lg p-4 mt-4">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Journey Summary</h3>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Phase 수 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Phases</span>
          </div>
          <p className="text-xl font-bold text-gray-800">{journey.phases.length}</p>
        </div>

        {/* Context 수 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <MapPin className="w-4 h-4" />
            <span className="text-xs">Contexts</span>
          </div>
          <p className="text-xl font-bold text-gray-800">{journey.contexts.length}</p>
        </div>

        {/* Touchpoint 수 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Layers className="w-4 h-4" />
            <span className="text-xs">Touchpoints</span>
          </div>
          <p className="text-xl font-bold text-gray-800">{journey.touchpoints.length}</p>
        </div>

        {/* Artifact 수 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Box className="w-4 h-4" />
            <span className="text-xs">Artifacts</span>
          </div>
          <p className="text-xl font-bold text-gray-800">{journey.artifacts.length}</p>
        </div>
      </div>

      {/* Contexts */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Contexts</h4>
        <div className="space-y-1">
          {journey.contexts.map((context) => {
            const touchpointCount = journey.touchpoints.filter(t => t.contextId === context.id).length;
            return (
              <div 
                key={context.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                style={{ 
                  backgroundColor: `${context.color}10`,
                  borderColor: `${context.color}40`,
                }}
              >
                <MapPin className="w-3 h-3" style={{ color: context.color }} />
                <span className="text-sm font-medium text-gray-800 flex-1">{context.name}</span>
                <span className="text-xs text-gray-500">{touchpointCount} touchpoints</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Artifacts */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Artifacts</h4>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Box className="w-4 h-4 text-amber-600" />
            <span className="text-gray-600">Tangible: {tangibleCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Cloud className="w-4 h-4 text-blue-600" />
            <span className="text-gray-600">Intangible: {intangibleCount}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {journey.artifacts.map((artifact) => (
            <span 
              key={artifact.id}
              className={`px-2 py-0.5 rounded text-xs ${
                artifact.type === 'tangible'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {artifact.name}
            </span>
          ))}
        </div>
      </div>

      {/* 상태 분포 */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Emotion Distribution</h4>
        <div className="flex h-3 rounded-full overflow-hidden">
          {journey.touchpoints.length > 0 && (
            <>
              <div 
                className="bg-green-500 transition-all"
                style={{ width: `${(emotionStats.positive / journey.touchpoints.length) * 100}%` }}
              />
              <div 
                className="bg-gray-400 transition-all"
                style={{ width: `${(emotionStats.neutral / journey.touchpoints.length) * 100}%` }}
              />
              <div 
                className="bg-red-500 transition-all"
                style={{ width: `${(emotionStats.negative / journey.touchpoints.length) * 100}%` }}
              />
            </>
          )}
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {emotionStats.positive}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            {emotionStats.neutral}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {emotionStats.negative}
          </span>
        </div>
      </div>

      {/* Pain Points */}
      {journey.touchpoints.some(t => t.painPoint && t.painPoint.length > 0) && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Pain Points</h4>
          <ul className="space-y-1">
            {journey.touchpoints
              .filter(t => t.painPoint && t.painPoint.length > 0)
              .map((tp) => (
                <li 
                  key={tp.id}
                  className="text-xs text-red-700 bg-red-50 rounded px-2 py-1"
                >
                  {tp.painPoint}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
