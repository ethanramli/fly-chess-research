// Test/replay adapter: identify corresponding frame slots explicitly.
import {NeuralEpisode as Original} from '../../../../.codebase/src/neural-learning/neural-episode.mjs';
export class NeuralEpisode extends Original {
  present(...args) {
    this.model.reuseSlot = this.frames;
    try {return super.present(...args);} finally {this.model.reuseSlot = null;}
  }
}
