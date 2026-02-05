import { MapPin, Clock, User as UserIcon, Bot, Monitor, GitBranch, Users } from 'lucide-react';
import type { Journey } from '../types/journey';

// 선택된 항목 타입
export type SelectedItem = 
  | { type: 'user'; id: string }
  | { type: 'phase'; id: string }
  | { type: 'context'; id: string }
  | { type: 'node'; id: string }
  | null;

interface JourneyDetailsProps {
  journey: Journey;
  onItemSelect?: (item: SelectedItem) => void;
}

// User 타입별 아이콘
const userTypeIcons = {
  human: UserIcon,
  robot: Bot,
  system: Monitor,
  other: UserIcon,
};

export function JourneyDetails({ journey, onItemSelect }: JourneyDetailsProps) {
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
        <div className="bg-white rounded-lg p-3 border border-gray-200 relative group cursor-pointer hover:border-gray-300 transition-colors">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs">Users</span>
          </div>
          <p className="text-xl font-bold text-gray-800">{journey.users.length}</p>
          {/* Hover tooltip */}
          {journey.users.length > 0 && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-48 max-w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="text-xs font-medium text-gray-500 mb-1.5 px-1">Users ({journey.users.length})</div>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {journey.users.map((user) => {
                  const Icon = userTypeIcons[user.type] || UserIcon;
                  return (
                    <li 
                      key={user.id} 
                      className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => onItemSelect?.({ type: 'user', id: user.id })}
                    >
                      <Icon className="w-3 h-3 flex-shrink-0" style={{ color: user.color }} />
                      <span className="text-xs text-gray-700 truncate">{user.name}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Phase 수 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200 relative group cursor-pointer hover:border-gray-300 transition-colors">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Phases</span>
          </div>
          <p className="text-xl font-bold text-gray-800">{journey.phases.length}</p>
          {/* Hover tooltip */}
          {journey.phases.length > 0 && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-48 max-w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="text-xs font-medium text-gray-500 mb-1.5 px-1">Phases ({journey.phases.length})</div>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {journey.phases.sort((a, b) => a.order - b.order).map((phase) => (
                  <li 
                    key={phase.id} 
                    className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => onItemSelect?.({ type: 'phase', id: phase.id })}
                  >
                    <span className="text-xs text-gray-400 w-4 text-right flex-shrink-0">{phase.order}.</span>
                    <span className="text-xs text-gray-700 truncate">{phase.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Context 수 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200 relative group cursor-pointer hover:border-gray-300 transition-colors">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <MapPin className="w-4 h-4" />
            <span className="text-xs">Contexts</span>
          </div>
          <p className="text-xl font-bold text-gray-800">{journey.contexts.length}</p>
          {/* Hover tooltip */}
          {journey.contexts.length > 0 && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-48 max-w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="text-xs font-medium text-gray-500 mb-1.5 px-1">Contexts ({journey.contexts.length})</div>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {journey.contexts.sort((a, b) => a.order - b.order).map((context) => (
                  <li 
                    key={context.id} 
                    className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => onItemSelect?.({ type: 'context', id: context.id })}
                  >
                    <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-700 truncate">{context.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Node 수 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200 relative group cursor-pointer hover:border-gray-300 transition-colors">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <GitBranch className="w-4 h-4" />
            <span className="text-xs">Nodes</span>
          </div>
          <p className="text-xl font-bold text-gray-800">{journey.nodes.length}</p>
          {/* Hover tooltip */}
          {journey.nodes.length > 0 && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-56 max-w-72 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="text-xs font-medium text-gray-500 mb-1.5 px-1">Nodes ({journey.nodes.length})</div>
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {journey.nodes.map((node) => {
                  const user = journey.users.find(u => u.id === node.userId);
                  const emotionColor = node.emotion === 'positive' ? 'bg-green-400' : node.emotion === 'negative' ? 'bg-red-400' : 'bg-gray-400';
                  return (
                    <li 
                      key={node.id} 
                      className="flex items-start gap-2 px-1 py-0.5 rounded hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => onItemSelect?.({ type: 'node', id: node.id })}
                    >
                      <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${emotionColor}`} />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-gray-700 line-clamp-2">{node.action}</span>
                        {user && (
                          <span className="text-[10px] text-gray-400 block truncate">by {user.name}</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
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

      {/* Connectors (동선) */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Connectors (Movements)</h4>
        <p className="text-sm text-gray-600">{journey.connectors.length} connections</p>
      </div>
    </div>
  );
}
