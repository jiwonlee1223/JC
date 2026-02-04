// Saved Journeys List Component
import { useState, useEffect } from 'react';
import { FolderOpen, Trash2, Clock, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react';
import { subscribeToUserJourneys, deleteJourneyFromFirestore } from '../lib/journey-service';
import type { Journey } from '../types/journey';

interface JourneyListProps {
  userId: string;
  currentJourneyId?: string;
  onSelect: (journey: Journey) => void;
}

export const JourneyList = ({ userId, currentJourneyId, onSelect }: JourneyListProps) => {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToUserJourneys(userId, (data) => {
      setJourneys(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleDelete = async (e: React.MouseEvent, journeyId: string) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this journey?')) {
      return;
    }

    setDeletingId(journeyId);
    try {
      await deleteJourneyFromFirestore(journeyId);
    } catch (err) {
      console.error('Failed to delete journey:', err);
      setError('Failed to delete journey');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than 1 hour
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes}m ago`;
    }
    // Less than 24 hours
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours}h ago`;
    }
    // Less than 7 days
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days}d ago`;
    }
    // Otherwise show date
    return date.toLocaleDateString();
  };

  return (
    <div className="mt-4">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4" />
          <span>Saved Journeys</span>
          {journeys.length > 0 && (
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              {journeys.length}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="mt-2 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 py-3 px-3 bg-red-50 text-red-600 text-sm rounded-lg">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          ) : journeys.length === 0 ? (
            <div className="py-4 text-center text-sm text-gray-400">
              No saved journeys yet
            </div>
          ) : (
            journeys.map((journey) => (
              <button
                key={journey.id}
                onClick={() => onSelect(journey)}
                className={`
                  w-full text-left p-3 rounded-lg border transition
                  ${currentJourneyId === journey.id
                    ? 'bg-primary-50 border-primary-200'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className={`
                      font-medium text-sm truncate
                      ${currentJourneyId === journey.id ? 'text-primary-700' : 'text-gray-800'}
                    `}>
                      {journey.title}
                    </h4>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(journey.updatedAt)}</span>
                      <span className="mx-1">·</span>
                      <span>{journey.users.length} users</span>
                      <span className="mx-1">·</span>
                      <span>{journey.nodes.length} nodes</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, journey.id)}
                    disabled={deletingId === journey.id}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                    title="Delete journey"
                  >
                    {deletingId === journey.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
