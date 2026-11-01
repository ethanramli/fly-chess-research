Accessed 2026-10-30 via connected Exa; extraction capped per page. Excerpts and omissions are not full-figure coverage.

Title: A Drosophila Whole-Connectome Network Can Learn Human-Designed Cognitive Tasks
URL: https://arxiv.org/html/2610.10014
Published: N/A
Author: N/A
Highlights:
A Drosophila Whole-Connectome Network Can Learn Human-Designed Cognitive Tasks

# A Drosophila Whole-Connectome Network Can Learn Human-Designed Cognitive Tasks

Joonghui Cho Minchan Kang Daeshik Kim ∗ 

Korea Advanced Institute of Science and Technology (KAIST)

paul26@kaist.ac.kr mc.kang@kaist.ac.kr daeshik@kaist.ac.kr

 ∗ Corresponding author.

###### Abstract

Can a biological wiring diagram serve as a useful computational substrate beyond the behaviors for which it evolved? We use the publicly released MaleCNS v1.0 connectome, reconstructed from a single adult male Drosophila specimen, as the fixed recurrent topology of an artificial network. We train separate models for bounded addition and for a controlled grounded relational language task built from a fixed 100-word lexicon. In both models, one scalar is learned per anatomical edge. The anatomical graph reaches $92.77\%$ mean accuracy on held-out addition, compared with $67.93\%$ for directed degree-preserving rewires. On the strict paired language endpoint, which matches original and order-reversed scenes to their corresponding descriptions, it reaches $61.59\%$ across four fixed interfaces, compared with $44.17\%$ for matched rewires. At the canonical interface, it ranks first in a fixed 21-graph comparison. On the matched 48-group intervention subset, shuffling task-defined sensory features reduces its score from $60.94\%$ to $19.27\%$. Together, these results show that higher-order MaleCNS wiring provides a reusable inductive bias for bounded addition and grounded relational language.

...

Most connectome-constrained models have pursued biological prediction in visual and sensorimotor systems, causal-effect estimation, or whole-brain activity fitting (Lappalainen et al., 2024; Shiu et al., 2024; Pospisil et al., 2024; Wang et al., 2026). Work on artificial tasks is smaller and has adapted fly wiring to image classification, chess, simulated locomotion, and robot navigation (Yu et al., 2026; Jin et al., 2026; Wang and Chen, 2026). Evidence about the topology itself is mixed. Random structures performed similarly to biological ones in one comparison, and another study found that shared initialization and degree-preserving nulls removed much of an apparent advantage (Pircher et al., 2021; Dhiman, 2026). Task performance by itself does not show whether the biological arrangement of edges matters.

...

Artificial-task studies use a complete larval connectome as a reservoir for image classification and chess (Yu et al., 2026), an adult-brain connectome as a learned controller for simulated fly locomotion (Jin et al., 2026), and a fly-brain-derived recurrent network for robot navigation (Wang and Chen, 2026). FlyGM also compares its locomotion controller with a degree-preserving rewire. The present experiments move away from embodied behavior to two symbolic mappings and ask whether their performance survives changes in token-input and output placement and graph draw.

---

Title: Ishaank/fruitflychess-connectome · Hugging Face
URL: https://huggingface.co/Ishaank/fruitflychess-connectome
Published: N/A
Author: N/A
Highlights:
# Fruit Fly Chess Connectome 

A chess policy/value network constrained by the wiring topology of the complete Drosophila larval connectome (Winding et al., Science, 2023).

...

## Architecture 

- 2,952 neurons and 110,677 fixed connectome edges
- 2,820,249 learned parameters
- 256 sensory neurons and 256 motor neurons
- 8 recurrent steps
- 4,672 move-policy outputs and 3 win/draw/loss outputs
- greedy legal-move selection; no search

## Measured strength 

| Checkpoint | Stockfish-anchored Elo | Games |
| --- | --- | --- |
| 400K | 1,235 | 160 |
| 500K | 1,288 | 160 |

Ratings combine games against Stockfish 18 limited to 1320, 1600, 1800, and 2000 Elo. Each checkpoint plays 40 games per anchor with colors balanced, 50 ms move time, a 4,000-node cap, and no neural search. These ratings are protocol-specific estimates, not FIDE or Chess.com ratings.

---

Title: Biological Processing Units: Leveraging an Insect Connectome to Pioneer Biofidelic Neural Architectures
URL: https://arxiv.org/html/2507.10951v1
Published: 2025-07-15T00:00:00.000Z
Author: N/A
Highlights:
# Biological Processing Units: Leveraging an Insect Connectome to Pioneer Biofidelic Neural Architectures

 Siyu Yu Affiliation: Johns Hopkins University, Baltimore MD 21218, USA Affiliation: Pomegranate Intelligence, Baltimore MD 21218, USA Zihan Qin Affiliation: Johns Hopkins University, Baltimore MD 21218, USA [-1ex] Tingshan Liu Affiliation: Johns Hopkins University, Baltimore MD 21218, USA Beiya Xu Affiliation: Johns Hopkins University, Baltimore MD 21218, USA [0.15ex] R. Jacob Vogelstein Affiliation: Catalio Capital Management, New York NY 10010, USA E-mail {syu80, zqin16, tliu68, bxu41, jovo}@jhu.edu (%7Bsyu80,%20zqin16,%20tliu68,%20bxu41,%20jovo%7D@jhu.edu) Jason Brown Affiliation: Pomegranate Intelligence, Baltimore MD 21218, USA [0.15ex] Joshua T. Vogelstein E-mail jason@pomintel.com E-mail rjv@cataliocapital.com Affiliation: Johns Hopkins University, Baltimore MD 21218, USA Affiliation: Pomegranate Intelligence, Baltimore MD 21218, USA 

###### Abstract

The complete connectome of the Drosophila larva brain offers a unique opportunity to investigate whether biologically evolved circuits can support artificial intelligence. We convert this wiring diagram into a Biological Processing Unit (BPU)—a fixed recurrent network derived directly from synaptic connectivity. Despite its modest size (3,000 neurons and 65,000 weights between them), the unmodified BPU achieves 98% accuracy on MNIST and 58% on CIFAR-10, surpassing size-matched MLPs. Scaling the BPU via structured connectome expansions further improves CIFAR-10 performance, while modality-specific ablations reveal the uneven contributions of different sensory subsystems. On the ChessBench dataset, a lightweight GNN-BPU model trained on only 10,000 games achieves 60% move accuracy, nearly 10x better than any size transformer. Moreover, CNN-BPU models with $\sim$ 2M parameters outperform parameter-matched Transformers, and with a depth-6 minimax search at inference, reach 91.7% accuracy, exceeding even a 9M-parameter Transformer baseline. These results demonstrate the potential of biofidelic neural architectures to support complex cognitive tasks and motivate scaling to larger and more intelligent connectomes in future work.

...

Here we directly leverage the complete Drosophila larval connectome to develop Biological Processing Units (BPUs). We evaluate BPU on two categories of tasks: sensory processing (MNIST, CIFAR-10) [4] and decision-making (chess puzzles) [8]. These tasks are chosen to reflect fundamental cognitive functions—perception, memory, and planning—that are intrinsic to both artificial and biological agents. By including peripheral sensors alongside the central BPU circuit, we test whether the BPU can support generalized cognition under realistic biological constraints. Finally, to understand how far this advantage can scale, we introduce a directed, signed degree–corrected Stochastic Block Model (DCSBM) that lets us expand the larval connectome up to 5× while faithfully preserving its block-level wiring statistics and synaptic polarity.

...

### 2.4 BPU for Chess Puzzle Solving

For the chess task, we evaluate the BPU using puzzle accuracy, the percentage of puzzles where the predicted move sequence exactly matches the full ground-truth solution. Each puzzle is drawn from a curated Lichess dataset [12], annotated with Elo difficulty ratings ranging from 399 to 2867 and complete solution sequences.

We use the ChessBench dataset [4], which provides $10\times 10^{6}$ board positions sourced from Lichess.org games. Each state is encoded using the Forsyth-Edwards Notation (FEN) [13], and annotated using Stockfish 16 under 50 ms per board constraints. The state value labels reflect the estimated win probabilities between 0% and 100%. To convert FEN strings into fixed-size neural inputs for the BPU, we implement two encoding pipelines:

...

Despite having only 232, 912 trainable parameters, the GNN–BPU converges even with small dataset size and achieves competitive or superior accuracy

...

We evaluated our GNN–BPU model, which contains only 232,912 trainable parameters, on the ChessBench dataset [8] under multiple training budgets. As illustrated in Figure 4, the model attains accuracies of 59%, 61%, and 63% when trained on $10^{4}$, $10^{5}$, and $10^{6}$ games, respectively. Remarkably, the GNN–BPU performs strongly with even smaller datasets. It also consistently surpasses the smallest reference model from Ruoss et al. [8], despite that baseline still having more parameters—and remains competitive with substantially larger models. These results underscore the effectiveness of our biologically inspired reservoir architecture for data-efficient strategic reasoning.

---

Title: Biological Processing Units: Leveraging an Insect Connectome to Pioneer Biofidelic Neural Architectures
URL: https://doi.org/10.48550/arxiv.2507.10951
Published: 2025-07-15T00:00:00.000Z
Author: Shuo Yu, Qin, Zihan, Tingshan Liu, B. Xu, R. Jacob Vogelstein, Jason I. Brown, et al.
Highlights:
# Biological Processing Units: Leveraging an Insect Connectome to Pioneer Biofidelic Neural Architectures

arXiv (Cornell University). Published: 2025-07-15. Preprint. 0 citations.

## Abstract

The complete connectome of the Drosophila larva brain offers a unique opportunity to investigate whether biologically evolved circuits can support artificial intelligence. We convert this wiring diagram into a Biological Processing Unit (BPU), a fixed recurrent network derived directly from synaptic connectivity. Despite its modest size 3,000 neurons and 65,000 weights between them), the unmodified BPU achieves 98% accuracy on MNIST and 58% on CIFAR-10, surpassing size-matched MLPs. Scaling the BPU via structured connectome expansions further improves CIFAR-10 performance, while modality-specific ablations reveal the uneven contributions of different sensory subsystems. On the ChessBench dataset, a lightweight GNN-BPU model trained on only 10,000 games achieves 60% move accuracy, nearly 10x better than any size transformer. Moreover, CNN-BPU models with ~2M parameters outperform parameter-matched Transformers, and with a depth-6 minimax search at inference, reach 91.7% accuracy, exceeding even a 9M-parameter Transformer baseline. These results demonstrate the potential of biofidelic neural architectures to support complex cognitive tasks and motivate scaling to larger and more intelligent connectomes in future work.
