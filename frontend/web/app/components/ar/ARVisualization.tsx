'use client';

import React, { useRef, useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Three.js components to avoid SSR issues
const ThreeVisualization = dynamic(() => import('./ThreeVisualization'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading 3D visualization...</p>
    </div>
  </div>
});

interface AssessmentData {
  feasibilityScore?: number;
  potentialWaterCollection?: number;
  recommendedSystem?: {
    tankCapacityLiters?: number;
  };
  annualSavings?: number;
  propertyDetails?: {
    roofArea?: number;
    roofType?: string;
  };
}

interface ARVisualizationProps {
  assessmentData?: AssessmentData;
  onModelLoad?: (model: any) => void;
  onARStart?: () => void;
  onAREnd?: () => void;
}

const ARVisualization: React.FC<ARVisualizationProps> = ({
  assessmentData,
  onModelLoad,
  onARStart,
  onAREnd
}) => {
  const [isWebXRSupported, setIsWebXRSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for WebXR support
    if (typeof navigator !== 'undefined' && 'xr' in navigator) {
      navigator.xr?.isSessionSupported?.('immersive-ar')
        .then(supported => setIsWebXRSupported(supported))
        .catch(() => setIsWebXRSupported(false));
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing AR visualization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ar-visualization-container relative w-full bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg overflow-hidden shadow-lg">
      <Suspense fallback={
        <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading 3D model...</p>
          </div>
        </div>
      }>
        <ThreeVisualization
          assessmentData={assessmentData}
          onModelLoad={onModelLoad}
        />
      </Suspense>

      {/* WebXR Status Banner */}
      {!isWebXRSupported && (
        <div className="absolute top-4 left-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 z-10">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-yellow-700">
              <strong>Note:</strong> AR features require a compatible device. Showing 3D preview instead.
            </p>
          </div>
        </div>
      )}

      {/* Controls Panel */}
      <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-95 backdrop-blur-sm border-t p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-blue-600">Tank Capacity</div>
            <div className="text-gray-700">
              {assessmentData?.recommendedSystem?.tankCapacityLiters?.toLocaleString() || '0'}L
            </div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-green-600">Feasibility</div>
            <div className="text-gray-700">
              {((assessmentData?.feasibilityScore || 0) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-indigo-600">Collection</div>
            <div className="text-gray-700">
              {(assessmentData?.potentialWaterCollection || 0).toLocaleString()}L/year
            </div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-purple-600">Savings</div>
            <div className="text-gray-700">
              ₹{(assessmentData?.annualSavings || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-2 mt-4">
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            onClick={() => {
              // Rotate view logic would be implemented in ThreeVisualization
            }}
          >
            🔄 Rotate View
          </button>
          <button 
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
            onClick={() => {
              // Export model logic
              if (onARStart) onARStart();
            }}
          >
            📤 Export Model
          </button>
          {isWebXRSupported && (
            <button 
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
              onClick={() => {
                if (onARStart) onARStart();
              }}
            >
              🥽 Start AR
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ARVisualization;