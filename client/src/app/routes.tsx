import React from "react";
import { createBrowserRouter } from "react-router";
import { MainLayout } from "./components/MainLayout";
import { RequireAuth } from "./components/RequireAuth";
import { GuestOnly } from "./components/GuestOnly";
import { AuthView } from "./views/AuthView";
import { MainMenuView } from "./views/MainMenuView";
import { PersonalizationView } from "./views/PersonalizationView";
import { StatisticsView } from "./views/StatisticsView";
import { HostGameView } from "./views/HostGameView";
import { JoinLobbyView } from "./views/JoinLobbyView";
import { GameBoard } from "./views/Gameplay/GameBoard";
import { MyCardsView } from "./views/MyCardsView";
import { PsychoProfileView } from "./views/PsychoProfileView";

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

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      { index: true, Component: withGuest(AuthView) },
      { path: "menu", Component: withAuth(MainMenuView) },
      { path: "personalization", Component: withAuth(PersonalizationView) },
      { path: "stats", Component: withAuth(StatisticsView) },
      { path: "psycho-profile", Component: withAuth(PsychoProfileView) },
      { path: "host", Component: withAuth(HostGameView) },
      { path: "join", Component: withAuth(JoinLobbyView) },
      { path: "game", Component: withAuth(GameBoard) },
      { path: "my-cards", Component: withAuth(MyCardsView) },
    ],
  },
]);
