import { Check, Loader2, Circle } from 'lucide-react';

interface StreamingProgressProps {
  completedSteps: string[];
  currentStep: string | null;
}

const STEPS = [
  { id: 'phases', label: 'Phases' },
  { id: 'contexts', label: 'Contexts' },
  { id: 'artifacts', label: 'Artifacts' },
  { id: 'touchpoints', label: 'Touchpoints' },
  { id: 'connections', label: 'Connections' },
  { id: 'complete', label: 'Complete' },
];

export function StreamingProgress({ completedSteps, currentStep }: StreamingProgressProps) {
  return (
    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 className="text-sm font-medium text-blue-800 mb-3">Generating Journey Map...</h4>
      
      <div className="space-y-2">
        {STEPS.map((step) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-2 text-sm ${
                isCompleted
                  ? 'text-green-700'
                  : isCurrent
                  ? 'text-blue-700'
                  : 'text-gray-400'
              }`}
            >
              {isCompleted ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : isCurrent ? (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
              <span className={isCompleted || isCurrent ? 'font-medium' : ''}>
                {step.label}
              </span>
              {isCompleted && step.id !== 'complete' && (
                <span className="text-xs text-green-600 ml-auto">Done</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
