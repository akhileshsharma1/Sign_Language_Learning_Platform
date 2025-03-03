// "use client";

// import React, { useState, useEffect, useRef } from 'react';
// import { Button } from '@/components/ui/button';
// import { Keyboard, Trash2, WifiOff, Hand } from 'lucide-react';

// const SignLanguageUI = () => {
//   const [state, setState] = useState({
//     current_word: '',
//     words: [],
//     current_gesture: null,
//     landmarks: null // Add landmarks state
//   });
//   const [connectionStatus, setConnectionStatus] = useState({
//     isConnected: false,
//     error: null,
//     retryCount: 0,
//     isConnecting: false
//   });
  
//   const videoRef = useRef(null);
//   const streamRef = useRef(null);
//   const wsRef = useRef(null);
//   const canvasRef = useRef(null);
//   const landmarksCanvasRef = useRef(null); // New canvas ref for landmarks
//   const animationFrameRef = useRef(null);
//   const reconnectTimeoutRef = useRef(null);
//   const MAX_RETRY_ATTEMPTS = 5;
//   const RETRY_DELAY = 3000;
//   const WS_URL = 'ws://127.0.0.1:5000/ws';

//   const connectWebSocket = () => {
//     if (wsRef.current?.readyState === WebSocket.OPEN || connectionStatus.isConnecting) return;

//     try {
//       setConnectionStatus(prev => ({
//         ...prev,
//         isConnecting: true,
//         error: null
//       }));

//       console.log('Attempting WebSocket connection...');
//       const ws = new WebSocket(WS_URL);
//       wsRef.current = ws;

//       ws.onopen = () => {
//         console.log('WebSocket Connected');
//         setConnectionStatus(prev => ({
//           isConnected: true,
//           error: null,
//           retryCount: 0,
//           isConnecting: false
//         }));
//         startFrameCapture();
//       };

//       ws.onmessage = (event) => {
//         try {
//           const data = JSON.parse(event.data);
//           setState(data);
//           if (data.landmarks) {
//             drawLandmarks(data.landmarks);
//           }
//         } catch (e) {
//           console.error('Error parsing WebSocket message:', e);
//           handleError('Invalid data received from server');
//         }
//       };

//       ws.onerror = (error) => {
//         console.error('WebSocket Error:', error);
//         handleError('Connection failed. Please check if the server is running.');
//       };

//       ws.onclose = (event) => {
//         console.log('WebSocket Disconnected:', event.code, event.reason);
//         handleDisconnect();
//       };
//     } catch (error) {
//       console.error('Error creating WebSocket:', error);
//       handleError('Failed to initialize connection');
//     }
//   };

//   const handleError = (errorMessage) => {
//     setConnectionStatus(prev => ({
//       isConnected: false,
//       error: errorMessage,
//       retryCount: prev.retryCount + 1,
//       isConnecting: false
//     }));
//     stopFrameCapture();
//   };

//   const handleDisconnect = () => {
//     setConnectionStatus(prev => ({
//       isConnected: false,
//       error: prev.error || 'Connection lost',
//       retryCount: prev.retryCount,
//       isConnecting: false
//     }));
//     stopFrameCapture();

//     // Attempt reconnection if we haven't exceeded max retries
//     if (connectionStatus.retryCount < MAX_RETRY_ATTEMPTS) {
//       console.log(`Attempting reconnection in ${RETRY_DELAY}ms...`);
//       reconnectTimeoutRef.current = setTimeout(connectWebSocket, RETRY_DELAY);
//     }
//   };

//   // Draw landmarks on the canvas
//   const drawLandmarks = (landmarks) => {
//     if (!landmarksCanvasRef.current) return;
    
//     const canvas = landmarksCanvasRef.current;
//     const ctx = canvas.getContext('2d');
//     const { width, height } = canvas;
    
//     // Clear previous drawing
//     ctx.clearRect(0, 0, width, height);
    
//     if (!landmarks || landmarks.length === 0) return;
    
//     // Define connections between landmarks for hand skeleton
//     const connections = [
//       // Thumb
//       [0, 1], [1, 2], [2, 3], [3, 4],
//       // Index finger
//       [0, 5], [5, 6], [6, 7], [7, 8],
//       // Middle finger
//       [0, 9], [9, 10], [10, 11], [11, 12],
//       // Ring finger
//       [0, 13], [13, 14], [14, 15], [15, 16],
//       // Pinky
//       [0, 17], [17, 18], [18, 19], [19, 20],
//       // Palm
//       [0, 5], [5, 9], [9, 13], [13, 17]
//     ];
    
//     // Draw connections (skeleton)
//     ctx.beginPath();
//     ctx.strokeStyle = 'rgba(0, 119, 255, 0.8)';
//     ctx.lineWidth = 3;
    
//     connections.forEach(([i, j]) => {
//       if (landmarks[i] && landmarks[j]) {
//         ctx.moveTo(landmarks[i].x * width, landmarks[i].y * height);
//         ctx.lineTo(landmarks[j].x * width, landmarks[j].y * height);
//       }
//     });
//     ctx.stroke();
    
//     // Draw landmarks
//     landmarks.forEach((point, index) => {
//       ctx.beginPath();
//       // Different colors for different finger landmarks
//       if (index === 0) {
//         // Wrist
//         ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
//         ctx.arc(point.x * width, point.y * height, 8, 0, 2 * Math.PI);
//       } else if (index % 4 === 0) {
//         // Fingertips
//         ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
//         ctx.arc(point.x * width, point.y * height, 6, 0, 2 * Math.PI);
//       } else {
//         // Other joints
//         ctx.fillStyle = 'rgba(0, 119, 255, 0.5)';
//         ctx.arc(point.x * width, point.y * height, 4, 0, 2 * Math.PI);
//       }
//       ctx.fill();
//     });
//   };

//   const startFrameCapture = () => {
//     if (!canvasRef.current || !videoRef.current) return;

//     const captureFrame = () => {
//       try {
//         if (videoRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
//           const context = canvasRef.current.getContext('2d');
//           context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
          
//           const frameData = canvasRef.current.toDataURL('image/jpeg', 0.7);
//           wsRef.current.send(frameData);
//         }
//         animationFrameRef.current = requestAnimationFrame(captureFrame);
//       } catch (error) {
//         console.error('Error capturing frame:', error);
//         handleError('Error capturing video frame');
//         stopFrameCapture();
//       }
//     };

//     animationFrameRef.current = requestAnimationFrame(captureFrame);
//   };

//   const stopFrameCapture = () => {
//     if (animationFrameRef.current) {
//       cancelAnimationFrame(animationFrameRef.current);
//       animationFrameRef.current = null;
//     }
//   };

//   const handleRetryConnection = () => {
//     // Clear any existing timeouts
//     if (reconnectTimeoutRef.current) {
//       clearTimeout(reconnectTimeoutRef.current);
//       reconnectTimeoutRef.current = null;
//     }

//     // Close existing connection if any
//     if (wsRef.current) {
//       wsRef.current.close();
//       wsRef.current = null;
//     }

//     setConnectionStatus(prev => ({
//       ...prev,
//       retryCount: 0,
//       error: null,
//       isConnecting: false
//     }));

//     // Attempt new connection
//     connectWebSocket();
//   };

//   useEffect(() => {
//     const initializeCamera = async () => {
//       try {
//         // Create canvas for frame capture
//         const canvas = document.createElement('canvas');
//         canvas.width = 640;
//         canvas.height = 480;
//         canvasRef.current = canvas;

//         // Get camera access
//         const stream = await navigator.mediaDevices.getUserMedia({
//           video: {
//             width: 640,
//             height: 480,
//             frameRate: { ideal: 10 }
//           }
//         });

//         if (videoRef.current) {
//           videoRef.current.srcObject = stream;
//           streamRef.current = stream;
//           videoRef.current.onloadedmetadata = () => {
//             connectWebSocket();
//           };
//         }
//       } catch (error) {
//         console.error("Error setting up camera:", error);
//         handleError(error.message || "Failed to access camera");
//       }
//     };

//     initializeCamera();

//     return () => {
//       // Cleanup function
//       stopFrameCapture();
      
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach(track => track.stop());
//       }
      
//       if (wsRef.current) {
//         wsRef.current.close();
//         wsRef.current = null;
//       }
      
//       if (reconnectTimeoutRef.current) {
//         clearTimeout(reconnectTimeoutRef.current);
//         reconnectTimeoutRef.current = null;
//       }
//     };
//   }, []);

//   const handleClear = async () => {
//     try {
//       const response = await fetch('http://127.0.0.1:5000/clear', {
//         method: 'POST'
//       });
//       if (response.ok) {
//         setState({
//           current_word: '',
//           words: [],
//           current_gesture: null,
//           landmarks: null
//         });
//       }
//     } catch (error) {
//       console.error('Error clearing state:', error);
//       handleError('Failed to clear text');
//     }
//   };

//   return (
//     <div className="max-w-4xl mx-auto p-4">
//       {connectionStatus.error && (
//         <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
//           <div className="flex items-center gap-2 text-red-800 font-semibold mb-1">
//             <WifiOff className="h-4 w-4" />
//             <span>Connection Error</span>
//           </div>
//           <p className="text-red-600">{connectionStatus.error}</p>
//           {connectionStatus.retryCount >= MAX_RETRY_ATTEMPTS && (
//             <div className="mt-2">
//               <button 
//                 onClick={handleRetryConnection}
//                 className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-800 rounded-md transition-colors"
//                 disabled={connectionStatus.isConnecting}
//               >
//                 {connectionStatus.isConnecting ? 'Connecting...' : 'Retry Connection'}
//               </button>
//             </div>
//           )}
//         </div>
//       )}
      
//       <div className="bg-white shadow-lg rounded-lg mb-4 p-4">
//         <div className="flex items-center justify-between border-b pb-2 mb-4">
//           <div className="flex items-center text-lg font-semibold">
//             <Keyboard className="mr-2" />
//             Sign Language Recognition
//             <div className={`ml-2 h-2 w-2 rounded-full ${connectionStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
//           </div>
//           <Button 
//             variant="ghost" 
//             size="icon"
//             onClick={handleClear}
//             className="hover:bg-red-100"
//           >
//             <Trash2 className="h-5 w-5" />
//           </Button>
//         </div>
//         <div className="min-h-[400px] bg-gray-100 rounded-lg p-6 shadow-inner">
//           <div className="text-lg mb-4">
//             {state.words.join(' ')}
//             {state.current_word && (
//               <span className="text-blue-600">
//                 {state.words.length > 0 ? ' ' : ''} 
//                 {state.current_word}
//               </span>
//             )}
//             <span className="animate-pulse">|</span>
//           </div>
//         </div>
//       </div>

//       <div className="bg-white shadow-lg rounded-lg p-4 mb-6">
//         <div className="flex items-center text-lg font-semibold mb-2">
//           <Hand className="mr-2 h-5 w-5" />
//           <h3>Hand Tracking</h3>
//         </div>
//         <div className="text-sm text-gray-600 mb-4">
//           MediaPipe hand landmarks visualization
//         </div>
//         <div className="flex justify-center">
//           <div className="relative">
//             <video
//               ref={videoRef}
//               autoPlay
//               playsInline
//               width="640"
//               height="480"
//               className="rounded-lg"
//               muted
//             />
//             <canvas
//               ref={landmarksCanvasRef}
//               width="640"
//               height="480"
//               className="absolute top-0 left-0 rounded-lg"
//             />
//           </div>
//         </div>
//       </div>

//       {state.current_gesture && (
//         <div className="fixed bottom-4 right-4 bg-blue-50 shadow-lg rounded-lg p-4">
//           <div className="text-2xl font-bold text-blue-600">
//             {state.current_gesture}
//           </div>
//           <div className="text-sm text-gray-600">
//             Current Gesture
//           </div>
//         </div>
//       )}

//       <div className="bg-white shadow-lg rounded-lg p-4 mb-6">
//         <h3 className="font-semibold mb-2">Instructions:</h3>
//         {/* <ul className="list-disc pl-5 space-y-1">
//           <li>Hold a gesture steady for 1 second to add it to the current word</li>
//           <li>Pause for 2 seconds to complete the current word</li>
//           <li>Click the trash icon to clear all text</li>
//           <li>Blue lines show hand skeleton tracking</li>
//           <li>Green dots highlight fingertips</li>
//         </ul> */}
//       </div>
//     </div>
//   );
// };

// export default SignLanguageUI;