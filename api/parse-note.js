export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { text } = req.body
  if (!text) return res.status(400).json({ error: 'No text provided' })

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Extrahiere aus dieser Sprachnotiz die Trainingsdaten fuer ein Pferd und gib sie als JSON zurueck.

Sprachnotiz: "${text}"

Antworte NUR mit einem JSON-Objekt (kein Markdown, kein Text darum):
{
  "discipline": "Trainingsart, z.B. Dressur, Springen, Koppel, Ausreiten - oder leer wenn unklar",
  "intensity": "leicht oder mittel oder intensiv",
  "duration": Zahl in Minuten (Zahl, kein String),
  "trainer": "Name des Trainers oder leer",
  "temperature": "Temperatur z.B. 18 Grad oder leer",
  "notes": "alle weiteren Beobachtungen und Notizen"
}

Wenn etwas nicht erwaehnt wird: leerer String oder bei duration 45, bei intensity mittel.`
      }]
    })
  })

  if (!response.ok) {
    return res.status(500).json({ error: 'Claude API error' })
  }

  const data = await response.json()
  const content = data.content[0].text.trim()

  try {
    const parsed = JSON.parse(content)
    res.json(parsed)
  } catch {
    res.status(500).json({ error: 'Parse error', raw: content })
  }
}
