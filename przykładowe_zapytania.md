import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
// 1. NOWA GRA
//    Tworzy rekord games + inicjalizuje game_scores dla graczy
//    oraz rozdaje im karty (player_hands).
// ─────────────────────────────────────────────────────────────

export async function createGame(
    roomId: string,
    playerIds: string[], // room_players.id (nie user.id)
    handSize = 6
) {
    // Pobierz aktywny set kart dla pokoju
    const room = await prisma.rooms.findUniqueOrThrow({
        where: { id: roomId },
        select: { active_set_id: true },
    });

    if (!room.active_set_id) {
        throw new Error("Pokój nie ma przypisanego zestawu kart.");
    }

    // Pobierz wszystkie karty z aktywnego zestawu
    const allCards = await prisma.cards.findMany({
        where: { set_id: room.active_set_id },
        select: { id: true },
    });

    if (allCards.length < playerIds.length * handSize) {
        throw new Error("Za mało kart w zestawie, aby rozdać ręce.");
    }

    // Tasowanie kart (Fisher-Yates)
    const shuffled = [...allCards].sort(() => Math.random() - 0.5);

    // Buduj ręce graczy
    const handsData: { game_id: string; player_id: string; card_id: string }[] =
        [];
    playerIds.forEach((playerId, i) => {
        const slice = shuffled.slice(i * handSize, (i + 1) * handSize);
        slice.forEach(({ id: cardId }) => {
            handsData.push({ game_id: "PLACEHOLDER", player_id: playerId, card_id: cardId });
        });
    });

    // Transakcja: utwórz grę, score'y i ręce atomowo
    const result = await prisma.$transaction(async (tx) => {
        // 1a. Utwórz grę
        const game = await tx.games.create({
            data: {
                room_id: roomId,
                current_round: 0,
                status: "active",
            },
        });

        // 1b. Inicjalizuj score 0 dla każdego gracza
        await tx.game_scores.createMany({
            data: playerIds.map((playerId) => ({
                game_id: game.id,
                player_id: playerId,
                score: 0,
                rank: null,
            })),
        });

        // 1c. Rozdaj karty — uzupełnij game_id (było PLACEHOLDER)
        await tx.player_hands.createMany({
            data: handsData.map((h) => ({ ...h, game_id: game.id })),
        });

        return game;
    });

    return result;
}

// ─────────────────────────────────────────────────────────────
// 2. NOWA RUNDA
//    Tworzy rekord rounds dla danej gry, inkrementuje
//    current_round w games, zwraca nową rundę.
// ─────────────────────────────────────────────────────────────

export async function createRound(
    gameId: string,
    narratorPlayerId: string,
    roundNumber: number
) {
    const [round] = await prisma.$transaction([
        // 2a. Utwórz rundę ze statusem "prompting"
        prisma.rounds.create({
            data: {
                game_id: gameId,
                round_number: roundNumber,
                narrator_player_id: narratorPlayerId,
                status: "prompting",
            },
        }),
        // 2b. Zaktualizuj licznik rund w grze
        prisma.games.update({
            where: { id: gameId },
            data: { current_round: roundNumber },
        }),
    ]);

    return round;
}

// ─────────────────────────────────────────────────────────────
// 3. NARRATOR WYBIERA KARTĘ I WPISUJE PROMPT
//    Aktualizuje rundę: narrator_card_id + prompt
//    oraz dodaje kartę narratora do round_submissions.
// ─────────────────────────────────────────────────────────────

export async function setNarratorCard(
    roundId: string,
    narratorPlayerId: string,
    cardId: string,
    prompt: string
) {
    const [round] = await prisma.$transaction([
        prisma.rounds.update({
            where: { id: roundId },
            data: {
                narrator_card_id: cardId,
                prompt,
                status: "submitting",
            },
        }),
        prisma.round_submissions.create({
            data: {
                round_id: roundId,
                player_id: narratorPlayerId,
                card_id: cardId,
                is_narrator_card: true,
            },
        }),
        // Usuń kartę z ręki narratora
        prisma.player_hands.deleteMany({
            where: {
                player_id: narratorPlayerId,
                card_id: cardId,
            },
        }),
    ]);

    return round;
}

// ─────────────────────────────────────────────────────────────
// 4. GRACZ SKŁADA KARTĘ
//    Tworzy round_submission + usuwa kartę z ręki gracza.
//    Opcjonalnie: sprawdza czy wszyscy złożyli.
// ─────────────────────────────────────────────────────────────

export async function submitCard(
    roundId: string,
    playerId: string,
    cardId: string
) {
    const submission = await prisma.$transaction(async (tx) => {
        const sub = await tx.round_submissions.create({
            data: {
                round_id: roundId,
                player_id: playerId,
                card_id: cardId,
                is_narrator_card: false,
            },
        });

        // Usuń z ręki gracza
        await tx.player_hands.deleteMany({
            where: { player_id: playerId, card_id: cardId },
        });

        return sub;
    });

    return submission;
}

// ─────────────────────────────────────────────────────────────
// 5. GRACZ GŁOSUJE
//    Jeden głos per gracz per runda (unique constraint).
// ─────────────────────────────────────────────────────────────

export async function castVote(
    roundId: string,
    voterPlayerId: string,
    submissionId: string
) {
    return prisma.round_votes.create({
        data: {
            round_id: roundId,
            voter_player_id: voterPlayerId,
            voted_submission_id: submissionId,
        },
    });
}

// ─────────────────────────────────────────────────────────────
// 6. PODLICZ WYNIKI RUNDY I ZAKTUALIZUJ SCORE'Y
//    Zakończ rundę (status "finished") i zaktualizuj
//    game_scores dla każdego gracza.
// ─────────────────────────────────────────────────────────────

export async function finalizeRound(
    roundId: string,
    gameId: string,
    scores: { playerId: string; points: number }[]
) {
    await prisma.$transaction([
        // Zamknij rundę
        prisma.rounds.update({
            where: { id: roundId },
            data: { status: "finished" },
        }),
        // Zaktualizuj score każdego gracza (upsert = bezpieczne)
        ...scores.map(({ playerId, points }) =>
            prisma.game_scores.upsert({
                where: { game_id_player_id: { game_id: gameId, player_id: playerId } },
                create: { game_id: gameId, player_id: playerId, score: points },
                update: { score: { increment: points } },
            })
        ),
    ]);
}

// ─────────────────────────────────────────────────────────────
// 7. ZAKOŃCZ GRĘ
//    Ustaw status "finished", zapisz rankingi końcowe.
// ─────────────────────────────────────────────────────────────

export async function endGame(gameId: string) {
    // Pobierz aktualne wyniki posortowane malejąco
    const scores = await prisma.game_scores.findMany({
        where: { game_id: gameId },
        orderBy: { score: "desc" },
    });

    await prisma.$transaction([
        // Oznacz grę jako zakończoną
        prisma.games.update({
            where: { id: gameId },
            data: { status: "finished", ended_at: new Date() },
        }),
        // Zapisz rankingi (rank 1 = najwyższy wynik)
        ...scores.map(({ id }, index) =>
            prisma.game_scores.update({
                where: { id },
                data: { rank: index + 1, updated_at: new Date() },
            })
        ),
    ]);

    return scores;
}

// ─────────────────────────────────────────────────────────────
// 8. ODCZYT STANU GRY (do synchronizacji frontendu)
// ─────────────────────────────────────────────────────────────

export async function getGameState(gameId: string) {
    return prisma.games.findUniqueOrThrow({
        where: { id: gameId },
        include: {
            rounds: {
                orderBy: { round_number: "asc" },
                include: {
                    round_submissions: {
                        include: { cards: true, round_votes: true },
                    },
                },
            },
            game_scores: {
                include: { room_players: { include: { users: true } } },
                orderBy: { score: "desc" },
            },
            player_hands: true,
        },
    });
}

// ─────────────────────────────────────────────────────────────
// UWAGA: tags w modelu cards
// ─────────────────────────────────────────────────────────────
//
// Pole `tags Json?` jest już w schemacie — Prisma mapuje je
// automatycznie na JSONB w PostgreSQL.
//
// Jeśli migracja nie była jeszcze uruchomiona, wykonaj:
//   npx prisma migrate dev --name add_tags_to_cards
//
// Przykłady operacji na tags:
//
// Tworzenie karty z tagami:
//   await prisma.cards.create({
//     data: {
//       set_id: "...",
//       image_url: "https://...",
//       tags: ["dark", "mystery", "forest"],
//     },
//   });
//
// Filtrowanie kart po tagu (Postgres JSONB operator @>):
//   await prisma.cards.findMany({
//     where: {
//       tags: { array_contains: "dark" },
//     },
//   });
//
// ─────────────────────────────────────────────────────────────