'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  FileQuestion,
  Play,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  BarChart3,
  Clock,
  Zap,
  Sparkles,
  Trophy,
  Send,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { toast } from 'sonner';

interface AITest {
  id: string;
  schoolId: string;
  assessmentId: string | null;
  studentId: string | null;
  classGroupId: string | null;
  subjectId: string | null;
  testType: string;
  difficulty: string;
  questionCount: number;
  questions: string | null;
  aiProvider: string;
  generatedAt: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  score: number | null;
  createdAt: string;
  student: { id: string; firstName: string; lastName: string } | null;
  classGroup: { id: string; name: string } | null;
  subject: { id: string; name: string } | null;
}

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export default function AITestsView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [tests, setTests] = useState<AITest[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [testTakingOpen, setTestTakingOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<AITest | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  // Generate form
  const [topic, setTopic] = useState('');
  const [testType, setTestType] = useState('practice');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState(10);

  const schoolId = currentUser?.schoolId;
  const role = currentUser?.role;
  const isStudent = role === 'STUDENT';
  const isTeacher = role === 'TEACHER';
  const isAdmin = role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN' || role === 'VICE_PRINCIPAL';

  const fetchTests = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const data = await apiGet<AITest[]>(`/api/ai-tests?schoolId=${schoolId}`);
      setTests(data);
    } catch (err) {
      console.error('Failed to fetch tests:', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const handleGenerateTest = async () => {
    if (!topic) return;
    try {
      await apiPost('/api/ai-tests', {
        schoolId,
        topic,
        testType,
        difficulty,
        questionCount,
      });
      toast.success(t('ai_tests.generate'));
      setGenerateDialogOpen(false);
      setTopic('');
      fetchTests();
    } catch (err) {
      toast.error(String(err) || 'Failed to generate test');
    }
  };

  const handleAutoGenerate = async () => {
    try {
      const result = await apiPost('/api/ai-tests/auto-generate', { schoolId });
      toast.success(`${t('ai_tests.auto_generate')}: ${result.generated}`);
      fetchTests();
    } catch (err) {
      toast.error(String(err) || 'Failed to auto-generate');
    }
  };

  const startTest = (test: AITest) => {
    setSelectedTest(test);
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
    setTestTakingOpen(true);
  };

  const getQuestions = (test: AITest): Question[] => {
    if (!test.questions) return [];
    try {
      return JSON.parse(test.questions);
    } catch {
      return [];
    }
  };

  const handleSubmitTest = async () => {
    if (!selectedTest) return;
    const questions = getQuestions(selectedTest);
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswer) correct++;
    });
    const score = questions.length > 0 ? (correct / questions.length) * 100 : 0;

    try {
      await apiPut(`/api/ai-tests/${selectedTest.id}`, {
        isCompleted: true,
        score,
      });
      setShowResults(true);
      toast.success(t('ai_tests.submit_answers'));
      fetchTests();
    } catch (err) {
      toast.error(String(err) || 'Failed to submit');
    }
  };

  const getTestTypeColor = (type: string) => {
    switch (type) {
      case 'practice': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'mock_exam': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'review': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'medium': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const pendingTests = tests.filter((t) => !t.isCompleted);
  const completedTests = tests.filter((t) => t.isCompleted);
  const avgScore = completedTests.length > 0 ? completedTests.reduce((a, t) => a + (t.score || 0), 0) / completedTests.length : 0;

  // Questions for current test
  const questions = selectedTest ? getQuestions(selectedTest) : [];
  const currentQ = questions[currentQuestion];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('ai_tests.title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('ai_tests.practice')}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setGenerateDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Sparkles className="h-4 w-4 mr-2" />
            {t('ai_tests.generate')}
          </Button>
          {isAdmin && (
            <Button variant="outline" onClick={handleAutoGenerate} className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('ai_tests.auto_generate')}
            </Button>
          )}
          <Button variant="outline" onClick={fetchTests}>
            {t('action.refresh')}
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('ai_tests.total_tests')}</p>
            <p className="text-2xl font-bold">{tests.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('ai_tests.pending')}</p>
            <p className="text-2xl font-bold">{pendingTests.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-teal-500">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('ai_tests.completion_rate')}</p>
            <p className="text-2xl font-bold">{tests.length > 0 ? Math.round((completedTests.length / tests.length) * 100) : 0}%</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t('ai_tests.average_score')}</p>
            <p className="text-2xl font-bold">{Math.round(avgScore)}%</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="available" className="space-y-4">
        <TabsList>
          <TabsTrigger value="available">{t('ai_tests.take_test')}</TabsTrigger>
          <TabsTrigger value="completed">{t('ai_tests.completed')}</TabsTrigger>
          {isAdmin && <TabsTrigger value="statistics">{t('ai_tests.test_statistics')}</TabsTrigger>}
        </TabsList>

        {/* Available Tests Tab */}
        <TabsContent value="available">
          {loading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : pendingTests.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <div className="h-20 w-20 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
                    <FileQuestion className="h-10 w-10 text-emerald-300 dark:text-emerald-600" />
                  </div>
                </motion.div>
                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">{t('ai_tests.no_tests')}</p>
                <p className="text-gray-400 text-sm mt-1">{t('ai_tests.generate')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              <AnimatePresence>
                {pendingTests.map((test, idx) => (
                  <motion.div
                    key={test.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${getTestTypeColor(test.testType)}`}>
                              <Brain className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={getTestTypeColor(test.testType)} variant="secondary">
                                  {t(`ai_tests.${test.testType}`)}
                                </Badge>
                                <Badge className={getDifficultyColor(test.difficulty)} variant="secondary">
                                  {t(`ai_tests.${test.difficulty}`)}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  {test.questionCount} {t('ai_tests.questions')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {test.subject?.name && `${t('ai_tests.subject')}: ${test.subject.name} | `}
                                {test.generatedAt && `${t('ai_tests.generated_on')}: ${new Date(test.generatedAt).toLocaleDateString()}`}
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={() => startTest(test)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            {t('ai_tests.take_test')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Completed Tests Tab */}
        <TabsContent value="completed">
          {completedTests.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <div className="h-20 w-20 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
                    <Trophy className="h-10 w-10 text-emerald-300 dark:text-emerald-600" />
                  </div>
                </motion.div>
                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">{t('ai_tests.no_tests')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {completedTests.map((test, idx) => (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${test.score && test.score >= 70 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                            <Trophy className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={getTestTypeColor(test.testType)} variant="secondary">
                                {t(`ai_tests.${test.testType}`)}
                              </Badge>
                              <span className="text-lg font-bold">{Math.round(test.score || 0)}%</span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {test.completedAt && `${t('ai_tests.completed')}: ${new Date(test.completedAt).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedTest(test);
                            setShowResults(true);
                            setTestTakingOpen(true);
                          }}
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          {t('ai_tests.results')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Statistics Tab */}
        {isAdmin && (
          <TabsContent value="statistics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('ai_tests.test_statistics')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('ai_tests.average_score')}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={avgScore} className="flex-1" />
                        <span className="text-sm font-medium">{Math.round(avgScore)}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('ai_tests.completion_rate')}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={tests.length > 0 ? (completedTests.length / tests.length) * 100 : 0} className="flex-1" />
                        <span className="text-sm font-medium">{tests.length > 0 ? Math.round((completedTests.length / tests.length) * 100) : 0}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('ai_tests.difficulty')}</p>
                      <div className="flex gap-2 mt-1">
                        {['easy', 'medium', 'hard'].map((d) => (
                          <Badge key={d} className={getDifficultyColor(d)} variant="secondary">
                            {t(`ai_tests.${d}`)}: {tests.filter((t) => t.difficulty === d).length}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('ai_tests.auto_settings')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">{t('ai_tests.two_weeks_before')}</p>
                    <Button onClick={handleAutoGenerate} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t('ai_tests.manual_trigger')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Generate Test Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ai_tests.generate')}</DialogTitle>
            <DialogDescription>{t('ai_tests.configure')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('ai_tests.topic')}</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t('ai_tests.topic')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('ai_tests.test_type')}</Label>
                <Select value={testType} onValueChange={setTestType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="practice">{t('ai_tests.practice')}</SelectItem>
                    <SelectItem value="mock_exam">{t('ai_tests.mock_exam')}</SelectItem>
                    <SelectItem value="review">{t('ai_tests.review')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('ai_tests.difficulty')}</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">{t('ai_tests.easy')}</SelectItem>
                    <SelectItem value="medium">{t('ai_tests.medium')}</SelectItem>
                    <SelectItem value="hard">{t('ai_tests.hard')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t('ai_tests.question_count')}</Label>
              <Select value={String(questionCount)} onValueChange={(v) => setQuestionCount(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
                {t('action.cancel')}
              </Button>
              <Button onClick={handleGenerateTest} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Sparkles className="h-4 w-4 mr-2" />
                {t('ai_tests.generate')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Taking Dialog */}
      <Dialog open={testTakingOpen} onOpenChange={setTestTakingOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {showResults ? t('ai_tests.results') : t('ai_tests.take_test')}
            </DialogTitle>
            <DialogDescription>
              {selectedTest && !showResults && t('ai_tests.question_of', { current: currentQuestion + 1, total: questions.length })}
            </DialogDescription>
          </DialogHeader>

          {showResults ? (
            <div className="space-y-4">
              {selectedTest && (
                <div className="text-center mb-4">
                  {/* Circular score visualization */}
                  <div className="relative w-28 h-28 mx-auto mb-3">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="6" />
                      <motion.circle
                        cx="50" cy="50" r="40" fill="none"
                        stroke={selectedTest.score && selectedTest.score >= 70 ? '#10b981' : selectedTest.score && selectedTest.score >= 40 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - (selectedTest.score || 0) / 100) }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.span
                        className={`text-2xl font-bold ${selectedTest.score && selectedTest.score >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.3 }}
                      >
                        {Math.round(selectedTest.score || 0)}%
                      </motion.span>
                    </div>
                  </div>
                  {/* Celebration animation for high scores */}
                  {selectedTest.score && selectedTest.score >= 70 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.5 }}
                    >
                      <Trophy className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                    </motion.div>
                  )}
                  <p className="text-sm text-muted-foreground">{t('ai_tests.score')}</p>
                </div>
              )}
              <ScrollArea className="max-h-96">
                <div className="space-y-4">
                  {questions.map((q, i) => {
                    const isCorrect = answers[i] === q.correctAnswer;
                    return (
                      <Card key={i} className={`${isCorrect ? 'border-emerald-300 dark:border-emerald-700' : 'border-red-300 dark:border-red-700'}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-2">
                            {isCorrect ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{q.question}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {t('ai_tests.your_answer')}: {answers[i] || '---'}
                              </p>
                              {!isCorrect && (
                                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                                  {t('ai_tests.correct_answer')}: {q.correctAnswer}
                                </p>
                              )}
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {t('ai_tests.explanation')}: {q.explanation}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          ) : currentQ ? (
            <div className="space-y-4">
              {/* Quiz progress bar with animated fill */}
              <div className="relative h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              {/* Question navigation dots */}
              <div className="flex items-center gap-1 justify-center">
                {questions.map((_, i) => (
                  <motion.div
                    key={i}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === currentQuestion
                        ? 'w-6 bg-emerald-500'
                        : answers[i]
                        ? 'w-2 bg-emerald-300 dark:bg-emerald-700'
                        : 'w-2 bg-gray-300 dark:bg-gray-600'
                    }`}
                    layout
                  />
                ))}
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{currentQ.question}</p>
              </div>
              <div className="space-y-2">
                {currentQ.options.map((option, i) => (
                  <Button
                    key={i}
                    variant={answers[currentQuestion] === option ? 'default' : 'outline'}
                    className={`w-full text-left justify-start h-auto py-3 px-4 ${
                      answers[currentQuestion] === option
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                    }`}
                    onClick={() => setAnswers({ ...answers, [currentQuestion]: option })}
                  >
                    <span className="mr-2 font-semibold">{String.fromCharCode(65 + i)}.</span>
                    {option}
                  </Button>
                ))}
              </div>
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('ai_tests.previous_question')}
                </Button>
                {currentQuestion < questions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQuestion(currentQuestion + 1)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {t('ai_tests.next_question')}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitTest}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {t('ai_tests.submit_answers')}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">{t('ai_tests.no_tests')}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
