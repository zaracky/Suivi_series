// Envoie un message dans le channel Discord défini via webhook.

async function sendDiscordMessage(content) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('DISCORD_WEBHOOK_URL manquante : notification non envoyée.');
    return;
  }
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`Erreur envoi Discord (${res.status}) : ${body}`);
  }
}

module.exports = { sendDiscordMessage };
