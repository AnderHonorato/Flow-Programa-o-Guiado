"""Ranking paginado e estatísticas limitadas aos campos exibidos pela comunidade."""
from sqlalchemy import func, select
from servidor.modelos import Leitura, Progresso, Usuario
from servidor.servicos.certificados import certificados_por_usuarios
from servidor.servicos.contas import filtro_ativos, estado_efetivo, iso

NIVEIS = [(0, 'Faísca'), (100, 'Explorador'), (280, 'Construtor'), (600, 'Inventor'),
          (1000, 'Arquiteto'), (1400, 'Especialista'), (1750, 'Visionário'), (2000, 'Luminar')]


def aulas_por_id(catalogo):
    return {a['id']: a for t in catalogo.get('trilhas', []) for m in t.get('modulos', []) for a in m.get('aulas', [])}


def ranking_sql():
    # `xp` é o valor canônico persistido pelo serviço de progresso, não o
    # número sugerido em uma consulta. Leitura e avaliações de satisfação não dão XP.
    xp = func.coalesce(Progresso.estado['xp'].as_integer(), 0)
    quantidade = func.coalesce(func.json_array_length(Progresso.estado['aulasConcluidas']), 0)
    return select(Usuario.id.label('usuario_id'), func.row_number().over(
        order_by=(xp.desc(), quantidade.desc(), Usuario.id.asc())
    ).label('posicao')).outerjoin(Progresso, Usuario.id == Progresso.usuario_id).where(filtro_ativos()).subquery()


def perfis_em_lote(db, usuarios, catalogo, posicoes=None, admin=False, detalhado=True):
    if not usuarios:
        return []
    ids = [u.id for u in usuarios]
    aulas = aulas_por_id(catalogo)
    progressos = {p.usuario_id: p.estado for p in db.scalars(select(Progresso).where(Progresso.usuario_id.in_(ids)))}
    leituras = db.execute(select(Leitura.usuario_id, Leitura.aula_id, func.count().label('leituras'),
        func.sum(Leitura.segundos).label('segundos')).where(Leitura.usuario_id.in_(ids))
        .group_by(Leitura.usuario_id, Leitura.aula_id)).all()
    por_leitor = {i: [] for i in ids}
    for l in leituras:
        por_leitor[l.usuario_id].append({'aulaId': l.aula_id, 'titulo': aulas.get(l.aula_id, {}).get('titulo', l.aula_id),
            'leituras': int(l.leituras), 'segundos': int(l.segundos)})
    certificados = certificados_por_usuarios(db, usuarios)
    saida = []
    for u in usuarios:
        e = progressos.get(u.id, {})
        xp = max(0, int(e.get('xp', 0)))
        nivel = max(i for i, n in enumerate(NIVEIS) if xp >= n[0])
        concluidas = list(dict.fromkeys(e.get('aulasConcluidas', [])))
        lidas = sorted(por_leitor[u.id], key=lambda x: (-x['leituras'], -x['segundos'], x['aulaId']))
        reconhecimentos = [{k: c[k] for k in ['codigo', 'titulo', 'aulaId', 'emitidoEm']} for c in certificados.get(u.id, [])]
        p = {'id': u.id, 'nome': u.nome, 'xp': xp, 'nivel': nivel + 1, 'nomeNivel': NIVEIS[nivel][1],
             'concluidas': len(concluidas), 'aulasConcluidas': [{'id': i, 'titulo': aulas.get(i, {}).get('titulo', i)} for i in concluidas],
             'leituras': sum(x['leituras'] for x in lidas), 'maisLidas': lidas[:10], 'certificados': reconhecimentos,
             'certificadosTotal': len(reconhecimentos),
             'posicao': (posicoes or {}).get(u.id, 0)}
        avatar = e.get('avatar')
        if isinstance(avatar, dict) and avatar.get('tipo') in ('desenho', 'emblema'):
            p['avatar'] = {k: avatar[k] for k in ['tipo', 'valor', 'atualizadoEm'] if k in avatar}
        if admin:
            p.update({'email': u.email, 'papel': u.papel, 'estado': estado_efetivo(u), 'motivo': u.motivo_estado,
                      'ate': iso(u.acesso_ate), 'criadoEm': iso(u.criado_em)})
        if not detalhado:
            # Lists keep the same contract while limiting expensive certificates
            # and lesson titles to the learner's first ten entries.
            p['aulasConcluidas'] = p['aulasConcluidas'][:10]
            p['certificados'] = p['certificados'][:10]
        saida.append(p)
    return saida
