import { fileURLToPath } from 'node:url';

// Synthetic transport fixture only. No graph, memory, learning or fly claim.
export async function createPlayer() {
  return { name: 'Synthetic mate-in-one fixture (not a fly)', files: [fileURLToPath(import.meta.url)],
    identity: () => ({ graph: 'none', model: 'synthetic', memory: 'none', encoder: 'none', readout: 'none', policy: 'fixed d8h4' }),
    reset: async () => {}, choose: async () => ({ from: 'd8', to: 'h4' }) };
}
