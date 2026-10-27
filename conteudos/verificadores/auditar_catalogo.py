"""Audita o inventário editorial e executa exemplos sem executar código de alunos.

Uso: python3 conteudos/verificadores/auditar_catalogo.py
Somente conteúdo autoral versionado é enviado aos subprocessos de verificação.
"""
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
DADOS = json.loads((RAIZ / 'conteudos/catalogo.json').read_text())
ERROS = []

def exigir(condicao, mensagem):
    if not condicao:
        ERROS.append(mensagem)

trilhas = DADOS.get('trilhas', [])
modulos = [m for t in trilhas for m in t['modulos']]
aulas = [a for m in modulos for a in m['aulas']]
ids_trilhas = {t['id'] for t in trilhas}
ids_aulas = {a['id'] for a in aulas}
exigir(DADOS.get('versao') == 1, 'Versão de catálogo desconhecida.')
exigir(len(trilhas) >= 10, 'Faltam trilhas para a meta estrutural de 10.')
exigir(len(modulos) >= 60, 'Faltam módulos para a meta estrutural de 60.')
exigir(len(ids_aulas) == len(aulas), 'IDs de aula repetidos.')
exigir(len(ids_trilhas) == len(trilhas), 'IDs de trilha repetidos.')
exigir(len({m['id'] for m in modulos}) == len(modulos), 'IDs de módulo repetidos.')
for t in trilhas:
    exigir(set(t['preRequisitos']) <= ids_trilhas, f'{t["id"]}: dependência de trilha ausente.')
for m in modulos:
    exigir(m['estado'] in {'publicado','em_producao'}, f'{m["id"]}: estado inválido.')
    exigir(bool(m['aulas']) == (m['estado'] == 'publicado'), f'{m["id"]}: publicação inconsistente.')
    exigir(m['planejamento']['aulasPrevistas'] >= len(m['aulas']), f'{m["id"]}: previsão menor que publicado.')

# Dependências cíclicas bloqueiam uma recomendação curricular coerente.
def verificar_ciclo(mapa, nome):
    visitados, pilha = set(), set()
    def visitar(id):
        if id in pilha:
            ERROS.append(f'{nome}: ciclo em {id}.'); return
        if id in visitados: return
        pilha.add(id)
        for pre in mapa.get(id, []): visitar(pre)
        pilha.remove(id); visitados.add(id)
    for id in mapa: visitar(id)
verificar_ciclo({t['id']:t['preRequisitos'] for t in trilhas}, 'Trilhas')
verificar_ciclo({a['id']:a['preRequisitos'] for a in aulas}, 'Aulas')

paragrafos, exemplos_js, exemplos_python = set(), 0, 0
for a in aulas:
    id = a['id']
    for campo in ['titulo','objetivo','desafio','variacao','resumo','competencia']:
        exigir(isinstance(a.get(campo), str) and len(a[campo]) >= 12, f'{id}: {campo} superficial ou ausente.')
    exigir(set(a['preRequisitos']) <= ids_aulas, f'{id}: pré-requisito de aula inexistente.')
    exigir(a['linguagem'] in {'html','css','javascript','dom','python','api'}, f'{id}: linguagem inválida.')
    exigir(len(a['blocos']) >= 4, f'{id}: menos de quatro blocos didáticos.')
    exigir(len(re.findall(r'\b\w+\b',' '.join(a['blocos']))) >= 150, f'{id}: texto didático menor que 150 palavras.')
    exigir(all(len(p) >= 80 for p in a['blocos']), f'{id}: bloco de texto muito curto.')
    for p in a['blocos']:
        exigir(p not in paragrafos, f'{id}: parágrafo didático duplicado.'); paragrafos.add(p)
    for campo in ['pontosDificeis','pistas','rubrica']:
        exigir(len(a[campo]) >= 2, f'{id}: {campo} incompleto.')
    exigir(len(a['exemplos']) >= 2, f'{id}: menos de dois exemplos.')
    exigir(len(a['questoes']) >= 2, f'{id}: menos de duas questões.')
    for e in a['exemplos']:
        exigir(len(e['codigo'].splitlines()) == len(e['explicacao']), f'{id}: explicação não cobre cada linha de {e["titulo"]}.')
        exigir(all(len(l) >= 28 for l in e['explicacao']), f'{id}: explicação de linha insuficiente.')
        exigir(e['codigo'].strip(), f'{id}: exemplo sem código.')
    for q in a['questoes']:
        exigir(len(q['alternativas']) >= 3, f'{q["id"]}: menos de três alternativas.')
        exigir(sum(o['correta'] is True for o in q['alternativas']) == 1, f'{q["id"]}: deve ter uma resposta correta.')
        exigir(all(len(o['feedback']) >= 35 for o in q['alternativas']), f'{q["id"]}: feedback por opção insuficiente.')
        exigir(len({o['feedback'] for o in q['alternativas']}) == len(q['alternativas']), f'{q["id"]}: feedback repetido.')
    exigir(all(campo in a['arquivos'] for campo in ['html','css','js']), f'{id}: arquivos incompletos.')
    exigir(bool(a['arquivos']['python'] if a['linguagem']=='python' else a['arquivos']['html']), f'{id}: laboratório sem código inicial.')
    if a['linguagem'] == 'python':
        # Executa todos os exemplos da aula em sequência, permitindo exemplos de continuação.
        codigo = '\n\n'.join(e['codigo'] for e in a['exemplos'])
        resultado = subprocess.run(['python3','-I','-c',codigo],capture_output=True,text=True,timeout=5)
        exigir(resultado.returncode == 0, f'{id}: exemplo Python falhou: {resultado.stderr}')
        exemplos_python += len(a['exemplos'])
    if a['linguagem'] in {'javascript','dom','api'}:
        exigir(shutil.which('node'), 'Node.js necessário para checagem JavaScript.')
        with tempfile.NamedTemporaryFile(suffix='.js', mode='w') as arquivo:
            arquivo.write('\n\n'.join(e['codigo'] for e in a['exemplos'])); arquivo.flush()
            resultado=subprocess.run(['node','--check',arquivo.name],capture_output=True,text=True,timeout=5)
            exigir(resultado.returncode == 0, f'{id}: sintaxe JavaScript falhou: {resultado.stderr}')
        exemplos_js += len(a['exemplos'])

questoes = sum(len(a['questoes']) for a in aulas)
atividades = questoes + len(aulas)*2  # Um desafio e uma variação autoral por aula.
inventario = {
 'versao':1,
 'criterio':'Exercício autoral = questão objetiva, desafio de laboratório ou variação com enunciado próprio. Exemplos, testes, pistas e módulos em produção não contam.',
 'metasMinimas':{'trilhas':10,'modulos':60,'aulas':180,'exercicios':450},
 'publicado':{'trilhasComAulas':sum(any(m['aulas'] for m in t['modulos']) for t in trilhas),'modulosComAulas':sum(bool(m['aulas']) for m in modulos),'aulas':len(aulas),'questoesObjetivas':questoes,'desafios':len(aulas),'variacoes':len(aulas),'exercicios':atividades,'exemplos':sum(len(a['exemplos']) for a in aulas),'testesObjetivos':sum(len(a.get('testes',[])) for a in aulas)},
 'emProducao':{'modulosSemAulas':sum(not m['aulas'] for m in modulos),'aulasParaMetaMinima':max(0,180-len(aulas)),'exerciciosParaMetaMinima':max(0,450-atividades)},
 'planejamento':{'aulas':sum(m['planejamento']['aulasPrevistas'] for m in modulos),'exercicios':sum(m['planejamento']['exerciciosPrevistos'] for m in modulos),'observacao':'Planejamento não é conteúdo publicado; quatro atividades por aula projetam 720, acima do mínimo editorial de 450.'},
 'porTrilha':[{'id':t['id'],'titulo':t['titulo'],'modulos':len(t['modulos']),'aulasPublicadas':sum(len(m['aulas']) for m in t['modulos']),'exerciciosPublicados':sum(len(a['questoes'])+2 for m in t['modulos'] for a in m['aulas'])} for t in trilhas],
 'aulas':[{'id':a['id'],'competencia':a['competencia'],'linguagem':a['linguagem'],'questoes':[q['id'] for q in a['questoes']],'desafio':f'{a["id"]}-desafio','variacao':f'{a["id"]}-variacao'} for a in aulas],
 'verificacao':{'integridadeEditorial':not ERROS,'exemplosPythonExecutados':exemplos_python,'exemplosJavaScriptSintaxe':exemplos_js,'erros':ERROS}
}
(RAIZ/'conteudos/inventario.json').write_text(json.dumps(inventario,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:inventario[k] for k in ['publicado','emProducao','verificacao']},ensure_ascii=False,indent=2))
raise SystemExit(1 if ERROS else 0)
