import { useState } from "react";
import VideoCall from "./components/VideoCall";

function App() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const userId = Math.random().toString(36).substring(7);

  return (
    <div>
      {!joined ? (
        <div>
          <input
            placeholder="Enter room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button onClick={() => setJoined(true)}>Join</button>
        </div>
      ) : (
        <VideoCall roomId={roomId} userId={userId} />
      )}
    </div>
  );
}

export default App;
