const inv=(c,a)=>window.__TAURI__.core.invoke(c,a);
let unsubs=[];
function on(e,fn){window.__TAURI__.event.listen(e,fn).then(u=>unsubs.push(u)).catch(()=>{});}
const $=id=>document.getElementById(id);
const dot=$('dot'),statusText=$('statusText');
function setStatus(s){dot.className='dot '+(s.connected?'ok':(s.error?'err':''));statusText.textContent=s.provider?(s.provider+' / '+s.model+(s.connected?'':' - '+(s.error||'disconnected'))):'disconnected';}
$('btnConn').onclick=async()=>{
$('connErr').textContent='';
const tok=$('fTok').value.trim();
const p={cwd:$('fCwd').value.trim()||'.',provider:$('fProv').value.trim(),model:$('fModel').value.trim(),maxTokens:tok?parseInt(tok,10):undefined,apiKey:$('fKey').value||undefined,runtimePath:$('fRun').value.trim()||undefined};
try{const st=await inv('init_runtime',p);setStatus(st);$('connect').style.display='none';$('chat').classList.add('on');addMsg('assist','Connected. Runtime ready. Type a message.');}catch(e){$('connErr').textContent='Connect failed: '+e;}};
function addMsg(who,text){const m=document.createElement('div');m.className='msg '+who;m.textContent=text;$('msgs').appendChild(m);$('msgs').scrollTop=$('msgs').scrollHeight;}
let cur=null;
function extractText(p){try{const e=p.event||p;if(!e)return null;const c=e.content||e.messageContent||[];if(Array.isArray(c))return c.map(b=>b&&b.text?b.text:'').join('');if(e.text)return e.text;if(e.delta)return(e.delta.text||'');return null;}catch{return null;}}
on('session.event',ev=>{const p=ev.payload&&ev.payload.params?ev.payload.params:ev.payload;const t=extractText(p)||'';if(!t)return;const sid=p&&p.sessionId;if(!cur||cur.sid!==sid){cur={sid,el:null};const m=document.createElement('div');m.className='msg assist';$('msgs').appendChild(m);cur.el=m;}cur.el.textContent+=t;$('msgs').scrollTop=$('msgs').scrollHeight;});
on('session.status',ev=>{const p=ev.payload&&ev.payload.params?ev.payload.params:ev.payload;if(p&&p.status==='idle')cur=null;});
$('btnSend').onclick=send;$('inp').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
async function send(){const c=$('inp').value.trim();if(!c)return;$('inp').value='';addMsg('user',c);try{await inv('send_prompt',{sessionId:'chat',content:c});}catch(e){addMsg('assist','Error: '+e);}}
$('btnDisc').onclick=async()=>{try{await inv('shutdown_runtime');}catch(e){}dot.className='dot';statusText.textContent='disconnected';cur=null;$('chat').classList.remove('on');$('connect').style.display='';$('msgs').innerHTML='';};
window.addEventListener('load',()=>{inv('get_status').then(setStatus).catch(()=>{});});