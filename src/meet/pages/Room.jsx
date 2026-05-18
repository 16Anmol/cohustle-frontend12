import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { messagesApi } from '@/lib/api';
import { useWebRTC } from '../hooks/useWebRTC';
import VideoTile from '../components/VideoTile';
import Controls from '../components/Controls';
import ChatPanel from '../components/ChatPanel';
import ReactionsOverlay, { useReactions } from '../components/ReactionsOverlay';
import styles from './Room.module.css';

// Compute grid columns based on participant count
function getGridStyle(total, isMobile) {
  if (isMobile) {
    // Mobile: 1 col for 1-2 people, 2 cols for 3+
    const cols = total <= 2 ? 1 : 2;
    const rows = Math.ceil(total / cols);
    return { gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` };
  }
  const cols = total === 1 ? 1 : total <= 4 ? 2 : total <= 9 ? 3 : 4;
  const rows = Math.ceil(total / cols);
  return { gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` };
}

export default function Room() {
  const { roomId } = useParams();
  const nav        = useNavigate();
  const myName     = sessionStorage.getItem('nexmeet_name') || 'Guest';
  const isMobile   = window.innerWidth <= 640;

  const [chatOpen,      setChatOpen]      = useState(false);
  const [audioOn,       setAudioOn]       = useState(true);
  const [videoOn,       setVideoOn]       = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised,    setHandRaised]    = useState(false);
  const [messages,      setMessages]      = useState([]);
  const [toast,         setToast]         = useState(null);
  const [localStream,   setLocalStream]   = useState(null);
  const [peersState,    setPeersState]    = useState({});
  const [confirmEnd,    setConfirmEnd]    = useState(false);
  const screenTrackRef = useRef(null);
  const { floaters, addReaction } = useReactions();

  const showToast = useCallback((text) => {
    setToast(text);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const onChat      = useCallback((msg) => setMessages(prev => [...prev, msg]), []);
  const onReaction  = useCallback((msg) => addReaction(msg.emoji, msg.name), [addReaction]);
  const onRaiseHand = useCallback((msg) => {
    showToast(`${msg.name} ${msg.raised ? 'raised their hand ✋' : 'lowered their hand'}`);
    setPeersState(prev => ({ ...prev, [msg.from]: { ...prev[msg.from], handRaised: msg.raised } }));
  }, [showToast]);

  const {
    peers, myPeerId, wsState,
    localStreamRef, connect,
    setAudio, setVideo,
    startScreenShare, stopScreenShare,
    sendChat, sendReaction, sendRaiseHand,
    isHost, waitingState, admissionQueue, admitPeer, endMeeting,
  } = useWebRTC({ roomId, myName, onChat, onReaction, onRaiseHand });

  // Get camera + mic then connect
  useEffect(() => {
    let mounted = true;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        setLocalStream(stream);
        connect(stream);
      })
      .catch(() => {
        // Camera failed — try audio only
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => { if (!mounted) return; setLocalStream(stream); connect(stream); })
          .catch(() => connect(null));
      });
    return () => { mounted = false; };
  }, [connect]);

  // Redirect non-hosts when meeting ends
  useEffect(() => {
    if (waitingState === 'ended' && !isHost) {
      showToast('The host has ended the meeting.');
      setTimeout(() => nav('/'), 2000);
    }
  }, [waitingState, isHost, nav, showToast]);

  const toggleAudio = () => { const n = !audioOn;  setAudioOn(n);  setAudio(n);  };
  const toggleVideo = () => { const n = !videoOn;  setVideoOn(n);  setVideo(n);  };

  const toggleScreen = async () => {
    if (screenSharing) {
      screenTrackRef.current?.stop();
      screenTrackRef.current = null;
      await stopScreenShare();
      setScreenSharing(false);
      if (localStreamRef.current) {
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
    } else {
      const track = await startScreenShare();
      if (track) {
        screenTrackRef.current = track;
        setScreenSharing(true);
        const preview = new MediaStream([track]);
        localStreamRef.current?.getAudioTracks().forEach(t => preview.addTrack(t));
        setLocalStream(preview);
        track.onended = async () => {
          setScreenSharing(false);
          screenTrackRef.current = null;
          await stopScreenShare();
          if (localStreamRef.current) {
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
          }
        };
      } else {
        showToast('Screen share cancelled or not allowed by browser.');
      }
    }
  };

  const toggleHand    = () => { const n = !handRaised; setHandRaised(n); sendRaiseHand(n); };
  const handleReaction = (emoji) => { addReaction(emoji, 'You'); sendReaction(emoji); };

  const handleLeave = () => {
    localStream?.getTracks().forEach(t => t.stop());
    nav('/');
  };

  const handleEndMeeting = async () => {
    endMeeting();
    localStream?.getTracks().forEach(t => t.stop());
    try { await messagesApi.endMeetingByRoomId(roomId); } catch {}
    nav('/');
  };

  const peerList   = Object.entries(peers);
  const total      = 1 + peerList.length;
  const gridStyle  = getGridStyle(total, isMobile);

  // ── Waiting screens ────────────────────────────────────────────────────────
  if (waitingState === 'waiting') return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f1a', fontFamily: 'Inter, sans-serif', padding: '1rem' }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Waiting for host</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>The host will admit you shortly...</p>
        <div style={{ marginTop: 24, width: 40, height: 4, background: 'linear-gradient(90deg,#8b5cf6,#06b6d4)', borderRadius: 2, margin: '24px auto 0', animation: 'pulse 1.5s ease-in-out infinite' }}/>
      </div>
    </div>
  );

  if (waitingState === 'denied') return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f1a', fontFamily: 'Inter, sans-serif', padding: '1rem' }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Entry denied</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>The host did not admit you.</p>
        <button onClick={() => nav('/')} style={{ marginTop: 24, padding: '10px 24px', borderRadius: 10, border: 'none', background: '#8b5cf6', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Go back
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.layout} data-meet="true">
      <div className={styles.main}>

        {/* Header */}
        <div className={styles.topBar}>
          <div className={styles.logo}>⬡ CoHustle</div>
          <div className={styles.roomInfo}>
            <span className={`${styles.dot} ${wsState === 'open' ? styles.dotGreen : styles.dotAmber}`} />
            <span className={styles.roomCode}>{roomId}</span>
            {isHost && (
              <span style={{ background: '#8b5cf6', color: 'white', borderRadius: 6, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>HOST</span>
            )}
          </div>
          <div className={styles.peerCount}>{total} participant{total !== 1 ? 's' : ''}</div>
        </div>

        {/* Admission queue (host only) */}
        {isHost && admissionQueue.length > 0 && (
          <div style={{ background: '#1e1b4b', borderBottom: '1px solid rgba(139,92,246,0.3)', padding: '8px 16px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>🔔 Waiting:</span>
            {admissionQueue.map(g => (
              <div key={g.peer_id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '4px 10px' }}>
                <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{g.name}</span>
                <button onClick={() => admitPeer(g.peer_id, true)}
                  style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Admit
                </button>
                <button onClick={() => admitPeer(g.peer_id, false)}
                  style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Deny
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Video grid */}
        <div className={styles.videoArea}>
          <div className={styles.grid} style={gridStyle}>
            <VideoTile
              stream={localStream}
              name={`${myName}${isHost ? ' (Host)' : ''}`}
              muted
              audioOn={audioOn}
              videoOn={videoOn}
              isLocal
              handRaised={handRaised}
            />
            {peerList.map(([pid, peer]) => (
              <VideoTile
                key={pid}
                stream={peer.stream}
                name={peer.name}
                audioOn={peer.audio !== false}
                videoOn={peer.video !== false}
                handRaised={peersState[pid]?.handRaised}
              />
            ))}
          </div>

          <ReactionsOverlay floaters={floaters} />

          {peerList.length === 0 && (
            <div style={{
              position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: 12, padding: '8px 20px',
              color: 'rgba(255,255,255,0.7)', fontSize: 13, pointerEvents: 'none',
              backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
            }}>
              Waiting for others to join...
            </div>
          )}
        </div>

        {/* Controls */}
        <Controls
          audioOn={audioOn} videoOn={videoOn}
          screenSharing={screenSharing} handRaised={handRaised}
          onToggleAudio={toggleAudio} onToggleVideo={toggleVideo}
          onToggleScreen={toggleScreen} onToggleHand={toggleHand}
          onReaction={handleReaction} onLeave={handleLeave}
          onToggleChat={() => setChatOpen(v => !v)} chatOpen={chatOpen}
          roomId={roomId} isHost={isHost}
          onEndMeeting={() => setConfirmEnd(true)}
        />
      </div>

      {/* Chat sidebar */}
      {chatOpen && (
        <div className={styles.sidebar}>
          <ChatPanel messages={messages} onSend={sendChat} myPeerId={myPeerId} />
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}

      {/* End meeting confirm */}
      {confirmEnd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: '#1e1b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '2rem', textAlign: 'center', maxWidth: 360, width: '100%' }}>
            <p style={{ color: 'white', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>End meeting for everyone?</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '0 0 24px' }}>All participants will be disconnected.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmEnd(false)}
                style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleEndMeeting}
                style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#ef4444', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                End for Everyone
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
