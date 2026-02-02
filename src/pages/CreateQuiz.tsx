import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Button as CustomButton } from '@/components/ui/custom-button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Question, Quiz, Answer } from '@/types'
import { ArrowLeft01Icon, PlusSignIcon, Delete02Icon, Tick02Icon, Cancel01Icon, Clock01Icon, CrownIcon, RocketIcon, Edit02Icon } from 'hugeicons-react'
import { v4 as uuidv4 } from 'uuid'

interface CreateQuizProps {
  onSubmit: (quiz: Omit<Quiz, 'id' | 'createdAt' | 'code'>) => void
  onBack: () => void
  isLoading?: boolean
}

const getAnswerDotClass = (color: Answer['color']) => {
  switch (color) {
    case 'red': return 'bg-[hsl(var(--answer-red))]'
    case 'blue': return 'bg-[hsl(var(--answer-blue))]'
    case 'yellow': return 'bg-[hsl(var(--answer-yellow))]'
    case 'green': return 'bg-[hsl(var(--answer-green))]'
  }
}

export function CreateQuiz({ onSubmit, onBack, isLoading }: CreateQuizProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [currentAnswers, setCurrentAnswers] = useState<Answer[]>([
    { id: uuidv4(), text: '', isCorrect: false, color: 'red' },
    { id: uuidv4(), text: '', isCorrect: false, color: 'blue' },
    { id: uuidv4(), text: '', isCorrect: false, color: 'yellow' },
    { id: uuidv4(), text: '', isCorrect: false, color: 'green' },
  ])
  const [timeLimit, setTimeLimit] = useState(20)
  const [points, setPoints] = useState(1000)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)

  const handleAddQuestion = () => {
    if (!currentQuestion.trim() || currentAnswers.some(a => !a.text.trim())) return
    if (!currentAnswers.some(a => a.isCorrect)) return

    if (editingQuestionId) {
      setQuestions(questions.map((q) => (
        q.id === editingQuestionId
          ? { ...q, text: currentQuestion, answers: currentAnswers, timeLimit, points }
          : q
      )))
      setEditingQuestionId(null)
    } else {
      const newQuestion: Question = {
        id: uuidv4(),
        text: currentQuestion,
        answers: currentAnswers,
        timeLimit,
        points,
      }
      setQuestions([...questions, newQuestion])
    }

    setCurrentQuestion('')
    setCurrentAnswers([
      { id: uuidv4(), text: '', isCorrect: false, color: 'red' },
      { id: uuidv4(), text: '', isCorrect: false, color: 'blue' },
      { id: uuidv4(), text: '', isCorrect: false, color: 'yellow' },
      { id: uuidv4(), text: '', isCorrect: false, color: 'green' },
    ])
    setTimeLimit(20)
    setPoints(1000)
  }

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id))
    if (editingQuestionId === id) {
      setEditingQuestionId(null)
      setCurrentQuestion('')
      setCurrentAnswers([
        { id: uuidv4(), text: '', isCorrect: false, color: 'red' },
        { id: uuidv4(), text: '', isCorrect: false, color: 'blue' },
        { id: uuidv4(), text: '', isCorrect: false, color: 'yellow' },
        { id: uuidv4(), text: '', isCorrect: false, color: 'green' },
      ])
      setTimeLimit(20)
      setPoints(1000)
    }
  }

  const handleUpdateAnswer = (id: string, text: string) => {
    setCurrentAnswers(currentAnswers.map(a => 
      a.id === id ? { ...a, text } : a
    ))
  }

  const handleSetCorrectAnswer = (id: string) => {
    setCurrentAnswers(currentAnswers.map(a => 
      ({ ...a, isCorrect: a.id === id })
    ))
  }

  const handleEditQuestion = (id: string) => {
    const question = questions.find((q) => q.id === id)
    if (!question) return
    setEditingQuestionId(id)
    setCurrentQuestion(question.text)
    setCurrentAnswers(question.answers.map((answer) => ({ ...answer })))
    setTimeLimit(question.timeLimit)
    setPoints(question.points)
  }

  const handleCancelEdit = () => {
    setEditingQuestionId(null)
    setCurrentQuestion('')
    setCurrentAnswers([
      { id: uuidv4(), text: '', isCorrect: false, color: 'red' },
      { id: uuidv4(), text: '', isCorrect: false, color: 'blue' },
      { id: uuidv4(), text: '', isCorrect: false, color: 'yellow' },
      { id: uuidv4(), text: '', isCorrect: false, color: 'green' },
    ])
    setTimeLimit(20)
    setPoints(1000)
  }

  const handleSubmit = () => {
    if (!title.trim() || questions.length === 0) return
    onSubmit({ title, description, questions })
  }

  const hasCorrectAnswer = currentAnswers.some(a => a.isCorrect)

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-4xl">
        <CustomButton
          variant="secondary"
          onClick={onBack}
          className="mb-8"
          icon={<ArrowLeft01Icon className="w-5 h-5" />}
        >
          Retour
        </CustomButton>

        <h1 className="text-3xl font-medium text-foreground mb-10">Créer un quiz</h1>

        <Card className="mb-6 border border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium">Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Titre du quiz</label>
              <Input
                placeholder="Exemple : Culture générale"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-border focus-visible:ring-foreground"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Description</label>
              <Input
                placeholder="Une brève description de votre quiz..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border-border focus-visible:ring-foreground"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 border border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium">
              {editingQuestionId ? 'Modifier une question' : 'Ajouter une question'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Question</label>
              <Input
                placeholder="Votre question ici..."
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                className="border-border focus-visible:ring-foreground"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Réponses</p>
              <p className="text-xs text-muted-foreground">Choisissez la bonne réponse</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentAnswers.map((answer, index) => (
                <div
                  key={answer.id}
                  className={`space-y-3 rounded-xl border p-3 ${answer.isCorrect ? 'border-[hsl(var(--answer-green))] bg-[hsl(var(--answer-green))]/5' : 'border-border bg-background'}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getAnswerDotClass(answer.color)}`} />
                      Réponse {index + 1}
                    </label>
                    <Button
                      variant={answer.isCorrect ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSetCorrectAnswer(answer.id)}
                      className={`w-full sm:w-auto rounded-lg ${answer.isCorrect ? 'bg-[hsl(var(--answer-green))] hover:bg-[hsl(var(--answer-green))]/90 border-0' : 'border-border'}`}
                    >
                      {answer.isCorrect ? (
                        <>
                          <Tick02Icon className="w-4 h-4 mr-2" />
                          Bonne réponse
                        </>
                      ) : (
                        <>
                          <Cancel01Icon className="w-4 h-4 mr-2" />
                          Marquer
                        </>
                      )}
                    </Button>
                  </div>
                  <Input
                    placeholder={`Réponse ${index + 1}`}
                    value={answer.text}
                    onChange={(e) => handleUpdateAnswer(answer.id, e.target.value)}
                    className={`border-border focus-visible:ring-foreground ${answer.isCorrect ? 'border-[hsl(var(--answer-green))]' : ''}`}
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Clock01Icon className="w-4 h-4" />
                  Temps (secondes)
                </label>
                <Input
                  type="number"
                  min={5}
                  max={60}
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  className="border-border focus-visible:ring-foreground"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <CrownIcon className="w-4 h-4" />
                  Points
                </label>
                <Input
                  type="number"
                  min={500}
                  max={1000}
                  step={1}
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="border-border focus-visible:ring-foreground"
                />
              </div>
            </div>

            <CustomButton
              variant="secondary"
              onClick={handleAddQuestion}
              className="w-full"
              disabled={!currentQuestion.trim() || currentAnswers.some(a => !a.text.trim()) || !hasCorrectAnswer}
              icon={<PlusSignIcon className="w-5 h-5" />}
            >
              {editingQuestionId ? 'Mettre à jour la question' : 'Ajouter la question'}
            </CustomButton>
            {editingQuestionId && (
              <Button
                variant="ghost"
                onClick={handleCancelEdit}
                className="w-full hover:bg-muted"
              >
                Annuler la modification
              </Button>
            )}
            {!hasCorrectAnswer && (
              <p className="text-sm text-muted-foreground text-center">
                Sélectionnez la bonne réponse pour continuer.
              </p>
            )}
          </CardContent>
        </Card>

        {questions.length > 0 && (
          <Card className="mb-6 border border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium">Questions ajoutées ({questions.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {questions.map((q, index) => (
                <div
                  key={q.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-muted/50 rounded-lg border border-border"
                >
                  <div>
                    <p className="font-medium text-foreground break-words">{index + 1}. {q.text}</p>
                    <p className="text-sm text-muted-foreground mt-1 break-words">
                      Bonne réponse : {q.answers.find(a => a.isCorrect)?.text || 'Non définie'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {q.answers.length} réponses · {q.timeLimit}s · {q.points} pts
                    </p>
                  </div>
                  <div className="flex items-center gap-0 self-end sm:self-auto">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditQuestion(q.id)}
                      className="hover:bg-muted"
                    >
                      <Edit02Icon className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Delete02Icon className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <CustomButton
          variant="primary"
          onClick={handleSubmit}
          disabled={!title.trim() || questions.length === 0 || isLoading}
          className="w-full"
          icon={<RocketIcon className="w-5 h-5" />}
        >
          {isLoading ? 'Création en cours...' : 'Créer le quiz et lancer la partie'}
        </CustomButton>
      </div>
    </div>
  )
}
