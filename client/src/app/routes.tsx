import React from "react";
import { createBrowserRouter } from "react-router";
import { MainLayout } from "./components/MainLayout";
import { RequireAuth } from "./components/RequireAuth";
import { GuestOnly } from "./components/GuestOnly";
import { PreviewRoute } from "./components/PreviewRoute";
import type { PreviewScenario } from "./hooks/usePreviewSeed";
import { AuthView } from "./views/AuthView";
import { MainMenuView } from "./views/MainMenuView";
import { PersonalizationView } from "./views/PersonalizationView";
import { StatisticsView } from "./views/StatisticsView";
import { HostGameView } from "./views/HostGameView";
import { JoinLobbyView } from "./views/JoinLobbyView";
import { GameBoard } from "./views/Gameplay/GameBoard";

import { NarratorHandView } from "./views/Gameplay/NarratorHandView";
import { NarratorTurnView } from "./views/Gameplay/NarratorTurnView";
import { PlayerHandView } from "./views/Gameplay/PlayerHandView";
import { PlayerTurnView } from "./views/Gameplay/PlayerTurnView";
import { PlayerVoteView } from "./views/Gameplay/PlayerVoteView";
import { NarratorVoteView } from "./views/Gameplay/NarratorVoteView";
import { RoundScoreView } from "./views/Gameplay/RoundScoreView";
import { RoundEndView } from "./views/Gameplay/RoundEndView";

function withAuth(Component: React.ComponentType) {
  return function ProtectedRoute() {
    return (
      <RequireAuth>
        <Component />
      </RequireAuth>
    );
  };
}

function withGuest(Component: React.ComponentType) {
  return function GuestRoute() {
    return (
      <GuestOnly>
        <Component />
      </GuestOnly>
    );
  };
}

function withPreview(scenario: PreviewScenario, Component: React.ComponentType) {
  return function PreviewWrappedRoute() {
    return (
      <PreviewRoute scenario={scenario}>
        <Component />
      </PreviewRoute>
    );
  };
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      { index: true, Component: withGuest(AuthView) },
      { path: "menu", Component: withAuth(MainMenuView) },
      { path: "personalization", Component: withAuth(PersonalizationView) },
      { path: "stats", Component: withAuth(StatisticsView) },
      { path: "host", Component: withAuth(HostGameView) },
      { path: "join", Component: withAuth(JoinLobbyView) },
      { path: "game", Component: withAuth(GameBoard) },
      { path: "preview/narrator-hand", Component: withPreview("narrator-hand", NarratorHandView) },
      { path: "preview/narrator-turn", Component: withPreview("narrator-turn", NarratorTurnView) },
      { path: "preview/player-hand", Component: withPreview("player-hand", PlayerHandView) },
      { path: "preview/player-turn", Component: withPreview("player-turn", PlayerTurnView) },
      { path: "preview/player-vote", Component: withPreview("player-vote", PlayerVoteView) },
      { path: "preview/narrator-vote", Component: withPreview("narrator-vote", NarratorVoteView) },
      { path: "preview/round-score", Component: withPreview("round-score", RoundScoreView) },
      { path: "preview/round-end", Component: withPreview("round-end", RoundEndView) },
    ],
  },
]);
