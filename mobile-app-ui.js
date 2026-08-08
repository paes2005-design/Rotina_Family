const escUI=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

import('./adm-enhancements.js').catch(e=>console.error('Aprimoramentos ADM:',e));

function iconeTarefa(nome=''){
  const n=String(nome).toLowerCase();
  const regras=[
    [/videogame|video game|jogar game|jogar jogo|game/, '🎮'],
    [/televis[aã]o|assistir tv|ver tv|tv/, '📺'],
    [/brincar|brincadeira|brinquedo/, '🧸'],
    [/celular|smartphone|telefone|mexer no celular|ficar no celular/, '📱'],
    [/computador|notebook|pc/, '💻'],
    [/cama|dormir|quarto/, '🛏️'],
    [/dente|escovar|higiene bucal/, '🪥'],
    [/banho|chuveiro/, '🚿'],
    [/leitura|ler|livro/, '📖'],
    [/mochila|material escolar/, '🎒'],
    [/estud|dever|lição|licao|prova|escola|ingl[eê]s/, '📚'],
    [/limp|varrer|arrumar|organizar|faxina/, '🧹'],
    [/louça|louca|prato|cozinha/, '🍽️'],
    [/roupa|uniforme|lavar roupa/, '👕'],
    [/lixo/, '🗑️'],
    [/pet|cachorro|gato|ração|racao/, '🐾'],
    [/rem[eé]dio|medica/, '💊'],
    [/exerc|treino|correr|caminhar|academia/, '🏃'],
    [/comer|almo|jantar|caf[eé]|lanche|aliment/, '🍴'],
    [/oração|oracao|rezar/, '🙏']
  ];
  return regras.find(([r])=>r.test(n))?.[1]||'✅';
}
window.iconeTarefaRotina=iconeTarefa;

function statusCard(txt=''){
  const t=txt.toLowerCase();
  if(t.includes('atrasado')) return ['late','Atrasado'];
  if(t.includes('75%')||t.includes('50%')||t.includes('parcial')) return ['partial',txt.trim()||'Parcial'];
  if(t.includes('prazo')) return ['ok',txt.trim()||'No prazo'];
  if(t.includes('andamento')) return ['progress','Em andamento'];
  return ['pending',txt.trim()||'Pendente'];
}

function dadosMonitor(){
  return [...document.querySelectorAll('#tbodyMonitor tr')].filter(r=>r.children.length>=6&&!r.classList.contains('monitor-hidden')).map(r=>{
    const c=r.children;
    const tarefa=c[1]?.querySelector('strong')?.textContent.trim()||c[1]?.textContent.trim()||'Tarefa';
    const horario=c[0]?.querySelector('strong')?.textContent.trim()||c[0]?.textContent.trim().split('|')[0]||'';
    const detalhes=[...c[0]?.querySelectorAll('div')||[]].map(x=>x.textContent.trim()).join(' ');
    return {horario,tarefa,usuario:c[2]?.textContent.trim()||'',dia:c[3]?.textContent.trim()||'',status:c[4]?.textContent.trim()||'Pendente',pontos:c[5]?.textContent.trim()||'',detalhes};
  });
}

function garantirCardsMonitor(){
  const monitor=document.getElementById('monitor'); if(!monitor)return null;
  let cards=document.getElementById('monitorNativeCards');
  if(cards)return cards;
  cards=document.createElement('div');cards.id='monitorNativeCards';cards.className='monitor-native-cards';
  const tabela=document.querySelector('#monitor .monitor-scroll-pro')||document.querySelector('#monitor .tabela-scroll');
  tabela?.insertAdjacentElement('afterend',cards);
  return cards;
}

function renderCardsMonitor(){
  const cards=garantirCardsMonitor(); if(!cards)return;
  const dados=dadosMonitor();
  if(!dados.length){cards.innerHTML='<div class="monitor-native-empty">Nenhuma tarefa para os filtros selecionados.</div>';return;}
  cards.innerHTML=dados.map(x=>{const [cls,label]=statusCard(x.status);return `<article class="mon-app-card"><div class="mon-app-time">${escUI(x.horario.replace(' às ','–'))}</div><div class="mon-app-main"><span class="task-icon-badge" aria-hidden="true">${iconeTarefa(x.tarefa)}</span><div class="mon-app-copy"><strong>${escUI(x.tarefa)}</strong><span>${escUI(x.usuario)}</span></div></div><div class="mon-app-side"><span class="mon-app-status ${cls}">${escUI(label)}</span><span class="mon-app-points">${escUI(x.pontos)}</span></div><div class="mon-app-meta"><span>${escUI(x.dia)}</span><span class="real-time">${escUI(x.detalhes)}</span></div></article>`}).join('');
}

function decorarGerenciar(){
  document.querySelectorAll('.ger-task-card').forEach(card=>{
    if(card.querySelector('.task-icon-badge'))return;
    const nome=card.querySelector('.ger-main strong')?.textContent||'';
    const icon=document.createElement('span');icon.className='task-icon-badge';icon.setAttribute('aria-hidden','true');icon.textContent=iconeTarefa(nome);
    card.querySelector('.ger-main')?.before(icon);
  });
}

const navItens=[
  {id:'cadastro',ico:'👤',label:'Cadastro'},
  {id:'monitor',ico:'📋',label:'Monitor'},
  {id:'gerenciar',ico:'🗂️',label:'Gerenciar'},
  {id:'dashboard',ico:'📊',label:'Dashboard'},
  {id:'recompensas',ico:'🎁',label:'Prêmios'}
];
function clicarAba(nome){
  const btn=[...document.querySelectorAll('.tab-nav .tab-btn')].find(b=>(b.textContent||'').trim().toLowerCase()===nome.toLowerCase());
  btn?.click();
}
function marcarNav(id){document.querySelectorAll('.mobile-bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===id));}
function montarBottomNav(){
  if(document.getElementById('mobileBottomNav'))return;
  const nav=document.createElement('nav');nav.id='mobileBottomNav';nav.className='mobile-bottom-nav';nav.setAttribute('aria-label','Navegação principal');
  nav.innerHTML=navItens.map(x=>`<button type="button" data-nav="${x.id}"><span class="nav-ico">${x.ico}</span><span class="nav-label">${x.label}</span></button>`).join('');
  document.body.appendChild(nav);
  nav.querySelectorAll('button').forEach(b=>b.onclick=()=>{
    const id=b.dataset.nav;
    if(id==='gerenciar'){
      clicarAba('Cadastro');
      marcarNav('gerenciar');
      setTimeout(()=>document.getElementById('gerenciarMobilePro')?.scrollIntoView({behavior:'smooth',block:'start'}),100);
      return;
    }
    clicarAba(id==='recompensas'?'Recompensas':id[0].toUpperCase()+id.slice(1));
    marcarNav(id);
    window.scrollTo({top:0,behavior:'smooth'});
  });
  marcarNav(document.querySelector('.tab-content.active')?.id||'cadastro');
  document.querySelectorAll('.tab-content').forEach(el=>new MutationObserver(()=>{if(el.classList.contains('active')&&!document.querySelector('.mobile-bottom-nav button[data-nav="gerenciar"].active'))marcarNav(el.id);}).observe(el,{attributes:true,attributeFilter:['class']}));
}

function iniciarUI(){
  montarBottomNav();renderCardsMonitor();decorarGerenciar();
  const tb=document.getElementById('tbodyMonitor');if(tb)new MutationObserver(()=>renderCardsMonitor()).observe(tb,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  const cad=document.getElementById('cadastro');if(cad)new MutationObserver(()=>decorarGerenciar()).observe(cad,{childList:true,subtree:true});
  window.addEventListener('resize',()=>{renderCardsMonitor();decorarGerenciar();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciarUI);else iniciarUI();
