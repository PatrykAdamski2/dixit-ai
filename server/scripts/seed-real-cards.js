/**
 * Wgrywa prawdziwe karty z server/public/Karty/ do bazy danych.
 * Usuwa placeholder-owe karty i zastępuje je prawdziwymi obrazkami.
 *
 * Użycie (z katalogu server/):
 *   node scripts/seed-real-cards.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');

const CARDS_DIR = path.join(__dirname, '../public/Karty');
const SET_NAME = 'Dixit Classic';

async function main() {
    // Znajdź pliki kart (KartaNr*.png, bez rewersu)
    const files = fs.readdirSync(CARDS_DIR)
        .filter(f => f.startsWith('KartaNr') && f.endsWith('.png'))
        .sort((a, b) => {
            const numA = parseInt(a.replace('KartaNr', '').replace('.png', ''), 10);
            const numB = parseInt(b.replace('KartaNr', '').replace('.png', ''), 10);
            return numA - numB;
        });

    console.log(`Znaleziono ${files.length} kart w ${CARDS_DIR}`);

    // Upewnij się że zestaw istnieje
    let set = await prisma.card_sets.findFirst({ where: { name: SET_NAME } });
    if (!set) {
        set = await prisma.card_sets.create({ data: { name: SET_NAME } });
        console.log(`Utworzono zestaw: ${set.id}`);
    } else {
        console.log(`Zestaw istnieje: ${set.id}`);
    }

    // Usuń stare karty z tego zestawu
    const deleted = await prisma.cards.deleteMany({ where: { set_id: set.id } });
    console.log(`Usunięto ${deleted.count} starych kart.`);

    // Wgraj nowe karty
    for (const file of files) {
        const imgData = fs.readFileSync(path.join(CARDS_DIR, file));
        await prisma.cards.create({
            data: {
                set_id: set.id,
                image_data: imgData
            }
        });
        process.stdout.write('.');
    }

    console.log(`\nDodano ${files.length} kart do zestawu "${SET_NAME}".`);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
