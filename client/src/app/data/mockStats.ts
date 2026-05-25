/** Podgląd rankingu — zastąp fetch z `/api/stats/global` gdy endpoint będzie gotowy. */
export const MOCK_GLOBAL_STATS = {
  topPlayers: [
    { rank: 1, name: 'KosmicznaAnna', wins: 42, avatar: 'KA' },
    { rank: 2, name: 'MistrzKart', wins: 38, avatar: 'MK' },
    { rank: 3, name: 'SnajperSkojarzeń', wins: 31, avatar: 'SS' },
    { rank: 4, name: 'BotDixit', wins: 27, avatar: 'BD' },
    { rank: 5, name: 'Nowicjusz', wins: 12, avatar: 'NO' },
  ],
  currentUserRank: { rank: 14, name: 'Ty', wins: 3, avatar: 'TY' },
};
