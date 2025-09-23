import React, { useState, useEffect } from 'react';
import './ARControls.css';

const ARControls = ({ 
  model, 
  assessmentData, 
  onViewChange,
  onAnimationToggle,
  onExport,
  onShare
}) => {
  const [currentView, setCurrentView] = useState('overview');
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState(null);

  const views = [
    { id: 'overview', name: 'Overview', icon: '🏠' },
    { id: 'roof', name: 'Roof System', icon: '🏘️' },
    { id: 'tank', name: 'Storage Tank', icon: '🛢️' },
    { id: 'pipes', name: 'Piping', icon: '🔧' },
    { id: 'flow', name: 'Water Flow', icon: '💧' }
  ];

  const components = [
    {
      id: 'roof',
      name: 'Roof Collection Area',
      description: 'Primary water collection surface',
      specs: {
        area: assessmentData?.propertyDetails?.roofArea || 0,
        material: assessmentData?.propertyDetails?.roofType || 'Unknown',
        efficiency: 0.85
      }
    },
    {
      id: 'gutters',
      name: 'Gutter System',
      description: 'Channels water from roof to downspouts',
      specs: {
        length: '24m',
        material: 'Aluminum',
        capacity: '150L/min'
      }
    },
    {
      id: 'downspouts',
      name: 'Downspouts',
      description: 'Vertical pipes directing water to storage',
      specs: {
        count: 2,
        diameter: '100mm',
        height: '3m'
      }
    },
    {
      id: 'tank',
      name: 'Storage Tank',
      description: 'Primary water storage container',
      specs: {
        capacity: `${assessmentData?.recommendedSystem?.tankCapacityLiters || 0}L`,
        material: 'Polyethylene',
        height: '2.5m'
      }
    },
    {
      id: 'pump',
      name: 'Pump System',
      description: 'Distributes stored water as needed',
      specs: {
        power: '0.5HP',
        flowRate: '30L/min',
        head: '20m'
      }
    },
    {
      id: 'filtration',
      name: 'Filtration System',
      description: 'Removes debris and contaminants',
      specs: {
        stages: 3,
        microns: '5μm',
        capacity: '2000L/hr'
      }
    }
  ];

  useEffect(() => {
    if (onViewChange) {
      onViewChange(currentView);
    }
  }, [currentView, onViewChange]);

  const handleViewChange = (viewId) => {
    setCurrentView(viewId);
  };

  const handleAnimationToggle = () => {
    const newState = !animationEnabled;
    setAnimationEnabled(newState);
    if (onAnimationToggle) {
      onAnimationToggle(newState);
    }
  };

  const handleComponentSelect = (component) => {
    setSelectedComponent(component);
    setShowDetails(true);
  };

  const handleExport = () => {
    if (onExport) {
      onExport();
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare();
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  return (
    <div className="ar-controls-panel">
      {/* View Controls */}
      <div className="control-section">
        <h4>Views</h4>
        <div className="view-buttons">
          {views.map((view) => (
            <button
              key={view.id}
              className={`view-button ${currentView === view.id ? 'active' : ''}`}
              onClick={() => handleViewChange(view.id)}
              title={view.name}
            >
              <span className="view-icon">{view.icon}</span>
              <span className="view-name">{view.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Animation Controls */}
      <div className="control-section">
        <h4>Animation</h4>
        <div className="animation-controls">
          <button
            className={`toggle-button ${animationEnabled ? 'active' : ''}`}
            onClick={handleAnimationToggle}
          >
            <span className="toggle-icon">
              {animationEnabled ? '⏸️' : '▶️'}
            </span>
            <span>{animationEnabled ? 'Pause' : 'Play'}</span>
          </button>
        </div>
      </div>

      {/* System Components */}
      <div className="control-section">
        <h4>Components</h4>
        <div className="components-list">
          {components.map((component) => (
            <div
              key={component.id}
              className="component-item"
              onClick={() => handleComponentSelect(component)}
            >
              <div className="component-info">
                <h5>{component.name}</h5>
                <p>{component.description}</p>
              </div>
              <span className="component-arrow">▶</span>
            </div>
          ))}
        </div>
      </div>

      {/* System Stats */}
      <div className="control-section">
        <h4>System Statistics</h4>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Collection Potential</span>
            <span className="stat-value">
              {formatNumber(assessmentData?.potentialWaterCollection || 0)}L/year
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Storage Capacity</span>
            <span className="stat-value">
              {formatNumber(assessmentData?.recommendedSystem?.tankCapacityLiters || 0)}L
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Efficiency</span>
            <span className="stat-value">
              {((assessmentData?.feasibilityScore || 0) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Annual Savings</span>
            <span className="stat-value">
              ₹{formatNumber(assessmentData?.annualSavings || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="control-section">
        <h4>Actions</h4>
        <div className="action-buttons">
          <button className="action-button primary" onClick={handleExport}>
            <span className="action-icon">📤</span>
            Export 3D Model
          </button>
          <button className="action-button secondary" onClick={handleShare}>
            <span className="action-icon">🔗</span>
            Share Visualization
          </button>
        </div>
      </div>

      {/* Component Details Modal */}
      {showDetails && selectedComponent && (
        <div className="component-details-overlay" onClick={() => setShowDetails(false)}>
          <div className="component-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedComponent.name}</h3>
              <button
                className="close-button"
                onClick={() => setShowDetails(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <p className="component-description">
                {selectedComponent.description}
              </p>
              <div className="specs-list">
                <h4>Specifications</h4>
                {Object.entries(selectedComponent.specs).map(([key, value]) => (
                  <div key={key} className="spec-item">
                    <span className="spec-key">
                      {key.charAt(0).toUpperCase() + key.slice(1)}:
                    </span>
                    <span className="spec-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="modal-button"
                onClick={() => setShowDetails(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ARControls;