# Quibly

Quibly est une alternative open source à Kahoot pour créer et animer des quiz en temps réel. Le projet met l’accent sur une expérience fluide, un design premium et une gestion simple des parties en live.

## Pourquoi Quibly

Quibly est pensé pour :
- des animations en classe, ateliers ou événements
- des sessions d’équipe rapides et ludiques
- des quiz instantanés avec un code à partager

## Fonctionnalites principales

- Création de quiz avec questions, réponses, points et temps limite
- Rejoindre une partie via un code unique
- Rôle hôte et rôle joueur
- Gestion du temps par question
- Résultats par question (bonne ou mauvaise réponse)
- Classement évolutif côté hôte
- Classement final à la fin de la partie

## Experience de jeu

### Rôle hôte
- Crée un quiz puis lance la partie
- Avance la partie et déclenche l’affichage des résultats par question
- Affiche le classement evolutif entre les questions
- Termine la partie pour afficher le classement final

### Rôle joueur
- Rejoint la partie avec le code
- Répond dans le temps imparti
- Voit son résultat (bonne ou mauvaise réponse) après chaque question
- Suit le score global pendant la partie

## Phases d’une partie

Une partie suit un cycle clair :
1. **waiting** : joueurs en salle d’attente
2. **playing**:
   - phase **question** : réponses ouvertes
   - phase **results** : correction et retour joueur
   - phase **scoreboard** : classement côté hôte
3. **finished** : fin de partie et classement final

## Stack technique

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- shadcn/ui
- Huge Icons
- Supabase (Auth, Postgres, Realtime)

## Architecture (vue d’ensemble)

- `src/pages/` regroupe les écrans (lobby, jeu hôte, jeu joueur, résultats)
- `src/hooks/useSupabase.ts` centralise les appels à Supabase
- `src/lib/supabase.ts` contient le client et les types

Le temps réel est géré via des subscriptions Realtime sur :
- `game_sessions`
- `players`

## Modèle de données (résumé)

- `quizzes` : quiz et métadonnées
- `questions` : questions par quiz
- `answers` : réponses par question
- `game_sessions` : session de partie
- `players` : joueurs par session
- `player_answers` : réponses des joueurs

## Sécurité et accès

- RLS activee sur les tables publiques
- Fonctions RPC sécurisées pour certaines opérations critiques
- Auth anonyme pour simplifier l’entrée en partie

## Installation et configuration

### Prérequis

- Node.js
- pnpm
- Un projet Supabase configuré

### Variables d environnement

Créer un fichier `.env` :
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Lancer en local

```
pnpm dev
```

### Build de production

```
pnpm build
pnpm preview
```

### Lint

```
pnpm lint
```

## Conseils d’exploitation

- Préférer une base propre pour les tests de session
- Surveiller la latence Realtime pour les événements live
- Garder des quiz courts pour un meilleur rythme de jeu

## Roadmap (idées)

- Mode équipe
- Statistiques par quiz
- Import CSV
- Paramètres d’animation avancés

## Contribution

Les contributions sont bienvenues. Ouvrir une issue ou proposer une PR.

## Licence

Ce projet est distribué sous licence MIT. Voir le fichier `LICENSE`.