/**
 * Seed kart do bazy danych.
 * Uruchom: npm run seed
 *
 * Skanuje server/public/Karty/*.png, wczytuje każdy plik jako bytea
 * i wstawia do bazy. Do bazy trafiają TYLKO karty których pliki istnieją.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');

const SET_NAME = 'Dixit Classic';
const CARDS_DIR = path.join(__dirname, '..', 'public', 'Karty');

async function main() {
    console.log('Seeding kart...');

    if (!fs.existsSync(CARDS_DIR)) {
        console.error(`Brak katalogu: ${CARDS_DIR}`);
        console.error('Dodaj pliki PNG do server/public/Karty/ przed uruchomieniem seeda.');
        process.exit(1);
    }

    const files = fs.readdirSync(CARDS_DIR).filter(f => f.toLowerCase().endsWith('.png'));
    if (files.length === 0) {
        console.error(`Brak plików PNG w ${CARDS_DIR}`);
        process.exit(1);
    }

    console.log(`Znaleziono ${files.length} plików PNG.`);

    const existing = await prisma.card_sets.findFirst({ where: { name: SET_NAME } });
    if (existing) {
        console.log(`Zestaw "${SET_NAME}" już istnieje (id: ${existing.id}). Pomijam.`);
        return;
    }

    const cardSet = await prisma.card_sets.create({
        data: { name: SET_NAME, is_user_generated: false }
    });

    console.log(`Utworzono zestaw: ${cardSet.id}`);

    for (const file of files) {
        const filePath = path.join(CARDS_DIR, file);
        const imageData = fs.readFileSync(filePath);

        await prisma.cards.create({
            data: {
                set_id: cardSet.id,
                image_data: imageData,
                image_url: null
            }
        });
        process.stdout.write('.');
    }

    console.log(`\nDodano ${files.length} kart do zestawu "${SET_NAME}" (id: ${cardSet.id}).`);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
