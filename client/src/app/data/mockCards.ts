export const ABSTRACT_CARDS = [
  { id: '1', image: "/Karty/KartaNr1.png" },
  { id: '2', image: "/Karty/KartaNr2.png" },
  { id: '3', image: "/Karty/KartaNr3.png" },
  { id: '4', image: "/Karty/KartaNr4.png" },
  { id: '5', image: "/Karty/KartaNr5.png" },
  { id: '6', image: "/Karty/KartaNr6.png" }
];

export const ALL_LOCAL_CARDS = Array.from({ length: 20 }, (_, i) => ({
  id: `${i + 1}`,
  image: `/Karty/KartaNr${i + 1}.png`
}));
