const { calculateScores } = require('../lib/scoring');

// Pomocnik budujący gracza
const p = (id) => ({ id });

// Pomocnik budujący submission
const sub = (id, playerId, isNarrator = false) => ({
    id,
    player_id: playerId,
    is_narrator_card: isNarrator
});

// Pomocnik budujący głos
const vote = (voterId, submissionId) => ({
    voter_player_id: voterId,
    voted_submission_id: submissionId
});

describe('calculateScores — Zasady Dixit', () => {
    // Scenariusz z 3 graczami: narrator=A, gracze B i C
    const round3 = { narrator_player_id: 'A' };
    const players3 = [p('A'), p('B'), p('C')];

    const subA = sub('sA', 'A', true);  // karta narratora
    const subB = sub('sB', 'B', false);
    const subC = sub('sC', 'C', false);
    const subs3 = [subA, subB, subC];

    test('Wszyscy zagłosowali na narratora → narrator 0, inni po 2', () => {
        // B i C głosują na kartę A
        const votes = [vote('B', 'sA'), vote('C', 'sA')];
        const scores = calculateScores(round3, subs3, votes, players3);

        expect(scores['A']).toBe(0);
        expect(scores['B']).toBe(2);
        expect(scores['C']).toBe(2);
    });

    test('Nikt nie zagłosował na narratora → narrator 0, inni po 2 + bonus', () => {
        // B głosuje na C, C głosuje na B
        const votes = [vote('B', 'sC'), vote('C', 'sB')];
        const scores = calculateScores(round3, subs3, votes, players3);

        expect(scores['A']).toBe(0);
        // B i C dostają 2 pkt bazowo + 1 bonus za głos na ich kartę
        expect(scores['B']).toBe(3); // 2 + 1 (C głosował na B)
        expect(scores['C']).toBe(3); // 2 + 1 (B głosował na C)
    });

    test('Część zagłosowała na narratora → narrator 3, trafieni 3 + bonus', () => {
        // B głosuje na kartę narratora A, C głosuje na kartę B
        const votes = [vote('B', 'sA'), vote('C', 'sB')];
        const scores = calculateScores(round3, subs3, votes, players3);

        expect(scores['A']).toBe(3); // narrator trafiony
        expect(scores['B']).toBe(4); // trafił narratora (+3) + 1 bonus (C głosował na sB)
        expect(scores['C']).toBe(0); // nie trafił, nikt nie głosował na sC
    });

    test('Scenariusz z 4 graczami — mixed voting', () => {
        // A-narrator, B C D — gracze
        const players4 = [p('A'), p('B'), p('C'), p('D')];
        const round4 = { narrator_player_id: 'A' };
        const subs4 = [
            sub('sA', 'A', true),
            sub('sB', 'B', false),
            sub('sC', 'C', false),
            sub('sD', 'D', false),
        ];

        // B trafił narratora, C i D nie trafili (głosują na siebie)
        const votes4 = [
            vote('B', 'sA'), // trafił
            vote('C', 'sD'), // nie trafił
            vote('D', 'sC'), // nie trafił
        ];

        const scores = calculateScores(round4, subs4, votes4, players4);

        expect(scores['A']).toBe(3); // narrator, ktoś trafił
        expect(scores['B']).toBe(3); // trafił narratora
        expect(scores['C']).toBe(1); // nie trafił, 1 bonus (D głosował na C)
        expect(scores['D']).toBe(1); // nie trafił, 1 bonus (C głosował na D)
    });

    test('Wyniki są liczbami nieujemnymi', () => {
        const votes = [vote('B', 'sA'), vote('C', 'sA')];
        const scores = calculateScores(round3, subs3, votes, players3);
        Object.values(scores).forEach(s => expect(s).toBeGreaterThanOrEqual(0));
    });

    test('Każdy gracz ma wynik w zwróconym obiekcie', () => {
        const votes = [vote('B', 'sA'), vote('C', 'sB')];
        const scores = calculateScores(round3, subs3, votes, players3);
        expect(scores).toHaveProperty('A');
        expect(scores).toHaveProperty('B');
        expect(scores).toHaveProperty('C');
    });
});
