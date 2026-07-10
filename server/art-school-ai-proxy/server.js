import http from 'node:http'

const port = Number(process.env.PORT || 3000)
const apiKey = process.env.SILICONFLOW_API_KEY
const model = process.env.SILICONFLOW_VISION_MODEL || 'Qwen/Qwen2.5-VL-72B-Instruct'
const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean))
const requestWindow = new Map()

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(body))
}

function withCors(request, response) {
  const origin = request.headers.origin
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
  }
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

async function readJson(request) {
  let raw = ''
  for await (const chunk of request) {
    raw += chunk
    if (Buffer.byteLength(raw) > 11 * 1024 * 1024) throw new Error('请求图片过大')
  }
  return JSON.parse(raw || '{}')
}

function isValidImageDataUrl(value) {
  return typeof value === 'string'
    && /^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(value)
    && Buffer.byteLength(value) <= 10 * 1024 * 1024
}

function rateLimited(ip) {
  const now = Date.now()
  const records = (requestWindow.get(ip) || []).filter((time) => now - time < 15 * 60 * 1000)
  records.push(now)
  requestWindow.set(ip, records)
  return records.length > 12
}

function parseReview(content) {
  const cleaned = String(content || '').replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
  const parsed = JSON.parse(cleaned)
  if (!parsed.summary || !Array.isArray(parsed.strengths) || !Array.isArray(parsed.suggestions) || !parsed.encouragement) throw new Error('AI 返回格式不完整')
  return {
    summary: String(parsed.summary).slice(0, 500),
    strengths: parsed.strengths.map(String).slice(0, 4),
    suggestions: parsed.suggestions.map(String).slice(0, 4),
    encouragement: String(parsed.encouragement).slice(0, 180),
  }
}

const server = http.createServer(async (request, response) => {
  withCors(request, response)
  if (request.method === 'OPTIONS') return response.end()
  if (request.method === 'GET' && request.url === '/health') return send(response, 200, { ok: true, service: 'art-school-ai-proxy' })
  if (request.method !== 'POST' || request.url !== '/api/ai/artwork-review') return send(response, 404, { error: 'Not found' })
  if (!apiKey) return send(response, 503, { error: '服务端尚未配置 SiliconFlow API Key' })
  if (!allowedOrigins.has(request.headers.origin || '')) return send(response, 403, { error: '来源未获授权' })
  if (rateLimited(request.socket.remoteAddress || 'unknown')) return send(response, 429, { error: '请求过于频繁，请稍后再试' })

  try {
    const { imageDataUrl, title = '未命名作品', idea = '', age = '儿童' } = await readJson(request)
    if (!isValidImageDataUrl(imageDataUrl)) return send(response, 400, { error: '请上传 10MB 以内的 JPG、PNG 或 WebP 图片' })
    const prompt = `请以儿童美术老师的语气点评一幅学生作品。学生年龄：${age}。作品名称：${title}。学生创作想法：${idea || '未填写'}。\n只能依据图片中可见内容，保持具体、温暖、鼓励性；绝不打分、排名、贬低儿童、评价人格或做心理/医学判断。\n严格只返回 JSON：{"summary":"一句总体评价","strengths":["优点1","优点2"],"suggestions":["可尝试的建议1","建议2"],"encouragement":"一句给孩子的鼓励"}`
    const upstream = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model, temperature: 0.5, max_tokens: 500, response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: [
          { type: 'image_url', image_url: { url: imageDataUrl, detail: 'low' } },
          { type: 'text', text: prompt },
        ] }],
      }),
      signal: AbortSignal.timeout(30000),
    })
    if (!upstream.ok) {
      console.error('SiliconFlow request failed:', upstream.status, await upstream.text())
      return send(response, 502, { error: 'AI 服务暂时不可用，请稍后重试' })
    }
    const payload = await upstream.json()
    return send(response, 200, parseReview(payload.choices?.[0]?.message?.content))
  } catch (error) {
    console.error('Artwork review failed:', error)
    return send(response, 500, { error: '生成点评失败，请更换图片后重试' })
  }
})

server.listen(port, () => console.log(`art-school-ai-proxy listening on ${port}`))
