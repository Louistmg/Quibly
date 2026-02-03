export type PlayerAnswerRecord = {
  playerId: string
  questionId: string
  isCorrect: boolean
  answeredAt: string
}

type LatestAnswerMap = Map<string, PlayerAnswerRecord>

const buildLatestAnswerMap = (answers: PlayerAnswerRecord[]) => {
  const map: LatestAnswerMap = new Map()
  for (const answer of answers) {
    const key = `${answer.playerId}:${answer.questionId}`
    const existing = map.get(key)
    if (!existing) {
      map.set(key, answer)
      continue
    }
    const existingTime = Date.parse(existing.answeredAt)
    const nextTime = Date.parse(answer.answeredAt)
    if (Number.isNaN(existingTime) || nextTime >= existingTime) {
      map.set(key, answer)
    }
  }
  return map
}

export const computeStreaks = (
  playerIds: string[],
  questionIds: string[],
  answers: PlayerAnswerRecord[]
) => {
  const latestAnswers = buildLatestAnswerMap(answers)
  const streaks: Record<string, number> = {}

  for (const playerId of playerIds) {
    let streak = 0
    for (let i = questionIds.length - 1; i >= 0; i -= 1) {
      const questionId = questionIds[i]
      const key = `${playerId}:${questionId}`
      const record = latestAnswers.get(key)
      if (!record || !record.isCorrect) break
      streak += 1
    }
    streaks[playerId] = streak
  }

  return streaks
}
