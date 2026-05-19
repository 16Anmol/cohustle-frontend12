import React, { useEffect, useRef, useState } from 'react';
import styles from './VideoTile.module.css';

export default function VideoTile({
  stream, name, muted = false,
  audioOn = true, videoOn = true,
  isLocal = false, handRaised = false,
  isScreenShare = false,
}) {
  const videoRef  = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!stream) {
      video.srcObject = null;
      setPlaying(false);
      return;
    }

    // Always assign fresh srcObject — forces browser to re-attach tracks
    video.srcObject = stream;
    video.muted = muted || isLocal;

    const tryPlay = () => {
      video.play()
        .then(() => {
          setPlaying(true);
          // Unmute remote video after play succeeds
          if (!isLocal && !muted) video.muted = false;
        })
        .catch(() => {
          // Browser blocked autoplay — play muted first
          video.muted = true;
          video.play()
            .then(() => {
              setPlaying(true);
              if (!isLocal && !muted) video.muted = false;
            })
            .catch(e => console.warn('[VideoTile] play failed:', e));
        });
    };

    // Small delay lets the stream stabilise before playing
    const t = setTimeout(tryPlay, 80);
    return () => clearTimeout(t);
  }, [stream]); // new stream object = re-run = re-attach srcObject

  // Sync muted prop changes (e.g. user mutes/unmutes)
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted || isLocal;
    }
  }, [muted, isLocal]);

  const hasVideo = stream && stream.getVideoTracks().some(t => t.readyState === 'live' && t.enabled);
  const showVideo = hasVideo && videoOn;
  const initials  = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className={styles.tile} style={{ position: 'relative', overflow: 'hidden', background: '#1a1a2e', borderRadius: 12, minHeight: 0 }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: '100%', height: '100%',
          objectFit: 'cover',
          display: showVideo ? 'block' : 'none',
          transform: (isLocal && !isScreenShare) ? 'scaleX(-1)' : 'none',
        }}
      />

      {!showVideo && (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(139,92,246,0.4)', border: '2px solid rgba(139,92,246,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 22, fontWeight: 700,
          }}>
            {initials}
          </div>
        </div>
      )}

      {/* Name + status label */}
      <div style={{
        position: 'absolute', bottom: 8, left: 10,
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'rgba(0,0,0,0.6)', borderRadius: 6,
        padding: '2px 8px', fontSize: 12, color: 'white', fontWeight: 500,
        maxWidth: 'calc(100% - 20px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {!audioOn && <span title="Muted">🔇</span>}
        {handRaised && <span>✋</span>}
        <span>{name}{isLocal ? ' (you)' : ''}</span>
      </div>

      {/* Red mute dot top-right */}
      {!audioOn && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          width: 8, height: 8, borderRadius: '50%',
          background: '#ef4444', boxShadow: '0 0 6px #ef4444',
        }} />
      )}
    </div>
  );
}
