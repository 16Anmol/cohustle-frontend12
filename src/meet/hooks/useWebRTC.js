import { useRef, useState, useCallback, useEffect } from 'react';
import { profileApi } from '@/lib/api';

const FALLBACK_ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

async function getIceConfig() {
  try {
    const { iceServers } = await profileApi.getTurnCredentials();
    console.log('[WebRTC] ICE servers from backend:', iceServers.length);
    return { iceServers, iceCandidatePoolSize: 10 };
  } catch (e) {
    console.warn('[WebRTC] TURN fetch failed, using STUN only:', e);
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
  const pendingCandidates = useRef({});
  const iceConfigRef      = useRef({ iceServers: FALLBACK_ICE, iceCandidatePoolSize: 4 });
  const myPeerIdRef       = useRef(null);

  // Keep callbacks in refs so they never cause stale closure issues
  const onChatRef      = useRef(onChat);
  const onReactionRef  = useRef(onReaction);
  const onRaiseHandRef = useRef(onRaiseHand);
  useEffect(() => { onChatRef.current = onChat; },      [onChat]);
  useEffect(() => { onReactionRef.current = onReaction; }, [onReaction]);
  useEffect(() => { onRaiseHandRef.current = onRaiseHand; }, [onRaiseHand]);

  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const updatePeer = useCallback((peerId, patch) => {
    setPeers(prev => ({ ...prev, [peerId]: { ...(prev[peerId] || {}), ...patch } }));
  }, []);

  const removePeer = useCallback((peerId) => {
    pcsRef.current[peerId]?.close();
    delete pcsRef.current[peerId];
    setPeers(prev => { const n = { ...prev }; delete n[peerId]; return n; });
  }, []);

  const drainCandidates = useCallback(async (peerId) => {
    const pc = pcsRef.current[peerId];
    if (!pc?.remoteDescription) return;
    const list = pendingCandidates.current[peerId] || [];
    delete pendingCandidates.current[peerId];
    for (const c of list) {
      try { await pc.addIceCandidate(c); } catch {}
    }
  }, []);

  const createPC = useCallback((peerId) => {
    if (pcsRef.current[peerId]) return pcsRef.current[peerId];

    const pc = new RTCPeerConnection({
      ...iceConfigRef.current,
      bundlePolicy:  'max-bundle',
      rtcpMuxPolicy: 'require',
    });
    pcsRef.current[peerId] = pc;

    // Add local tracks
    const stream = localStreamRef.current;
    if (stream?.getTracks().length > 0) {
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
    } else {
      pc.addTransceiver('video', { direction: 'sendrecv' });
      pc.addTransceiver('audio', { direction: 'sendrecv' });
    }

    // Remote tracks — create new MediaStream each time to force React re-render
    const remoteStream = new MediaStream();

    pc.ontrack = (e) => {
      if (!e.track) return;
      console.log(`[ontrack] peer=${peerId} kind=${e.track.kind} state=${e.track.readyState}`);

      // Replace existing track of same kind
      remoteStream.getTracks()
        .filter(t => t.kind === e.track.kind)
        .forEach(t => remoteStream.removeTrack(t));
      remoteStream.addTrack(e.track);

      // IMPORTANT: pass a new MediaStream object so React state diff detects change
      updatePeer(peerId, { stream: new MediaStream(remoteStream.getTracks()), _ts: Date.now() });

      e.track.onunmute = () => {
        console.log(`[ontrack] ${peerId} ${e.track.kind} unmuted`);
        updatePeer(peerId, { stream: new MediaStream(remoteStream.getTracks()), _ts: Date.now() });
      };
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) send({ type: 'ice-candidate', target: peerId, candidate: e.candidate });
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[ICE] ${peerId} → ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'disconnected') {
        setTimeout(() => {
          const cur = pcsRef.current[peerId];
          if (cur?.iceConnectionState !== 'connected' &&
              cur?.iceConnectionState !== 'completed' &&
              cur?.signalingState === 'stable') {
            cur.createOffer({ iceRestart: true })
              .then(o => cur.setLocalDescription(o))
              .then(() => send({ type: 'offer', target: peerId, sdp: cur.localDescription }))
              .catch(() => {});
          }
        }, 3000);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[PC] ${peerId} → ${pc.connectionState}`);
      if (pc.connectionState === 'failed') {
        if (pc.signalingState === 'stable') {
          pc.createOffer({ iceRestart: true })
            .then(o => pc.setLocalDescription(o))
            .then(() => send({ type: 'offer', target: peerId, sdp: pc.localDescription }))
            .catch(() => removePeer(peerId));
        } else {
          removePeer(peerId);
        }
      }
    };

    pc.onsignalingstatechange = async () => {
      if (pc.signalingState === 'stable') await drainCandidates(peerId);
    };

    return pc;
  }, [send, updatePeer, removePeer, drainCandidates]);

  // ── Signaling ──────────────────────────────────────────────────────────────

  const handleMessage = useCallback(async (msg) => {
    switch (msg.type) {

      case 'joined': {
        myPeerIdRef.current = msg.peer_id;
        setMyPeerId(msg.peer_id);
        setIsHost(msg.is_host === true || !msg.members?.length);
        setWaitingState(null);
        for (const m of (msg.members || [])) {
          updatePeer(m.peer_id, { name: m.name, stream: null });
          const pc = createPC(m.peer_id);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          send({ type: 'offer', target: m.peer_id, sdp: pc.localDescription });
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

      case 'admission_request':
        setAdmissionQueue(prev => [...prev, { peer_id: msg.peer_id, name: msg.name }]);
        break;

      case 'peer_joined':
        updatePeer(msg.peer_id, { name: msg.name, stream: null });
        createPC(msg.peer_id);
        break;

      case 'peer_left':
        removePeer(msg.peer_id);
        break;

      case 'offer': {
        const pc = pcsRef.current[msg.from] || createPC(msg.from);
        if (pc.signalingState === 'have-local-offer') {
          try { await pc.setLocalDescription({ type: 'rollback' }); } catch {}
        }
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
        if (pc?.signalingState === 'have-local-offer') {
          try {
            await pc.setRemoteDescription(msg.sdp);
            await drainCandidates(msg.from);
          } catch (e) {
            console.warn('[answer] setRemoteDescription failed:', e.message);
          }
        }
        break;
      }

      case 'ice-candidate': {
        const pc = pcsRef.current[msg.from];
        if (!pc) return;
        if (pc.remoteDescription?.type) {
          try { await pc.addIceCandidate(msg.candidate); } catch {}
        } else {
          if (!pendingCandidates.current[msg.from]) pendingCandidates.current[msg.from] = [];
          pendingCandidates.current[msg.from].push(msg.candidate);
        }
        break;
      }

      // Use refs for callbacks — avoids stale closure
      case 'chat':       onChatRef.current?.(msg);      break;
      case 'reaction':   onReactionRef.current?.(msg);  break;
      case 'raise-hand': onRaiseHandRef.current?.(msg); break;

      case 'media-state':
        updatePeer(msg.from, { audio: msg.audio, video: msg.video, screen: msg.screen });
        break;

      default: break;
    }
  }, [createPC, drainCandidates, send, updatePeer, removePeer]);

  const handleMessageRef = useRef(handleMessage);
  useEffect(() => { handleMessageRef.current = handleMessage; }, [handleMessage]);

  // ── Connect ────────────────────────────────────────────────────────────────

  const connect = useCallback(async (stream) => {
    if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) return;

    iceConfigRef.current = await getIceConfig();
    localStreamRef.current = stream;

    const WS_URL = import.meta.env.VITE_WEBRTC_WS_URL || `ws://${window.location.hostname}:8765`;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen  = () => { setWsState('open'); ws.send(JSON.stringify({ type: 'join', room_id: roomId, name: myName })); };
    ws.onmessage = e => { try { handleMessageRef.current(JSON.parse(e.data)); } catch {} };
    ws.onclose = () => setWsState('closed');
    ws.onerror = () => setWsState('closed');
  }, [roomId, myName]); // eslint-disable-line

  // ── Media controls ─────────────────────────────────────────────────────────

  const setAudio = useCallback((on) => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = on; });
    send({ type: 'media-state', audio: on });
  }, [send]);

  const setVideo = useCallback((on) => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = on; });
    send({ type: 'media-state', video: on });
  }, [send]);

  const startScreenShare = useCallback(async () => {
    try {
      const ss = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const track = ss.getVideoTracks()[0];
      origCamTrackRef.current = localStreamRef.current?.getVideoTracks()[0] || null;
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(t => localStreamRef.current.removeTrack(t));
        localStreamRef.current.addTrack(track);
      }
      for (const [pid, pc] of Object.entries(pcsRef.current)) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video' || !s.track);
        if (sender) await sender.replaceTrack(track);
      }
      send({ type: 'media-state', screen: true });
      return track;
    } catch { return null; }
  }, [send]);

  const stopScreenShare = useCallback(async () => {
    let cam = origCamTrackRef.current;
    if (!cam || cam.readyState === 'ended') {
      try { cam = (await navigator.mediaDevices.getUserMedia({ video: true })).getVideoTracks()[0]; } catch { cam = null; }
    }
    if (localStreamRef.current && cam) {
      localStreamRef.current.getVideoTracks().forEach(t => localStreamRef.current.removeTrack(t));
      localStreamRef.current.addTrack(cam);
    }
    for (const pc of Object.values(pcsRef.current)) {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video' || !s.track);
      if (sender) await sender.replaceTrack(cam || null);
    }
    origCamTrackRef.current = null;
    send({ type: 'media-state', screen: false });
  }, [send]);

  // sendChat adds to local state AND sends to server so own messages appear instantly
  const sendChat = useCallback((message) => {
    send({ type: 'chat', message });
    // Add own message locally immediately (server broadcasts to others only)
    onChatRef.current?.({
      from:      myPeerIdRef.current,
      name:      myName,
      message,
      timestamp: new Date().toISOString(),
    });
  }, [send, myName]);

  const sendReaction  = useCallback((emoji)  => send({ type: 'reaction',   emoji }),        [send]);
  const sendRaiseHand = useCallback((raised)  => send({ type: 'raise-hand', raised }),       [send]);
  const admitPeer     = useCallback((id, a)   => { send({ type: 'admit', peer_id: id, admit: a }); setAdmissionQueue(p => p.filter(x => x.peer_id !== id)); }, [send]);
  const endMeeting    = useCallback(()        => send({ type: 'end_meeting' }),              [send]);

  useEffect(() => () => {
    wsRef.current?.close();
    Object.values(pcsRef.current).forEach(pc => pc.close());
  }, []);

  return {
    peers, myPeerId, wsState, localStreamRef, connect,
    setAudio, setVideo, startScreenShare, stopScreenShare,
    isHost, waitingState, admissionQueue, admitPeer, endMeeting,
    sendChat, sendReaction, sendRaiseHand,
  };
}
