process.env.DISCORD_WEBHOOK_DRY_RUN = 'true';

const request = require('supertest');
const { createApp } = require('../appFactory');

async function main() {
    const app = createApp();

    const res = await request(app)
        .post('/api/webhooks/github')
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'ping')
        .set('X-GitHub-Delivery', 'test-delivery')
        .send({
            zen: 'Keep it logically awesome.',
            repository: { full_name: 'demo/repo' },
        });

    // 204 expected
    console.log('status:', res.status);
    if (res.status !== 204) {
        console.log('body:', res.body);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
