from pathlib import Path
import re

p = Path('index-ADMIN-v8.html')
s = p.read_text(encoding='utf-8')

# 1) Gerenciamento mostra todos os dias por padrao.
needle = '''                        <select id="filtroExclusaoDia" onchange="renderizarTabelaExclusao()">\n                            <option value="Domingo">Domingo</option>'''
repl = '''                        <select id="filtroExclusaoDia" onchange="renderizarTabelaExclusao()">\n                            <option value="">Todos os dias</option>\n                            <option value="Domingo">Domingo</option>'''
assert needle in s, 'Filtro de dias nao encontrado'
s = s.replace(needle, repl, 1)

# 2) Reset ADM limpa todos os campos introduzidos pela regra 100/75/50/0.
needle = '''                            iniciouComAtraso: false,\n                            justificativaAtraso: "",\n                            tipoJustificativa: ""'''
repl = '''                            iniciouComAtraso: false,\n                            iniciouAposLimiteFinal: false,\n                            percentualAplicado: null,\n                            faixaAtraso: "",\n                            justificativaAtraso: "",\n                            tipoJustificativa: "",\n                            justificativaRecusada: false'''
assert needle in s, 'Bloco de reset nao encontrado'
s = s.replace(needle, repl, 1)

# 3) Excluir passa a remover o grupo recorrente inteiro. Remocao de um dia continua possivel pela edicao/desmarcacao.
pattern = re.compile(r'''    window\.excluirTarefa = async \(idTarefa\) => \{.*?\n    \};\n\n    window\.renderizarTabelaExclusao''', re.S)
match = pattern.search(s)
assert match, 'Funcao excluirTarefa nao encontrada'
new_delete = '''    window.excluirTarefa = async (idTarefa) => {\n        const alvo = tarefasCache.find(t => t.id === idTarefa);\n        if(!alvo) return alert('Tarefa não encontrada. Atualize a tela e tente novamente.');\n        const relacionadas = alvo.tarefaGrupoId\n            ? tarefasCache.filter(t => t.tarefaGrupoId === alvo.tarefaGrupoId)\n            : [alvo];\n        const dias = relacionadas.map(t => t.diaSemana).filter(Boolean).join(', ');\n        if(!confirm(`Excluir permanentemente a tarefa "${alvo.nome}" em todos os dias cadastrados${dias ? ` (${dias})` : ''}?\\n\\nPara remover apenas um dia, use Editar e desmarque esse dia.`)) return;\n        try {\n            const batch = writeBatch(db);\n            relacionadas.forEach(t => batch.delete(doc(db, 'tarefas', t.id)));\n            await batch.commit();\n            alert('Tarefa recorrente excluída com sucesso.');\n        } catch (error) {\n            alert('Erro ao excluir tarefa: ' + error.message);\n        }\n    };\n\n    window.renderizarTabelaExclusao'''
s = s[:match.start()] + new_delete + s[match.end():]

# 4) Helper unico e defensivo para conflito de horario.
marker = '''    window.salvarTarefa = async () => {'''
assert marker in s, 'salvarTarefa nao encontrada'
helper = '''    function horarioAgendaValido(valor) {\n        return /^\\d{2}:\\d{2}$/.test(String(valor || ''));\n    }\n\n    function encontrarConflitoHorario({ perfilId, responsavel, dia, horaInicio, horaFim, ignorarIds = new Set() }) {\n        return tarefasCache.find(t => {\n            if(!t || ignorarIds.has(t.id)) return false;\n            const mesmoIntegrante = t.perfilId ? t.perfilId === perfilId : t.perfilNome === responsavel;\n            if(!mesmoIntegrante || t.diaSemana !== dia) return false;\n            if(!horarioAgendaValido(t.horaSugeridaInicio) || !horarioAgendaValido(t.horaSugeridaFim)) return false;\n            if(t.horaSugeridaInicio >= t.horaSugeridaFim) return false;\n            return horaInicio < t.horaSugeridaFim && horaFim > t.horaSugeridaInicio;\n        });\n    }\n\n'''
s = s.replace(marker, helper + marker, 1)

edit_block = '''                let conflito = tarefasCache.find(t => {\n                    // Ignora as tarefas do próprio grupo que está sendo editado\n                    if(idsRelacionados.has(t.id)) return false;\n\n                    // Apenas valida para o mesmo integrante e mesmo dia da semana\n                    if((t.perfilId ? t.perfilId !== perfilIdSelecionado : t.perfilNome !== responsavel) || t.diaSemana !== dia) return false;\n\n                    // Trava de sobreposição de horários\n                    return (horaInicio < t.horaSugeridaFim && horaFim > t.horaSugeridaInicio);\n                });'''
edit_repl = '''                const conflito = encontrarConflitoHorario({\n                    perfilId: perfilIdSelecionado, responsavel, dia, horaInicio, horaFim, ignorarIds: idsRelacionados\n                });'''
assert edit_block in s, 'Validacao de conflito da edicao nao encontrada'
s = s.replace(edit_block, edit_repl, 1)

create_block = '''                let conflito = tarefasCache.find(t => {\n                    if((t.perfilId ? t.perfilId !== perfilIdSelecionado : t.perfilNome !== responsavel) || t.diaSemana !== dia) return false;\n                    return (horaInicio < t.horaSugeridaFim && horaFim > t.horaSugeridaInicio);\n                });'''
create_repl = '''                const conflito = encontrarConflitoHorario({\n                    perfilId: perfilIdSelecionado, responsavel, dia, horaInicio, horaFim\n                });'''
assert create_block in s, 'Validacao de conflito da criacao nao encontrada'
s = s.replace(create_block, create_repl, 1)

# 5) Status novo "Atrasado (0%)" deve continuar mostrando justificativas no monitor.
s = s.replace('statusTexto === "Atrasado" && t.justificativaAtraso', 'statusTexto.includes("Atrasado") && t.justificativaAtraso')
s = s.replace('statusTexto === "Atrasado" && t.justificativaRecusada === true', 'statusTexto.includes("Atrasado") && t.justificativaRecusada === true')
s = s.replace("statusTexto === \"Atrasado\" && t.tipoJustificativa === 'voz-transcrita'", "statusTexto.includes(\"Atrasado\") && t.tipoJustificativa === 'voz-transcrita'")

p.write_text(s, encoding='utf-8')

# Dashboard profissional: tornar obtencao do Firestore resiliente a ordem de execucao e corrigir periodo da tabela detalhada.
dp = Path('dashboard-ranking-pro.js')
d = dp.read_text(encoding='utf-8')
old = '''const app = getApps().length ? getApp() : null;\nconst db = app ? getFirestore(app) : null;'''
new = '''const obterDb = () => getApps().length ? getFirestore(getApp()) : null;'''
assert old in d, 'Inicializacao do dashboard nao encontrada'
d = d.replace(old, new, 1)
old = '''  montarDashboard(); if(!db) return;\n  const grupoId='''
new = '''  montarDashboard(); const db=obterDb(); if(!db) return;\n  const grupoId='''
assert old in d, 'Render do dashboard nao encontrado'
d = d.replace(old, new, 1)

old_map = '''    const vis=perfis.filter(p=>!sel.value||p.id===sel.value).map(p=>{const h=historico.filter(x=>x.perfilId===p.id||(!x.perfilId&&x.perfilNome===p.nome)),soma=(a,b)=>h.filter(x=>x.data>=a&&x.data<=b).reduce((q,x)=>q+(Number(x.pontosGanhos)||0),0),hs=h.filter(x=>x.data>=iniS&&x.data<=fimS);return{id:p.id,nome:p.nome,hist:h,diario:soma(dia,dia),semanal:soma(iniS,fimS),mensal:soma(iniM,fimM),concluidas:hs.length,prazo:hs.filter(x=>x.status?.includes('Prazo')).length,seq:sequencia(h)}});\n    const campo=periodoAtual,ord=[...vis].sort((a,b)=>b[campo]-a[campo]),a=campo==='diario'?dia:campo==='mensal'?iniM:iniS,b=campo==='diario'?dia:campo==='mensal'?fimM:fimS,hp=historico.filter(x=>x.data>=a&&x.data<=b&&(!sel.value||x.perfilId===sel.value)),pts=ord.reduce((q,x)=>q+x[campo],0),concl=hp.length,prazo=hp.filter(x=>x.status?.includes('Prazo')).length,taxa=concl?Math.round(prazo/concl*100):0,lead=ord[0];'''
new_map = '''    const campo=periodoAtual;\n    const periodoIni=campo==='diario'?dia:campo==='mensal'?iniM:iniS, periodoFim=campo==='diario'?dia:campo==='mensal'?fimM:fimS;\n    const vis=perfis.filter(p=>!sel.value||p.id===sel.value).map(p=>{\n      const h=historico.filter(x=>x.perfilId===p.id||(!x.perfilId&&x.perfilNome===p.nome));\n      const soma=(a,b)=>h.filter(x=>x.data>=a&&x.data<=b).reduce((q,x)=>q+(Number(x.pontosGanhos)||0),0);\n      const hpPerfil=h.filter(x=>x.data>=periodoIni&&x.data<=periodoFim);\n      return{id:p.id,nome:p.nome,hist:h,diario:soma(dia,dia),semanal:soma(iniS,fimS),mensal:soma(iniM,fimM),concluidas:hpPerfil.length,prazo:hpPerfil.filter(x=>x.status?.includes('Prazo')).length,seq:sequencia(h)};\n    });\n    const ord=[...vis].sort((a,b)=>b[campo]-a[campo]);\n    const perfilSelecionado=perfis.find(p=>p.id===sel.value);\n    const hp=historico.filter(x=>x.data>=periodoIni&&x.data<=periodoFim&&(!sel.value||x.perfilId===sel.value||(!x.perfilId&&x.perfilNome===perfilSelecionado?.nome)));\n    const pts=ord.reduce((q,x)=>q+x[campo],0),concl=hp.length,prazo=hp.filter(x=>x.status?.includes('Prazo')).length,taxa=concl?Math.round(prazo/concl*100):0,lead=ord[0];'''
assert old_map in d, 'Calculo de periodo do dashboard nao encontrado'
d = d.replace(old_map, new_map, 1)

dp.write_text(d, encoding='utf-8')

print('AUDIT_REPAIR_OK')
