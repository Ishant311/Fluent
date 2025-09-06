import { useEffect, useRef } from "react";

export default function VideoTile({ stream, isLocal = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal} // Only mute local video to avoid echo
      className="w-64 h-48 rounded-lg shadow-md bg-gray-800"
      style={{ objectFit: 'cover' }}
    />
  );
}
