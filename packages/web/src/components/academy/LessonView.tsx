'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Lesson, UserProgress } from '@/lib/academy-data';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle, Trophy, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LessonViewProps {
  lesson: Lesson;
  progress: UserProgress;
  onComplete: (lessonId: string, score: number) => void;
  onBack: () => void;
  onNext: () => void;
}

export function LessonView({ lesson, progress, onComplete, onBack, onNext }: LessonViewProps) {
  const [showQuiz, setShowQuiz] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  /** True when this quiz submission was the first pass that awarded HP */
  const [awardedHpThisSubmit, setAwardedHpThisSubmit] = useState(false);

  const isCompleted = progress.completedLessons.includes(lesson.id);

  const handleAnswer = (questionId: string, answerIndex: number) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length < lesson.quiz.questions.length) return;

    let correct = 0;
    lesson.quiz.questions.forEach((q) => {
      if (answers[q.id] === q.correctIndex) correct++;
    });

    const pct = (correct / lesson.quiz.questions.length) * 100;
    setScore(pct);
    setSubmitted(true);

    if (pct >= lesson.quiz.passingScore) {
      if (!isCompleted) {
        onComplete(lesson.id, pct);
        setAwardedHpThisSubmit(true);
      } else {
        setAwardedHpThisSubmit(false);
      }
    } else {
      setAwardedHpThisSubmit(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const qLen = lesson.quiz.questions.length;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-1 sm:px-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack} className="w-fit text-gray-400 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to module
        </Button>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>{lesson.estimatedMinutes} min read</span>
          {isCompleted && <CheckCircle className="h-4 w-4 text-green-400" />}
        </div>
      </div>

      {!showQuiz ? (
        <Card className="border-gray-800 bg-cv-dark p-6 sm:p-8">
          <h1 className="mb-6 text-2xl font-bold text-white">{lesson.title}</h1>

          <div className="max-w-none space-y-4 text-gray-300 [&_h1]:mb-4 [&_h1]:mt-8 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-white [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:text-white [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:leading-relaxed [&_strong]:text-cv-teal [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_td]:border [&_td]:border-gray-800 [&_td]:px-2 [&_td]:py-2 [&_th]:border [&_th]:border-gray-800 [&_th]:px-2 [&_th]:py-2 [&_th]:text-left [&_th]:text-white [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6">
            <div className="overflow-x-auto">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.content.trim()}</ReactMarkdown>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-800 pt-6">
            <Button
              onClick={() => setShowQuiz(true)}
              className="bg-cv-teal text-white hover:bg-teal-700"
            >
              Take quiz
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="border-gray-800 bg-cv-dark p-6 sm:p-8">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-white">Quiz: {lesson.title}</h2>
            <span className="text-sm text-gray-400">Passing: {lesson.quiz.passingScore}%</span>
          </div>

          <Progress value={(answeredCount / qLen) * 100} className="mb-6 h-2 bg-gray-800" />

          <div className="space-y-8">
            {lesson.quiz.questions.map((q, qIdx) => (
              <div key={q.id} className="space-y-3">
                <p className="font-medium text-white">
                  {qIdx + 1}. {q.question}
                </p>

                <RadioGroup
                  value={answers[q.id] !== undefined ? String(answers[q.id]) : undefined}
                  onValueChange={(v) => handleAnswer(q.id, parseInt(v, 10))}
                  disabled={submitted}
                  className="gap-3"
                >
                  {q.options.map((opt, oIdx) => (
                    <div
                      key={oIdx}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                        submitted && oIdx === q.correctIndex
                          ? 'border-green-500 bg-green-500/10'
                          : submitted &&
                              answers[q.id] === oIdx &&
                              oIdx !== q.correctIndex
                            ? 'border-red-500 bg-red-500/10'
                            : 'border-gray-700 hover:border-gray-600'
                      )}
                    >
                      <RadioGroupItem value={String(oIdx)} id={`${q.id}-${oIdx}`} />
                      <Label
                        htmlFor={`${q.id}-${oIdx}`}
                        className="flex-1 cursor-pointer text-gray-300"
                      >
                        {opt}
                      </Label>
                      {submitted && oIdx === q.correctIndex && (
                        <CheckCircle className="h-4 w-4 shrink-0 text-green-400" />
                      )}
                      {submitted && answers[q.id] === oIdx && oIdx !== q.correctIndex && (
                        <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                      )}
                    </div>
                  ))}
                </RadioGroup>

                {submitted && (
                  <p
                    className={cn(
                      'rounded-lg p-3 text-sm',
                      answers[q.id] === q.correctIndex
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    )}
                  >
                    {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>

          {!submitted ? (
            <Button
              onClick={handleSubmit}
              disabled={answeredCount < qLen}
              className="mt-6 w-full bg-cv-teal text-white hover:bg-teal-700"
            >
              Submit answers
            </Button>
          ) : (
            <div className="mt-6 text-center">
              <AnimatePresence mode="wait">
                {score >= lesson.quiz.passingScore ? (
                  <motion.div
                    key="pass"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-center gap-2 text-green-400">
                      <Trophy className="h-6 w-6" />
                      <span className="text-xl font-bold">Passed! ({Math.round(score)}%)</span>
                    </div>
                    {awardedHpThisSubmit && (
                      <p className="text-gray-400">+{lesson.heartPoints} Heart Points earned!</p>
                    )}
                    {!awardedHpThisSubmit && isCompleted && (
                      <p className="text-sm text-gray-500">Lesson already completed — HP unchanged.</p>
                    )}
                    <Button onClick={onNext} className="bg-cv-teal text-white hover:bg-teal-700">
                      Next lesson
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="fail"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <p className="text-xl font-bold text-red-400">
                      Needs review ({Math.round(score)}%)
                    </p>
                    <p className="text-gray-400">
                      You need {lesson.quiz.passingScore}% to pass. Review the lesson and try again.
                    </p>
                    <Button
                      onClick={() => {
                        setSubmitted(false);
                        setAnswers({});
                        setAwardedHpThisSubmit(false);
                        setShowQuiz(false);
                      }}
                      variant="outline"
                      className="border-gray-600 text-gray-300"
                    >
                      Review lesson
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
