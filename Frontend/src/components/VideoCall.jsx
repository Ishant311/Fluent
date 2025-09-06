import useWebRTC from "../hooks/useWebRTC";
import VideoTile from "./VideoTile";

export default function VideoCall({ roomId, userId }) {
  const { localStreamRef, peers } = useWebRTC(roomId, userId);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Room: {roomId}</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {/* Local video */}
        <div className="relative">
          <VideoTile stream={localStreamRef.current} isLocal={true} />
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
            You
          </div>
        </div>
        
        {/* Remote videos */}
        {Object.entries(peers).map(([peerId, peerData]) => (
          peerData.stream && (
            <div key={peerId} className="relative">
              <VideoTile stream={peerData.stream} isLocal={false} />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                User {peerId}
              </div>
            </div>
          )
        ))}
      </div>
      
      {/* Debug info */}
      <div className="mt-4 p-4 bg-gray-100 rounded text-sm text-gray-600">
        <p><strong>Room:</strong> {roomId}</p>
        <p><strong>Your ID:</strong> {userId}</p>
        <p><strong>Connected peers:</strong> {Object.keys(peers).length}</p>
        <p><strong>Local stream:</strong> {localStreamRef.current ? 'Active' : 'Inactive'}</p>
        <div><strong>Peer details:</strong></div>
        {Object.entries(peers).map(([peerId, peerData]) => (
          <div key={peerId} className="ml-4">
            - {peerId}: {peerData.stream ? 'Has stream' : 'No stream'} 
            {peerData.peerConnection && ` (${peerData.peerConnection.connectionState})`}
          </div>
        ))}
      </div>
    </div>
  );
}
