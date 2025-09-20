// src/pages/collections/components/CollectionsQuiz.tsx
import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  Award, 
  RefreshCw, 
  Clock,
  Target
} from 'lucide-react';

interface CollectionsQuizProps {
  collectionName: string;
  onComplete?: (score: number) => void;
  onClose?: () => void;
}

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const CollectionsQuiz: React.FC<CollectionsQuizProps> = ({ 
  collectionName, 
  onComplete, 
  onClose 
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [quizComplete, setQuizComplete] = useState(false);

  // Mock questions - will be loaded from Firebase based on collection
  const questions: Question[] = [
    {
      id: 1,
      question: "What is the first step when installing a new toilet?",
      options: [
        "Connect the water supply",
        "Remove the old toilet",
        "Install the wax ring",
        "Level the toilet"
      ],
      correctAnswer: 1,
      explanation: "Always remove the old toilet first to prepare the area for installation."
    },
    {
      id: 2,
      question: "What tool is essential for checking if a toilet is level?",
      options: [
        "Adjustable wrench",
        "Screwdriver",
        "Level",
        "Pipe cutter"
      ],
      correctAnswer: 2,
      explanation: "A level ensures the toilet sits properly and prevents leaks."
    },
    {
      id: 3,
      question: "How long should you wait after installing before testing for leaks?",
      options: [
        "Immediately",
        "30 minutes",
        "1 hour",
        "24 hours"
      ],
      correctAnswer: 0,
      explanation: "Test immediately to catch any leaks before they cause damage."
    },
    {
      id: 4,
      question: "What material creates the seal between the toilet and floor drain?",
      options: [
        "Silicone caulk",
        "Plumber's putty",
        "Wax ring",
        "Rubber gasket"
      ],
      correctAnswer: 2,
      explanation: "A wax ring creates a watertight seal between the toilet and the floor flange."
    },
    {
      id: 5,
      question: "What should you do if the toilet rocks after installation?",
      options: [
        "Tighten the bolts more",
        "Use shims to level it",
        "Replace the wax ring",
        "Apply more caulk"
      ],
      correctAnswer: 1,
      explanation: "Use plastic shims to level the toilet and prevent movement that could break the seal."
    }
  ];

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return;
    
    setSelectedAnswer(answerIndex);
    setShowResult(true);
    
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answerIndex;
    setAnswers(newAnswers);
    
    if (answerIndex === questions[currentQuestion].correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(answers[currentQuestion + 1] ?? null);
      setShowResult(false);
    } else {
      setQuizComplete(true);
      onComplete?.(score);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setAnswers([]);
    setQuizComplete(false);
  };

  const getScoreColor = () => {
    const percentage = (score / questions.length) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreMessage = () => {
    const percentage = (score / questions.length) * 100;
    if (percentage >= 80) return 'Excellent work! You\'ve mastered this procedure.';
    if (percentage >= 60) return 'Good job! Review the missed questions to improve.';
    return 'Keep practicing! Review the procedure and try again.';
  };

  if (quizComplete) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 rounded-full mb-6">
            <Award className="w-10 h-10 text-orange-600" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Quiz Complete!</h2>
          <p className="text-lg text-gray-600 mb-6">{collectionName}</p>
          
          <div className={`text-5xl font-bold mb-4 ${getScoreColor()}`}>
            {score}/{questions.length}
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-gray-700">{getScoreMessage()}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <Target className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Accuracy</p>
              <p className="text-xl font-semibold text-gray-900">
                {Math.round((score / questions.length) * 100)}%
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Correct Answers</p>
              <p className="text-xl font-semibold text-gray-900">{score}</p>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={handleRestart}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retake Quiz</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Progress Bar */}
        <div className="bg-gray-200 h-2">
          <div 
            className="bg-orange-600 h-2 transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          />
        </div>
        
        {/* Quiz Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{collectionName}</h3>
            <span className="text-sm text-gray-500">
              Question {currentQuestion + 1} of {questions.length}
            </span>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>~{questions.length * 2} min</span>
            </div>
            <div className="flex items-center space-x-1">
              <Target className="w-4 h-4" />
              <span>Score: {score}/{currentQuestion + (showResult ? 1 : 0)}</span>
            </div>
          </div>
        </div>
        
        {/* Question */}
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {questions[currentQuestion].question}
          </h2>
          
          {/* Options */}
          <div className="space-y-3">
            {questions[currentQuestion].options.map((option, index) => {
              const isCorrect = index === questions[currentQuestion].correctAnswer;
              const isSelected = index === selectedAnswer;
              
              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showResult}
                  className={`
                    w-full text-left p-4 rounded-lg border-2 transition-all
                    ${!showResult ? 
                      'border-gray-200 hover:border-orange-500 hover:bg-orange-50' :
                      isCorrect ? 
                        'border-green-500 bg-green-50' :
                        isSelected ? 
                          'border-red-500 bg-red-50' :
                          'border-gray-200 opacity-50'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className={`
                        flex items-center justify-center w-8 h-8 rounded-full font-medium
                        ${!showResult ?
                          'bg-gray-100 text-gray-700' :
                          isCorrect ?
                            'bg-green-600 text-white' :
                            isSelected ?
                              'bg-red-600 text-white' :
                              'bg-gray-100 text-gray-400'
                        }
                      `}>
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className={`
                        ${showResult && isCorrect ? 'font-semibold text-green-700' :
                          showResult && isSelected && !isCorrect ? 'text-red-700' :
                          'text-gray-900'}
                      `}>
                        {option}
                      </span>
                    </div>
                    {showResult && (
                      <>
                        {isCorrect && <CheckCircle className="w-5 h-5 text-green-600" />}
                        {isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-600" />}
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          
          {/* Explanation */}
          {showResult && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-1">Explanation:</p>
              <p className="text-sm text-blue-700">
                {questions[currentQuestion].explanation}
              </p>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Exit Quiz
            </button>
            <button
              onClick={handleNext}
              disabled={!showResult}
              className={`
                flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors
                ${showResult ?
                  'bg-orange-600 text-white hover:bg-orange-700' :
                  'bg-gray-300 text-gray-500 cursor-not-allowed'}
              `}
            >
              <span>{currentQuestion === questions.length - 1 ? 'Finish' : 'Next'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionsQuiz;