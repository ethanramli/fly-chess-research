import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

// A single outstanding UCI command; transcripts stream directly to disk.
export class StockfishOpponent {
  constructor(executable, { timeout = 30000, record = () => {}, args = [] } = {}) {
    this.timeout = timeout;
    this.record = record;
    this.options = new Map();
    this.child = spawn(executable, args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    this.child.stdin.on('error', error => this.fail(error));
    this.child.on('error', error => this.fail(error));
    this.child.on('exit', (code, signal) => this.fail(Error(`Stockfish exited (${code}, ${signal})`)));
    this.lines = createInterface({ input: this.child.stdout });
    this.lines.on('line', line => {
      if (line.length > 65536) return this.fail(Error('Oversized UCI line'));
      this.record('out', line);
      if (line.startsWith('id name ')) this.name = line.slice(8);
      const option = line.match(/^option name (.+?) type (\w+)(.*)$/);
      if (option) this.options.set(option[1], option[3]);
      if (this.pending?.match(line)) {
        const pending = this.pending; this.pending = null;
        clearTimeout(pending.timer); pending.resolve(line);
      }
    });
    this.child.stderr.on('data', chunk => this.record('stderr', chunk.toString().slice(0, 65536)));
  }
  fail(error) {
    this.error = error;
    if (this.pending) { clearTimeout(this.pending.timer); this.pending.reject(error); this.pending = null; }
    this.child.kill();
  }
  send(command) {
    if (this.error) throw this.error;
    this.record('in', command);
    this.child.stdin.write(command + '\n');
  }
  command(command, match) {
    if (this.pending) throw Error('Concurrent UCI commands are forbidden');
    if (this.error) return Promise.reject(this.error);
    return new Promise((resolve, reject) => {
      this.pending = { match, resolve, reject, timer: setTimeout(() => this.fail(Error(`UCI timeout: ${command}`)), this.timeout) };
      try { this.send(command); } catch (error) { this.fail(error); }
    });
  }
  async initialize() {
    await this.command('uci', line => line === 'uciok');
    const range = this.options.get('UCI_Elo')?.match(/min (\d+) max (\d+)/);
    if (!range || !this.options.has('UCI_LimitStrength')) throw Error('Engine does not advertise limited Elo strength');
    this.range = range.slice(1).map(Number);
    this.send('setoption name Threads value 1');
    this.send('setoption name Hash value 32');
    this.send('setoption name Ponder value false');
    this.send('setoption name UCI_LimitStrength value true');
    await this.command('isready', line => line === 'readyok');
  }
  async newGame(elo) {
    if (!Number.isInteger(elo) || elo < this.range[0] || elo > this.range[1]) throw Error(`Unsupported Stockfish Elo ${elo}; range ${this.range}`);
    this.send(`setoption name UCI_Elo value ${elo}`);
    this.send('ucinewgame');
    this.send('setoption name Clear Hash');
    await this.command('isready', line => line === 'readyok');
  }
  async move(moves, milliseconds) {
    this.send('position startpos' + (moves.length ? ' moves ' + moves.join(' ') : ''));
    const line = await this.command(`go movetime ${milliseconds}`, line => line.startsWith('bestmove '));
    const move = line.split(/\s+/)[1];
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) throw Error('Invalid engine bestmove');
    return { from: move.slice(0, 2), to: move.slice(2, 4), ...(move[4] ? { promotion: move[4] } : {}) };
  }
  close() { this.child.kill(); this.lines.close(); }
}
