import {getApps,getApp} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {getFirestore,collection,query,where,getDocs,doc,getDoc,writeBatch} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let contextoAtual=null;
let salvando=false;

function db(){return getApps().length?getFirestore(getApp()):null;}
function grupo(){return (document.getElementById('displayCodigoCliente')?.textContent||'').trim();}
function dataSelecionada(){return document.getElementById('filtroData')?.value||'';}
function parseHorario(txt=''){
  const m=String(txt).match(/(\d{2}:\d{2}).*?(\d{2}:\d{2})/);
  return m?{inicio:m[1],fim:m[2]}:{inicio:'',fim:''};
}
function pctOriginal(t){
  if(Number.isFinite(Number(t.percentualOriginal)))return Number(t.percentualOriginal);
  if(Number.isFinite(Number(t.percentualAplicado)))return Number(t.percentualAplicado);
  const max=Number(t.pontosMaximos)||0,pts=Number(t.pontosOriginais??t.pontosGanhos)||0;
  return max?Math.round(pts/max*100):0;
}
function pontosOriginais(t){return Number.isFinite(Number(t.pontosOriginais))?Number(t.pontosOriginais):(Number(t.pontosGanhos)||0);}
function pontosPara(max,pct){return Math.round((Number(max)||0)*(Number(pct)||0)/100);}

function garantirModal(){
  let m=document.getElementById('admReviewJustModal');
  if(m)return m;
  m=document.createElement('div');
  m.id='admReviewJustModal';
  m.innerHTML=`<div class="adm-review-card" role="dialog" aria-modal="true" aria-labelledby="admReviewTitulo">
    <button type="button" class="adm-review-close" aria-label="Fechar">×</button>
    <div class="adm-review-kicker">🚩 Justificativa</div>
    <h2 id="admReviewTitulo">Revisar ocorrência</h2>
    <div id="admReviewResumo" class="adm-review-summary"></div>
    <div class="adm-review-text"><small>Justificativa enviada</small><p id="admReviewTexto"></p></div>
    <div class="adm-review-original" id="admReviewOriginal"></div>
    <div class="adm-review-actions" id="admReviewAcoes"></div>
    <div class="adm-review-msg" id="admReviewMsg" aria-live="polite"></div>
  </div>`;
  const style=document.createElement('style');
  style.textContent=`#admReviewJustModal{display:none;position:fixed;inset:0;z-index:30000;background:rgba(15,23,42,.62);align-items:center;justify-content:center;padding:16px;box-sizing:border-box}.adm-review-card{position:relative;width:min(520px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:20px;padding:20px;box-shadow:0 24px 70px rgba(15,23,42,.28);box-sizing:border-box}.adm-review-close{position:absolute;right:14px;top:12px;border:0;background:#f1f5f9;width:34px;height:34px;border-radius:50%;font-size:22px;color:#475569;cursor:pointer}.adm-review-kicker{font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;color:#b45309}.adm-review-card h2{margin:5px 42px 14px 0;color:#1e293b}.adm-review-summary{font-size:13px;color:#64748b;line-height:1.5}.adm-review-text{margin:14px 0;padding:13px;border:1px solid #fde68a;background:#fffbeb;border-radius:13px}.adm-review-text small{display:block;font-weight:800;color:#92400e;text-transform:uppercase;font-size:10px;margin-bottom:5px}.adm-review-text p{margin:0;color:#334155;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}.adm-review-original{padding:11px 12px;background:#f8fafc;border-radius:12px;color:#475569;font-size:12px;line-height:1.45}.adm-review-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.adm-review-actions button{border:0;border-radius:11px;padding:11px 9px;font-weight:800;cursor:pointer;background:#e2e8f0;color:#334155}.adm-review-actions button[data-pct="75"]{background:#fff4dd;color:#a35200}.adm-review-actions button[data-pct="100"]{background:#dcfce7;color:#166534}.adm-review-actions button:disabled{opacity:.45;cursor:not-allowed}.adm-review-msg{font-size:12px;margin-top:10px;color:#64748b;min-height:18px}@media(max-width:480px){.adm-review-card{padding:18px 15px;border-radius:18px}.adm-review-actions{grid-template-columns:1fr}.adm-review-actions button{padding:12px}.adm-review-card h2{font-size:20px}}`;
  document.head.appendChild(style);
  document.body.appendChild(m);
  m.querySelector('.adm-review-close').onclick=()=>fecharModal();
  m.addEventListener('click',e=>{if(e.target===m)fecharModal();});
  m.querySelector('#admReviewAcoes').addEventListener('click',e=>{const b=e.target.closest('button[data-review]');if(!b)return;salvarRevisao(b.dataset.review,b.dataset.pct===''?null:Number(b.dataset.pct));});
  return m;
}
function fecharModal(){if(salvando)return;const m=document.getElementById('admReviewJustModal');if(m)m.style.display='none';contextoAtual=null;}

async function localizarTarefa(ctx){
  const banco=db(),g=grupo();if(!banco||!g||g==='--'||g==='CLI-Gen')throw new Error('Grupo não identificado.');
  if(ctx.id){const s=await getDoc(doc(banco,'tarefas',ctx.id));if(s.exists())return{id:s.id,...s.data()};}
  const snap=await getDocs(query(collection(banco,'tarefas'),where('grupoId','==',g)));
  const horario=parseHorario(ctx.horario||ctx.schedule||'');
  const lista=snap.docs.map(d=>({id:d.id,...d.data()})).filter(t=>
    (!ctx.tarefa||t.nome===ctx.tarefa)&&
    (!ctx.usuario||t.perfilNome===ctx.usuario)&&
    (!ctx.dia||t.diaSemana===ctx.dia)&&
    (!horario.inicio||t.horaSugeridaInicio===horario.inicio)&&
    (!horario.fim||t.horaSugeridaFim===horario.fim)
  );
  if(ctx.justificativa){const exata=lista.find(t=>(t.justificativaAtraso||'').trim()===ctx.justificativa.trim());if(exata)return exata;}
  return lista[0]||null;
}

function montarAcoes(t){
  const originalPct=pctOriginal(t),originalPts=pontosOriginais(t),max=Number(t.pontosMaximos)||0;
  const atual=Number(t.pontosGanhos)||0,rev=t.revisaoStatus==='revisado';
  const botoes=[50,75,100].map(p=>`<button type="button" data-review="devolver" data-pct="${p}" ${p<=originalPct?'disabled':''}>Devolver até ${p}%<br><small>${Math.max(originalPts,pontosPara(max,p))} pts</small></button>`).join('');
  return {html:`<button type="button" data-review="manter" data-pct="">Manter resultado automático</button>${botoes}`,originalPct,originalPts,max,atual,rev};
}

async function abrir(ctx={}){
  const m=garantirModal();
  const msg=m.querySelector('#admReviewMsg');
  const data=ctx.data||dataSelecionada();
  m.style.display='flex';msg.textContent='Carregando ocorrência…';m.querySelector('#admReviewAcoes').innerHTML='';
  m.querySelector('#admReviewTexto').textContent=ctx.justificativa||'Carregando…';
  try{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(data))throw new Error('Selecione a data da ocorrência no Monitor antes de revisar.');
    const t=await localizarTarefa(ctx);if(!t)throw new Error('Não foi possível localizar esta tarefa.');
    const justificativa=(t.justificativaAtraso||ctx.justificativa||'').trim();
    contextoAtual={tarefa:t,data};
    const a=montarAcoes(t);
    m.querySelector('#admReviewTitulo').textContent=t.nome||'Revisar ocorrência';
    m.querySelector('#admReviewResumo').innerHTML=`<strong>${esc(t.perfilNome||ctx.usuario||'Integrante')}</strong> · ${esc(t.diaSemana||ctx.dia||'')} · ${esc(data.split('-').reverse().join('/'))}<br>${esc(t.horaSugeridaInicio||'--:--')}–${esc(t.horaSugeridaFim||'--:--')}`;
    m.querySelector('#admReviewTexto').textContent=justificativa||'Nenhuma justificativa em texto foi encontrada.';
    m.querySelector('#admReviewOriginal').innerHTML=`Resultado automático preservado: <strong>${esc(t.status||'—')}</strong> · <strong>${a.originalPts}/${a.max} pts</strong>${a.rev?`<br>Revisão atual: <strong>${a.atual}/${a.max} pts</strong> · devolvidos ${Number(t.pontosDevolvidos)||0} pts`:''}`;
    m.querySelector('#admReviewAcoes').innerHTML=justificativa?a.html:'<div style="grid-column:1/-1;color:#64748b;font-size:12px">Sem justificativa enviada, não há pontos para revisar por este fluxo.</div>';
    msg.textContent='';
  }catch(e){console.error('Revisão de justificativa:',e);msg.textContent=e.message||'Não foi possível carregar a justificativa.';}
}

async function docsRelacionados(banco,t,data){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data))throw new Error('Data da ocorrência inválida.');
  const hist=[];const exec=[];
  if(t.perfilId){
    const h=await getDoc(doc(banco,'historico',`${t.perfilId}_${t.id}_${data}`));
    if(h.exists())hist.push(h);
  }
  const e=await getDoc(doc(banco,'execucoes',`${data}__${t.id}`));
  if(e.exists())exec.push(e);
  // Compatibilidade com históricos antigos cujo perfilId ou ID determinístico ainda não existia.
  if(!hist.length){
    const hs=await getDocs(query(collection(banco,'historico'),where('tarefaId','==',t.id)));
    hs.docs.filter(d=>{const x=d.data();return x.data===data&&(!t.perfilId||!x.perfilId||x.perfilId===t.perfilId);}).forEach(d=>hist.push(d));
  }
  return {hist,exec};
}

async function salvarRevisao(tipo,pct){
  if(salvando||!contextoAtual?.tarefa)return;
  salvando=true;
  const m=garantirModal(),msg=m.querySelector('#admReviewMsg'),buttons=[...m.querySelectorAll('#admReviewAcoes button')];buttons.forEach(b=>b.disabled=true);msg.textContent='Salvando revisão…';
  try{
    const banco=db(),t=contextoAtual.tarefa,data=contextoAtual.data;if(!banco)throw new Error('Firebase ainda não está disponível.');
    const rel=await docsRelacionados(banco,t,data);
    if(!rel.hist.length)throw new Error('Histórico desta ocorrência não foi encontrado; nenhuma pontuação foi alterada.');
    const histBase=rel.hist[0].data();
    const originalPts=Number.isFinite(Number(histBase.pontosOriginais))?Number(histBase.pontosOriginais):(Number(histBase.pontosGanhos)||0);
    const originalPct=Number.isFinite(Number(histBase.percentualOriginal))?Number(histBase.percentualOriginal):(Number.isFinite(Number(histBase.percentualAplicado))?Number(histBase.percentualAplicado):(Number(histBase.pontosMaximos)?Math.round(originalPts/Number(histBase.pontosMaximos)*100):0));
    const max=Number(histBase.pontosMaximos??t.pontosMaximos)||0;
    const alvoPct=tipo==='manter'?originalPct:Math.max(originalPct,Number(pct)||0);
    const novosPts=tipo==='manter'?originalPts:Math.max(originalPts,pontosPara(max,alvoPct));
    const devolvidos=Math.max(0,novosPts-originalPts);
    const agora=new Date().toISOString();
    const decisao=tipo==='manter'?'resultado-mantido':alvoPct>=100?'devolucao-total':`devolucao-${alvoPct}`;
    const patch={pontosGanhos:novosPts,pontosOriginais:originalPts,percentualOriginal:originalPct,percentualRevisado:alvoPct,pontosDevolvidos:devolvidos,revisaoStatus:'revisado',revisaoDecisao:decisao,revisadoEm:agora};
    const batch=writeBatch(banco);
    // Atualiza a tarefa atual apenas se a revisão for da execução que ela ainda representa.
    const dataTarefa=String(t.dataExecucao||t.terminoExecutadoEm||t.inicioExecutadoEm||'').slice(0,10);
    const mesmaExecucao=!dataTarefa||dataTarefa===data;
    if(mesmaExecucao)batch.update(doc(banco,'tarefas',t.id),patch);
    rel.hist.forEach(d=>batch.update(d.ref,patch));
    rel.exec.forEach(d=>batch.update(d.ref,patch));
    await batch.commit();
    contextoAtual.tarefa={...t,...patch};
    msg.textContent=tipo==='manter'?'Revisão salva: resultado automático mantido.':`Revisão salva: ${devolvidos} ponto(s) devolvido(s).`;
    m.querySelector('#admReviewOriginal').innerHTML=`Resultado automático preservado: <strong>${esc(histBase.status||t.status||'—')}</strong> · <strong>${originalPts}/${max} pts</strong><br>Revisão atual: <strong>${novosPts}/${max} pts</strong> · devolvidos ${devolvidos} pts`;
    m.querySelector('#admReviewAcoes').innerHTML=montarAcoes({...t,...patch,pontosMaximos:max}).html;
    setTimeout(()=>{if(document.getElementById('admReviewJustModal')?.style.display==='flex')fecharModal();},900);
  }catch(e){console.error('Salvar revisão:',e);msg.textContent=e.message||'Não foi possível salvar a revisão. Tente novamente.';buttons.forEach(b=>b.disabled=false);}
  finally{salvando=false;}
}

window.abrirRevisaoJustificativa=abrir;

document.addEventListener('click',e=>{
  const mobile=e.target.closest?.('.mon-just-flag');
  if(mobile){
    e.preventDefault();
    abrir({tarefa:mobile.dataset.taskName||'',usuario:mobile.dataset.user||'',dia:mobile.dataset.day||'',horario:mobile.dataset.schedule||'',justificativa:mobile.dataset.justification||'',data:mobile.dataset.date||''});
    return;
  }
  const flag=e.target.closest?.('.tooltip-justificativa');
  if(flag){
    e.preventDefault();
    const r=flag.closest('tr'),c=r?.children;if(!c||c.length<4)return;
    abrir({tarefa:c[1]?.querySelector('strong')?.textContent.trim()||c[1]?.textContent.trim()||'',usuario:c[2]?.textContent.trim()||'',dia:c[3]?.textContent.trim()||'',horario:c[0]?.querySelector('strong')?.textContent.trim()||'',justificativa:flag.querySelector('.tooltip-texto')?.textContent.trim()||'',data:dataSelecionada()});
  }
});
