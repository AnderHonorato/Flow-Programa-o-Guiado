import { describe, expect, it } from 'vitest';
import { verificarSaida } from './saida';
describe('saída real estruturada', () => {
  it('compara arrays e tipos em vez de encontrar palavras soltas', () => {
    expect(verificarSaida(['Leitura Escrita 30'], '["Leitura","Escrita"]', 'json:nomes')).toBe(false);
    expect(verificarSaida(['{"nomes":["Leitura","Escrita"],"total":30}'], '["Leitura","Escrita"]', 'json:nomes')).toBe(true);
    expect(verificarSaida(['{"total":"30"}'], '30', 'json:total')).toBe(false);
    expect(verificarSaida(['{"total":30}'], '30', 'json:total')).toBe(true);
    expect(verificarSaida(['{"aceito":false}'], 'true', 'json:aceito')).toBe(false);
  });
  it('compara objetos sem depender da ordem das chaves e restringe caminhos', () => {
    expect(verificarSaida(['{"b":2,"a":1}'], '{"a":1,"b":2}', 'json:')).toBe(true);
    expect(verificarSaida(['{}'], '{}', 'json:__proto__')).toBe(false);
    expect(verificarSaida(['{}'], '{}', 'json:constructor')).toBe(false);
    expect(verificarSaida(['não é JSON'], '{}', 'json:')).toBe(false);
  });
});
