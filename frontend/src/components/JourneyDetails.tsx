import { MapPin, Clock, FileText, Users, Bot, User, Cpu } from 'lucide-react';
import type { Journey } from '../types/journey';

interface JourneyDetailsProps {
  journey: Journey;
}

// Actor 타입별 아이콘
const actorTypeIcons: Record<string, React.ReactNode> = {
  human: <User className="w-3 h-3" />,
  robot: <Bot className="w-3 h-3" />,
  system: <Cpu className="w-3 h-3" />,
};

export function JourneyDetails({ journey }: JourneyDetailsProps) {
  const emotionStats = {
    positive: journey.touchpoints.filter(t => t.emotion === 'positive').length,
    neutral: journey.touchpoints.filter(t => t.emotion === 'neutral').length,
    negative: journey.touchpoints.filter(t => t.emotion === 'negative').length,
  };

  const channels = [...new Set(journey.touchpoints.map(t => t.channel))];

  return (
    <div className="bg-gray-50 rounded-lg p-4 mt-4">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Journey Summary</h3>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Actor 수 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs">Actors</span>
          </div>
          <p className="text-xl font-bold text-gray-800">{journey.actors.length}</p>
        </div>

        {/* 터치포인트 수 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <MapPin className="w-4 h-4" />
            <span className="text-xs">Touchpoints</span>
          </div>
          <p className="text-xl font-bold text-gray-800">{journey.touchpoints.length}</p>
        </div>

        {/* 단계 수 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Phases</span>
          </div>
          <p className="text-xl font-bold text-gray-800">{journey.phases.length}</p>
        </div>

        {/* Physical Evidence */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <FileText className="w-4 h-4" />
            <span className="text-xs">Evidences</span>
          </div>
          <p className="text-xl font-bold text-gray-800">{journey.physicalEvidences.length}</p>
        </div>
      </div>

      {/* Actors */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Actors</h4>
        <div className="space-y-1">
          {journey.actors.map((actor) => {
            const touchpointCount = journey.touchpoints.filter(t => t.actorId === actor.id).length;
            return (
              <div 
                key={actor.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                style={{ 
                  backgroundColor: `${actor.color}10`,
                  borderColor: `${actor.color}40`,
                }}
              >
                <span style={{ color: actor.color }}>
                  {actorTypeIcons[actor.type] || <User className="w-3 h-3" />}
                </span>
                <span className="text-sm font-medium text-gray-800 flex-1">{actor.name}</span>
                <span className="text-xs text-gray-500">{touchpointCount} touchpoints</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 상태 분포 */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Status Distribution</h4>
        <div className="flex h-3 rounded-full overflow-hidden">
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

      {/* 채널 목록 */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Channels</h4>
        <div className="flex flex-wrap gap-1">
          {channels.map((channel) => (
            <span 
              key={channel}
              className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs"
            >
              {channel}
            </span>
          ))}
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
