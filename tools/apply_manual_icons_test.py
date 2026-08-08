from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 occurrence, found {count}')
    return text.replace(old, new, 1)


def replace_count(text, old, new, expected, label):
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'{label}: expected {expected} occurrences, found {count}')
    return text.replace(old, new)

html_path = Path('index-ADMIN-v8.html')
html = html_path.read_text(encoding='utf-8')

style_old = """        .form-group {
            margin-bottom: 18px;
        }
"""
style_new = style_old + """
        .task-icon-name-field {
            display: grid;
            grid-template-columns: 150px minmax(0, 1fr);
            gap: 10px;
            align-items: center;
        }
        .task-icon-select {
            font-size: 16px;
            font-weight: 700;
        }
        .task-icon-cell {
            display: inline-block;
            min-width: 1.5em;
            margin-right: 4px;
            font-size: 1.15em;
            line-height: 1;
            vertical-align: -0.08em;
        }
        @media (max-width: 520px) {
            .task-icon-name-field { grid-template-columns: 116px minmax(0, 1fr); }
            .task-icon-select { padding-left: 8px; padding-right: 6px; }
        }
"""
html = replace_once(html, style_old, style_new, 'icon form styles')

form_old = """                <div class=\"form-group\">
                    <label for=\"nomeTarefa\">Nome da Meta / Tarefa:</label>
                    <input type=\"text\" id=\"nomeTarefa\">
                </div>
"""
form_new = """                <div class=\"form-group\">
                    <label for=\"nomeTarefa\">Ícone e Nome da Meta / Tarefa:</label>
                    <div class=\"task-icon-name-field\">
                        <select id=\"iconeTarefa\" class=\"task-icon-select\" aria-label=\"Escolher ícone da tarefa\">
                            <option value=\"✅\">✅ Geral</option>
                            <option value=\"🎮\">🎮 Videogame</option>
                            <option value=\"📺\">📺 TV</option>
                            <option value=\"🧸\">🧸 Brincar</option>
                            <option value=\"📱\">📱 Celular</option>
                            <option value=\"💻\">💻 Computador</option>
                            <option value=\"🛏️\">🛏️ Cama / Dormir</option>
                            <option value=\"🪥\">🪥 Dentes</option>
                            <option value=\"🚿\">🚿 Banho</option>
                            <option value=\"📖\">📖 Leitura</option>
                            <option value=\"🎒\">🎒 Mochila</option>
                            <option value=\"📚\">📚 Estudo</option>
                            <option value=\"🧹\">🧹 Limpeza</option>
                            <option value=\"🍽️\">🍽️ Louça</option>
                            <option value=\"👕\">👕 Roupas</option>
                            <option value=\"🗑️\">🗑️ Lixo</option>
                            <option value=\"🐾\">🐾 Pet</option>
                            <option value=\"💊\">💊 Remédio</option>
                            <option value=\"🏃\">🏃 Exercício</option>
                            <option value=\"🍴\">🍴 Alimentação</option>
                            <option value=\"🙏\">🙏 Oração</option>
                            <option value=\"🎵\">🎵 Música</option>
                            <option value=\"🚗\">🚗 Transporte</option>
                            <option value=\"🛒\">🛒 Compras</option>
                        </select>
                        <input type=\"text\" id=\"nomeTarefa\" placeholder=\"Digite o nome que quiser\">
                    </div>
                    <small style=\"color:#777\">O nome é livre. O ícone é escolhido separadamente e não depende do texto.</small>
                </div>
"""
html = replace_once(html, form_old, form_new, 'task icon selector')

helper_anchor = """    window.salvarTarefa = async () => {
"""
helper_code = """    const ICONES_TAREFA_PERMITIDOS = new Set(['✅','🎮','📺','🧸','📱','💻','🛏️','🪥','🚿','📖','🎒','📚','🧹','🍽️','👕','🗑️','🐾','💊','🏃','🍴','🙏','🎵','🚗','🛒']);
    function iconeTarefaLegado(nome='') {
        const n=String(nome).toLowerCase();
        const regras=[
            [/videogame|video game|jogar game|jogar jogo|game/,'🎮'],[/televis[aã]o|assistir tv|ver tv|tv/,'📺'],[/brincar|brincadeira|brinquedo/,'🧸'],[/celular|smartphone|telefone/,'📱'],[/computador|notebook|pc/,'💻'],[/cama|dormir|quarto/,'🛏️'],[/dente|escovar|higiene bucal/,'🪥'],[/banho|chuveiro/,'🚿'],[/leitura|ler|livro/,'📖'],[/mochila|material escolar/,'🎒'],[/estud|dever|lição|licao|prova|escola/,'📚'],[/limp|varrer|arrumar|organizar|faxina/,'🧹'],[/louça|louca|prato|cozinha/,'🍽️'],[/roupa|uniforme|lavar roupa/,'👕'],[/lixo/,'🗑️'],[/pet|cachorro|gato|ração|racao/,'🐾'],[/rem[eé]dio|medica/,'💊'],[/exerc|treino|correr|caminhar|academia/,'🏃'],[/comer|almo|jantar|caf[eé]|lanche|aliment/,'🍴'],[/oração|oracao|rezar/,'🙏']
        ];
        return regras.find(([r])=>r.test(n))?.[1]||'✅';
    }
    function normalizarIconeTarefa(icone,nome='') {
        const valor=String(icone||'').trim();
        return ICONES_TAREFA_PERMITIDOS.has(valor) ? valor : iconeTarefaLegado(nome);
    }

""" + helper_anchor
html = replace_once(html, helper_anchor, helper_code, 'manual icon helpers')

read_old = """        const nomeTarefa = document.getElementById('nomeTarefa').value.trim();
        const horaInicio = document.getElementById('horarioInicioSugerido').value;
"""
read_new = """        const nomeTarefa = document.getElementById('nomeTarefa').value.trim();
        const iconeTarefaSelecionado = normalizarIconeTarefa(document.getElementById('iconeTarefa').value, nomeTarefa);
        const horaInicio = document.getElementById('horarioInicioSugerido').value;
"""
html = replace_once(html, read_old, read_new, 'read selected icon')

payload_old = """                            nome: nomeTarefa,
                            perfilNome: responsavel,
"""
payload_new = """                            nome: nomeTarefa,
                            icone: iconeTarefaSelecionado,
                            perfilNome: responsavel,
"""
html = replace_count(html, payload_old, payload_new, 2, 'edit payload icons')

create_payload_old = """                    nome: nomeTarefa,
                    perfilNome: responsavel,
"""
create_payload_new = """                    nome: nomeTarefa,
                    icone: iconeTarefaSelecionado,
                    perfilNome: responsavel,
"""
html = replace_once(html, create_payload_old, create_payload_new, 'new task payload icon')

edit_old = """        document.getElementById('nomeTarefa').value = t.nome;
        document.getElementById('horarioInicioSugerido').value = t.horaSugeridaInicio;
"""
edit_new = """        document.getElementById('nomeTarefa').value = t.nome;
        document.getElementById('iconeTarefa').value = normalizarIconeTarefa(t.icone, t.nome);
        document.getElementById('horarioInicioSugerido').value = t.horaSugeridaInicio;
"""
html = replace_once(html, edit_old, edit_new, 'load icon on edit')

cancel_old = """        document.getElementById('editTarefaId').value = '';
        document.getElementById('nomeTarefa').value = '';
        document.getElementById('horarioInicioSugerido').value = '08:00';
"""
cancel_new = """        document.getElementById('editTarefaId').value = '';
        document.getElementById('nomeTarefa').value = '';
        document.getElementById('iconeTarefa').value = '✅';
        document.getElementById('horarioInicioSugerido').value = '08:00';
"""
html = replace_once(html, cancel_old, cancel_new, 'reset icon on cancel')

new_reset_old = """            alert('Meta cadastrada com sucesso!');
            document.getElementById('nomeTarefa').value = '';
            document.querySelectorAll('.dia-semana-check').forEach(cb => cb.checked = false);
"""
new_reset_new = """            alert('Meta cadastrada com sucesso!');
            document.getElementById('nomeTarefa').value = '';
            document.getElementById('iconeTarefa').value = '✅';
            document.querySelectorAll('.dia-semana-check').forEach(cb => cb.checked = false);
"""
html = replace_once(html, new_reset_old, new_reset_new, 'reset icon after create')

cell_old = """                    <td><strong>${escaparHtml(t.nome)}</strong></td>
"""
cell_new = """                    <td><span class=\"task-icon-cell\" aria-hidden=\"true\">${escaparHtml(normalizarIconeTarefa(t.icone,t.nome))}</span><strong>${escaparHtml(t.nome)}</strong></td>
"""
html = replace_count(html, cell_old, cell_new, 2, 'task icon cells')

html_path.write_text(html, encoding='utf-8')

mobile_path = Path('mobile-app-ui.js')
mobile = mobile_path.read_text(encoding='utf-8')
old = """      const tarefa=c[1]?.querySelector('strong')?.textContent.trim()||c[1]?.textContent.trim()||'Tarefa';
      const horario=c[0]?.querySelector('strong')?.textContent.trim()||c[0]?.textContent.trim().split('|')[0]||'';
"""
new = """      const tarefa=c[1]?.querySelector('strong')?.textContent.trim()||c[1]?.textContent.trim()||'Tarefa';
      const icone=c[1]?.querySelector('.task-icon-cell')?.textContent.trim()||'';
      const horario=c[0]?.querySelector('strong')?.textContent.trim()||c[0]?.textContent.trim().split('|')[0]||'';
"""
mobile = replace_once(mobile, old, new, 'monitor reads explicit icon')
old = """      return{horario,tarefa,usuario:c[2]?.textContent.trim()||'',dia:c[3]?.textContent.trim()||'',status:c[4]?.textContent.trim()||'Pendente',pontos:c[5]?.textContent.trim()||'',detalhes,justificativa,data};
"""
new = """      return{horario,tarefa,icone,usuario:c[2]?.textContent.trim()||'',dia:c[3]?.textContent.trim()||'',status:c[4]?.textContent.trim()||'Pendente',pontos:c[5]?.textContent.trim()||'',detalhes,justificativa,data};
"""
mobile = replace_once(mobile, old, new, 'monitor carries explicit icon')
old = """<span class=\"task-icon-badge\" aria-hidden=\"true\">${iconeTarefa(x.tarefa)}</span>"""
new = """<span class=\"task-icon-badge\" aria-hidden=\"true\">${escUI(x.icone||iconeTarefa(x.tarefa))}</span>"""
mobile = replace_once(mobile, old, new, 'monitor displays explicit icon')
mobile_path.write_text(mobile, encoding='utf-8')

manage_path = Path('manage-pro.js')
manage = manage_path.read_text(encoding='utf-8')
old = """    const horario=row.children[0]?.textContent.trim()||'';
    const tarefa=row.children[1]?.textContent.trim()||'';
    const usuario=row.children[2]?.textContent.trim()||'';
    return {row,horario,tarefa,usuario,id:pegarId(editar,'preencherEdicaoTarefa')||pegarId(excluir,'excluirTarefa')};
"""
new = """    const horario=row.children[0]?.textContent.trim()||'';
    const celTarefa=row.children[1];
    const tarefa=celTarefa?.querySelector('strong')?.textContent.trim()||celTarefa?.textContent.trim()||'';
    const icone=celTarefa?.querySelector('.task-icon-cell')?.textContent.trim()||'✅';
    const usuario=row.children[2]?.textContent.trim()||'';
    return {row,horario,tarefa,icone,usuario,id:pegarId(editar,'preencherEdicaoTarefa')||pegarId(excluir,'excluirTarefa')};
"""
manage = replace_once(manage, old, new, 'manage reads explicit icon')
old = """      <div class=\"ger-time\">${escG(x.horario.replace(' às ','–'))}</div>
      <div class=\"ger-main\">
"""
new = """      <div class=\"ger-time\">${escG(x.horario.replace(' às ','–'))}</div>
      <span class=\"task-icon-badge\" aria-hidden=\"true\">${escG(x.icone||'✅')}</span>
      <div class=\"ger-main\">
"""
manage = replace_once(manage, old, new, 'manage displays explicit icon')
manage_path.write_text(manage, encoding='utf-8')

print('ADM manual icon test patch applied successfully')
