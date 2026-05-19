import { useRef, useState, useCallback, useEffect } from 'react';
import { profileApi } from '@/lib/api';

// Fallback ICE config if backend fetch fails
const FALLBACK_ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// Fetch TURN credentials from our backend (stored securely in env vars)
async function getIceConfig() {
  try {
    const { iceServers } = await profileApi.getTurnCredentials();
    console.log('[WebRTC] ICE servers loaded from backend:', iceServers.length);
    return { iceServers, iceCandidatePoolSize: 10 };
  } catch (e) {
    console.warn('[WebRTC] Could not fetch TURN credentials, using STUN only:', e);
    return { iceServers: FALLBACK_ICE, iceCandidatePoolSize: 4 };
  }
}

export function useWebRTC({ roomId, myName, onChat, onReaction, onRaiseHand }) {
  const [peers,          setPeers]          = useState({});
  const [myPeerId,       setMyPeerId]       = useState(null);
  const [wsState,        setWsState]        = useState('connecting');
  const [isHost,         setIsHost]         = useState(false);
  const [waitingState,   setWaitingState]   = useState(null);
  const [admissionQueue, setAdmissionQueue] = useState([]);

  const wsRef             = useRef(null);
  const pcsRef            = useRef({});
  const localStreamRef    = useRef(null);
  const origCamTrackRef   = useRef(null);
  const pendingCandidates = useRef({});   // peer_id → [ICE candidates before remoteDesc is set]
  const remoteStreams      = useRef({});   // peer_id → MediaStream — kept alive across renders
  const iceConfigRef      = useRef({ iceServers: FALLBACK_ICE, iceCandidatePoolSize: 4 });

  // ── helpers ────────────────────────────────────────────────────────────────

  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const updatePeer = useCallback((peerId, patch) => {
    setPeers(prev => ({ ...prev, [peerId]: { ...prev[peerId], ...patch } }));
  }, []);

  const removePeer = useCallback((peerId) => {
    pcsRef.current[peerId]?.close();
    delete pcsRef.current[peerId];
    delete remoteStreams.current[peerId];
    setPeers(prev => { const n = { ...prev }; delete n[peerId]; return n; });
  }, []);

  // ── drain pending ICE candidates ───────────────────────────────────────────
  const drainCandidates = useCallback(async (peerId) => {
    const pc = pcsRef.current[peerId];
    if (!pc || !pc.remoteDescription) return;
    const list = pendingCandidates.current[peerId] || [];
    delete pendingCandidates.current[peerId];
    for (const c of list) {
      try { await pc.addIceCandidate(c); } catch {}
    }
  }, []);

  // ── create RTCPeerConnection ───────────────────────────────────────────────
  const createPC = useCallback((peerId, polite) => {
    if (pcsRef.current[peerId]) return pcsRef.current[peerId];

    const pc = new RTCPeerConnection({
      ...iceConfigRef.current,
      bundlePolicy:     'max-bundle',   // bundle all media on one transport — reduces TURN relay load
      rtcpMuxPolicy:    'require',      // mux RTCP with RTP — halves port usage
      iceCandidatePoolSize: 10,
    });
    pcsRef.current[peerId] = pc;

    // Add all local tracks
    const stream = localStreamRef.current;
    if (stream && stream.getTracks().length > 0) {
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
    } else {
      // No camera — add transceivers so screen share can replaceTrack later
      pc.addTransceiver('video', { direction: 'sendrecv' });
      pc.addTransceiver('audio', { direction: 'sendrecv' });
    }

    // Keep a stable MediaStream for this peer across track events
    if (!remoteStreams.current[peerId]) {
      remoteStreams.current[peerId] = new MediaStream();
    }

    // ── ontrack: add each incoming track to the stable stream ────────────────
    pc.ontrack = (e) => {
      if (!e.track) return;
      console.log(`[ontrack] ${peerId} got ${e.track.kind} track, readyState: ${e.track.readyState}`);

      const rs = remoteStreams.current[peerId];

      // Replace any existing track of the same kind
      rs.getTracks()
        .filter(t => t.kind === e.track.kind)
        .forEach(t => rs.removeTrack(t));
      rs.addTrack(e.track);

      // Create a NEW MediaStream object to force React/VideoTile to re-assign srcObject
      const freshStream = new MediaStream(rs.getTracks());
      remoteStreams.current[peerId] = freshStream;
      updatePeer(peerId, { stream: freshStream, _t: Date.now() });

      // Re-trigger update when track becomes active (unmuted)
      e.track.onunmute = () => {
        console.log(`[ontrack] ${peerId} ${e.track.kind} unmuted`);
        updatePeer(peerId, { stream: remoteStreams.current[peerId], _t: Date.now() });
      };
      e.track.onended = () => {
        remoteStreams.current[peerId]?.removeTrack(e.track);
        updatePeer(peerId, { stream: remoteStreams.current[peerId], _t: Date.now() });
      };
    };

    // ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        send({ type: 'ice-candidate', target: peerId, candidate: e.candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[ICE] ${peerId} state: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'disconnected') {
        // Brief disconnect — wait and try ICE restart
        setTimeout(() => {
          if (!pcsRef.current[peerId]) return; // already removed
          const cur = pcsRef.current[peerId];
          if (cur && cur.iceConnectionState !== 'connected' &&
              cur.iceConnectionState !== 'completed' &&
              cur.signalingState === 'stable') {
            console.log(`[ICE] ${peerId} still disconnected — restarting`);
            cur.createOffer({ iceRestart: true })
              .then(o => cur.setLocalDescription(o))
              .then(() => send({ type: 'offer', target: peerId, sdp: cur.localDescription }))
              .catch(() => {});
          }
        }, 3000);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[PC] ${peerId} connection: ${pc.connectionState}`);
      if (pc.connectionState === 'failed') {
        // Try ICE restart before removing peer
        if (pc.signalingState === 'stable') {
          console.log(`[PC] ${peerId} connection failed — restarting ICE`);
          pc.createOffer({ iceRestart: true })
            .then(offer => pc.setLocalDescription(offer))
            .then(() => send({ type: 'offer', target: peerId, sdp: pc.localDescription }))
            .catch(() => {
              // Only remove peer if restart fails
              console.log(`[PC] ${peerId} ICE restart failed — removing peer`);
              removePeer(peerId);
            });
        } else {
          removePeer(peerId);
        }
      }
    };

    // Drain pending ICE candidates once remote description is set
    pc.onsignalingstatechange = async () => {
      if (pc.signalingState === 'stable') await drainCandidates(peerId);
    };

    // Negotiation — polite peer defers; impolite peer initiates
    pc.onnegotiationneeded = async () => {
      try {
        if (!polite && pc.signalingState !== 'stable') return;
        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') return;
        await pc.setLocalDescription(offer);
        send({ type: 'offer', target: peerId, sdp: pc.localDescription });
      } catch (e) { console.warn('[WebRTC] onnegotiationneeded:', e); }
    };

    return pc;
  }, [send, updatePeer, removePeer, drainCandidates]);

  // ── signaling message handler ──────────────────────────────────────────────

  const handleMessage = useCallback(async (msg) => {
    switch (msg.type) {

      case 'joined': {
        setMyPeerId(msg.peer_id);
        const iAmHost = msg.is_host === true || !msg.members?.length;
        setIsHost(iAmHost);
        setWaitingState(null);
        // Connect to every member already in room
        for (const member of (msg.members || [])) {
          updatePeer(member.peer_id, { name: member.name, stream: null });
          const pc = createPC(member.peer_id, true); // we are polite — we join later
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          send({ type: 'offer', target: member.peer_id, sdp: pc.localDescription });
        }
        break;
      }

      case 'waiting':       setWaitingState('waiting'); break;
      case 'denied':        setWaitingState('denied');  break;
      case 'meeting_ended': {
        setWaitingState('ended');
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        break;
      }

      case 'admission_request': {
        setAdmissionQueue(prev => [...prev, { peer_id: msg.peer_id, name: msg.name }]);
        break;
      }

      case 'peer_joined': {
        updatePeer(msg.peer_id, { name: msg.name, stream: null });
        createPC(msg.peer_id, false); // existing peer is impolite
        break;
      }

      case 'peer_left': removePeer(msg.peer_id); break;

      case 'offer': {
        const pc = pcsRef.current[msg.from] || createPC(msg.from, false);
        // Glare handling: if we're already in have-local-offer, rollback first
        if (pc.signalingState === 'have-local-offer') {
          await pc.setLocalDescription({ type: 'rollback' });
        }
        // Only process if we're in a state that can accept an offer
        if (pc.signalingState === 'stable' || pc.signalingState === 'have-remote-offer') {
          await pc.setRemoteDescription(msg.sdp);
          await drainCandidates(msg.from);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          send({ type: 'answer', target: msg.from, sdp: pc.localDescription });
        }
        break;
      }

      case 'answer': {
        const pc = pcsRef.current[msg.from];
        if (pc && pc.signalingState === 'have-local-offer') {
          // Only accept answer when we actually sent an offer
          try {
            await pc.setRemoteDescription(msg.sdp);
            await drainCandidates(msg.from);
          } catch (e) {
            console.warn('[WebRTC] setRemoteDescription(answer) failed:', pc.signalingState, e.message);
          }
        }
        break;
      }

      case 'ice-candidate': {
        const pc = pcsRef.current[msg.from];
        if (!pc) return;
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try { await pc.addIceCandidate(msg.candidate); } catch {}
        } else {
          // Buffer until remoteDescription is set
          if (!pendingCandidates.current[msg.from]) pendingCandidates.current[msg.from] = [];
          pendingCandidates.current[msg.from].push(msg.candidate);
        }
        break;
      }

      case 'chat':       onChat?.(msg);      break;
      case 'reaction':   onReaction?.(msg);  break;
      case 'raise-hand': onRaiseHand?.(msg); break;

      case 'media-state': {
        updatePeer(msg.from, {
          audio: msg.audio, video: msg.video, screen: msg.screen,
        });
        break;
      }

      default: break;
    }
  }, [createPC, drainCandidates, send, updatePeer, removePeer, onChat, onReaction, onRaiseHand]);

  // Keep handleMessage in ref so connect() stays stable
  const handleMessageRef = useRef(handleMessage);
  useEffect(() => { handleMessageRef.current = handleMessage; }, [handleMessage]);

  // ── connect WebSocket ──────────────────────────────────────────────────────

  const connect = useCallback(async (stream) => {
    if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) return;

    // Fetch TURN credentials before creating any peer connections
    iceConfigRef.current = await getIceConfig();

    localStreamRef.current = stream;
    const WS_URL = import.meta.env.VITE_WEBRTC_WS_URL || `ws://${window.location.hostname}:8765`;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsState('open');
      ws.send(JSON.stringify({ type: 'join', room_id: roomId, name: myName }));
    };
    ws.onmessage = e => {
      try { handleMessageRef.current(JSON.parse(e.data)); } catch {}
    };
    ws.onclose = () => setWsState('closed');
    ws.onerror = () => setWsState('closed');
  }, [roomId, myName]); // eslint-disable-line

  // ── media controls ─────────────────────────────────────────────────────────

  const setAudio = useCallback((enabled) => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = enabled; });
    send({ type: 'media-state', audio: enabled });
  }, [send]);

  const setVideo = useCallback((enabled) => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = enabled; });
    send({ type: 'media-state', video: enabled });
  }, [send]);

  // ── screen share ───────────────────────────────────────────────────────────

  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true, // include system audio if browser allows
      });
      const screenTrack = screenStream.getVideoTracks()[0];

      // Save original camera track
      origCamTrackRef.current = localStreamRef.current?.getVideoTracks()[0] || null;

      // Update localStreamRef
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(t => localStreamRef.current.removeTrack(t));
        localStreamRef.current.addTrack(screenTrack);
      }

      // Replace in all peer connections
      for (const [peerId, pc] of Object.entries(pcsRef.current)) {
        try {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video' || s.track === null);
          if (sender) {
            await sender.replaceTrack(screenTrack);
          } else {
            pc.addTrack(screenTrack);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            send({ type: 'offer', target: peerId, sdp: pc.localDescription });
          }
        } catch (e) { console.error('[ScreenShare] peer', peerId, e); }
      }

      send({ type: 'media-state', screen: true });
      return screenTrack;
    } catch (err) {
      if (err.name !== 'NotAllowedError') console.error('Screen share error:', err);
      return null;
    }
  }, [send]);

  const stopScreenShare = useCallback(async () => {
    let camTrack = origCamTrackRef.current;
    if (!camTrack || camTrack.readyState === 'ended') {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        camTrack = s.getVideoTracks()[0];
      } catch { camTrack = null; }
    }

    if (localStreamRef.current && camTrack) {
      localStreamRef.current.getVideoTracks().forEach(t => localStreamRef.current.removeTrack(t));
      localStreamRef.current.addTrack(camTrack);
    }

    for (const pc of Object.values(pcsRef.current)) {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video' || s.track === null);
      if (sender) await sender.replaceTrack(camTrack || null);
    }

    origCamTrackRef.current = null;
    send({ type: 'media-state', screen: false });
  }, [send]);

  const sendChat      = useCallback((msg)   => send({ type: 'chat',       message: msg }), [send]);
  const sendReaction  = useCallback((emoji) => send({ type: 'reaction',   emoji }),        [send]);
  const sendRaiseHand = useCallback((raised)=> send({ type: 'raise-hand', raised }),       [send]);
  const admitPeer     = useCallback((id, a) => {
    send({ type: 'admit', peer_id: id, admit: a });
    setAdmissionQueue(p => p.filter(x => x.peer_id !== id));
  }, [send]);
  const endMeeting = useCallback(() => send({ type: 'end_meeting' }), [send]);

  // ── cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      wsRef.current?.close();
      Object.values(pcsRef.current).forEach(pc => pc.close());
    };
  }, []);

  return {
    peers, myPeerId, wsState, localStreamRef, connect,
    setAudio, setVideo, startScreenShare, stopScreenShare,
    isHost, waitingState, admissionQueue, admitPeer, endMeeting,
    sendChat, sendReaction, sendRaiseHand,
  };
}
