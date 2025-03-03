from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import mediapipe as mp
import numpy as np
import pickle
import time
from collections import deque
import base64
import cv2
from PIL import Image
import io
import logging
import asyncio

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MediaPipe with optimized settings
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,  # Set to False for video stream
    max_num_hands=1,
    min_detection_confidence=0.5,  # Lower threshold for better performance
    min_tracking_confidence=0.5    # Add tracking confidence parameter
)

# Load the pre-trained model
try:
    with open('model.p', 'rb') as f:
        model_dict = pickle.load(f)
        model = model_dict['model']
        logger.info("Model loaded successfully")
except FileNotFoundError:
    logger.warning("Warning: model.p not found. Using mock predictions.")
    model = None

# Define gesture labels
labels_dict = {0: 'A', 1: 'B', 2: 'C'}

class SignLanguageProcessor:
    def __init__(self):
        self.current_word = []
        self.words = []
        self.current_gesture = None
        self.gesture_start_time = None
        self.last_gesture_time = None
        self.gesture_buffer = deque(maxlen=5)
        self.landmarks = None
        self.frame_count = 0
        
    def add_to_word(self, character):
        self.current_word.append(character)
        
    def complete_word(self):
        if self.current_word:
            word = ''.join(self.current_word)
            self.words.append(word)
            self.current_word = []
            
    def get_state(self):
        return {
            'current_word': ''.join(self.current_word),
            'words': self.words,
            'current_gesture': self.current_gesture,
            'landmarks': self.landmarks
        }
    
    def set_landmarks(self, landmarks):
        self.landmarks = landmarks
    
    def clear(self):
        self.current_word = []
        self.words = []
        self.current_gesture = None
        self.gesture_buffer.clear()
        self.gesture_start_time = None
        self.last_gesture_time = None
        self.landmarks = None
        self.frame_count = 0

async def process_frame(frame_data: str, processor: SignLanguageProcessor):
    try:
        # Increment frame counter
        processor.frame_count += 1
        
        # Decode base64 image
        img_data = base64.b64decode(frame_data.split(',')[1])
        image = Image.open(io.BytesIO(img_data))
        
        # Resize image to reduce processing time
        image = image.resize((320, 240), Image.LANCZOS)
        
        frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Convert to RGB for MediaPipe
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Only process landmarks on every 2nd frame to reduce CPU load
        process_landmarks = processor.frame_count % 2 == 0
        
        # Reset landmarks if we're not processing this frame
        if not process_landmarks:
            return processor.get_state()
            
        # Process with MediaPipe
        results = hands.process(frame_rgb)
        
        # Reset landmarks
        processor.set_landmarks(None)
        
        if results.multi_hand_landmarks:
            # Extract landmarks for frontend visualization
            # Send only a reduced set of landmarks to reduce payload size
            landmarks = []
            for hand_landmarks in results.multi_hand_landmarks:
                for i in range(len(hand_landmarks.landmark)):
                    # Round to 3 decimal places to reduce payload size
                    landmarks.append({
                        'x': round(hand_landmarks.landmark[i].x, 3),
                        'y': round(hand_landmarks.landmark[i].y, 3),
                        'z': round(hand_landmarks.landmark[i].z, 3)
                    })
            
            # Set the landmarks in the processor
            processor.set_landmarks(landmarks)
            
            # Process for gesture recognition
            data_aux = []
            x_ = []
            y_ = []
            z_ = []

            for hand_landmarks in results.multi_hand_landmarks:
                for i in range(len(hand_landmarks.landmark)):
                    x = hand_landmarks.landmark[i].x
                    y = hand_landmarks.landmark[i].y
                    z = hand_landmarks.landmark[i].z
                    x_.append(x)
                    y_.append(y)
                    z_.append(z)

            for i in range(len(hand_landmarks.landmark)):
                data_aux.append(x_[i] - min(x_))
                data_aux.append(y_[i] - min(y_))
                data_aux.append(z_[i] - min(z_))

            # Make prediction
            if model is not None:
                prediction = model.predict([np.asarray(data_aux)])
                predicted_character = labels_dict[int(prediction[0])]
            else:
                predicted_character = np.random.choice(['A', 'B', 'L'])

            # Update gesture buffer
            processor.gesture_buffer.append(predicted_character)
            current_time = time.time()

            if len(processor.gesture_buffer) >= 3:
                most_common = max(set(processor.gesture_buffer), 
                                key=processor.gesture_buffer.count)

                if processor.current_gesture != most_common:
                    processor.current_gesture = most_common
                    processor.gesture_start_time = current_time
                    processor.last_gesture_time = current_time
                elif (current_time - processor.gesture_start_time) >= 1.0:
                    processor.add_to_word(most_common)
                    processor.gesture_start_time = None
                    processor.current_gesture = None
                    processor.gesture_buffer.clear()
                    processor.last_gesture_time = current_time

        # Check for word completion
        if processor.last_gesture_time and (time.time() - processor.last_gesture_time) >= 2.0:
            processor.complete_word()
            processor.last_gesture_time = None

    except Exception as e:
        logger.error(f"Error processing frame: {e}")
        raise
    
    return processor.get_state()

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[websocket] = SignLanguageProcessor()
        logger.info("New WebSocket connection established")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            del self.active_connections[websocket]
            logger.info("WebSocket connection closed")

    def get_processor(self, websocket: WebSocket) -> SignLanguageProcessor:
        return self.active_connections.get(websocket)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    try:
        await manager.connect(websocket)
        
        while True:
            try:
                frame_data = await websocket.receive_text()
                processor = manager.get_processor(websocket)
                if processor:
                    state = await process_frame(frame_data, processor)
                    await websocket.send_json(state)
            except WebSocketDisconnect:
                logger.info("WebSocket disconnected normally")
                break
            except Exception as e:
                logger.error(f"Error in WebSocket communication: {e}")
                await websocket.close(code=1011)
                break
                
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        raise
    finally:
        manager.disconnect(websocket)

@app.post("/clear")
async def clear():
    # Updated to actually clear all processors
    for websocket, processor in manager.active_connections.items():
        processor.clear()
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=5000,
        log_level="info",
        loop="asyncio"
    )

# from fastapi import FastAPI, WebSocket, WebSocketDisconnect
# from fastapi.middleware.cors import CORSMiddleware
# import mediapipe as mp
# import numpy as np
# import pickle
# import time
# from collections import deque
# import base64
# import cv2
# from PIL import Image
# import io
# import logging
# import asyncio

# # Set up logging
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# app = FastAPI()

# # Enable CORS
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Initialize MediaPipe with optimized settings
# mp_hands = mp.solutions.hands
# hands = mp_hands.Hands(
#     static_image_mode=False,  # Set to False for video stream
#     max_num_hands=1,
#     min_detection_confidence=0.5,  # Lower threshold for better performance
#     min_tracking_confidence=0.5    # Add tracking confidence parameter
# )

# # Load the pre-trained model
# try:
#     with open('model.p', 'rb') as f:
#         model_dict = pickle.load(f)
#         model = model_dict['model']
#         logger.info("Model loaded successfully")
# except FileNotFoundError:
#     logger.warning("Warning: model.p not found. Using mock predictions.")
#     model = None

# # Define gesture labels
# labels_dict = {0: 'A', 1: 'B', 2: 'L'}

# class SignLanguageProcessor:
#     def __init__(self):
#         self.current_word = []
#         self.words = []
#         self.current_gesture = None
#         self.gesture_start_time = None
#         self.last_gesture_time = None
#         self.gesture_buffer = deque(maxlen=5)
#         self.landmarks = []  # Initialize as empty list instead of None
#         self.frame_count = 0
#         self.last_landmarks = []  # Store previous landmarks for stability
        
#     def add_to_word(self, character):
#         self.current_word.append(character)
        
#     def complete_word(self):
#         if self.current_word:
#             word = ''.join(self.current_word)
#             self.words.append(word)
#             self.current_word = []
            
#     def get_state(self):
#         return {
#             'current_word': ''.join(self.current_word),
#             'words': self.words,
#             'current_gesture': self.current_gesture,
#             'landmarks': self.landmarks if self.landmarks else self.last_landmarks
#         }
    
#     def set_landmarks(self, landmarks):
#         if landmarks and len(landmarks) > 0:
#             self.last_landmarks = self.landmarks  # Store previous landmarks
#             self.landmarks = landmarks
#         elif not landmarks:
#             # Keep previous landmarks if no new ones - helps with stability
#             self.landmarks = self.last_landmarks
    
#     def clear(self):
#         self.current_word = []
#         self.words = []
#         self.current_gesture = None
#         self.gesture_buffer.clear()
#         self.gesture_start_time = None
#         self.last_gesture_time = None
#         self.landmarks = []
#         self.last_landmarks = []
#         self.frame_count = 0

# async def process_frame(frame_data: str, processor: SignLanguageProcessor):
#     try:
#         # Increment frame counter
#         processor.frame_count += 1
        
#         # Decode base64 image
#         try:
#             img_data = base64.b64decode(frame_data.split(',')[1])
#             image = Image.open(io.BytesIO(img_data))
            
#             # Resize image to reduce processing time
#             image = image.resize((320, 240), Image.LANCZOS)
            
#             frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
#             # Convert to RGB for MediaPipe
#             frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#         except Exception as e:
#             logger.error(f"Error processing image: {e}")
#             return processor.get_state()
        
#         # Process with MediaPipe - no more frame skipping
#         results = hands.process(frame_rgb)
        
#         if results.multi_hand_landmarks:
#             # Extract landmarks for frontend visualization
#             landmarks = []
#             for hand_landmarks in results.multi_hand_landmarks:
#                 for i in range(len(hand_landmarks.landmark)):
#                     # Round to 3 decimal places to reduce payload size
#                     landmarks.append({
#                         'x': round(hand_landmarks.landmark[i].x, 3),
#                         'y': round(hand_landmarks.landmark[i].y, 3),
#                         'z': round(hand_landmarks.landmark[i].z, 3)
#                     })
            
#             # Set the landmarks in the processor
#             processor.set_landmarks(landmarks)
            
#             # Process for gesture recognition
#             data_aux = []
#             x_ = []
#             y_ = []
#             z_ = []

#             for hand_landmarks in results.multi_hand_landmarks:
#                 for i in range(len(hand_landmarks.landmark)):
#                     x = hand_landmarks.landmark[i].x
#                     y = hand_landmarks.landmark[i].y
#                     z = hand_landmarks.landmark[i].z
#                     x_.append(x)
#                     y_.append(y)
#                     z_.append(z)

#             for i in range(len(hand_landmarks.landmark)):
#                 data_aux.append(x_[i] - min(x_))
#                 data_aux.append(y_[i] - min(y_))
#                 data_aux.append(z_[i] - min(z_))

#             # Make prediction
#             if model is not None:
#                 prediction = model.predict([np.asarray(data_aux)])
#                 predicted_character = labels_dict[int(prediction[0])]
#             else:
#                 predicted_character = np.random.choice(['A', 'B', 'L'])

#             # Update gesture buffer
#             processor.gesture_buffer.append(predicted_character)
#             current_time = time.time()

#             if len(processor.gesture_buffer) >= 3:
#                 most_common = max(set(processor.gesture_buffer), 
#                                 key=processor.gesture_buffer.count)

#                 if processor.current_gesture != most_common:
#                     processor.current_gesture = most_common
#                     processor.gesture_start_time = current_time
#                     processor.last_gesture_time = current_time
#                 elif (current_time - processor.gesture_start_time) >= 1.0:
#                     processor.add_to_word(most_common)
#                     processor.gesture_start_time = None
#                     processor.current_gesture = None
#                     processor.gesture_buffer.clear()
#                     processor.last_gesture_time = current_time
#         else:
#             # Send empty landmarks array instead of None to maintain consistent structure
#             processor.set_landmarks([])

#         # Check for word completion
#         if processor.last_gesture_time and (time.time() - processor.last_gesture_time) >= 2.0:
#             processor.complete_word()
#             processor.last_gesture_time = None

#     except Exception as e:
#         logger.error(f"Error processing frame: {e}")
#         # Return current state even if error occurs
#         return processor.get_state()
    
#     return processor.get_state()

# class ConnectionManager:
#     def __init__(self):
#         self.active_connections: dict = {}

#     async def connect(self, websocket: WebSocket):
#         await websocket.accept()
#         self.active_connections[websocket] = SignLanguageProcessor()
#         logger.info("New WebSocket connection established")

#     def disconnect(self, websocket: WebSocket):
#         if websocket in self.active_connections:
#             del self.active_connections[websocket]
#             logger.info("WebSocket connection closed")

#     def get_processor(self, websocket: WebSocket) -> SignLanguageProcessor:
#         return self.active_connections.get(websocket)

# manager = ConnectionManager()

# @app.websocket("/ws")
# async def websocket_endpoint(websocket: WebSocket):
#     client = f"{websocket.client.host}:{websocket.client.port}"
#     logger.info(f"Received WebSocket connection request from {client}")
#     try:
#         await manager.connect(websocket)
#         logger.info(f"Connection established with {client}")
        
#         while True:
#             try:
#                 # Add timeout to avoid blocking indefinitely
#                 frame_data = await asyncio.wait_for(
#                     websocket.receive_text(), 
#                     timeout=5.0
#                 )
#                 processor = manager.get_processor(websocket)
#                 if processor:
#                     state = await process_frame(frame_data, processor)
#                     await websocket.send_json(state)
#             except asyncio.TimeoutError:
#                 # Handle timeout gracefully
#                 logger.warning(f"WebSocket receive timeout for {client}")
#                 continue
#             except WebSocketDisconnect:
#                 logger.info(f"WebSocket {client} disconnected normally")
#                 break
#             except Exception as e:
#                 logger.error(f"Error in WebSocket communication with {client}: {e}")
#                 try:
#                     await websocket.close(code=1011)
#                 except:
#                     pass
#                 break
                
#     except Exception as e:
#         logger.error(f"WebSocket error with {client}: {e}")
#     finally:
#         manager.disconnect(websocket)
#         logger.info(f"Connection with {client} closed")

# @app.post("/clear")
# async def clear():
#     # Updated to actually clear all processors
#     for websocket, processor in manager.active_connections.items():
#         processor.clear()
#     return {"status": "success"}

# @app.get("/health")
# async def health_check():
#     """Simple endpoint to check if the server is running."""
#     return {"status": "ok", "version": "1.0"}

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(
#         app,
#         host="0.0.0.0",
#         port=5000,
#         log_level="info",
#         loop="asyncio"
#     )