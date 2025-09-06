import { useEffect, useRef, useState, useCallback } from "react";
import socket from "../util/socket";

// WebRTC configuration: Use public Google STUN servers for NAT traversal
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export default function useWebRTC(roomId, userId) {
  // State to hold all peer connections and their remote streams
  const [peers, setPeers] = useState({});
  // Ref to hold the local media stream
  const localStreamRef = useRef(null);
  // Ref to always have the latest peers object for event handlers
  const peersRef = useRef({});

  // Keep peersRef in sync with state for event handlers (avoids stale closures)
  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  /**
   * Create a new RTCPeerConnection for a remote user.
   * Adds local media tracks and sets up event handlers for signaling and streams.
   * @param {string} remoteId - The userId of the remote peer
   * @param {boolean} isInitiator - True if this client should initiate the connection
   */
  const createPeerConnection = useCallback((remoteId, isInitiator = true) => {
    console.log(`Creating peer connection for ${remoteId}, initiator: ${isInitiator}`);
    
    const peerConnection = new RTCPeerConnection(rtcConfig);
    
    // Add local media tracks to the connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log(`Adding track to peer connection for ${remoteId}`);
        peerConnection.addTrack(track, localStreamRef.current);
      });
    }

    // When a remote track is received, update the peers state
    peerConnection.ontrack = (event) => {
      console.log(`Received stream from ${remoteId}`, event.streams);
      const [remoteStream] = event.streams;
      if (remoteStream) {
        setPeers(prev => ({
          ...prev,
          [remoteId]: { ...prev[remoteId], stream: remoteStream }
        }));
      }
    };

    // When ICE candidates are found, send them to the remote peer via socket
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`Sending ICE candidate to ${remoteId}`);
        socket.emit("signal", {
          to: remoteId,
          data: {
            type: 'ice-candidate',
            candidate: event.candidate
          }
        });
      }
    };

    // Log connection state changes for debugging
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state with ${remoteId}:`, peerConnection.connectionState);
      if (peerConnection.connectionState === 'failed') {
        console.log(`Connection failed with ${remoteId}, attempting restart`);
        peerConnection.restartIce();
      }
    };

    // Log ICE connection state changes for debugging
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${remoteId}:`, peerConnection.iceConnectionState);
    };

    return peerConnection;
  }, []);

  /**
   * Main effect: sets up local media, socket event listeners, and handles cleanup.
   * Handles joining the room, peer connection setup, and signaling.
   */
  useEffect(() => {
    const init = async () => {
      try {
        // Get local media stream (camera + mic)
        console.log("Initializing WebRTC...");
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        // Join the signaling room
        console.log("Local stream obtained, joining room:", roomId);
        socket.emit("join-room", { roomId, userId });

        /**
         * When a new user joins, create a peer connection and send an offer
         */
        const handleUserJoined = async ({ userId: remoteId }) => {
          console.log("User joined:", remoteId);
          const peerConnection = createPeerConnection(remoteId, true);
          
          // Store peer connection immediately
          const newPeerData = { peerConnection, stream: null };
          setPeers(prev => ({ ...prev, [remoteId]: newPeerData }));
          peersRef.current = { ...peersRef.current, [remoteId]: newPeerData };
          
          try {
            // Create offer SDP and send to remote peer
            const offer = await peerConnection.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true
            });
            await peerConnection.setLocalDescription(offer);
            
            console.log(`Sending offer to ${remoteId}`);
            socket.emit("signal", {
              to: remoteId,
              data: {
                type: 'offer',
                offer: offer
              }
            });
          } catch (error) {
            console.error(`Error creating offer for ${remoteId}:`, error);
          }
        };

        /**
         * Handle incoming signaling messages (offer, answer, ICE candidate)
         */
        const handleSignal = async ({ from, data }) => {
          console.log("Received signal from:", from, data.type);
          
          let peerData = peersRef.current[from];
          
          // If no peer connection exists, create one as non-initiator
          if (!peerData) {
            const peerConnection = createPeerConnection(from, false);
            peerData = { peerConnection, stream: null };
            
            setPeers(prev => ({ ...prev, [from]: peerData }));
            // Update ref immediately
            peersRef.current = { ...peersRef.current, [from]: peerData };
          }
          
          const { peerConnection } = peerData;
          
          try {
            if (data.type === 'offer') {
              // Received offer: set remote description, create and send answer
              console.log(`Handling offer from ${from}`);
              await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
              const answer = await peerConnection.createAnswer();
              await peerConnection.setLocalDescription(answer);
              
              socket.emit("signal", {
                to: from,
                data: {
                  type: 'answer',
                  answer: answer
                }
              });
            } else if (data.type === 'answer') {
              // Received answer: set remote description
              console.log(`Handling answer from ${from}`);
              await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            } else if (data.type === 'ice-candidate') {
              // Received ICE candidate: add to peer connection
              console.log(`Handling ICE candidate from ${from}`);
              await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
          } catch (error) {
            console.error("Error handling signal:", error);
          }
        };

        /**
         * Handle when a user leaves the room: close and clean up their peer connection
         */
        const handleUserLeft = ({ userId: leftUserId }) => {
          console.log("User left:", leftUserId);
          
          setPeers(prev => {
            if (prev[leftUserId]) {
              prev[leftUserId].peerConnection.close();
              const { [leftUserId]: _, ...rest } = prev;
              
              // Update ref immediately
              const newPeers = { ...peersRef.current };
              delete newPeers[leftUserId];
              peersRef.current = newPeers;
              
              return rest;
            }
            return prev;
          });
        };

        // Register socket event listeners
        socket.on("user-joined", handleUserJoined);
        socket.on("signal", handleSignal);
        socket.on("user-left", handleUserLeft);

        // Cleanup function: remove listeners, close connections, stop local stream
        return () => {
          console.log("Cleaning up WebRTC...");
          socket.off("user-joined", handleUserJoined);
          socket.off("signal", handleSignal);
          socket.off("user-left", handleUserLeft);
          
          // Clean up all peer connections
          Object.values(peersRef.current).forEach(peerData => {
            if (peerData.peerConnection) {
              peerData.peerConnection.close();
            }
          });
          
          // Stop local stream
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
          }
        };
      } catch (error) {
        console.error("Error initializing WebRTC:", error);
      }
    };

    // Only initialize if both roomId and userId are present
    if (roomId && userId) {
      init();
    }
  }, [roomId, userId, createPeerConnection]);

  // Return local stream ref and all peer connections/streams
  return { localStreamRef, peers };
}
