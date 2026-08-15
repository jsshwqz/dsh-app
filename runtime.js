#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'

let provider='', model='', apiKey='', cwd='', maxTokens=0
let conversation=[]

async function fetchApi(messages, body) {
  const url = body.custom_endpoint || `https://api.deepseek.com/v1/chat/completions`
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+apiKey },
    body: JSON.stringify(body)
  })
}

async function handleSessionPrompt(params) {
  const blocks = params.contentBlocks || [{type:'text',text:params.content||''}]
  let text=''
  for (const b of blocks) { if (b.text) text += b.text }
  
  conversation.push({role:'user', content: text})
  
  const messages = [
    {role:'system', content:'You are DSH Desktop assistant.'},
    ...conversation
  ]
  
  const body = {
    model: model,
    messages: messages,
    stream: true,
    ...(maxTokens?{max_tokens:maxTokens}:{}),
    ...(params.custom_endpoint?{custom_endpoint:params.custom_endpoint}:{})
  }
  
  try {
    const resp = await fetchApi(messages, body)
    if (!resp.ok) throw new Error('API '+resp.status)
    
    const reader = resp.body.getReader()
    const dec = new TextDecoder()
    let buffer=''
    
    while (true) {
      const {done, value} = await reader.read()
      if (done) break
      buffer += dec.decode(value, {stream:true})
      const lines = buffer.split('\n')
      buffer = lines.pop()
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const j = JSON.parse(data)
          const delta = j.choices?.[0]?.delta?.content
          if (delta) {
            process.stdout.write(JSON.stringify({jsonrpc:'2.0', method:'session.event', params:{sessionId:params.sessionId, event:{content:[{type:'text',text:delta}]}}})+'\n')
          }
        } catch(e){}
      }
    }
    
    conversation.push({role:'assistant', content:''})
    process.stdout.write(JSON.stringify({jsonrpc:'2.0', method:'session.status', params:{sessionId:params.sessionId, status:'idle'}})+'\n')
    return {messageId: 'msg-'+Date.now()}
  } catch(e) {
    process.stdout.write(JSON.stringify({jsonrpc:'2.0', method:'session.status', params:{sessionId:params.sessionId, status:'idle', error:e.message}})+'\n')
    throw e
  }
}

async function main() {
  apiKey = process.env.DEEPSEEK_API_KEY || ''
  provider = process.env.DSH_PROVIDER || 'deepseek'
  model = process.env.DSH_MODEL || 'deepseek-chat'
  cwd = process.env.DSH_CWD || '.'
  maxTokens = parseInt(process.env.DSH_MAX_TOKENS||'0',10)
  
  const stdin = process.stdin
  stdin.setEncoding('utf8')
  let buf=''
  
  stdin.on('data', chunk => {
    buf += chunk
    while (buf.includes('\n')) {
      const idx = buf.indexOf('\n')
      const line = buf.slice(0, idx)
      buf = buf.slice(idx+1)
      if (!line.trim()) continue
      processLine(line)
    }
  })
  
  async function processLine(line) {
    try {
      const req = JSON.parse(line)
      if (!req.method) return
      
      let result
      if (req.method === 'initialize') {
        const p = req.params || {}
        if (p.provider) provider = p.provider
        if (p.model) model = p.model
        if (p.apiKey) apiKey = p.apiKey
        if (p.maxTokens) maxTokens = p.maxTokens
        if (p.cwd) cwd = p.cwd
        result = {serverInfo:{name:'dsh-desktop-runtime',version:'0.1.0'}}
      } else if (req.method === 'session/prompt') {
        result = await handleSessionPrompt(req.params || {})
      } else if (req.method === 'shutdown') {
        process.exit(0)
      } else {
        result = {}
      }
      process.stdout.write(JSON.stringify({jsonrpc:'2.0', id:req.id, result})+'\n')
    } catch(e) {
      process.stdout.write(JSON.stringify({jsonrpc:'2.0', method:'session.event', params:{event:{text:'Error: '+e.message}}})+'\n')
    }
  }
  
  process.stdout.write(JSON.stringify({jsonrpc:'2.0', method:'runtime:ready'})+'\n')
}

main().catch(e => { process.stderr.write('runtime error: '+e.message+'\n'); process.exit(1) })
