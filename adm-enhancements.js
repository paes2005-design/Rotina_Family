import { getApps, getApp, initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, query, where, onSnapshot, getDocs, doc, getDoc, updateDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const firebaseConfig={apiKey:'AIzaSyCP9odEV8TJGOM4lflHk64BbPyXXVjGcYg',authDomain:'sistema-de-metas-diarias.firebaseapp.com',projectId:'sistema-de-metas-diarias',storageBucket:'sistema-de-metas-diarias.firebasestorage.app',messagingSenderId:'576624564310',appId:'1:576624564310:web:fb2115a0c21659fefb83f7'};
const app=getApps().length?getApp():initializeApp(firebaseConfig);
const db=getFirestore(app);const auth=getAuth(app);
const ICONES=[['✅','Padrão'],['🎮','Videogame'],['📺','Televisão'],['🧸','Brincar'],['📱','Celular'],['💻','Computador'],['🛏️','Cama / quarto'],['🪥','Escovar dentes'],['🚿','Banho'],['📖','Leitura'],['🎒','Mochila'],['📚','Estudo'],['🧹','Limpeza'],['🍽️','Louça / cozinha'],['👕','Roupas'],['🗑️','Lixo'],['🐾','Pet'],['💊','Remédio'],['🏃','Exercício'],['🍴','Alimentação'],['🙏','Oração'],['🎵','Música'],['🚗','Passeio'],['🛒','Compras']];
let tarefas=[];let historico=[];let unsubT=null,unsubH=null;let grupoAtual='';let sincronizando=false;
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hoje=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const grupoId=()=>{const t=(document.getElementById('displayCodigoCliente')?.textContent||'').trim();return /^CLI-/i.test(t)?t:'';};
function iconAuto(nome=''){return window.iconeTarefaRotina?.(nome)||'✅';}
function instalarEstilo(){if(document.getElementById('admEnhStyle'))return;const s=document.createElement('style');s.id='admEnhStyle';s.textContent=`.icone-preview-adm{display:flex;align-items:center;gap:10px;margin-top:7px;color:#64748b;font-size:12px}.icone-preview-adm b{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;background:#f3f0ff;border:1px solid #ddd7ff;font-size:21px}.task-icon-web{display:inline-grid;place-items:center;width:28px;height:28px;margin-right:7px;border-radius:8px;background:#f3f0ff;border:1px solid #ddd7ff;vertical-align:middle;font-size:16px}.review-admin-box{background:#f8fafc;border:1px solid #dbe4ee;border-radius:15px;padding:14px;margin:10px 0 20px}.review-admin-head{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap}.review-admin-item{background:#fff;border:1px solid #e2e8f0;border-radius:13px;padding:12px;margin-top:10px}.review-admin-meta{font-size:12px;color:#64748b;margin:5px 0}.review-admin-just{padding:9px 10px;border-radius:9px;background:#f8fafc;color:#334155;margin:8px 0;font-size:13px}.review-admin-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.review-admin-actions button{border:0;border-radius:9px;padding:7px 10px;font-size:12px;font-weight:800;cursor:pointer}.review-admin-actions .keep{background:#e2e8f0;color:#334155}.review-admin-actions .partial{background:#fff4e6;color:#b45309}.review-admin-actions .full{background:#dcfce7;color:#166534}.review-status{display:inline-block;padding:4px 7px;border-radius:999px;font-size:11px;font-weight:800;background:#eef2ff;color:#4338ca}.regra-v2-note{margin-top:10px;padding:10px 12px;border-radius:10px;background:#eef6ff;border:1px solid #bfdbfe;color:#334155;font-size:13px;line-height:1.5}@media(max-width:780px){.review-admin-actions button{flex:1;min-width:90px}.task-icon-web{width:26px;height:26px}}`;document.head.appendChild(s);}
function instalarSeletor(){
  if(document.getElementById('iconeTarefa'))return;
  const nome=document.getElementById('nomeTarefa');if(!nome)return;
  const div=document.createElement('div');div.className='form-group';div.innerHTML=`<label for="iconeTarefa">Ícone da tarefa:</label><select id="iconeTarefa">${ICONES.map(([i,n])=>`<option value="${i}">${i} ${n}</option>`).join('')}</select><div class="icone-preview-adm"><b id="iconePreviewAdm">✅</b><span>Escolha o ícone que aparecerá no ADM e no aplicativo Cliente.</span></div>`;
  nome.closest('.form-group')?.insertAdjacentElement('afterend',div);
  const sel=div.querySelector('select'),prev=div.querySelector('#iconePreviewAdm');sel.onchange=()=>prev.textContent=sel.value;
}
async function atualizarIconeDepoisSalvar(captura){
  const g=grupoId();if(!g||!captura.nome)return;
  await new Promise(r=>setTimeout(r,250));
  const snap=await getDocs(query(collection(db,'tarefas'),where('grupoId','==',g)));
  const lista=snap.docs.map(d=>({id:d.id,...d.data()}));
  let alvos=[];
  if(captura.grupoAnterior)alvos=lista.filter(t=>t.tarefaGrupoId===captura.grupoAnterior);
  if(!alvos.length)alvos=lista.filter(t=>t.nome===captura.nome&&(t.perfilId===captura.perfilId||(!t.perfilId&&t.perfilNome===captura.perfilNome))&&captura.dias.includes(t.diaSemana));
  await Promise.allSettled(alvos.map(t=>updateDoc(doc(db,'tarefas',t.id),{icone:captura.icone,iconeAtualizadoEm:new Date().toISOString()})));
}
function envolverCadastro(){
  if(window.__admIconWrapped)return;window.__admIconWrapped=true;
  const tentar=()=>{
    if(!window.salvarTarefa||window.salvarTarefa.__iconeWrapped)return false;
    const original=window.salvarTarefa;
    const wrapper=async()=>{const editId=document.getElementById('editTarefaId')?.value||'';const antiga=tarefas.find(t=>t.id===editId);const perfilId=document.getElementById('tarefaResponsavel')?.value||'';const perfilNome=document.querySelector(`#tarefaResponsavel option[value="${CSS.escape(perfilId)}"]`)?.textContent?.replace(/\s*\([^)]*\).*$/,'').trim()||'';const captura={nome:document.getElementById('nomeTarefa')?.value.trim()||'',perfilId,perfilNome,dias:[...document.querySelectorAll('.dia-semana-check:checked')].map(x=>x.value),icone:document.getElementById('iconeTarefa')?.value||'✅',grupoAnterior:antiga?.tarefaGrupoId||''};await original();await atualizarIconeDepoisSalvar(captura);};wrapper.__iconeWrapped=true;window.salvarTarefa=wrapper;
    const pOriginal=window.preencherEdicaoTarefa;
    if(pOriginal&&!pOriginal.__iconeWrapped){const p=async id=>{pOriginal(id);const g=grupoId();if(!g)return;try{const s=await getDoc(doc(db,'tarefas',id));if(s.exists()){const ic=s.data().icone||iconAuto(s.data().nome);const sel=document.getElementById('iconeTarefa');if(sel){sel.value=[...sel.options].some(o=>o.value===ic)?ic:'✅';document.getElementById('iconePreviewAdm').textContent=sel.value;}}}catch(e){}};p.__iconeWrapped=true;window.preencherEdicaoTarefa=p;}
    const cOriginal=window.cancelarEdicaoTarefa;if(cOriginal&&!cOriginal.__iconeWrapped){const c=()=>{cOriginal();const sel=document.getElementById('iconeTarefa');if(sel){sel.value='✅';document.getElementById('iconePreviewAdm').textContent='✅';}};c.__iconeWrapped=true;window.cancelarEdicaoTarefa=c;}
    return true;
  };
  if(!tentar())setTimeout(tentar,500);
}
function acharTarefaPorLinha(row,nome){
  const txt=row.textContent||'';return tarefas.find(t=>t.nome===nome&&(!t.perfilNome||txt.includes(t.perfilNome))&&(!t.horaSugeridaInicio||txt.includes(t.horaSugeridaInicio)))||tarefas.find(t=>t.nome===nome);
}
function decorarWeb(){
  document.querySelectorAll('#tbodyExclusao tr,#tbodyMonitor tr').forEach(row=>{const st=row.querySelector('td:nth-child(2) strong');if(!st)return;const nome=st.textContent.trim(),t=acharTarefaPorLinha(row,nome),ic=t?.icone||iconAuto(nome);let el=st.parentElement.querySelector(':scope > .task-icon-web');if(!el){el=document.createElement('span');el.className='task-icon-web';st.parentElement.insertBefore(el,st);}el.textContent=ic;});
  document.querySelectorAll('.ger-task-card').forEach(card=>{const nome=card.querySelector('.ger-main strong')?.textContent?.trim();if(!nome)return;const t=tarefas.find(x=>x.nome===nome);const el=card.querySelector('.task-icon-badge');if(el)el.textContent=t?.icone||iconAuto(nome);});
  document.querySelectorAll('.mon-app-card').forEach(card=>{const nome=card.querySelector('.mon-app-copy strong')?.textContent?.trim();if(!nome)return;const t=tarefas.find(x=>x.nome===nome);const el=card.querySelector('.task-icon-badge');if(el)el.textContent=t?.icone||iconAuto(nome);});
}
function textoRegraAdmin(){return `<strong>Saldo único de tolerância por tarefa.</strong><br>O atraso no início e o atraso no término usam o <strong>mesmo saldo</strong>. O sistema soma os dois consumos.<br><br>• Até 100% do saldo de tolerância: <strong>100% dos pontos</strong>.<br>• Passou do saldo, mas ficou até 25% além: <strong>75%</strong>.<br>• Passou mais, mas ficou até 50% além: <strong>50%</strong>.<br>• Passou de 50% além da tolerância: <strong>0%</strong> e pode gerar justificativa.<br><br><strong>Exemplo com 10 min:</strong> consumo total até 10 min = 100%; até 13 min = 75%; até 15 min = 50%; acima de 15 min = 0%. Se começou 5 min atrasado, restam 5 min do saldo normal para eventual atraso no término.<br><br>As tarefas têm cronômetros independentes. Uma próxima tarefa começa a consumir sua própria tolerância quando seu horário chega, mesmo se a anterior ainda estiver em andamento.<br><br><strong>Revisão humana:</strong> a pontuação automática é preservada no histórico. Após uma justificativa, o responsável pode manter o resultado ou restaurar pontos parcialmente ou totalmente.`;}
function atualizarTextoRegra(){const el=document.getElementById('explicacaoRegraAtrasoAdmin');if(el&&el.style.display!=='none')el.innerHTML=textoRegraAdmin();const prev=document.getElementById('previewRegraAtrasoAdmin');if(prev)prev.innerHTML=textoRegraAdmin();const modal=document.getElementById('modalRegraAtrasoAdmin');if(modal){const p=modal.querySelector('p');if(p)p.textContent='Os percentuais podem ser personalizados; os limites de consumo seguem o saldo único: normal, +25%, +50% e estourado.';const labs=modal.querySelectorAll('.form-group label');if(labs[0])labs[0].textContent='Até o saldo normal (%)';if(labs[1])labs[1].textContent='Até 25% além do saldo (%)';if(labs[2])labs[2].textContent='Até 50% além do saldo (%)';}}
function envolverExplicacao(){
  const a=window.alternarExplicacaoRegraAtrasoAdmin;if(a&&!a.__v2){const w=()=>{a();setTimeout(atualizarTextoRegra,0);};w.__v2=true;window.alternarExplicacaoRegraAtrasoAdmin=w;}
  const b=window.abrirConfiguracaoRegraAtraso;if(b&&!b.__v2){const w=()=>{b();setTimeout(atualizarTextoRegra,0);};w.__v2=true;window.abrirConfiguracaoRegraAtraso=w;}
  atualizarTextoRegra();
}
function garantirRevisao(){
  if(document.getElementById('revisaoJustificativasAdm'))return;
  const monitor=document.getElementById('monitor');const h=monitor?.querySelector('h2');if(!monitor||!h)return;
  const d=document.createElement('section');d.id='revisaoJustificativasAdm';d.className='review-admin-box';d.innerHTML='<div class="review-admin-head"><div><strong>💬 Revisão de justificativas</strong><div style="font-size:12px;color:#64748b;margin-top:3px">A pontuação automática permanece registrada. Você pode manter ou devolver pontos após analisar a explicação.</div></div><span id="reviewCountAdm" class="review-status">0 pendentes</span></div><div id="reviewListaAdm"></div>';
  h.insertAdjacentElement('afterend',d);
}
function renderRevisoes(){
  garantirRevisao();const el=document.getElementById('reviewListaAdm'),count=document.getElementById('reviewCountAdm');if(!el)return;
  const lista=historico.filter(h=>h.justificativaAtraso).sort((a,b)=>(b.data||'').localeCompare(a.data||''));const pend=lista.filter(h=>h.revisaoStatus!=='revisada').length;if(count)count.textContent=`${pend} pendente${pend===1?'':'s'}`;
  if(!lista.length){el.innerHTML='<p style="color:#64748b;font-size:13px">Nenhuma justificativa para revisar.</p>';return;}
  el.innerHTML=lista.slice(0,20).map(h=>{const atual=Number(h.pontosGanhos||0),max=Number(h.pontosMaximos)||0,orig=Number(h.pontosOriginais??atual),pctAtual=max?Math.round(atual/max*100):0;const rev=h.revisaoStatus==='revisada';const btns=[50,75,100].filter(p=>Math.round(max*p/100)>atual).map(p=>`<button class="${p===100?'full':'partial'}" onclick="revisarPontosAdm('${h.id}',${p})">Restaurar ${p}%</button>`).join('');return `<article class="review-admin-item"><div><strong>${esc(h.perfilNome||'Integrante')} · ${esc(h.nomeTarefa||'Tarefa')}</strong> ${rev?'<span class="review-status">Revisada</span>':'<span class="review-status">Aguardando análise</span>'}</div><div class="review-admin-meta">${esc(h.data||'')} · automático: ${orig}/${max} pts · atual: ${atual}/${max} pts (${pctAtual}%)</div><div class="review-admin-just">“${esc(h.justificativaAtraso)}”</div><div class="review-admin-actions"><button class="keep" onclick="revisarPontosAdm('${h.id}',null)">Manter pontuação</button>${btns}</div></article>`}).join('');
}
window.revisarPontosAdm=async(id,pct)=>{
  const h=historico.find(x=>x.id===id);if(!h)return;const max=Number(h.pontosMaximos)||0;const originalPts=Number(h.pontosOriginais??h.pontosGanhos??0);const originalPct=Number(h.percentualOriginal??h.percentualAplicado??(max?Math.round(originalPts/max*100):0));const novoPts=pct===null?Number(h.pontosGanhos||0):Math.round(max*(pct/100));const pctNovo=pct===null?Number(h.percentualRevisado??h.percentualAplicado??originalPct):pct;const dados={pontosOriginais:originalPts,percentualOriginal:originalPct,pontosGanhos:novoPts,pontosRevisados:novoPts,percentualRevisado:pctNovo,revisaoStatus:'revisada',revisaoDecisao:pct===null?'mantida':pctNovo>=100?'restaurada-total':'restaurada-parcial',revisadoEm:new Date().toISOString(),revisadoPorUid:auth.currentUser?.uid||''};
  await updateDoc(doc(db,'historico',id),dados);if(h.tarefaId&&h.data)await setDoc(doc(db,'execucoes',`${h.data}__${h.tarefaId}`),dados,{merge:true});if(h.tarefaId&&h.data===hoje()){try{await updateDoc(doc(db,'tarefas',h.tarefaId),dados);}catch(e){}}
};
function iniciarEscutas(){const g=grupoId();if(!g||g===grupoAtual)return;grupoAtual=g;unsubT?.();unsubH?.();unsubT=onSnapshot(query(collection(db,'tarefas'),where('grupoId','==',g)),s=>{tarefas=s.docs.map(d=>({id:d.id,...d.data()}));decorarWeb();});unsubH=onSnapshot(query(collection(db,'historico'),where('grupoId','==',g)),s=>{historico=s.docs.map(d=>({id:d.id,...d.data()}));renderRevisoes();});}
function boot(){instalarEstilo();instalarSeletor();envolverCadastro();envolverExplicacao();garantirRevisao();iniciarEscutas();new MutationObserver(()=>{instalarSeletor();envolverCadastro();envolverExplicacao();iniciarEscutas();decorarWeb();renderRevisoes();}).observe(document.body,{childList:true,subtree:true,characterData:true});setInterval(()=>{iniciarEscutas();decorarWeb();},1500);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
