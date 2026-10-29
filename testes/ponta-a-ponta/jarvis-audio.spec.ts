import { test, expect, type Page } from '@playwright/test';

// A fronteira TTS é controlada: verifica integração visual/eventos, não audição física.
async function preparar(page: Page, brasileira = true) {
  await page.addInitScript(({ brasileira }) => {
    if (window !== window.top) return;
    localStorage.setItem('flow-nome', 'Interação QA'); localStorage.setItem('flow-pagina', 'aula'); localStorage.setItem('flow-aula', 'html-primeira-pagina');
    const falas: { lang: string; text: string; voice: { lang: string }; onstart?: () => void; onend?: () => void; onerror?: (e: { error: string }) => void; onresume?: () => void }[] = [];
    const vozes = [
      { voiceURI: 'fr', name: 'Français', lang: 'fr-FR', localService: true },
      { voiceURI: 'pt-pt', name: 'Portugal', lang: 'pt-PT', localService: true },
      { voiceURI: 'en', name: 'English local', lang: 'en-US', localService: true },
      ...(brasileira ? [{ voiceURI: 'pt-br', name: 'Brasil online', lang: 'pt-BR', localService: false }] : []),
    ];
    class Fala { text: string; lang = ''; voice = null; rate = 1; volume = 1; constructor(text: string) { this.text = text; } }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: Fala });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => vozes, addEventListener: () => {}, removeEventListener: () => {}, speak: (f: typeof falas[number]) => falas.push(f), cancel: () => {}, pause: () => {}, resume: () => falas.at(-1)?.onresume?.() } });
    Object.assign(window, { flowVozTeste: { falas, iniciar: () => falas.at(-1)?.onstart?.(), terminar: () => falas.at(-1)?.onend?.(), falhar: () => falas.at(-1)?.onerror?.({ error: 'synthesis-failed' }) } });
  }, { brasileira });
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Minha primeira página' })).toBeVisible();
}
async function eventoVoz(page: Page, evento: 'iniciar' | 'terminar' | 'falhar') { await page.evaluate(e => (window as unknown as { flowVozTeste: Record<string, () => void> }).flowVozTeste[e](), evento); }
async function falas(page: Page) { return page.evaluate(() => (window as unknown as { flowVozTeste: { falas: { lang: string; text: string }[] } }).flowVozTeste.falas.map(f => ({ lang: f.lang, text: f.text }))); }
async function abrirJarvis(page: Page) {
  const ativador = page.locator('.jarvis-ativador');
  if (!await page.getByRole('button', { name: 'Explorar termo', exact: true }).isVisible()) await ativador.click();
}

test('português brasileiro é padrão e os eventos reais coordenam fala, pausa e encerramento', async ({ page }) => {
  await preparar(page); const dock = page.getByRole('complementary', { name: 'Assistente J.A.R.V.I.S', exact: true });
  await expect(page.getByRole('combobox', { name: /Idioma da voz/ })).toContainText('Português Brasil');
  await page.getByRole('button', { name: 'Ouvir aula', exact: true }).click();
  expect((await falas(page))[0].lang).toBe('pt-BR');
  await expect(dock).toHaveAttribute('data-voz', 'preparando'); await expect(dock.locator('.jarvis-fala-status')).not.toContainText('Falando');
  await eventoVoz(page, 'iniciar'); await expect(dock).toHaveClass(/jarvis-dock--falando/); await expect(dock.locator('.jarvis-fala-status')).toContainText('Falando');
  await page.getByRole('button', { name: 'Pausar', exact: true }).click(); await expect(dock).toHaveAttribute('data-voz', 'pausada'); await expect(dock).not.toHaveClass(/jarvis-dock--falando/);
  await page.getByRole('button', { name: 'Retomar', exact: true }).click(); await expect(dock).toHaveAttribute('data-voz', 'falando');
  await page.getByRole('button', { name: 'Parar', exact: true }).click(); await expect(dock).toHaveAttribute('data-voz', 'parada'); await expect(dock.locator('.jarvis-fala-status')).toHaveCount(0);
  await eventoVoz(page, 'terminar'); await page.waitForTimeout(400); expect(await falas(page)).toHaveLength(1);
});

test('sem voz brasileira não troca idioma sozinho; inglês é uma escolha explícita no menu do app', async ({ page }) => {
  await preparar(page, false);
  await expect(page.getByRole('button', { name: 'Ouvir aula', exact: true })).toBeDisabled();
  await expect(page.locator('.narracao-disponibilidade')).toContainText('Nenhuma voz em português do Brasil');
  const idioma = page.getByRole('combobox', { name: /Idioma da voz/ }); await idioma.click();
  const lista = page.getByRole('listbox'); await expect(lista).toBeVisible();
  await page.getByRole('option', { name: 'Inglês · alternativa', exact: true }).click();
  await page.getByRole('button', { name: 'Ouvir aula', exact: true }).click(); expect((await falas(page))[0].lang).toBe('en-US');
  await expect(page.locator('.narracao-disponibilidade')).toContainText('não é traduzido');
  await eventoVoz(page, 'iniciar'); await eventoVoz(page, 'falhar');
  await expect(page.locator('.jarvis-dock')).toHaveAttribute('data-voz', 'erro');
  await expect(page.locator('.jarvis-dock')).not.toHaveClass(/jarvis-dock--falando/);
});

test('seleção editorial explica sem áudio automático; consulta e humor funcionam por toque e teclado', async ({ page }) => {
  await preparar(page);
  await page.evaluate(() => {
    const paragrafos = [...document.querySelectorAll('.narracao-paragrafos p')];
    const p = paragrafos.find(p => /HTML/.test(p.textContent!))!; const texto = p.firstChild!; const inicio = texto.textContent!.indexOf('HTML');
    const r = document.createRange(); r.setStart(texto, inicio); r.setEnd(texto, inicio + 4); const s = window.getSelection()!; s.removeAllRanges(); s.addRange(r); document.dispatchEvent(new Event('selectionchange'));
  });
  await expect(page.locator('.jarvis-termo')).toContainText('HTML'); await expect(page.locator('.jarvis-mensagem')).toContainText('estrutura'); expect(await falas(page)).toHaveLength(0);
  await page.getByRole('button', { name: 'Ouvir explicação', exact: true }).click(); expect(await falas(page)).toHaveLength(1); await eventoVoz(page, 'iniciar');
  await expect(page.locator('.jarvis-dock')).toHaveAttribute('data-voz', 'falando');
  await page.getByRole('button', { name: 'Parar leitura pelo J.A.R.V.I.S', exact: true }).click();
  await page.getByRole('button', { name: 'Explorar termo', exact: true }).click();
  await page.getByLabel('Qual termo vamos explorar?').fill('variável'); await page.getByLabel('Qual termo vamos explorar?').press('Enter');
  await expect(page.locator('.jarvis-termo')).toContainText('variável'); await expect(page.locator('.jarvis-mensagem')).toContainText('valor');
  await page.getByRole('button', { name: 'Uma piada', exact: true }).click(); await expect(page.locator('.jarvis-dock')).toHaveAttribute('data-estado', 'brincalhao');
  await page.getByRole('button', { name: 'Fingir braveza', exact: true }).click(); await expect(page.locator('.jarvis-dock')).toHaveAttribute('data-estado', 'bravo');
  await expect(page.locator('.jarvis-legenda')).toContainText('brincadeira');
  await page.keyboard.press('Escape'); await expect(page.locator('.jarvis-balao')).toHaveCount(0); await expect(page.locator('.jarvis-ativador')).toBeFocused();
});

test('reage à ação de estudar sem revelar resposta e menus próprios respeitam teclado e menos movimento', async ({ page }) => {
  await preparar(page); await page.emulateMedia({ reducedMotion: 'reduce' });
  const idioma = page.getByRole('combobox', { name: /Idioma da voz/ }); await idioma.focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('End'); await page.keyboard.press('Escape'); await expect(idioma).toContainText('Português Brasil'); await expect(idioma).toBeFocused();
  await page.getByRole('tab', { name: 'Fixar', exact: true }).click();
  await expect(page.locator('.jarvis-mensagem')).toContainText('Só vou corrigir'); await page.waitForTimeout(750);
  const q = page.locator('fieldset.questao').first(); await q.getByRole('button', { name: 'A h1', exact: true }).click();
  await expect(page.locator('.jarvis-mensagem')).toContainText('suspense'); for (const botao of await q.getByRole('button').all()) await expect(botao).toBeDisabled();
  await expect(q.locator('.correta,.incorreta')).toHaveCount(0);
  const animacao = await page.locator('.jarvis-holograma').evaluate(e => getComputedStyle(e).animationName); expect(animacao).toBe('none');
  await abrirJarvis(page); await page.getByRole('button', { name: 'Explorar termo', exact: true }).click(); await page.getByLabel('Qual termo vamos explorar?').fill('conceito inexistente'); await page.getByRole('button', { name: 'Explicar termo', exact: true }).click(); await expect(page.locator('.jarvis-mensagem')).toContainText('não tem uma definição');
});
