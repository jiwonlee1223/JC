import { MapPin, Clock, User as UserIcon, Bot, Monitor, GitBranch, Users } from 'lucide-react';
import type { Journey } from '../types/journey';

interface JourneyDetailsProps {
  journey: Journey;
}

// User 타입별 아이콘
const userTypeIcons = {
  human: UserIcon,
  robot: Bot,
  system: Monitor,
  other: UserIcon,
};

export function JourneyDetails({ journey }: JourneyDetailsProps) {
  const emotionStats = {
    positive: journey.nodes.filter(n => n.emotion === 'positive').length,
    neutral: journey.nodes.filter(n => n.emotion === 'neutral').length,
    negative: journey.nodes.filter(n => n.emotion === 'negative').length,
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 mt-4">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Journey Summary</h3>
      
      <div className="grid grid-cols-2 gap-3">
        {/* User 수 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs">Users</span>
          </div>
          <p className="text-xl font-bold text-gray-800">{journey.users.length}</p>
        </div>

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

        {/* Node 수 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <GitBranch className="w-4 h-4" />
            <span className="text-xs">Nodes</span>
          </div>
          <p className="text-xl font-bold text-gray-800">{journey.nodes.length}</p>
        </div>
      </div>

      {/* Users */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Users (Actors)</h4>
        <div className="space-y-1">
          {journey.users.map((user) => {
            const Icon = userTypeIcons[user.type] || UserIcon;
            const nodeCount = journey.nodes.filter(n => n.userId === user.id).length;
            return (
              <div 
                key={user.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                style={{ 
                  backgroundColor: `${user.color}10`,
                  borderColor: `${user.color}40`,
                }}
              >
                <Icon className="w-4 h-4" style={{ color: user.color }} />
                <span className="text-sm font-medium text-gray-800 flex-1">{user.name}</span>
                <span className="text-xs text-gray-500">{nodeCount} nodes</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Intersections (접점) */}
      {journey.intersections.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Intersections (User Meetings)</h4>
          <div className="space-y-1">
            {journey.intersections.map((intersection) => (
              <div 
                key={intersection.id}
                className="px-3 py-2 rounded-lg bg-purple-50 border border-purple-200"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-3 h-3 text-purple-600" />
                  <span className="text-xs text-purple-700 font-medium">
                    {intersection.nodeIds.length} users meeting
                  </span>
                </div>
                {intersection.description && (
                  <p className="text-xs text-purple-600 mt-1">{intersection.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 감정 분포 */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Emotion Distribution</h4>
        <div className="flex h-3 rounded-full overflow-hidden">
          {journey.nodes.length > 0 && (
            <>
              <div 
                className="bg-green-500 transition-all"
                style={{ width: `${(emotionStats.positive / journey.nodes.length) * 100}%` }}
              />
              <div 
                className="bg-gray-400 transition-all"
                style={{ width: `${(emotionStats.neutral / journey.nodes.length) * 100}%` }}
              />
              <div 
                className="bg-red-500 transition-all"
                style={{ width: `${(emotionStats.negative / journey.nodes.length) * 100}%` }}
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
      {journey.nodes.some(n => n.painPoint && n.painPoint.length > 0) && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Pain Points</h4>
          <ul className="space-y-1">
            {journey.nodes
              .filter(n => n.painPoint && n.painPoint.length > 0)
              .map((node) => (
                <li 
                  key={node.id}
                  className="text-xs text-red-700 bg-red-50 rounded px-2 py-1"
                >
                  {node.painPoint}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Edges (동선) */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Edges (Movements)</h4>
        <p className="text-sm text-gray-600">{journey.edges.length} connections</p>
      </div>
    </div>
  );
}
