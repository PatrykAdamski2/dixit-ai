/**
 * Logika punktacji Dixit.
 *
 * Zasady:
 *   - Jeśli WSZYSCY lub NIKT non-narrator zagłosował na kartę narratora:
 *       narrator = 0 pkt, każdy inny = 2 pkt
 *   - W przeciwnym wypadku:
 *       narrator = 3 pkt, każdy kto trafił kartę narratora = 3 pkt
 *   - Bonus (zawsze): każda karta non-narratora dostaje +1 pkt per głos na nią
 */
function calculateScores(round, submissions, votes, allPlayers) {
    const narratorId = round.narrator_player_id;
    const narratorSub = submissions.find(s => s.is_narrator_card);

    const scores = {};
    allPlayers.forEach(p => { scores[p.id] = 0; });

    const nonNarratorPlayers = allPlayers.filter(p => p.id !== narratorId);
    const votesForNarrator = votes.filter(v => v.voted_submission_id === narratorSub?.id).length;
    const nonNarratorCount = nonNarratorPlayers.length;

    if (votesForNarrator === 0 || votesForNarrator === nonNarratorCount) {
        // Wszyscy lub nikt trafił — narrator 0, inni +2
        nonNarratorPlayers.forEach(p => { scores[p.id] += 2; });
    } else {
        // Narrator +3, gracze którzy trafili +3
        scores[narratorId] = (scores[narratorId] ?? 0) + 3;
        votes
            .filter(v => v.voted_submission_id === narratorSub?.id)
            .forEach(v => { scores[v.voter_player_id] = (scores[v.voter_player_id] ?? 0) + 3; });
    }

    // Bonus: +1 per głos na każdą kartę non-narratora
    const nonNarratorSubs = submissions.filter(s => !s.is_narrator_card);
    for (const sub of nonNarratorSubs) {
        const votesForSub = votes.filter(v => v.voted_submission_id === sub.id).length;
        scores[sub.player_id] = (scores[sub.player_id] ?? 0) + votesForSub;
    }

    return scores;
}

module.exports = { calculateScores };
