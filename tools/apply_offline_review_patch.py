from pathlib import Path

# Trigger da validação isolada desta correção offline.
p=Path('adm-justification-review.js')
s=p.read_text(encoding='utf-8')
old="import {getFirestore,collection,query,where,getDocs,doc,getDoc,runTransaction,deleteField} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';"
new="import {getFirestore,collection,query,where,getDocs,doc,getDoc,writeBatch,deleteField} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';"
if s.count(old)!=1: raise SystemExit('import esperado nao encontrado exatamente uma vez')
s=s.replace(old,new,1)
start=s.index('async function salvarRevisao(tipo,pct){')
end=s.index('\nwindow.abrirRevisaoJustificativa=abrir;',start)
novo=r'''function commitSemBloquearOffline(batch,operacaoId,msg){
  // O SDK completo do Firestore persiste writeBatch offline. O Promise só resolve
  // quando o servidor confirmar, por isso não bloqueamos a interface esperando-o.
  batch.commit().then(()=>{
    if(operacaoId!==ultimaOperacao)return;
    if(msg&&navigator.onLine!==false)msg.textContent=(msg.dataset.okOnline||msg.textContent);
  }).catch(e=>{
    console.error('Sincronizar revisão:',e);
    if(operacaoId!==ultimaOperacao)return;
    if(msg)msg.textContent='⚠️ A alteração ficou local, mas o servidor recusou a sincronização. Reconecte e tente novamente.';
  });
}

let ultimaOperacao=0;
async function salvarRevisao(tipo,pct){
  if(salvando||!contextoAtual?.tarefa||!contextoAtual?.historico)return;
  salvando=true;
  const operacaoId=++ultimaOperacao;
  const m=garantirModal(),msg=m.querySelector('#admReviewMsg'),buttons=[...m.querySelectorAll('#admReviewAcoes button')];
  buttons.forEach(b=>b.disabled=true);
  msg.textContent=tipo==='reverter'?'Registrando reversão…':'Registrando parecer…';
  try{
    const banco=db();if(!banco)throw new Error('Firebase ainda não está disponível.');
    const {tarefa:t,data,histDocs,execDocs}=contextoAtual;
    if(!histDocs.length)throw new Error('Histórico da ocorrência não encontrado.');

    // O estado local/cache é a referência imediata. Isso mantém a decisão única na
    // interface e permite reverter + escolher novamente sem depender de internet.
    const atual={...contextoAtual.historico};
    const o=originalDaOcorrencia(atual);
    const batch=writeBatch(banco);
    let atualizado;

    if(tipo==='reverter'){
      if(!decisaoTomada(atual))throw new Error('Esta ocorrência não possui uma decisão para reverter.');
      const patch={
        pontosGanhos:o.pontos,
        pontosOriginais:o.pontos,
        percentualOriginal:o.pct,
        revisaoStatus:'aguardando',
        percentualRevisado:deleteField(),
        pontosDevolvidos:deleteField(),
        revisaoDecisao:deleteField(),
        revisadoEm:deleteField()
      };
      histDocs.forEach(d=>batch.update(d.ref,patch));
      execDocs.forEach(d=>batch.update(d.ref,patch));
      if(data===hojeISO())batch.update(doc(banco,'tarefas',t.id),patch);

      atualizado={...atual,pontosGanhos:o.pontos,pontosOriginais:o.pontos,percentualOriginal:o.pct,revisaoStatus:'aguardando'};
      delete atualizado.percentualRevisado;delete atualizado.pontosDevolvidos;delete atualizado.revisaoDecisao;delete atualizado.revisadoEm;
      contextoAtual.historico=atualizado;
      msg.dataset.okOnline='Decisão revertida e sincronizada.';
      msg.textContent=navigator.onLine===false?'📴 Decisão revertida neste aparelho. Será sincronizada quando a internet voltar.':'Decisão revertida. O resultado automático foi restaurado; escolha uma nova opção se desejar.';
      m.querySelector('#admReviewOriginal').innerHTML=resumoResultado(atualizado,o);
      m.querySelector('#admReviewAcoes').innerHTML=montarAcoes(atualizado).html;
      commitSemBloquearOffline(batch,operacaoId,msg);
      return;
    }

    if(decisaoTomada(atual))throw new Error('Já existe uma decisão para esta ocorrência. Reverta a decisão atual antes de escolher outra.');
    const alvoPct=tipo==='manter'?o.pct:Math.max(o.pct,Number(pct)||0);
    const novosPts=tipo==='manter'?o.pontos:Math.max(o.pontos,pontosPara(o.max,alvoPct));
    const devolvidos=Math.max(0,novosPts-o.pontos);
    const agora=new Date().toISOString();
    const decisao=tipo==='manter'?'resultado-mantido':alvoPct>=100?'devolucao-total':`devolucao-${alvoPct}`;
    const patch={pontosGanhos:novosPts,pontosOriginais:o.pontos,percentualOriginal:o.pct,percentualRevisado:alvoPct,pontosDevolvidos:devolvidos,revisaoStatus:'revisado',revisaoDecisao:decisao,revisadoEm:agora};
    histDocs.forEach(d=>batch.update(d.ref,patch));
    execDocs.forEach(d=>batch.update(d.ref,patch));
    if(data===hojeISO())batch.update(doc(banco,'tarefas',t.id),patch);

    atualizado={...atual,...patch};
    contextoAtual.historico=atualizado;
    const textoOnline=tipo==='manter'?'Decisão salva: resultado automático mantido. Para mudar, reverta primeiro.':`Decisão salva: ${devolvidos} ponto(s) devolvido(s). Para mudar, reverta primeiro.`;
    msg.dataset.okOnline=textoOnline;
    msg.textContent=navigator.onLine===false?`📴 Parecer salvo neste aparelho${tipo==='manter'?'':` (${devolvidos} ponto(s) devolvido(s))`}. Será sincronizado quando a internet voltar.`:textoOnline;
    m.querySelector('#admReviewOriginal').innerHTML=resumoResultado(atualizado,o);
    m.querySelector('#admReviewAcoes').innerHTML=montarAcoes(atualizado).html;
    commitSemBloquearOffline(batch,operacaoId,msg);
  }catch(e){
    console.error('Salvar revisão:',e);
    msg.textContent=e.message||'Não foi possível registrar a revisão. Tente novamente.';
    buttons.forEach(b=>b.disabled=false);
  }finally{
    salvando=false;
  }
}
'''
s=s[:start]+novo+s[end:]
p.write_text(s,encoding='utf-8')

sw=Path('sw.js')
w=sw.read_text(encoding='utf-8')
if "const CACHE_NAME='rotina-family-adm-v25';" not in w: raise SystemExit('cache ADM v25 nao encontrado')
w=w.replace("const CACHE_NAME='rotina-family-adm-v25';","const CACHE_NAME='rotina-family-adm-v26';",1)
sw.write_text(w,encoding='utf-8')
