// Software counter fixture ONLY. No graph, neurons, biology or learned policy.
import assert from 'node:assert/strict';
import { digest } from '../../../src/neural-learning/mushroom-body.mjs';
import { CONDITIONS } from '../../../src/puzzle-learning/plasticity-mechanism-assay.mjs';

export function createAdapters(config) {
  assert.ok(!('experiences' in config) && !('schedule' in config), 'Teacher truth leaked into factory');
  return Object.fromEntries(CONDITIONS.map(condition => {
    let value = 0, assessments = 0, readouts = 0, deliveries = 0;
    const fault = config.modelConfig ?? {};
    let fired = false;
    const snapshot = () => ({ physiological: { value }, neuralTransient: { assessments, readouts, deliveries },
      eligibility: [Math.min(1, assessments * 0.01)] });
    const stage = name => {
      if (fault.mutateStage === name) value++;
      if (!fired && condition === 'informative' && fault.interruptStage === name) {
        fired = true; throw Error('inert ' + name + ' interruption');
      }
    };
    const ranking = input => {
      const other = input.action === 'm0' ? 'm1' : 'm0';
      return { ...input, rows: [{ move: input.action, score: value }, { move: other, score: 0 }],
        choice: value > 0 ? input.action : value < 0 ? other : null,
        memoryHash: digest(snapshot().physiological), evaluations: 1, presentations: 0, inputDose: 0, simulationSteps: 0 };
    };
    return [condition, { identity: config.identity.algorithms.assayAdapter,
      snapshot, restore(state) { value = state.physiological.value; ({ assessments, readouts, deliveries } = state.neuralTransient); },
      async assess(input, options) { options.guard(); assessments++; stage('assess'); return ranking(input); },
      async readout(input, options) { options.guard(); readouts++; stage('readout'); return ranking(input); },
      async deliver(input, options) {
        options.guard();
        assert.ok(!('status' in input) && !('certificateSha256' in input) && !('expectedChannel' in input));
        deliveries++;
        if (options.plasticityEnabled && options.feedbackEnabled) value += assessments + readouts;
        stage('deliver');
        return { eligibility: snapshot().eligibility, signedLocalDrives: [{ compartment: 'inert', potentiation: 0, depression: 0 }],
          compartmentGains: [{ compartment: 'inert', gains: [1], saturation: [false] }],
          neuralConsequences: [{ compartment: 'inert', before: 0, after: 0 }], presentations: 1, inputDose: 0, simulationSteps: 0 };
      } }];
  }));
}
