require('dotenv').config();
const prisma = require('../config/db');

const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
);

async function main() {
    let set = await prisma.card_sets.findFirst({ where: { name: 'Dixit Classic' } });
    if (!set) {
        set = await prisma.card_sets.create({ data: { name: 'Dixit Classic' } });
        console.log('Utworzono zestaw:', set.id);
    }
    const count = await prisma.cards.count({ where: { set_id: set.id } });
    if (count >= 50) {
        console.log('Karty juz istnieja (' + count + '), pomijam.');
        return;
    }
    const toAdd = 50 - count;
    for (let i = 0; i < toAdd; i++) {
        await prisma.cards.create({ data: { set_id: set.id, image_data: PNG } });
        process.stdout.write('.');
    }
    console.log('\nDodano ' + toAdd + ' kart. Set ID: ' + set.id);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
