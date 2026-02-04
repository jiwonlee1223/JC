// Journey Toolbar Component (Undo/Redo, Saved Journeys, Save)
import { useState, useEffect, useRef } from 'react';
import { Undo2, Redo2, FolderOpen, Save, Trash2, Clock, Loader2, ChevronDown } from 'lucide-react';
import { subscribeToUserJourneys, deleteJourneyFromFirestore } from '../lib/journey-service';
import type { Journey } from '../types/journey';

interface JourneyToolbarProps {
  userId?: string;
  currentJourneyId?: string;
  hasJourney: boolean;
  canUndo: boolean;
  canRedo: boolean;
  saving: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onSelectJourney: (journey: Journey) => void;
}

export const JourneyToolbar = ({
  userId,
  currentJourneyId,
  hasJourney,
  canUndo,
  canRedo,
  saving,
  onUndo,
  onRedo,
  onSave,
  onSelectJourney,
}: JourneyToolbarProps) => {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Subscribe to user's journeys
  useEffect(() => {
    if (!userId) {
      setJourneys([]);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToUserJourneys(userId, (data) => {
      setJourneys(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDelete = async (e: React.MouseEvent, journeyId: string) => {
    e.stopPropagation();
    
    if (!userId) return;
    
    if (!confirm('Are you sure you want to delete this journey?')) {
      return;
    }

    setDeletingId(journeyId);
    try {
      await deleteJourneyFromFirestore(userId, journeyId);
    } catch (err) {
      console.error('Failed to delete journey:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelect = (journey: Journey) => {
    onSelectJourney(journey);
    setDropdownOpen(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes}m ago`;
    }
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours}h ago`;
    }
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days}d ago`;
    }
    return date.toLocaleDateString();
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white rounded-lg shadow-md border border-gray-200 p-1">
      {/* Undo/Redo - only show when has journey */}
      {hasJourney && (
        <>
          {/* Undo Button */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`
              p-2 rounded-md transition-colors
              ${canUndo 
                ? 'text-gray-700 hover:bg-gray-100' 
                : 'text-gray-300 cursor-not-allowed'}
            `}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          {/* Redo Button */}
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`
              p-2 rounded-md transition-colors
              ${canRedo 
                ? 'text-gray-700 hover:bg-gray-100' 
                : 'text-gray-300 cursor-not-allowed'}
            `}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200 mx-1" />
        </>
      )}

      {/* Saved Journeys Dropdown (only when logged in) */}
      {userId && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            <span className="text-sm font-medium">Saved</span>
            {journeys.length > 0 && (
              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                {journeys.length}
              </span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-1 max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              ) : journeys.length === 0 ? (
                <div className="py-4 px-3 text-center text-sm text-gray-400">
                  No saved journeys yet
                </div>
              ) : (
                journeys.map((journey) => (
                  <div
                    key={journey.id}
                    onClick={() => handleSelect(journey)}
                    className={`
                      w-full text-left px-3 py-2 hover:bg-gray-50 transition cursor-pointer
                      ${currentJourneyId === journey.id ? 'bg-primary-50' : ''}
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
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(journey.updatedAt)}</span>
                          <span className="mx-1">·</span>
                          <span>{journey.users.length} users</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, journey.id)}
                        disabled={deletingId === journey.id}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                        title="Delete journey"
                      >
                        {deletingId === journey.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Divider & Save Button (only when logged in AND has journey) */}
      {userId && hasJourney && (
        <>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 text-primary-600 hover:bg-primary-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save Journey"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </>
      )}
    </div>
  );
};
