import { createBrowserRouter } from "react-router";
import { MainLayout } from "./components/MainLayout";
import { AuthView } from "./views/AuthView";
import { MainMenuView } from "./views/MainMenuView";
import { PersonalizationView } from "./views/PersonalizationView";
import { StatisticsView } from "./views/StatisticsView";
import { HostGameView } from "./views/HostGameView";
import { JoinLobbyView } from "./views/JoinLobbyView";
import { GameBoard } from "./views/Gameplay/GameBoard";

// Gameplay Previews (Legacy/Debugging)
import { NarratorHandView } from "./views/Gameplay/NarratorHandView";
import { NarratorTurnView } from "./views/Gameplay/NarratorTurnView";
import { PlayerHandView } from "./views/Gameplay/PlayerHandView";
import { PlayerTurnView } from "./views/Gameplay/PlayerTurnView";
import { PlayerVoteView } from "./views/Gameplay/PlayerVoteView";
import { NarratorVoteView } from "./views/Gameplay/NarratorVoteView";
import { RoundScoreView } from "./views/Gameplay/RoundScoreView";
import { RoundEndView } from "./views/Gameplay/RoundEndView";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      { index: true, Component: AuthView },
      { path: "menu", Component: MainMenuView },
      { path: "personalization", Component: PersonalizationView },
      { path: "stats", Component: StatisticsView },
      { path: "host", Component: HostGameView },
      { path: "join", Component: JoinLobbyView },
      
      // Main Gameplay Route
      { path: "game", Component: GameBoard },
      
      // Previews
      { path: "preview/narrator-hand", Component: NarratorHandView },
      { path: "preview/narrator-turn", Component: NarratorTurnView },
      { path: "preview/player-hand", Component: PlayerHandView },
      { path: "preview/player-turn", Component: PlayerTurnView },
      { path: "preview/player-vote", Component: PlayerVoteView },
      { path: "preview/narrator-vote", Component: NarratorVoteView },
      { path: "preview/round-score", Component: RoundScoreView },
      { path: "preview/round-end", Component: RoundEndView },
    ],
  },
]);
