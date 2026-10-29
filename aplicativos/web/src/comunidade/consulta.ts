import { useCallback, useEffect, useState } from 'react';
import { requisitar } from '../componentes/api';
export function useConsulta<T>(caminho: string, token: string | undefined, online: boolean, habilitado = true) {
  const [dados, definirDados] = useState<T | null>(null);
  const [erro, definirErro] = useState('');
  const [carregando, definirCarregando] = useState(false);
  const [versao, definirVersao] = useState(0);
  const atualizar = useCallback(() => definirVersao(v => v + 1), []);
  useEffect(() => {
    const controle = new AbortController();
    definirDados(null); definirErro('');
    if (!habilitado || !online || !token) { definirCarregando(false); return () => controle.abort(); }
    definirCarregando(true);
    void requisitar<T>(caminho, token, { signal: controle.signal }).then(resultado => {
      if (!controle.signal.aborted) definirDados(resultado);
    }).catch(e => {
      if (!controle.signal.aborted) definirErro(e instanceof Error ? e.message : 'Não foi possível consultar os dados.');
    }).finally(() => { if (!controle.signal.aborted) definirCarregando(false); });
    return () => controle.abort();
  }, [caminho, token, online, habilitado, versao]);
  return { dados, erro, carregando, atualizar };
}
