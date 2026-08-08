const MONITOR_LABELS=['Horário','Tarefa','Integrante','Dia','Status','Pontos'];
const estadoMonitor={usuarios:new Set(),tarefas:new Set(),status:new Set(),data:''};
let monitorPreparado=false;
let atualizarMonitorOriginal=null;

const escM=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hojeISO=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};

function normalizarStatus(texto=''){
  if(texto.includes('Atrasado')) return 'Atrasado';
  if(texto.includes('Prazo')) return 'No Prazo';
  if(texto.toLowerCase().includes('andamento')) return 'Em andamento';
  return 'Pendente';
}

function valoresMarcados(containerId){
  return new Set([...document.querySelectorAll(`#${containerId} input[type=checkbox]:checked`)].map(x=>x.value));
}

function renderChecklist(id,valores,selecionados){
  const el=document.getElementById(id); if(!el)return;
  if(!valores.length){el.innerHTML='<div style="padding:7px;color:#94a3b8;font-size:12px">Sem opções</div>';return;}
  el.innerHTML=valores.map(v=>`<label class="monitor-check"><input type="checkbox" value="${escM(v)}" ${selecionados.has(v)?'checked':''}> <span>${escM(v)}</span></label>`).join('');
}

function obterUsuariosDisponiveis(){
  const select=document.getElementById('filtroIntegrante');
  return select?[...select.options].filter(o=>o.value).map(o=>({id:o.value,nome:o.textContent.trim()})):[];
}

function obterDadosDasLinhas(){
  return [...document.querySelectorAll('#tbodyMonitor tr')].filter(r=>r.children.length>=6).map(r=>({
    row:r,
    tarefa:r.children[1]?.querySelector('strong')?.textContent.trim()||r.children[1]?.textContent.trim()||'',
    usuario:r.children[2]?.textContent.trim()||'',
    status:normalizarStatus(r.children[4]?.textContent.trim()||'')
  }));
}

function decorarTabela(){
  const tabela=document.querySelector('#monitor table');
  const scroll=tabela?.closest('.tabela-scroll');
  if(tabela)tabela.classList.add('monitor-table-pro');
  if(scroll)scroll.classList.add('monitor-scroll-pro');
  [...document.querySelectorAll('#tbodyMonitor tr')].forEach(row=>{
    [...row.children].forEach((td,i)=>td.dataset.label=MONITOR_LABELS[i]||'');
  });
}

function atualizarOpcoesFiltro(){
  const usuarios=obterUsuariosDisponiveis().map(x=>x.nome);
  renderChecklist('monitorUsuarios',usuarios,estadoMonitor.usuarios);
  const dados=obterDadosDasLinhas();
  const tarefas=[...new Set(dados.map(x=>x.tarefa).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  renderChecklist('monitorTarefas',tarefas,estadoMonitor.tarefas);
  renderChecklist('monitorStatus',['Pendente','Em andamento','No Prazo','Atrasado'],estadoMonitor.status);
}

function aplicarFiltroNasLinhas(){
  const dados=obterDadosDasLinhas();
  let visiveis=0;
  dados.forEach(({row,tarefa,usuario,status})=>{
    const okUsuario=!estadoMonitor.usuarios.size||estadoMonitor.usuarios.has(usuario);
    const okTarefa=!estadoMonitor.tarefas.size||estadoMonitor.tarefas.has(tarefa);
    const okStatus=!estadoMonitor.status.size||estadoMonitor.status.has(status);
    const ok=okUsuario&&okTarefa&&okStatus;
    row.classList.toggle('monitor-hidden',!ok); if(ok)visiveis++;
  });
  let vazio=document.getElementById('monitorVazioFiltro');
  if(!vazio){vazio=document.createElement('div');vazio.id='monitorVazioFiltro';vazio.className='monitor-empty-filter';vazio.style.display='none';vazio.textContent='Nenhuma tarefa corresponde aos filtros selecionados.';document.querySelector('#monitor .tabela-scroll')?.after(vazio);}
  vazio.style.display=dados.length&&visiveis===0?'block':'none';
  atualizarResumo();
}

function contarFiltros(){
  let n=estadoMonitor.usuarios.size+estadoMonitor.tarefas.size+estadoMonitor.status.size;
  if(estadoMonitor.data&&estadoMonitor.data!==hojeISO())n++;
  return n;
}

function atualizarResumo(){
  const count=document.getElementById('monitorFilterCount');
  const summary=document.getElementById('monitorFilterSummary');
  const n=contarFiltros();
  if(count){count.textContent=n;count.classList.toggle('show',n>0);}
  if(!summary)return;
  const partes=[];
  const d=estadoMonitor.data||hojeISO();
  try{partes.push(new Date(d+'T12:00:00').toLocaleDateString('pt-BR'));}catch{}
  if(estadoMonitor.usuarios.size)partes.push(`${estadoMonitor.usuarios.size} usuário(s)`);
  if(estadoMonitor.tarefas.size)partes.push(`${estadoMonitor.tarefas.size} tarefa(s)`);
  if(estadoMonitor.status.size)partes.push(`${estadoMonitor.status.size} status`);
  summary.textContent=partes.join(' • ');
}

function renderDepoisDoMonitor({repopular=true}={}){
  requestAnimationFrame(()=>{
    decorarTabela();
    if(repopular)atualizarOpcoesFiltro();
    aplicarFiltroNasLinhas();
  });
}

function executarMonitorBase(){
  const userSelect=document.getElementById('filtroIntegrante');
  const usuarios=obterUsuariosDisponiveis();
  if(userSelect){
    if(estadoMonitor.usuarios.size===1){const nome=[...estadoMonitor.usuarios][0];userSelect.value=usuarios.find(u=>u.nome===nome)?.id||'';}
    else userSelect.value='';
  }
  const dataInput=document.getElementById('filtroData'); if(dataInput)dataInput.value=estadoMonitor.data||hojeISO();
  atualizarMonitorOriginal?.();
  renderDepoisDoMonitor();
}

function aplicarFiltros(){
  estadoMonitor.data=document.getElementById('monitorData')?.value||hojeISO();
  estadoMonitor.usuarios=valoresMarcados('monitorUsuarios');
  estadoMonitor.tarefas=valoresMarcados('monitorTarefas');
  estadoMonitor.status=valoresMarcados('monitorStatus');
  executarMonitorBase();
  document.getElementById('monitorFilterPanel')?.classList.remove('open');
}

function limparFiltros(){
  estadoMonitor.data=hojeISO();estadoMonitor.usuarios.clear();estadoMonitor.tarefas.clear();estadoMonitor.status.clear();
  const d=document.getElementById('monitorData');if(d)d.value=estadoMonitor.data;
  ['monitorUsuarios','monitorTarefas','monitorStatus'].forEach(id=>document.querySelectorAll(`#${id} input`).forEach(x=>x.checked=false));
  executarMonitorBase();
}

function montarFiltroCompacto(){
  const monitor=document.getElementById('monitor'); if(!monitor||monitorPreparado)return;
  const oldData=document.getElementById('filtroData');
  const oldContainer=oldData?.closest('div[style*="display: flex"]'); if(oldContainer)oldContainer.classList.add('monitor-old-filters');
  const nota=oldContainer?.nextElementSibling;if(nota&&nota.tagName==='P')nota.classList.add('monitor-old-filters');
  estadoMonitor.data=oldData?.value||hojeISO();
  const anchor=oldContainer||monitor.querySelector('h2');
  const bloco=document.createElement('div');
  bloco.innerHTML=`
    <div class="monitor-pro-toolbar">
      <div class="monitor-pro-title"><span>📋</span><span id="monitorFilterSummary" class="monitor-filter-summary">${escM(new Date((estadoMonitor.data||hojeISO())+'T12:00:00').toLocaleDateString('pt-BR'))}</span></div>
      <button type="button" id="monitorFilterBtn" class="monitor-filter-btn">⚙️ Filtrar <span id="monitorFilterCount" class="monitor-filter-count">0</span></button>
    </div>
    <div id="monitorFilterPanel" class="monitor-filter-panel">
      <div class="monitor-filter-grid">
        <div class="monitor-filter-group"><label>Data</label><input id="monitorData" type="date" value="${escM(estadoMonitor.data||hojeISO())}"></div>
        <div class="monitor-filter-group"><label>Usuários <small style="font-weight:500;color:#94a3b8">(pode marcar vários)</small></label><div id="monitorUsuarios" class="monitor-check-list"></div></div>
        <div class="monitor-filter-group"><label>Tarefas <small style="font-weight:500;color:#94a3b8">(pode marcar várias)</small></label><div id="monitorTarefas" class="monitor-check-list"></div></div>
        <div class="monitor-filter-group"><label>Status <small style="font-weight:500;color:#94a3b8">(pode marcar vários)</small></label><div id="monitorStatus" class="monitor-check-list"></div></div>
      </div>
      <div class="monitor-filter-actions"><button type="button" class="monitor-filter-clear" id="monitorLimpar">Limpar</button><button type="button" class="monitor-filter-apply" id="monitorAplicar">Aplicar filtros</button></div>
    </div>
    <p class="monitor-mobile-hint">No celular, as tarefas são mostradas em cartões para facilitar a leitura.</p>`;
  anchor.after(bloco);
  document.getElementById('monitorFilterBtn').onclick=()=>document.getElementById('monitorFilterPanel').classList.toggle('open');
  document.getElementById('monitorAplicar').onclick=aplicarFiltros;
  document.getElementById('monitorLimpar').onclick=limparFiltros;
  document.getElementById('monitorData').addEventListener('change',()=>{
    estadoMonitor.data=document.getElementById('monitorData').value||hojeISO();
    const u=valoresMarcados('monitorUsuarios'),s=valoresMarcados('monitorStatus');
    estadoMonitor.usuarios=u;estadoMonitor.status=s;estadoMonitor.tarefas.clear();
    executarMonitorBase();
    document.getElementById('monitorFilterPanel').classList.add('open');
  });
  atualizarOpcoesFiltro(); decorarTabela(); atualizarResumo();
  monitorPreparado=true;
}

function iniciarMonitorPro(){
  if(typeof window.atualizarMonitor!=='function'){setTimeout(iniciarMonitorPro,150);return;}
  if(atualizarMonitorOriginal)return;
  atualizarMonitorOriginal=window.atualizarMonitor;
  window.atualizarMonitor=function(){atualizarMonitorOriginal();renderDepoisDoMonitor();};
  montarFiltroCompacto();
  renderDepoisDoMonitor();
  const select=document.getElementById('filtroIntegrante');
  if(select)new MutationObserver(()=>{if(monitorPreparado)atualizarOpcoesFiltro();}).observe(select,{childList:true});
}

if(document.readyState==='loading') window.addEventListener('DOMContentLoaded',iniciarMonitorPro);
else iniciarMonitorPro();
