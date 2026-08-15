const inv=(c,a)=>window.__TAURI__.core.invoke(c,a);
const $=id=>document.getElementById(id);
let unsubs=[];
function on(e,fn){window.__TAURI__.event.listen(e,fn).then(u=>unsubs.push(u)).catch(()=>{});}
const dot=$('dot'),statusText=$('statusText');
function setStatus(s){dot.className='dot '+(s.connected?'ok':(s.error?'err':''));statusText.textContent=s.provider?(s.provider+' / '+s.model+(s.connected?'':' - '+(s.error||'disconnected'))):'disconnected';}
$('btnConn').onclick=async()=>{
$('connErr').textContent='';
const tok=$('fTok').value.trim();
try{const p={cwd:$('fCwd').value.trim()||'.',provider:$('fProv').value.trim(),model:$('fModel').value.trim(),maxTokens:tok?parseInt(tok,10):undefined,apiKey:$('fKey').value||undefined,runtimePath:$('fRun').value.trim()||undefined};const st=await inv('init_runtime',p);setStatus(st);$('connect').style.display='none';$('chat').classList.add('on');addMsg('assist','Connected. Type a message.');}catch(e){$('connErr').textContent='Connect failed: '+e;}
};
function addMsg(who,text){const m=document.createElement('div');m.className='msg '+who;m.textContent=text;$('msgs').appendChild(m);$('msgs').scrollTop=$('msgs').scrollHeight;}
let cur=null;
function extractText(p){try{const e=p.event||p;if(!e)return null;const c=e.content||e.messageContent||[];if(Array.isArray(c))return c.map(b=>b&&b.text?b.text:'').join('');if(e.text)return e.text;if(e.delta)return(e.delta.text||'');return null;}catch{return null;}}
on('session.event',ev=>{const p=ev.payload&&ev.payload.params?ev.payload.params:ev.payload;const t=extractText(p)||'';if(!t)return;const sid=p&&p.sessionId;if(!cur||cur.sid!==sid){cur={sid,el:null};const m=document.createElement('div');m.className='msg assist';$('msgs').appendChild(m);cur.el=m;}cur.el.textContent+=t;$('msgs').scrollTop=$('msgs').scrollHeight;});
on('session.status',ev=>{const p=ev.payload&&ev.payload.params?ev.payload.params:ev.payload;if(p&&p.status==='idle')cur=null;});
$('btnSend').onclick=send;$('inp').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
async function send(){const c=$('inp').value.trim();if(!c)return;$('inp').value='';addMsg('user',c);try{await inv('send_prompt',{sessionId:'chat',content:c});}catch(e){addMsg('assist','Error: '+e);}}
$('btnDisc').onclick=async()=>{try{await inv('shutdown_runtime');}catch(e){}dot.className='dot';statusText.textContent='disconnected';cur=null;$('chat').classList.remove('on');$('connect').style.display='';$('msgs').innerHTML='';};

// === Plugins ===
$('btnImg').onclick=async()=>{$('fileImg').click();};
$('fileImg').onchange=async e=>{const f=e.target.files[0];if(!f)return;const b64=await new Promise(r=>{const rd=new FileReader();rd.onload=()=>r(rd.result);rd.readAsDataURL(f);});$('inp').value=('[img data-url='+b64+']');$('inp').focus();};
$('btnFile').onclick=async()=>{$('fileDoc').click();};
$('fileDoc').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const text=await new Promise((r,j)=>{const rd=new FileReader();rd.onload=ev=>r(ev.target.result);rd.onerror=j;rd.readAsText(f);});const name=f.name||'(file)';$('inp').value+=$('inp').value?'\n'+'[file '+name+']\n'+text.slice(0,8000)+'\n[/file]\n':'[file '+name+']\n'+text.slice(0,8000)+'\n[/file]\n';$('inp').focus();}catch(err){alert('File read error: '+err);}};
$('btnQuote').onclick=async()=>{const cwd=($('fCwd').value||'.');try{const files=await inv('list_files',{dir:cwd,max:100});const list=$('wsList');list.innerHTML='';if(!files||files.length===0){list.innerHTML='<div id="wsEmpty">No files found</div>';}else{files.forEach(f=>{if(!f.is_file)return;const row=document.createElement('div');row.className='row';row.innerHTML='<span class="n">'+escHtml(f.name)+'</span><span class="s">'+fmtSize(f.size)+'</span>';row.onclick=async()=>{try{const txt=await inv('read_file',{path:f.path,max_bytes:8000});$('inp').value+=$('inp').value?'\n'+'[quote '+f.name+']\n'+txt.slice(0,6000)+'\n[/quote]\n':'[quote '+f.name+']\n'+txt.slice(0,6000)+'\n[/quote]\n';$('inp').focus();wsClose();}catch(err){alert('Read error: '+err);}};list.appendChild(row);});} $('wsOverlay').classList.add('on');}catch(err){alert('List error: '+err);}};
$('wsClose').onclick=wsClose;
$('wsOverlay').onclick=e=>{if(e.target===$('wsOverlay'))wsClose();};
function wsClose(){$('wsOverlay').classList.remove('on');}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function fmtSize(b){if(b<1024)return b+'B';if(b<1048576)return (b/1024).toFixed(0)+'KB';return (b/1048576).toFixed(1)+'MB';}
window.addEventListener('load',()=>{inv('get_status').then(setStatus).catch(()=>{});});
