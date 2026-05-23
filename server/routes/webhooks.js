const express = require('express');
const crypto = require('crypto');

const router = express.Router();

function timingSafeEqualHex(a, b) {
    const aBuf = Buffer.from(a, 'utf8');
    const bBuf = Buffer.from(b, 'utf8');
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifyGithubSignature({ rawBody, signature256, secret }) {
    if (!secret) return true; // verification disabled
    if (!signature256 || typeof signature256 !== 'string') return false;

    const expected = `sha256=${crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')}`;

    return timingSafeEqualHex(expected, signature256);
}

function buildDiscordWebhookUrl({ webhookUrl, threadId }) {
    const url = new URL(webhookUrl);

    // Allow user to paste a webhook URL that already targets a thread.
    if (threadId && !url.searchParams.has('thread_id')) {
        url.searchParams.set('thread_id', threadId);
    }

    return url.toString();
}

function ellipsize(text, maxLen) {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return `${text.slice(0, Math.max(0, maxLen - 1))}…`;
}

function formatGithubEvent({ eventName, deliveryId, payload }) {
    const repo = payload?.repository?.full_name;

    if (eventName === 'ping') {
        return `✅ GitHub webhook ping for **${repo || 'unknown repo'}** (delivery: ${deliveryId || 'n/a'})`;
    }

    if (eventName === 'push') {
        const ref = payload?.ref;
        const pusher = payload?.pusher?.name || payload?.pusher?.email || 'unknown';
        const compareUrl = payload?.compare;
        const commits = Array.isArray(payload?.commits) ? payload.commits.slice(0, 5) : [];

        const commitsLines = commits
            .map((c) => {
                const sha = (c?.id || '').slice(0, 7);
                const msg = (c?.message || '').split('\n')[0];
                const url = c?.url;
                const line = `- ${sha} ${ellipsize(msg, 80)}`;
                return url ? `${line} (${url})` : line;
            })
            .join('\n');

        const header = `⬆️ Push to **${repo || 'repo'}**\nBy: **${pusher}**\nRef: \`${ref || ''}\``;
        const link = compareUrl ? `\nCompare: ${compareUrl}` : '';
        const commitsBlock = commitsLines ? `\nCommits:\n${commitsLines}` : '';
        return `${header}${link}${commitsBlock}`;
    }

    if (eventName === 'pull_request') {
        const action = payload?.action;
        const pr = payload?.pull_request;
        const title = pr?.title;
        const url = pr?.html_url;
        const author = pr?.user?.login;
        const base = pr?.base?.ref;
        const head = pr?.head?.ref;
        return `🔀 PR **${action || ''}** in **${repo || 'repo'}**\n**${ellipsize(title || '', 120)}**\nBy: **${author || 'unknown'}**\n${head || ''} → ${base || ''}\n${url || ''}`;
    }

    if (eventName === 'issues') {
        const action = payload?.action;
        const issue = payload?.issue;
        const title = issue?.title;
        const url = issue?.html_url;
        const author = issue?.user?.login;
        const number = issue?.number;
        return `🐛 Issue **${action || ''}** in **${repo || 'repo'}**\n#${number ?? ''} **${ellipsize(title || '', 120)}**\nBy: **${author || 'unknown'}**\n${url || ''}`;
    }

    if (eventName === 'issue_comment') {
        const action = payload?.action;
        const issue = payload?.issue;
        const comment = payload?.comment;
        const url = comment?.html_url;
        const author = comment?.user?.login;
        const title = issue?.title;
        const number = issue?.number;
        const body = comment?.body ? ellipsize(comment.body.split('\n')[0], 140) : '';
        return `💬 Comment **${action || ''}** on issue in **${repo || 'repo'}**\n#${number ?? ''} **${ellipsize(title || '', 120)}**\nBy: **${author || 'unknown'}**\n${body ? `> ${body}\n` : ''}${url || ''}`;
    }

    if (eventName === 'release') {
        const action = payload?.action;
        const rel = payload?.release;
        const name = rel?.name || rel?.tag_name;
        const url = rel?.html_url;
        const author = rel?.author?.login;
        return `🏷️ Release **${action || ''}** in **${repo || 'repo'}**\n**${ellipsize(name || '', 120)}**\nBy: **${author || 'unknown'}**\n${url || ''}`;
    }

    // Fallback for unhandled events
    const action = payload?.action ? ` (action: ${payload.action})` : '';
    return `📣 GitHub event **${eventName}**${action} in **${repo || 'repo'}** (delivery: ${deliveryId || 'n/a'})`;
}

async function postToDiscord({ webhookUrl, threadId, content }) {
    const url = buildDiscordWebhookUrl({ webhookUrl, threadId });

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            content: ellipsize(content, 1900),
            allowed_mentions: { parse: [] },
        }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        const err = new Error(`Discord webhook failed: ${res.status} ${res.statusText}`);
        err.details = text;
        throw err;
    }
}

// GitHub requires signature verification over the raw request body.
router.post(
    '/github',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
        try {
            const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
            const eventName = req.get('x-github-event');
            const deliveryId = req.get('x-github-delivery');
            const signature256 = req.get('x-hub-signature-256');

            const githubSecret = process.env.GITHUB_WEBHOOK_SECRET || '';
            const ok = verifyGithubSignature({
                rawBody,
                signature256,
                secret: githubSecret,
            });

            if (!ok) {
                return res.status(401).json({ error: 'Invalid GitHub signature' });
            }

            let payload = {};
            try {
                payload = rawBody.length ? JSON.parse(rawBody.toString('utf8')) : {};
            } catch {
                return res.status(400).json({ error: 'Invalid JSON payload' });
            }

            const threadId = process.env.DISCORD_THREAD_ID;
            const content = formatGithubEvent({ eventName, deliveryId, payload });

            if ((process.env.DISCORD_WEBHOOK_DRY_RUN || '').toLowerCase() === 'true') {
                console.log('[webhooks/github][dry-run]', content);
                return res.status(204).send();
            }

            const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
            if (!webhookUrl) {
                return res.status(500).json({ error: 'Missing DISCORD_WEBHOOK_URL' });
            }

            await postToDiscord({ webhookUrl, threadId, content });

            // Discord webhooks respond 204 on success, GitHub expects 2xx.
            return res.status(204).send();
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Webhook processing failed' });
        }
    }
);

module.exports = router;
