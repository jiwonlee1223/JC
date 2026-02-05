import { useState, useCallback, useEffect } from 'react';
import { Map, ChevronLeft, ChevronRight, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { ScenarioInput } from './components/ScenarioInput';
import { JourneyMap } from './components/JourneyMap';
import { JourneyDetails, type SelectedItem } from './components/JourneyDetails';
import { StreamingProgress } from './components/StreamingProgress';
import { AuthModal } from './components/AuthModal';
import { JourneyToolbar } from './components/JourneyToolbar';
import { updateJourney } from './api/journey';
import { createJourneyStream } from './api/journey-stream';
import { useHistory } from './hooks/useHistory';
import { useAuth } from './hooks/useAuth';
import { signOut } from './lib/auth';
import { saveJourney, updateJourneyInFirestore } from './lib/journey-service';
import type { Journey, User, Phase, Context, JourneyNode, JourneyConnector, Intersection } from './types/journey';

// 점진적으로 빌드되는 Journey 상태
interface PartialJourney {
  id?: string;
  title?: string;
  users: User[];
  phases: Phase[];
  contexts: Context[];
  nodes: JourneyNode[];
  connectors: JourneyConnector[];
  intersections: Intersection[];
}

// 스트리밍 진행 상태
interface StreamingState {
  isStreaming: boolean;
  completedSteps: string[];
  currentStep: string | null;
}

function App() {
  // 인증 상태
  const { user, loading: authLoading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // History 관리를 통한 Undo/Redo 지원
  const {
    state: journey,
    set: setJourney,
    setWithoutHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<Journey>();

  const [partialJourney, setPartialJourney] = useState<PartialJourney | null>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    completedSteps: [],
    currentStep: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await signOut();
      setWithoutHistory(null); // Clear journey on sign out
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  // Save journey to Firestore
  const handleSaveJourney = useCallback(async () => {
    if (!journey || !user) return;
    
    setSaving(true);
    try {
      await saveJourney(user.uid, journey);
    } catch (err) {
      console.error('Failed to save journey:', err);
      setError('Failed to save journey');
    } finally {
      setSaving(false);
    }
  }, [journey, user]);

  // Load journey from list
  const handleLoadJourney = useCallback((selectedJourney: Journey) => {
    setWithoutHistory(selectedJourney);
  }, [setWithoutHistory]);

  const handleSubmit = useCallback(async (scenario: string, title?: string) => {
    setError(null);
    setWithoutHistory(null); // 새 Journey 생성 시 히스토리 초기화
    setPartialJourney({
      users: [],
      phases: [],
      contexts: [],
      nodes: [],
      connectors: [],
      intersections: [],
    });
    setStreamingState({
      isStreaming: true,
      completedSteps: [],
      currentStep: 'users',
    });

    try {
      await createJourneyStream(scenario, title, {
        onStart: (data) => {
          setPartialJourney(prev => prev ? {
            ...prev,
            id: data.journeyId,
            title: data.title,
          } : null);
        },
        
        onUsers: (users) => {
          setPartialJourney(prev => prev ? { ...prev, users } : null);
          setStreamingState(prev => ({
            ...prev,
            completedSteps: [...prev.completedSteps, 'users'],
            currentStep: 'phases',
          }));
        },
        
        onPhases: (phases) => {
          setPartialJourney(prev => prev ? { ...prev, phases } : null);
          setStreamingState(prev => ({
            ...prev,
            completedSteps: [...prev.completedSteps, 'phases'],
            currentStep: 'contexts',
          }));
        },
        
        onContexts: (contexts) => {
          setPartialJourney(prev => prev ? { ...prev, contexts } : null);
          setStreamingState(prev => ({
            ...prev,
            completedSteps: [...prev.completedSteps, 'contexts'],
            currentStep: 'nodes',
          }));
        },
        
        onNodes: (nodes) => {
          setPartialJourney(prev => prev ? { ...prev, nodes } : null);
          setStreamingState(prev => ({
            ...prev,
            completedSteps: [...prev.completedSteps, 'nodes'],
            currentStep: 'connectors',
          }));
        },
        
        onConnectors: (connectors) => {
          setPartialJourney(prev => prev ? { ...prev, connectors } : null);
          setStreamingState(prev => ({
            ...prev,
            completedSteps: [...prev.completedSteps, 'connectors'],
            currentStep: 'intersections',
          }));
        },
        
        onIntersections: (intersections) => {
          setPartialJourney(prev => prev ? { ...prev, intersections } : null);
          setStreamingState(prev => ({
            ...prev,
            completedSteps: [...prev.completedSteps, 'intersections'],
            currentStep: 'complete',
          }));
        },
        
        onComplete: async (completeJourney) => {
          setWithoutHistory(completeJourney); // 새 Journey는 히스토리 없이 시작
          setPartialJourney(null);
          setStreamingState({
            isStreaming: false,
            completedSteps: [],
            currentStep: null,
          });
          
          // Auto-save to Firestore if user is logged in
          if (user) {
            try {
              await saveJourney(user.uid, completeJourney);
            } catch (err) {
              console.error('Auto-save failed:', err);
            }
          }
        },
        
        onError: (err) => {
          setError(err.message);
          setStreamingState({
            isStreaming: false,
            completedSteps: [],
            currentStep: null,
          });
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create journey');
      setStreamingState({
        isStreaming: false,
        completedSteps: [],
        currentStep: null,
      });
    }
  }, [setWithoutHistory]);

  // Journey 업데이트 (히스토리에 추가됨 - Undo 가능)
  const handleJourneyUpdate = useCallback(async (updatedJourney: Journey) => {
    // 먼저 UI 업데이트 (히스토리에 추가)
    setJourney(updatedJourney);
    
    // 백그라운드에서 서버에 저장
    try {
      await updateJourney(updatedJourney.id, updatedJourney);
      
      // Also save to Firestore if user is logged in
      if (user) {
        await updateJourneyInFirestore(user.uid, updatedJourney.id, updatedJourney);
      }
    } catch (err) {
      console.error('Journey update failed:', err);
    }
  }, [setJourney, user]);

  // 현재 표시할 데이터
  const displayData = journey || (partialJourney && {
    ...partialJourney,
    id: partialJourney.id || 'temp',
    title: partialJourney.title || 'Generating...',
    description: '',
    scenario: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Journey);

  const isLoading = streamingState.isStreaming;

  // 키보드 단축키 (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 무시
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gray-100">
      {/* Left Sidebar */}
      <aside
        className={`
          ${sidebarOpen ? 'w-96' : 'w-0'}
          transition-all duration-300 ease-in-out
          bg-white border-r border-gray-200 flex-shrink-0
          overflow-hidden
        `}
      >
        <div className="w-96 h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Map className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-lg font-bold text-gray-800">Journey Creator</h1>
                <p className="text-xs text-gray-500">User Journey Map Automation</p>
              </div>
            </div>
            
            {/* Auth section */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              {authLoading ? (
                <div className="text-sm text-gray-400">Loading...</div>
              ) : user ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-gray-700 truncate max-w-[180px]">
                        {user.displayName || user.email?.split('@')[0]}
                      </p>
                      <p className="text-xs text-gray-400 truncate max-w-[180px]">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary-50 text-primary-600 font-medium rounded-lg hover:bg-primary-100 transition"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>
              )}
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <ScenarioInput onSubmit={handleSubmit} isLoading={isLoading} />

            {/* Streaming Progress */}
            {streamingState.isStreaming && (
              <StreamingProgress
                completedSteps={streamingState.completedSteps}
                currentStep={streamingState.currentStep}
              />
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Journey Details */}
            {journey && (
              <JourneyDetails 
                journey={journey} 
                onItemSelect={setSelectedItem}
              />
            )}
          </div>
        </div>
      </aside>

      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white border border-gray-200 rounded-r-lg p-1.5 shadow-md hover:bg-gray-50 transition"
        style={{ left: sidebarOpen ? '384px' : '0' }}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-600" />
        )}
      </button>

      {/* Main Content - Full Screen React Flow */}
      <main className="flex-1 relative">
        {/* Toolbar - always show when logged in or has journey */}
        {(user || displayData) && !streamingState.isStreaming && (
          <JourneyToolbar
            userId={user?.uid}
            currentJourneyId={journey?.id}
            hasJourney={!!displayData}
            canUndo={canUndo}
            canRedo={canRedo}
            saving={saving}
            onUndo={undo}
            onRedo={redo}
            onSave={handleSaveJourney}
            onSelectJourney={handleLoadJourney}
          />
        )}

        {displayData ? (
          <JourneyMap 
            journey={displayData} 
            onJourneyUpdate={handleJourneyUpdate}
            selectedItem={selectedItem}
            onClearSelection={() => setSelectedItem(null)}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="inline-flex p-4 bg-gray-100 rounded-full mb-4">
                <Map className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                No journey created yet
              </h3>
              <p className="text-gray-500">
                Enter a scenario on the left to generate a journey map.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* 로그인 모달 */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setAuthModalOpen(false)}
      />
    </div>
  );
}

export default App;
