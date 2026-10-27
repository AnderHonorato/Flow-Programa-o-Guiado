// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { criarDocumento, limparHtml } from './sandbox';
describe('sandbox visual', () => {
  it('remove executores HTML, handlers e destinos de rede explícitos', () => {
    const html = limparHtml('<h1 onclick="fetch(1)">Olá</h1><script>alert(1)</script><iframe srcdoc="x"></iframe><object></object><img src="https://externo.test/a"><a href="javascript:alert(1)">link</a><form action="/api/apagar"><button formaction="/x">A</button></form>');
    const dom = new DOMParser().parseFromString(html, 'text/html');
    expect(dom.querySelector('script,iframe,object')).toBeNull(); expect(dom.querySelector('h1')?.hasAttribute('onclick')).toBe(false); expect(dom.querySelector('img')?.hasAttribute('src')).toBe(false); expect(dom.querySelector('a')?.hasAttribute('href')).toBe(false); expect(dom.querySelector('form')?.hasAttribute('action')).toBe(false);
  });
  it('preserva destinos de links para inspecionar a semântica sem carregar subrecursos', () => {
    const dom = new DOMParser().parseFromString(limparHtml('<a href="https://example.org/agenda">Agenda</a><a href="contato.html">Contato</a><img src="https://example.org/imagem">'), 'text/html');
    expect(dom.querySelector('a')?.getAttribute('href')).toBe('https://example.org/agenda');
    expect(dom.querySelectorAll('a')[1].getAttribute('href')).toBe('contato.html');
    expect(dom.querySelector('img')?.hasAttribute('src')).toBe(false);
  });
  it('escapa encerramento de script nos arquivos e mantém CSP sem eval ou rede', () => {
    const documento = criarDocumento({ html: '<h1>Olá</h1>', css: 'h1{color:red}', js: 'console.log("</script><script>parent.pwn=1</script>")' }, 'token');
    const dom = new DOMParser().parseFromString(documento, 'text/html');
    expect(dom.querySelectorAll('script')).toHaveLength(1);
    const csp = dom.querySelector('meta[http-equiv]')?.getAttribute('content'); expect(csp).toContain("connect-src 'none'"); expect(csp).toContain("default-src 'none'"); expect(csp).not.toContain('unsafe-eval'); expect(csp).toContain('nonce-'); expect(documento).not.toContain('<script>parent.pwn');
  });
  it('não injeta código usando encerramento de style', () => {
    const documento = criarDocumento({ html: '', css: '</style><script>alert(1)</script>', js: '' }, 'token');
    expect(new DOMParser().parseFromString(documento, 'text/html').querySelectorAll('script')).toHaveLength(1);
  });
});
