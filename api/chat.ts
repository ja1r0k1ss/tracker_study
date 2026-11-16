import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM = `Eres el asistente de estudio de LexTracker, la app con la que un estudiante de 4.º de Derecho (USC) sigue su temario, sus vueltas y sus horas.
Debajo tienes todos sus datos exportados de la app. Úsalos para responder sobre cómo avanza: ritmo, constancia, asignaturas atrasadas, cuánto falta para cada examen, qué priorizar.
Cifras concretas sacadas de los datos; si algo no está en los datos, dilo. Responde en español, breve y directo, en texto plano (sin tablas ni markdown pesado), porque se lee en un iPhone.

Cómo leer los datos:
- Lecciones: N (apuntes hechos), S (subrayado), v1..v5 = vueltas hechas (son consecutivas).
- Bloques: fecha, inicio-fin, minutos, actividad, asignatura, lección. Estudio efectivo = lectura, vueltas y apuntes (pesos de carga cognitiva 1 / 0,85 / 0,05). "libre" = día libre. "biblioteca" marca presencia y se solapa con otras actividades.`

// Tope por petición: el endpoint es público y cada llamada se paga
const MAX_BODY = 1_500_000

export async function POST(req: Request) {
  const raw = await req.text()
  if (raw.length > MAX_BODY) return new Response('Demasiados datos', { status: 413 })
  let body: { context?: unknown; messages?: unknown }
  try { body = JSON.parse(raw) } catch { return new Response('JSON no válido', { status: 400 }) }
  const { context, messages } = body
  const valid = Array.isArray(messages) && messages.length > 0 && messages.length <= 60 &&
    messages.every((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.length > 0) &&
    messages[0].role === 'user' && typeof context === 'string'
  if (!valid) return new Response('Petición no válida', { status: 400 })

  const stream = client.beta.messages.stream({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    output_config: { effort: 'medium' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    // Datos en el system con caché: en una misma conversación solo se pagan enteros la primera vez
    system: [{ type: 'text', text: `${SYSTEM}\n\n${context}`, cache_control: { type: 'ephemeral' } }],
    messages: messages as Anthropic.Beta.BetaMessageParam[],
  })

  const enc = new TextEncoder()
  return new Response(new ReadableStream({
    async start(ctrl) {
      try {
        for await (const ev of stream) {
          if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') ctrl.enqueue(enc.encode(ev.delta.text))
        }
        const final = await stream.finalMessage()
        if (final.stop_reason === 'refusal') ctrl.enqueue(enc.encode('\n\n(No puedo responder a eso.)'))
      } catch (e) {
        console.error(e)
        const msg = e instanceof Anthropic.AuthenticationError ? 'Falta o es inválida la ANTHROPIC_API_KEY en Vercel.'
          : e instanceof Anthropic.RateLimitError ? 'Límite de uso alcanzado, prueba en un rato.'
          : 'Error al contactar con Claude.'
        ctrl.enqueue(enc.encode(`\n\n⚠️ ${msg}`))
      }
      ctrl.close()
    },
  }), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
}
