import { useState } from 'react';
import { Map, ChevronLeft, ChevronRight } from 'lucide-react';
import { ScenarioInput } from './components/ScenarioInput';
import { JourneyMap } from './components/JourneyMap';
import { JourneyDetails } from './components/JourneyDetails';
import { createJourney, updateJourney } from './api/journey';
import type { Journey } from './types/journey';

function App() {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSubmit = async (scenario: string, title?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const newJourney = await createJourney({ scenario, title });
      setJourney(newJourney);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create journey');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJourneyUpdate = async (updatedJourney: Journey) => {
    try {
      const saved = await updateJourney(updatedJourney.id, updatedJourney);
      setJourney(saved);
    } catch (err) {
      console.error('Journey update failed:', err);
    }
  };

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
          <div className="p-4 border-b border-gray-200 flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Map className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Journey Creator</h1>
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <ScenarioInput onSubmit={handleSubmit} isLoading={isLoading} />

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Journey Details */}
            {journey && <JourneyDetails journey={journey} />}
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
        {journey ? (
          <JourneyMap journey={journey} onJourneyUpdate={handleJourneyUpdate} />
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
    </div>
  );
}

export default App;
