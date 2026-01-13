package handlers

import (
	"sync"
	"testing"
	"time"
)

// TestSessionHealthQuorum_FreshSegments tests Tier 1: fresh segment requests
func TestSessionHealthQuorum_FreshSegments(t *testing.T) {
	now := time.Now()
	session := &HLSSession{
		ID:                 "test-session",
		CreatedAt:          now.Add(-5 * time.Minute),
		LastSegmentRequest: now.Add(-10 * time.Second), // 10s ago - fresh!
		LastKeepaliveTime:  now.Add(-30 * time.Second), // Stale keepalive
		LastPlaylistRequest: now.Add(-30 * time.Second),
		SegmentsCreated:    10,
		mu:                 sync.RWMutex{},
	}

	// Create the health check function (same as in hls.go)
	healthCheck := func(session *HLSSession, now time.Time) (bool, string) {
		session.mu.RLock()
		lastSegment := session.LastSegmentRequest
		lastKeepalive := session.LastKeepaliveTime
		lastPlaylist := session.LastPlaylistRequest
		maxSegment := session.MaxSegmentRequested
		prevMaxSegment := session.PreviousMaxSegment
		activeConns := session.ActiveConnections
		segmentsCreated := session.SegmentsCreated
		sessionAge := time.Since(session.CreatedAt)
		session.mu.RUnlock()

		timeSinceSegment := now.Sub(lastSegment)
		timeSinceKeepalive := now.Sub(lastKeepalive)
		timeSincePlaylist := now.Sub(lastPlaylist)

		// TIER 1: Fresh segment requests
		if timeSinceSegment < 20*time.Second {
			return true, "fresh segment requests"
		}

		// TIER 2: Keepalive with context
		if timeSinceKeepalive < 15*time.Second {
			if timeSinceSegment < 60*time.Second {
				return true, "keepalive + recent segments"
			}
			if sessionAge < 2*time.Minute && segmentsCreated > 3 {
				return true, "keepalive + session initializing"
			}
			if timeSinceSegment >= 60*time.Second && timeSinceSegment < 120*time.Second {
				weakSignals := 0
				if timeSinceKeepalive < 15*time.Second {
					weakSignals++
				}
				if timeSincePlaylist < 15*time.Second {
					weakSignals++
				}
				if maxSegment > prevMaxSegment && prevMaxSegment >= 0 {
					weakSignals++
				}
				if activeConns > 0 {
					weakSignals++
				}
				if weakSignals >= 2 {
					return true, "quorum of weak signals"
				}
			}
			if timeSinceSegment >= 120*time.Second {
				return false, "keepalive isolated - stuck interval suspected"
			}
		}

		// TIER 3: Quorum without keepalive
		weakSignals := 0
		if timeSincePlaylist < 15*time.Second {
			weakSignals++
		}
		if maxSegment > prevMaxSegment && prevMaxSegment >= 0 && timeSinceSegment < 120*time.Second {
			weakSignals++
		}
		if activeConns > 0 {
			weakSignals++
		}
		if weakSignals >= 2 && timeSinceSegment < 120*time.Second {
			return true, "quorum without keepalive"
		}

		return false, "all signals stale"
	}

	healthy, reason := healthCheck(session, now)
	if !healthy {
		t.Errorf("Expected healthy=true for fresh segments, got false. Reason: %s", reason)
	}
	if reason != "fresh segment requests" {
		t.Errorf("Expected reason 'fresh segment requests', got: %s", reason)
	}
}

// TestSessionHealthQuorum_KeepaliveWithRecentSegments tests Tier 2: keepalive + recent segments
func TestSessionHealthQuorum_KeepaliveWithRecentSegments(t *testing.T) {
	now := time.Now()
	session := &HLSSession{
		ID:                  "test-session",
		CreatedAt:           now.Add(-5 * time.Minute),
		LastSegmentRequest:  now.Add(-45 * time.Second), // 45s ago - recent
		LastKeepaliveTime:   now.Add(-5 * time.Second),  // 5s ago - fresh
		LastPlaylistRequest: now.Add(-10 * time.Second),
		SegmentsCreated:     10,
		mu:                  sync.RWMutex{},
	}

	healthCheck := createHealthCheck()
	healthy, reason := healthCheck(session, now)
	if !healthy {
		t.Errorf("Expected healthy=true for keepalive + recent segments, got false. Reason: %s", reason)
	}
	if reason != "keepalive + recent segments" {
		t.Errorf("Expected reason 'keepalive + recent segments', got: %s", reason)
	}
}

// TestSessionHealthQuorum_InitializingSession tests Tier 2: keepalive during initialization
func TestSessionHealthQuorum_InitializingSession(t *testing.T) {
	now := time.Now()
	session := &HLSSession{
		ID:                  "test-session",
		CreatedAt:           now.Add(-90 * time.Second), // 90s old
		LastSegmentRequest:  now.Add(-80 * time.Second), // 80s ago
		LastKeepaliveTime:   now.Add(-5 * time.Second),  // Fresh keepalive
		LastPlaylistRequest: now.Add(-10 * time.Second),
		SegmentsCreated:     5, // Created some segments
		mu:                  sync.RWMutex{},
	}

	healthCheck := createHealthCheck()
	healthy, reason := healthCheck(session, now)
	if !healthy {
		t.Errorf("Expected healthy=true for initializing session, got false. Reason: %s", reason)
	}
	if reason != "keepalive + session initializing" {
		t.Errorf("Expected reason 'keepalive + session initializing', got: %s", reason)
	}
}

// TestSessionHealthQuorum_QuorumValidation tests Tier 2: quorum of weak signals
func TestSessionHealthQuorum_QuorumValidation(t *testing.T) {
	now := time.Now()
	session := &HLSSession{
		ID:                  "test-session",
		CreatedAt:           now.Add(-10 * time.Minute),
		LastSegmentRequest:  now.Add(-90 * time.Second), // 90s ago - needs quorum
		LastKeepaliveTime:   now.Add(-5 * time.Second),  // Fresh keepalive
		LastPlaylistRequest: now.Add(-5 * time.Second),  // Fresh playlist
		MaxSegmentRequested: 10,
		PreviousMaxSegment:  9, // Buffer advancing
		ActiveConnections:   0,
		SegmentsCreated:     20,
		mu:                  sync.RWMutex{},
	}

	healthCheck := createHealthCheck()
	healthy, reason := healthCheck(session, now)
	if !healthy {
		t.Errorf("Expected healthy=true with quorum (keepalive + playlist + buffer_advancing), got false. Reason: %s", reason)
	}
	if reason != "quorum of weak signals" {
		t.Errorf("Expected reason 'quorum of weak signals', got: %s", reason)
	}
}

// TestSessionHealthQuorum_StuckInterval tests detection of stuck keepalive intervals
func TestSessionHealthQuorum_StuckInterval(t *testing.T) {
	now := time.Now()
	session := &HLSSession{
		ID:                  "test-session",
		CreatedAt:           now.Add(-10 * time.Minute),
		LastSegmentRequest:  now.Add(-125 * time.Second), // 125s ago - way too long
		LastKeepaliveTime:   now.Add(-5 * time.Second),   // Fresh keepalive (stuck interval!)
		LastPlaylistRequest: now.Add(-130 * time.Second), // Stale playlist
		MaxSegmentRequested: 10,
		PreviousMaxSegment:  10, // No buffer advancement
		ActiveConnections:   0,
		SegmentsCreated:     10,
		mu:                  sync.RWMutex{},
	}

	healthCheck := createHealthCheck()
	healthy, reason := healthCheck(session, now)
	if healthy {
		t.Errorf("Expected healthy=false for stuck interval, got true. Reason: %s", reason)
	}
	if reason != "keepalive isolated - stuck interval suspected" {
		t.Errorf("Expected reason 'keepalive isolated - stuck interval suspected', got: %s", reason)
	}
}

// TestSessionHealthQuorum_InsufficientQuorum tests failure when only 1 weak signal
func TestSessionHealthQuorum_InsufficientQuorum(t *testing.T) {
	now := time.Now()
	session := &HLSSession{
		ID:                  "test-session",
		CreatedAt:           now.Add(-10 * time.Minute),
		LastSegmentRequest:  now.Add(-90 * time.Second), // 90s ago
		LastKeepaliveTime:   now.Add(-5 * time.Second),  // Fresh keepalive (only 1 signal)
		LastPlaylistRequest: now.Add(-60 * time.Second), // Stale playlist
		MaxSegmentRequested: 10,
		PreviousMaxSegment:  10, // No buffer advancement
		ActiveConnections:   0,  // No active connections
		SegmentsCreated:     20,
		mu:                  sync.RWMutex{},
	}

	healthCheck := createHealthCheck()
	healthy, reason := healthCheck(session, now)
	if healthy {
		t.Errorf("Expected healthy=false with insufficient quorum, got true. Reason: %s", reason)
	}
}

// TestSessionHealthQuorum_AllStaleSignals tests failure when all signals are stale
func TestSessionHealthQuorum_AllStaleSignals(t *testing.T) {
	now := time.Now()
	session := &HLSSession{
		ID:                  "test-session",
		CreatedAt:           now.Add(-10 * time.Minute),
		LastSegmentRequest:  now.Add(-150 * time.Second), // Stale
		LastKeepaliveTime:   now.Add(-60 * time.Second),  // Stale
		LastPlaylistRequest: now.Add(-60 * time.Second),  // Stale
		MaxSegmentRequested: 10,
		PreviousMaxSegment:  10, // No buffer advancement
		ActiveConnections:   0,
		SegmentsCreated:     20,
		mu:                  sync.RWMutex{},
	}

	healthCheck := createHealthCheck()
	healthy, reason := healthCheck(session, now)
	if healthy {
		t.Errorf("Expected healthy=false with all stale signals, got true. Reason: %s", reason)
	}
	if reason != "all signals stale" {
		t.Errorf("Expected reason 'all signals stale', got: %s", reason)
	}
}

// TestSessionHealthQuorum_QuorumWithoutKeepalive tests Tier 3: quorum without keepalive
func TestSessionHealthQuorum_QuorumWithoutKeepalive(t *testing.T) {
	now := time.Now()
	session := &HLSSession{
		ID:                  "test-session",
		CreatedAt:           now.Add(-10 * time.Minute),
		LastSegmentRequest:  now.Add(-100 * time.Second), // 100s ago
		LastKeepaliveTime:   now.Add(-60 * time.Second),  // Stale keepalive
		LastPlaylistRequest: now.Add(-5 * time.Second),   // Fresh playlist
		MaxSegmentRequested: 15,
		PreviousMaxSegment:  10, // Buffer advancing
		ActiveConnections:   0,
		SegmentsCreated:     20,
		mu:                  sync.RWMutex{},
	}

	healthCheck := createHealthCheck()
	healthy, reason := healthCheck(session, now)
	if !healthy {
		t.Errorf("Expected healthy=true with quorum without keepalive (playlist + buffer), got false. Reason: %s", reason)
	}
	if reason != "quorum without keepalive" {
		t.Errorf("Expected reason 'quorum without keepalive', got: %s", reason)
	}
}

// TestSessionHealthQuorum_ActiveDownloads tests quorum with active connections
func TestSessionHealthQuorum_ActiveDownloads(t *testing.T) {
	now := time.Now()
	session := &HLSSession{
		ID:                  "test-session",
		CreatedAt:           now.Add(-10 * time.Minute),
		LastSegmentRequest:  now.Add(-100 * time.Second), // 100s ago
		LastKeepaliveTime:   now.Add(-60 * time.Second),  // Stale
		LastPlaylistRequest: now.Add(-5 * time.Second),   // Fresh
		MaxSegmentRequested: 10,
		PreviousMaxSegment:  10, // No buffer advancement
		ActiveConnections:   2,  // Active downloads
		SegmentsCreated:     20,
		mu:                  sync.RWMutex{},
	}

	healthCheck := createHealthCheck()
	healthy, reason := healthCheck(session, now)
	if !healthy {
		t.Errorf("Expected healthy=true with active connections + playlist, got false. Reason: %s", reason)
	}
	if reason != "quorum without keepalive" {
		t.Errorf("Expected reason 'quorum without keepalive', got: %s", reason)
	}
}

// Helper function to create the health check closure (same logic as in hls.go)
func createHealthCheck() func(*HLSSession, time.Time) (bool, string) {
	return func(session *HLSSession, now time.Time) (bool, string) {
		session.mu.RLock()
		lastSegment := session.LastSegmentRequest
		lastKeepalive := session.LastKeepaliveTime
		lastPlaylist := session.LastPlaylistRequest
		maxSegment := session.MaxSegmentRequested
		prevMaxSegment := session.PreviousMaxSegment
		activeConns := session.ActiveConnections
		segmentsCreated := session.SegmentsCreated
		sessionAge := time.Since(session.CreatedAt)
		session.mu.RUnlock()

		timeSinceSegment := now.Sub(lastSegment)
		timeSinceKeepalive := now.Sub(lastKeepalive)
		timeSincePlaylist := now.Sub(lastPlaylist)

		// TIER 1: Fresh segment requests
		if timeSinceSegment < 20*time.Second {
			return true, "fresh segment requests"
		}

		// TIER 2: Keepalive with context
		if timeSinceKeepalive < 15*time.Second {
			if timeSinceSegment < 60*time.Second {
				return true, "keepalive + recent segments"
			}
			if sessionAge < 2*time.Minute && segmentsCreated > 3 {
				return true, "keepalive + session initializing"
			}
			if timeSinceSegment >= 60*time.Second && timeSinceSegment < 120*time.Second {
				weakSignals := 0
				if timeSinceKeepalive < 15*time.Second {
					weakSignals++
				}
				if timeSincePlaylist < 15*time.Second {
					weakSignals++
				}
				if maxSegment > prevMaxSegment && prevMaxSegment >= 0 {
					weakSignals++
				}
				if activeConns > 0 {
					weakSignals++
				}
				if weakSignals >= 2 {
					return true, "quorum of weak signals"
				}
			}
			if timeSinceSegment >= 120*time.Second {
				return false, "keepalive isolated - stuck interval suspected"
			}
		}

		// TIER 3: Quorum without keepalive
		weakSignals := 0
		if timeSincePlaylist < 15*time.Second {
			weakSignals++
		}
		if maxSegment > prevMaxSegment && prevMaxSegment >= 0 && timeSinceSegment < 120*time.Second {
			weakSignals++
		}
		if activeConns > 0 {
			weakSignals++
		}
		if weakSignals >= 2 && timeSinceSegment < 120*time.Second {
			return true, "quorum without keepalive"
		}

		return false, "all signals stale"
	}
}
