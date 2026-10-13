import { useState, useEffect } from 'react'

export default function DynamicStats() {
  const [stats, setStats] = useState({
    animalsRegistered: 10247,
    aiAccuracy: 94.7,
    activeUsers: 523,
    breedTypes: 47
  })

  useEffect(() => {
    // Real-time dynamic updates interval
    const interval = setInterval(() => {
      setStats(prevStats => ({
        animalsRegistered: prevStats.animalsRegistered + Math.floor(Math.random() * 5) + 1,
        aiAccuracy: Math.min(99.9, prevStats.aiAccuracy + (Math.random() - 0.5) * 0.2),
        activeUsers: prevStats.activeUsers + Math.floor(Math.random() * 3),
        breedTypes: prevStats.breedTypes + (Math.random() > 0.9 ? 1 : 0)
      }))
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="pv-stats-grid">
      {/* 1. Animals Registered */}
      <div className="pv-stat-card">
        <div className="pv-stat-number" style={{ color: '#16a34a' }}>
          {stats.animalsRegistered.toLocaleString()}+
        </div>
        <div className="pv-stat-label">
          Animals Registered
        </div>
        <div className="pv-stat-update">
          <span className="pv-stat-update-icon">↗</span> Live Updates
        </div>
      </div>
      
      {/* 2. AI Accuracy Rate */}
      <div className="pv-stat-card">
        <div className="pv-stat-number" style={{ color: '#1565c0' }}>
          {stats.aiAccuracy.toFixed(1)}%
        </div>
        <div className="pv-stat-label">
          AI Accuracy Rate
        </div>
        <div className="pv-stat-update">
          <span className="pv-stat-update-icon">↗</span> Live Updates
        </div>
      </div>
      
      {/* 3. Active Users */}
      <div className="pv-stat-card">
        <div className="pv-stat-number" style={{ color: '#eab308' }}>
          {stats.activeUsers.toLocaleString()}+
        </div>
        <div className="pv-stat-label">
          Active Users
        </div>
        <div className="pv-stat-update">
          <span className="pv-stat-update-icon">↗</span> Live Updates
        </div>
      </div>
      
      {/* 4. Breed Types */}
      <div className="pv-stat-card">
        <div className="pv-stat-number" style={{ color: '#6d4c41' }}>
          {stats.breedTypes}+
        </div>
        <div className="pv-stat-label">
          Breed Types
        </div>
        <div className="pv-stat-update">
          <span className="pv-stat-update-icon">↗</span> Live Updates
        </div>
      </div>
    </div>
  )
}
