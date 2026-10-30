import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface VozNativa { id: string; nome: string; idioma: string; local: boolean }
export interface EventoNativo { id: string; erro?: string; cancelado?: boolean }
export interface NarradorNativoPlugin {
  vozes(): Promise<{ vozes: VozNativa[] }>;
  falar(opcoes: { texto: string; idioma?: string; voz?: string; velocidade?: number; volume?: number; id: string }): Promise<void>;
  parar(): Promise<void>;
  addListener(evento: 'inicio' | 'fim' | 'erro', callback: (evento: EventoNativo) => void): Promise<PluginListenerHandle>;
}
export const narradorNativo = registerPlugin<NarradorNativoPlugin>('NarradorNativo');
export const plataformaNativa = () => Capacitor.isNativePlatform();
