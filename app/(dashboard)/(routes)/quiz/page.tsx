"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  BookOpen, Check, X, HelpCircle, Award, ChevronRight, 
  RotateCcw, ThumbsUp, Camera, ImageIcon, AlertTriangle, Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const SignLanguageQuiz = () => {
  // Quiz state
  const [quizState, setQuizState] = useState({
    currentQuiz: null,
    currentQuestionIndex: 0,
    answers: [],
    score: 0,
    quizCompleted: false,
    showResults: false,
    timeRemaining: 0,
    isPaused: false,
    difficulty: 'beginner', // 'beginner', 'intermediate', 'advanced'
    mode: 'multipleChoice', // 'multipleChoice', 'recognition', 'signing'
  });
  
  // Camera states for recognition mode
  const [cameraActive, setCameraActive] = useState(false);
  const [processingGesture, setProcessingGesture] = useState(false);
  const [detectedSign, setDetectedSign] = useState(null);
  const [showHint, setShowHint] = useState(false);
  
  // Visual feedback states
  const [feedbackState, setFeedbackState] = useState({
    visible: false,
    correct: false,
    message: '',
  });
  
  // References
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const captureIntervalRef = useRef(null);
  
  const API_URL = 'http://127.0.0.1:5000';
  
  // Mock quiz data - this would come from your API in a real application
  const quizzes = {
    beginner: {
      title: "ASL Alphabet Basics",
      description: "Learn the basic hand shapes for ASL alphabet letters A-G",
      questions: [
        {
          id: 1,
          type: "multipleChoice",
          imageUrl: "/image/0.jpg", // A
          question: "What letter is shown in this sign?",
          options: ["A", "B", "C", "D"],
          correctAnswer: "A",
          hint: "This sign is made with a closed fist with thumb alongside."
        },
        {
          id: 2,
          type: "multipleChoice",
          imageUrl: null, // B
          question: "Which sign represents the letter B?",
          options: ["/image/0.jpg", "/image/1.jpg", "/image/2.jpg", "/image/3.jpg"],
          correctAnswer: 1,
          hint: "Letter B is signed with an upright palm, fingers together and thumb folded in."
        },
        {
          id: 3,
          type: "recognition",
          question: "Make the sign for the letter C",
          correctAnswer: "C",
          hint: "Form a C shape with your hand, as if holding a small cup."
        },
        {
          id: 4,
          type: "multipleChoice",
          imageUrl: "/image/3.jpg", // D
          question: "What letter is shown in this sign?",
          options: ["D", "E", "F", "G"],
          correctAnswer: "D",
          hint: "This sign forms a 'D' shape with your index finger pointing up and other fingers curled."
        },
        {
          id: 5,
          type: "matching",
          question: "Match the following letters with their signs",
          pairs: [
            { sign: "/image/4.jpg", meaning: "E" },
            { sign: "/image/5.jpg", meaning: "F" },
            { sign: "/image/6.jpg", meaning: "G" }
          ],
          hint: "Focus on the hand shape and finger positions."
        }
      ],
      timeLimit: 300, // 5 minutes in seconds
    },
    intermediate: {
      title: "ASL Alphabet Continued",
      description: "Test your knowledge of ASL alphabet letters H-P",
      questions: [
        {
          id: 1,
          type: "multipleChoice",
          imageUrl: "/image/7.jpg", // H
          question: "What letter is shown in this sign?",
          options: ["H", "I", "J", "K"],
          correctAnswer: "H",
          hint: "This sign uses two fingers extended horizontally."
        },
        {
          id: 2,
          type: "recognition",
          question: "Sign the letter 'J'",
          correctAnswer: "J",
          hint: "Start with the pinky side of your hand facing outward, extend your pinky, and trace the letter J in the air."
        },
        {
          id: 3,
          type: "multipleChoice",
          imageUrl: "/image/11.jpg", // L
          question: "What letter does this sign represent?",
          options: ["L", "M", "N", "P"],
          correctAnswer: "L",
          hint: "Form an L shape with your thumb and index finger extended."
        },
        {
          id: 4,
          type: "multipleChoice",
          imageUrl: "/image/14.jpg", // O
          question: "Which letter is being signed?",
          options: ["M", "N", "O", "P"],
          correctAnswer: "O",
          hint: "This sign forms a circular shape with all fingers."
        },
        {
          id: 5,
          type: "matching",
          question: "Match the following signs with their correct letters",
          pairs: [
            { sign: "/image/12.jpg", meaning: "M" },
            { sign: "/image/13.jpg", meaning: "N" },
            { sign: "/image/15.jpg", meaning: "P" }
          ],
          hint: "Pay attention to how many fingers are folded and their positions."
        }
      ],
      timeLimit: 240, // 4 minutes in seconds
    },
    advanced: {
      title: "ASL Alphabet Mastery",
      description: "Master the remaining ASL alphabet letters Q-Z",
      questions: [
        {
          id: 1,
          type: "recognition",
          question: "Sign the letter 'Q'",
          correctAnswer: "Q",
          hint: "Point your index finger down with your thumb and index finger forming a circle."
        },
        {
          id: 2,
          type: "multipleChoice",
          imageUrl: "/image/17.jpg", // R
          question: "What letter is shown in this sign?",
          options: ["R", "S", "T", "U"],
          correctAnswer: "R",
          hint: "Cross your middle finger over your index finger while keeping them together."
        },
        {
          id: 3,
          type: "multipleChoice",
          imageUrl: "/image/22.jpg", // W
          question: "Which letter is this sign representing?",
          options: ["V", "W", "X", "Y"],
          correctAnswer: "W",
          hint: "This sign uses three extended fingers forming a 'W' shape."
        },
        {
          id: 4,
          type: "recognition",
          question: "Sign the letter 'Z'",
          correctAnswer: "Z",
          hint: "Make the shape of the letter Z in the air with your index finger."
        },
        {
          id: 5,
          type: "matching",
          question: "Match the following signs with their letters",
          pairs: [
            { sign: "/image/18.jpg", meaning: "S" },
            { sign: "/image/19.jpg", meaning: "T" },
            { sign: "/image/23.jpg", meaning: "X" }
          ],
          hint: "Pay close attention to the position of the thumb relative to the other fingers."
        }
      ],
      timeLimit: 300, // 5 minutes in seconds
    }
  };
  
  
  // Start a new quiz
  const startQuiz = (difficulty, mode) => {
    const selectedQuiz = quizzes[difficulty];
    if (!selectedQuiz) return;
    
    setQuizState({
      currentQuiz: selectedQuiz,
      currentQuestionIndex: 0,
      answers: Array(selectedQuiz.questions.length).fill(null),
      score: 0,
      quizCompleted: false,
      showResults: false,
      timeRemaining: selectedQuiz.timeLimit,
      isPaused: false,
      difficulty,
      mode,
    });
    
    // Start timer
    startTimer(selectedQuiz.timeLimit);
    
    // Initialize camera if in recognition mode and first question requires it
    if (mode === 'recognition' && selectedQuiz.questions[0].type === 'recognition') {
      initializeCamera();
    }
  };
  
  // Start countdown timer
  const startTimer = (timeInSeconds) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setQuizState(prev => ({
      ...prev,
      timeRemaining: timeInSeconds,
      isPaused: false
    }));
    
    timerRef.current = setInterval(() => {
      setQuizState(prev => {
        if (prev.isPaused) return prev;
        
        const newTimeRemaining = prev.timeRemaining - 1;
        
        if (newTimeRemaining <= 0) {
          clearInterval(timerRef.current);
          return {
            ...prev,
            timeRemaining: 0,
            quizCompleted: true,
            showResults: true,
          };
        }
        
        return {
          ...prev,
          timeRemaining: newTimeRemaining,
        };
      });
    }, 1000);
  };
  
  // Pause or resume the timer
  const togglePause = () => {
    setQuizState(prev => ({
      ...prev,
      isPaused: !prev.isPaused,
    }));
  };
  
  // Format time remaining as MM:SS
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Initialize camera for recognition mode
  const initializeCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Create canvas for frame capture if it doesn't exist
      if (!canvasRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        canvasRef.current = canvas;
      }
      
      const constraints = {
        video: { width: 640, height: 480, facingMode: 'user' }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        
        // Start gesture recognition after camera is initialized
        startGestureRecognition();
      }
    } catch (error) {
      console.error("Error setting up camera:", error);
      alert("Failed to access camera: " + error.message);
    }
  };
  
  // Start gesture recognition process
  const startGestureRecognition = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    
    captureIntervalRef.current = setInterval(() => {
      captureAndProcessFrame();
    }, 500); // Process every 500ms for better performance
  };
  
  // Capture and process video frame
  const captureAndProcessFrame = async () => {
    if (!videoRef.current || !canvasRef.current || processingGesture) return;
    
    try {
      setProcessingGesture(true);
      
      const context = canvasRef.current.getContext('2d');
      context.drawImage(
        videoRef.current, 
        0, 0, 
        canvasRef.current.width, 
        canvasRef.current.height
      );
      
      const frameData = canvasRef.current.toDataURL('image/jpeg', 0.7);
      
      // In a real app, you'd send this to your backend
      // For demo purposes, we'll simulate a response
      simulateGestureRecognition(frameData);
      
    } catch (error) {
      console.error('Error capturing frame:', error);
    }
  };
  
  // Simulate gesture recognition (in a real app, this would be an API call)
  const simulateGestureRecognition = (frameData) => {
    // Simulate processing delay
    setTimeout(() => {
      // Get random letter for demonstration
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const randomLetter = letters[Math.floor(Math.random() * letters.length)];
      
      setDetectedSign(randomLetter);
      setProcessingGesture(false);
    }, 800);
  };
  
  // Check if the detected sign matches the correct answer
  const checkDetectedSign = () => {
    const currentQuestion = quizState.currentQuiz.questions[quizState.currentQuestionIndex];
    
    if (detectedSign === currentQuestion.correctAnswer) {
      showFeedback(true, "Correct! Well done!");
      submitAnswer(detectedSign);
    } else {
      showFeedback(false, `Incorrect. Try again! The system detected "${detectedSign}"`);
    }
  };
  
  // Show feedback message
  const showFeedback = (correct, message) => {
    setFeedbackState({
      visible: true,
      correct,
      message
    });
    
    // Hide feedback after 3 seconds
    setTimeout(() => {
      setFeedbackState({
        visible: false,
        correct: false,
        message: ''
      });
    }, 3000);
  };
  
  // Clean up camera resources
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    
    setCameraActive(false);
    setDetectedSign(null);
  };
  
  // Submit an answer to the current question
  const submitAnswer = (answer) => {
    const { currentQuiz, currentQuestionIndex, answers } = quizState;
    const currentQuestion = currentQuiz.questions[currentQuestionIndex];
    const isCorrect = answer === currentQuestion.correctAnswer;
    
    // Update answers array
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = {
      question: currentQuestion.question,
      userAnswer: answer,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect
    };
    
    // Calculate new score
    const newScore = newAnswers.reduce((total, ans) => {
      return total + (ans && ans.isCorrect ? 1 : 0);
    }, 0);
    
    // Check if we've completed the quiz
    const isLastQuestion = currentQuestionIndex === currentQuiz.questions.length - 1;
    
    if (isLastQuestion) {
      // If this is the last question, complete the quiz
      clearInterval(timerRef.current);
      stopCamera();
      
      setQuizState(prev => ({
        ...prev,
        answers: newAnswers,
        score: newScore,
        quizCompleted: true,
        showResults: true,
      }));
    } else {
      // Move to next question
      const nextIndex = currentQuestionIndex + 1;
      const nextQuestion = currentQuiz.questions[nextIndex];
      
      // Show feedback for a moment before moving on
      showFeedback(
        isCorrect,
        isCorrect ? "Correct! Great job!" : `Incorrect. The correct answer was: ${currentQuestion.correctAnswer}`
      );
      
      // After a short delay, move to the next question
      setTimeout(() => {
        setQuizState(prev => ({
          ...prev,
          currentQuestionIndex: nextIndex,
          answers: newAnswers,
          score: newScore,
        }));
        
        // Initialize camera if needed for next question
        if (nextQuestion.type === 'recognition') {
          if (!cameraActive) {
            initializeCamera();
          }
        } else {
          stopCamera();
        }
        
        setShowHint(false);
      }, 1500);
    }
  };
  
  // Move to the next question without submitting an answer
  const skipQuestion = () => {
    const { currentQuiz, currentQuestionIndex, answers } = quizState;
    
    // Mark this question as skipped/incorrect
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = {
      question: currentQuiz.questions[currentQuestionIndex].question,
      userAnswer: "Skipped",
      correctAnswer: currentQuiz.questions[currentQuestionIndex].correctAnswer,
      isCorrect: false,
      skipped: true
    };
    
    // Check if we've completed the quiz
    const isLastQuestion = currentQuestionIndex === currentQuiz.questions.length - 1;
    
    if (isLastQuestion) {
      // If this is the last question, complete the quiz
      clearInterval(timerRef.current);
      stopCamera();
      
      setQuizState(prev => ({
        ...prev,
        answers: newAnswers,
        quizCompleted: true,
        showResults: true,
      }));
    } else {
      // Move to next question
      const nextIndex = currentQuestionIndex + 1;
      const nextQuestion = currentQuiz.questions[nextIndex];
      
      setQuizState(prev => ({
        ...prev,
        currentQuestionIndex: nextIndex,
        answers: newAnswers,
      }));
      
      // Initialize camera if needed for next question
      if (nextQuestion.type === 'recognition') {
        if (!cameraActive) {
          initializeCamera();
        }
      } else {
        stopCamera();
      }
      
      setShowHint(false);
    }
  };
  
  // Restart the quiz
  const restartQuiz = () => {
    // Stop any existing timers and camera
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    stopCamera();
    
    // Reset to the selected difficulty
    startQuiz(quizState.difficulty, quizState.mode);
  };
  
  // Exit the quiz and return to selection screen
  const exitQuiz = () => {
    // Stop any existing timers and camera
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    stopCamera();
    
    setQuizState({
      currentQuiz: null,
      currentQuestionIndex: 0,
      answers: [],
      score: 0,
      quizCompleted: false,
      showResults: false,
      timeRemaining: 0,
      isPaused: false,
      difficulty: 'beginner',
      mode: 'multipleChoice',
    });
  };
  
  // Toggle hint visibility
  const toggleHint = () => {
    setShowHint(!showHint);
  };
  
  // Calculate quiz percentage score
  const calculatePercentage = () => {
    if (!quizState.currentQuiz) return 0;
    const totalQuestions = quizState.currentQuiz.questions.length;
    return Math.round((quizState.score / totalQuestions) * 100);
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // Get percentage of quiz completed
  const getProgressPercentage = () => {
    if (!quizState.currentQuiz) return 0;
    return ((quizState.currentQuestionIndex + 1) / quizState.currentQuiz.questions.length) * 100;
  };

  // Render the current question
  const renderQuestion = () => {
    if (!quizState.currentQuiz) return null;
    
    const { currentQuiz, currentQuestionIndex } = quizState;
    const question = currentQuiz.questions[currentQuestionIndex];
    
    switch (question.type) {
      case 'multipleChoice':
        return renderMultipleChoiceQuestion(question);
      case 'recognition':
        return renderRecognitionQuestion(question);
      case 'matching':
        return renderMatchingQuestion(question);
      default:
        return <div>Unknown question type</div>;
    }
  };
  
  // Render multiple choice question
// Render multiple choice question
const renderMultipleChoiceQuestion = (question) => {
  // Is this a text-based multiple choice or image-based?
  const isImageOptions = typeof question.options[0] === 'string' && 
                         (question.options[0].includes('/image/') || 
                          question.options[0].includes('/api/placeholder'));
  
  return (
    <div className="space-y-4">
      {/* Question header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">{question.question}</h3>
        
        {/* Show image or video if available */}
        {question.imageUrl && (
          <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden mb-4">
            <img 
              src={question.imageUrl} 
              alt="Sign language gesture" 
              className="w-full h-full object-contain"
            />
          </div>
        )}
        
        {question.videoUrl && (
          <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden mb-4">
            <video 
              className="w-full h-full object-contain" 
              src={question.videoUrl}
              controls
            />
          </div>
        )}
      </div>
      
      {/* Image-based options */}
      {isImageOptions ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {question.options.map((image, index) => (
            <div 
              key={index}
              className="cursor-pointer border-2 rounded-lg overflow-hidden hover:border-blue-500 transition-colors"
              onClick={() => submitAnswer(index)}
            >
              <img 
                src={image} 
                alt={`Option ${index + 1}`}
                className="w-full h-full object-contain"
              />
              <div className="text-center p-2 bg-gray-50">Option {index + 1}</div>
            </div>
          ))}
        </div>
      ) : (
        /* Text-based options */
        <RadioGroup 
          defaultValue=""
          onValueChange={(value) => submitAnswer(value)}
          className="space-y-3"
        >
          {question.options.map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <RadioGroupItem value={option} id={`option-${index}`} />
              <Label htmlFor={`option-${index}`} className="text-base">{option}</Label>
            </div>
          ))}
        </RadioGroup>
      )}
      
      {/* Skip button */}
      <div className="flex justify-end mt-4">
        <Button 
          variant="outline" 
          onClick={skipQuestion}
          className="text-gray-500"
        >
          Skip Question
        </Button>
      </div>
    </div>
  );
};
  // Render recognition question (user performs sign)
  const renderRecognitionQuestion = (question) => {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold mb-2">{question.question}</h3>
        
        {/* Camera view for sign detection */}
        <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden relative">
          {cameraActive ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {processingGesture && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-center">Detecting sign...</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Button onClick={initializeCamera}>
                <Camera className="mr-2 h-4 w-4" />
                Enable Camera
              </Button>
            </div>
          )}
        </div>
        
        {/* Detected sign and verification */}
        {detectedSign && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">Detected Sign:</p>
                <h4 className="text-2xl font-bold">{detectedSign}</h4>
              </div>
              
              <Button 
                onClick={checkDetectedSign}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Submit This Sign
              </Button>
            </div>
          </div>
        )}
        
        {/* Skip button */}
        <div className="flex justify-end mt-4">
          <Button 
            variant="outline" 
            onClick={skipQuestion}
            className="text-gray-500"
          >
            Skip Question
          </Button>
        </div>
      </div>
    );
  };
  
  // Render matching question (drag and drop in real app)
  const renderMatchingQuestion = (question) => {
    // Simplified matching implementation
    // In a real app, you'd use a drag-and-drop library
    
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold mb-4">{question.question}</h3>
        
        <div className="grid grid-cols-2 gap-8">
          {/* Left column: signs */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700">Signs</h4>
            {question.pairs.map((pair, index) => (
              <div key={`sign-${index}`} className="bg-gray-100 p-2 rounded-lg">
                <img 
                  src={pair.sign} 
                  alt={`Sign ${index + 1}`}
                  className="w-full rounded"
                />
                <div className="mt-2 text-center">Sign {index + 1}</div>
              </div>
            ))}
          </div>
          
          {/* Right column: meanings */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700">Meanings</h4>
            {question.pairs.map((pair, index) => (
              <div key={`meaning-${index}`} className="flex">
                <select 
                  className="w-full p-2 border rounded-lg"
                  defaultValue=""
                  onChange={(e) => {
                    // In a real app, this would track matching state
                    // Simplified for demo
                    if (parseInt(e.target.value) === index) {
                      showFeedback(true, "Correct match!");
                    } else {
                      showFeedback(false, "That's not the right match.");
                    }
                  }}
                >
                  <option value="" disabled>Select matching sign</option>
                  {question.pairs.map((_, i) => (
                    <option key={i} value={i}>Sign {i + 1}</option>
                  ))}
                </select>
                <div className="ml-3 flex items-center">{pair.meaning}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Submit and skip buttons */}
        <div className="flex justify-between mt-6">
          <Button 
            onClick={() => submitAnswer(0)} // Simplified - in real app would check all matches
            className="bg-blue-600 hover:bg-blue-700"
          >
            Submit Matches
          </Button>
          
          <Button 
            variant="outline" 
            onClick={skipQuestion}
            className="text-gray-500"
          >
            Skip Question
          </Button>
        </div>
      </div>
    );
  };
  
  // Render quiz results
  const renderResults = () => {
    const percentage = calculatePercentage();
    let feedback;
    
    if (percentage >= 90) {
      feedback = "Excellent! You're a sign language expert!";
    } else if (percentage >= 70) {
      feedback = "Great job! You have strong sign language skills.";
    } else if (percentage >= 50) {
      feedback = "Good effort! With more practice, you'll improve quickly.";
    } else {
      feedback = "Keep practicing! Sign language takes time to master.";
    }
    
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center bg-blue-100 p-3 rounded-full mb-4">
            <Award className="h-12 w-12 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Quiz Completed!</h2>
          <p className="text-gray-600">{feedback}</p>
        </div>
        
        {/* Score summary */}
        <div className="flex justify-between items-center mb-6 border-b pb-6">
          <div>
            <p className="text-gray-600">Your Score</p>
            <p className="text-3xl font-bold">{quizState.score} / {quizState.currentQuiz.questions.length}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-600">Time Used</p>
            <p className="text-xl">
              {formatTime(quizState.currentQuiz.timeLimit - quizState.timeRemaining)}
            </p>
          </div>
        </div>
        
        {/* Answer review */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Answer Review</h3>
          <div className="space-y-3">
            {quizState.answers.map((answer, index) => (
              answer && (
                <div 
                  key={index}
                  className={`p-3 rounded-lg ${
                    answer.isCorrect ? 'bg-green-50 border-l-4 border-green-500' : 
                    answer.skipped ? 'bg-gray-50 border-l-4 border-gray-400' : 
                    'bg-red-50 border-l-4 border-red-500'
                  }`}
                >
                  <div className="flex items-start">
                    <div className={`rounded-full p-1 mr-3 ${
                      answer.isCorrect ? 'bg-green-100 text-green-700' :
                      answer.skipped ? 'bg-gray-100 text-gray-500' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {answer.isCorrect ? (
                        <Check className="h-4 w-4" />
                    ) : answer.skipped ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Question {index + 1}: {answer.question}</p>
                      <div className="mt-1 text-sm">
                        {answer.skipped ? (
                          <p className="text-gray-500">Skipped</p>
                        ) : (
                          <>
                            <p className={answer.isCorrect ? "text-green-600" : "text-red-600"}>
                              Your answer: {answer.userAnswer}
                            </p>
                            {!answer.isCorrect && (
                              <p className="text-gray-600">
                                Correct answer: {answer.correctAnswer}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={restartQuiz}
            className="flex-1"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Retry Quiz
          </Button>
          <Button 
            onClick={exitQuiz}
            variant="outline"
            className="flex-1"
          >
            Exit to Menu
          </Button>
        </div>
      </div>
    );
  };
  
  // Render quiz selection view
  const renderQuizSelection = () => {
    return (
      <div className="space-y-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">Sign Language Quiz</h1>
          <p className="text-gray-600">Test and improve your sign language skills</p>
        </div>
        
        <Tabs defaultValue="difficulty" className="w-full">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="difficulty">Difficulty</TabsTrigger>
            <TabsTrigger value="mode">Quiz Mode</TabsTrigger>
          </TabsList>
          
          <TabsContent value="difficulty" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['beginner', 'intermediate', 'advanced'].map((level) => (
                <div 
                  key={level}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    quizState.difficulty === level ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400'
                  }`}
                  onClick={() => setQuizState(prev => ({ ...prev, difficulty: level }))}
                >
                  <h3 className="text-lg font-medium capitalize mb-1">{level}</h3>
                  <p className="text-sm text-gray-600">
                    {level === 'beginner' && 'Learn the basics of sign language'}
                    {level === 'intermediate' && 'For those with some sign language experience'}
                    {level === 'advanced' && 'Challenge your fluency and speed'}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="mode" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  id: 'multipleChoice',
                  title: 'Multiple Choice',
                  description: 'Select the correct answer from options'
                },
                {
                  id: 'recognition',
                  title: 'Sign Recognition',
                  description: 'Perform signs and get feedback through your camera'
                },
                {
                  id: 'signing',
                  title: 'Signing Practice',
                  description: 'Learn to sign with step-by-step guidance'
                }
              ].map((mode) => (
                <div 
                  key={mode.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    quizState.mode === mode.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400'
                  }`}
                  onClick={() => setQuizState(prev => ({ ...prev, mode: mode.id }))}
                >
                  <h3 className="text-lg font-medium mb-1">{mode.title}</h3>
                  <p className="text-sm text-gray-600">{mode.description}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Quiz Options</h3>
          <div className="flex items-center space-x-2">
            <Switch id="practice-mode" />
            <Label htmlFor="practice-mode">Practice Mode (No Time Limit)</Label>
          </div>
          
          <div className="mt-6">
            <Button 
              onClick={() => startQuiz(quizState.difficulty, quizState.mode)}
              className="w-full md:w-auto"
              size="lg"
            >
              <BookOpen className="mr-2 h-5 w-5" />
              Start Quiz
            </Button>
          </div>
        </div>
      </div>
    );
  };
  
  // Main render
  return (
    <div className="container max-w-4xl mx-auto p-4">
      {/* Quiz header */}
      {quizState.currentQuiz && !quizState.showResults && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-bold">{quizState.currentQuiz.title}</h2>
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={togglePause}
              >
                {quizState.isPaused ? 'Resume' : 'Pause'}
              </Button>
              <div className="ml-2 text-lg font-mono">
                {formatTime(quizState.timeRemaining)}
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="flex items-center mb-4">
            <Progress value={getProgressPercentage()} className="flex-1 mr-4" />
            <span className="text-sm text-gray-600 whitespace-nowrap">
              {quizState.currentQuestionIndex + 1} / {quizState.currentQuiz.questions.length}
            </span>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Select quiz mode */}
        {!quizState.currentQuiz && renderQuizSelection()}
        
        {/* Quiz in progress */}
        {quizState.currentQuiz && !quizState.showResults && (
          <div>
            {/* Question content */}
            {renderQuestion()}
            
            {/* Hint button */}
            {quizState.currentQuiz.questions[quizState.currentQuestionIndex].hint && (
              <div className="mt-6">
                <Button 
                  variant="outline" 
                  onClick={toggleHint}
                  className="flex items-center text-blue-600"
                >
                  <Lightbulb className="mr-2 h-4 w-4" />
                  {showHint ? 'Hide Hint' : 'Show Hint'}
                </Button>
                
                {showHint && (
                  <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-md">
                    <p>{quizState.currentQuiz.questions[quizState.currentQuestionIndex].hint}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Quiz results */}
        {quizState.showResults && renderResults()}
        
        {/* Feedback message */}
        {feedbackState.visible && (
          <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-lg ${
            feedbackState.correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className="flex items-center">
              {feedbackState.correct ? (
                <ThumbsUp className="mr-2 h-5 w-5" />
              ) : (
                <AlertTriangle className="mr-2 h-5 w-5" />
              )}
              {feedbackState.message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignLanguageQuiz;