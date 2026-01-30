import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Button as CustomButton } from '@/components/ui/custom-button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Question, Quiz, Answer } from '@/types'
import { ArrowLeft01Icon, PlusSignIcon, Delete02Icon, Tick02Icon, Cancel01Icon, Clock01Icon, CrownIcon, RocketIcon } from 'hugeicons-react'
import { v4 as uuidv4 } from 'uuid'

interface CreateQuizProps {
  onSubmit: (quiz: Omit<Quiz, 'id' | 'createdAt' | 'code'>, hostName: string) => void
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
  const [hostName, setHostName] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [currentAnswers, setCurrentAnswers] = useState<Answer[]>([
    { id: uuidv4(), text: '', isCorrect: true, color: 'red' },
    { id: uuidv4(), text: '', isCorrect: false, color: 'blue' },
    { id: uuidv4(), text: '', isCorrect: false, color: 'yellow' },
    { id: uuidv4(), text: '', isCorrect: false, color: 'green' },
  ])
  const [timeLimit, setTimeLimit] = useState(20)
  const [points, setPoints] = useState(1000)

  const handleAddQuestion = () => {
    if (!currentQuestion.trim() || currentAnswers.some(a => !a.text.trim())) return

    const newQuestion: Question = {
      id: uuidv4(),
      text: currentQuestion,
      answers: currentAnswers,
      timeLimit,
      points,
    }

    setQuestions([...questions, newQuestion])
    setCurrentQuestion('')
    setCurrentAnswers([
      { id: uuidv4(), text: '', isCorrect: true, color: 'red' },
      { id: uuidv4(), text: '', isCorrect: false, color: 'blue' },
      { id: uuidv4(), text: '', isCorrect: false, color: 'yellow' },
      { id: uuidv4(), text: '', isCorrect: false, color: 'green' },
    ])
  }

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id))
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

  const handleSubmit = () => {
    if (!title.trim() || !hostName.trim() || questions.length === 0) return
    onSubmit({ title, description, questions }, hostName.trim())
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-4xl">
        <Button variant="ghost" onClick={onBack} className="mb-8 hover:bg-muted">
          <ArrowLeft01Icon className="w-5 h-5 mr-2" />
          Retour
        </Button>

        <h1 className="text-3xl font-medium text-foreground mb-10">Créer un quiz</h1>

        <Card className="mb-6 border border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium">Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Votre pseudo (hôte)</label>
              <Input
                placeholder="Exemple : Alex"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="border-border focus-visible:ring-foreground"
              />
            </div>
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
            <CardTitle className="text-lg font-medium">Ajouter une question</CardTitle>
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

            <div className="grid grid-cols-2 gap-4">
              {currentAnswers.map((answer, index) => (
                <div key={answer.id} className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getAnswerDotClass(answer.color)}`} />
                    Réponse {index + 1}
                    {answer.isCorrect && (
                      <Tick02Icon className="w-4 h-4 text-[hsl(var(--answer-green))]" />
                    )}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder={`Réponse ${index + 1}`}
                      value={answer.text}
                      onChange={(e) => handleUpdateAnswer(answer.id, e.target.value)}
                      className={`border-border focus-visible:ring-foreground ${answer.isCorrect ? 'border-[hsl(var(--answer-green))]' : ''}`}
                    />
                    <Button
                      variant={answer.isCorrect ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => handleSetCorrectAnswer(answer.id)}
                      className={answer.isCorrect ? 'bg-[hsl(var(--answer-green))] hover:bg-[hsl(var(--answer-green))]/90 border-0' : 'border-border'}
                    >
                      {answer.isCorrect ? (
                        <Tick02Icon className="w-4 h-4" />
                      ) : (
                        <Cancel01Icon className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
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
                  min={10}
                  max={1000}
                  step={10}
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
              disabled={!currentQuestion.trim() || currentAnswers.some(a => !a.text.trim())}
              icon={<PlusSignIcon className="w-5 h-5" />}
            >
              Ajouter la question
            </CustomButton>
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
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border"
                >
                  <div>
                    <p className="font-medium text-foreground">{index + 1}. {q.text}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {q.answers.length} réponses · {q.timeLimit}s · {q.points} pts
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveQuestion(q.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Delete02Icon className="w-5 h-5" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <CustomButton
          variant="primary"
          onClick={handleSubmit}
          disabled={!title.trim() || !hostName.trim() || questions.length === 0 || isLoading}
          className="w-full"
          icon={<RocketIcon className="w-5 h-5" />}
        >
          {isLoading ? 'Création en cours...' : 'Créer le quiz et lancer la partie'}
        </CustomButton>
      </div>
    </div>
  )
}
