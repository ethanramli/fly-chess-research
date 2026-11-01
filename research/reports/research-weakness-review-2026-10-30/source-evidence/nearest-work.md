Accessed 2026-10-30. Exa extraction capped at 15000 characters per URL. No independent replication of reported performance.

# A Drosophila Whole-Connectome Network Can Learn Human-Designed Cognitive Tasks
URL: https://arxiv.org/html/2610.10014

A Drosophila Whole-Connectome Network Can Learn Human-Designed Cognitive Tasks

# A Drosophila Whole-Connectome Network Can Learn Human-Designed Cognitive Tasks

Joonghui Cho Minchan Kang Daeshik Kim ∗ 

Korea Advanced Institute of Science and Technology (KAIST)

paul26@kaist.ac.kr mc.kang@kaist.ac.kr daeshik@kaist.ac.kr

 ∗ Corresponding author.

###### Abstract

Can a biological wiring diagram serve as a useful computational substrate beyond the behaviors for which it evolved? We use the publicly released MaleCNS v1.0 connectome, reconstructed from a single adult male Drosophila specimen, as the fixed recurrent topology of an artificial network. We train separate models for bounded addition and for a controlled grounded relational language task built from a fixed 100-word lexicon. In both models, one scalar is learned per anatomical edge. The anatomical graph reaches $92.77\%$ mean accuracy on held-out addition, compared with $67.93\%$ for directed degree-preserving rewires. On the strict paired language endpoint, which matches original and order-reversed scenes to their corresponding descriptions, it reaches $61.59\%$ across four fixed interfaces, compared with $44.17\%$ for matched rewires. At the canonical interface, it ranks first in a fixed 21-graph comparison. On the matched 48-group intervention subset, shuffling task-defined sensory features reduces its score from $60.94\%$ to $19.27\%$. Together, these results show that higher-order MaleCNS wiring provides a reusable inductive bias for bounded addition and grounded relational language.

## 1 Introduction

Connectomes are anatomical records, but they can also be read as candidate architectures. Synapse-resolution reconstructions now cover nearly the entire adult fly brain and the complete adult male central nervous system (CNS), revealing recurrent organizations shaped by an animal’s behavior (Dorkenwald et al., 2024; Berg et al., 2026). We ask whether that organization remains useful when connection strengths are relearned for problems outside the animal’s natural repertoire.

Most connectome-constrained models have pursued biological prediction in visual and sensorimotor systems, causal-effect estimation, or whole-brain activity fitting (Lappalainen et al., 2024; Shiu et al., 2024; Pospisil et al., 2024; Wang et al., 2026). Work on artificial tasks is smaller and has adapted fly wiring to image classification, chess, simulated locomotion, and robot navigation (Yu et al., 2026; Jin et al., 2026; Wang and Chen, 2026). Evidence about the topology itself is mixed. Random structures performed similarly to biological ones in one comparison, and another study found that shared initialization and degree-preserving nulls removed much of an apparent advantage (Pircher et al., 2021; Dhiman, 2026). Task performance by itself does not show whether the biological arrangement of edges matters.

We use the MaleCNS adjacency as the recurrent mask of an artificial network, with one learned scalar on each retained edge. Addition and grounded relational language are trained as separate models. Addition requires exact answers for unseen operand pairs. The language model receives controlled English alongside task-defined sensory events and must distinguish descriptions of held-out channel pairs and reversed event sequences. Orthogonal token codes contain no pretrained lexical semantics, so the mapping must be acquired from the generated corpus and sensory stream.

The anatomical graph outperforms degree-preserving rewires on both tasks, with the language separation appearing at every tested interface and in an additional 20-rewire ensemble. Sensory shuffling sharply reduces language performance. Figure 1 introduces the graph, tasks, and main controls.

Figure 1: Study design. (a) The processed MaleCNS v1.0 adjacency fixes the recurrent support, and each retained directed edge carries one learned scalar. The anatomical rendering shows a deterministic sample of 3,000 neuron skeletons. The overlaid nodes and arrows are schematic. Directed-degree-preserving rewires retain each node’s in- and out-degree. (b) Addition and grounded relational language are separate fits on the same topology. Language receives sensory events and fixed token codes and predicts the next symbol through a fixed readout. Held-out evaluation pairs original and order-reversed scenes with their corresponding equal-length descriptions. Orange marks the sensory-shuffle control used only at evaluation.

#### Whole-connectome resources and models.

FlyWire reconstructed a whole adult female brain with 139,255 neurons and about 50 million chemical synapses (Dorkenwald et al., 2024). MaleCNS extends synapse-resolution reconstruction across the complete adult male CNS (Berg et al., 2026). Whole-brain analyses identify rich-club organization and overrepresented recurrent motifs (Lin et al., 2024). Functional models use this anatomical detail to predict visual activity (Lappalainen et al., 2024), model feeding and grooming transformations (Shiu et al., 2024), and formulate estimators for causal neural effects (Pospisil et al., 2024). BrainTrace, for example, applied its online learning method to a FlyWire-constrained spiking model of resting-state regional activity and interregional functional connectivity (Wang et al., 2026).

#### Topology as an inductive bias.

Connectome-constrained reservoir studies have examined time-series prediction and multifunctional dynamics across hyperparameter regimes (Morra et al., 2025). In small fly-connectome subgraphs, raw task performance was generally comparable to random reservoirs, but weight-cost-normalized performance and robustness to neuron loss or parameter variation were higher (McAllister et al., 2026). Simplified whole-brain communication models likewise produced simulated region-selective activation patterns that were sensitive to degree-preserving rewiring (Zhang et al., 2026). A recent fly-visual-system study found that advantages over a weak random control largely disappeared with shared from-scratch initialization and degree-preserving nulls (Dhiman, 2026).

Artificial-task studies use a complete larval connectome as a reservoir for image classification and chess (Yu et al., 2026), an adult-brain connectome as a learned controller for simulated fly locomotion (Jin et al., 2026), and a fly-brain-derived recurrent network for robot navigation (Wang and Chen, 2026). FlyGM also compares its locomotion controller with a degree-preserving rewire. The present experiments move away from embodied behavior to two symbolic mappings and ask whether their performance survives changes in token-input and output placement and graph draw.

#### Grounding, composition, and arithmetic.

Fly-inspired language work has used a mathematical mushroom-body motif to learn sparse word representations from text (Liang et al., 2021). Associations between words and referents can also be learned from paired egocentric visual and linguistic experience (Vong et al., 2024), and pretrained instruction embeddings can support compositional generalization in sensorimotor networks (Riveland and Pouget, 2024). Benchmarks such as gSCAN, COGS, ReaSCAN, and Winoground test whether familiar components remain interpretable in new combinations or orders (Ruis et al., 2020; Kim and Linzen, 2020; Wu et al., 2021; Thrush et al., 2022). Our language experiment uses orthogonal token codes, channel-pair holdouts, sensory interventions, and relation reversal for the same general reason. The addition experiment reports exact answers and carry-sensitive results, following work that separates predictive performance from mechanistic recovery (Nikankin et al., 2025).

### 3.1 Experimental design

The two task models are trained independently on the anatomical topology and on directed degree-preserving rewires. Addition provides a repeated-run comparison across several graphs, whereas language uses a crossed design of five topologies and four input-output interfaces followed by a larger 21-graph comparison at interface I1. Rewiring changes the adjacency while retaining node and edge counts, every node’s directed degree, the task interface, parameter count, initialization distribution, optimizer, and training budget.

### 3.2 Connectome network and topology controls

We use the public MaleCNS v1.0 release (Berg et al., 2026) and retain every downloaded neuron assigned a superclass. The processed graph has 166,700 nodes and 25,582,938 directed neuron-to-neuron edges, representing 124,177,617 synaptic contacts. Appendix A gives the specimen, selection, orientation, and provenance details.

Let $G=(V,E)$ denote the directed graph. For a batch state $h_{t}\in\mathbb{R}^{|V|\times B}$, both task models use a leaky bounded recurrence

$h_{t+1}=(1-\alpha)h_{t}+\alpha\tanh\!\left(u_{t}+W_{E}h_{t}\right),$

(1)

where $\alpha$ is the leak coefficient, $u_{t}$ is the task-specific input drive, and $W_{E}$ has nonzeros only on $E$. For an edge $e=(j\!\to\!i)$, $(W_{E})_{ij}=\theta_{e}/\sqrt{\max(d_{i}^{\mathrm{in}},1)}$, where $d_{i}^{\mathrm{in}}$ is the in-degree of node $i$. The recurrent gain is one in both tasks. Synaptic contact counts determine only the mask, and edge scalars are initialized independently. The edge vector $\theta\in\mathbb{R}^{|E|}$ is the only trainable tensor, with input and readout maps and codebooks held fixed.

Rewired controls are generated by directed double-edge swaps that preserve every node’s unweighted in-degree and out-degree, retain the original self-loops, and introduce no duplicate edges. After five accepted swaps per original edge, only $0.588$–$0.594\%$ of source edges remain across the 20-graph ensemble. The comparison tests the collective contribution of higher-order properties, including reciprocity, motifs, paths, communities, and spectra, beyond directed degree. Appendix D gives the construction details and structural diagnostics.

### 3.3 Bounded-addition protocol

The task contains every ordered pair of nonnegative integers satisfying $a+b\leq 100$. An expression $a+b$ is encoded in 47 fixed channels: two 22-dimensional digit codes and three operator channels. The network receives 64 recurrent updates, and logits for the 101 answers from 0 through 100 are averaged over the final four steps. Training minimizes cross-entropy plus a normalized ordinal CDF loss with unit coefficient. The 5,151 expressions are divided into 3,584 training, 775 validation, and 792 test examples. Commuted expressions are grouped before splitting, so no unordered operand pair occurs in more than one split. Each epoch visits all training expressions once without replacement, and the checkpoint with the lowest validation loss is selected before a single evaluation of the test set.

The comparison contains four optimization runs on the anatomical graph, four on the first rewire, and two each on two additional rewires, yielding an unbalanced graph-by-initialization design. We report the individual runs and their descriptive aggregate.

### 3.4 Grounded relational language protocol

The language task pairs sensory events with a question and a controlled English answer. In one held-out example, strong pressure on the right middle leg occurs before weak movement on the right front leg. Asked “What did I feel?”, the target answer begins “The strong pressure on the right middle leg happened before the weak movement on the right front leg.” Table 3 gives the complete record and its order reversal.

Each event combines one of six leg locations with one of four signal kinds and has binary strength, duration, and speed attributes. The 24 location–kind channels drive disjoint groups of anatomically annotated MaleCNS leg afferents, comprising 2,837 neurons. Event attributes determine the amplitudes and timing of the sensory input. Answers are rendered from a 100-word lexicon using authored task conventions, while the model vocabulary also includes three punctuation marks and six control symbols. Two fixed $128\times 109$ codebooks assign orthonormal input and output codes to these 109 symbols.

Let $a_{t}\in\mathbb{R}^{24}$ contain the task-defined sensory amplitudes and let $q_{t}$ be the one-hot indicator for the current symbol. With fixed sensory and token gains $g_{s}$ and $g_{w}$, the language drive is

$u_{t}=g_{s}P_{s}a_{t}+g_{w}P_{w}E_{\mathrm{in}}q_{t}.$

(2)

For sensory group $S_{g}$, $(P_{s})_{ig}=|S_{g}|^{-1/2}$ when $i\in S_{g}$ and zero otherwise, while each code dimension is copied by $P_{w}$ to eight token-input nodes. Token nodes are sampled without replacement from nodes with outgoing edges after excluding sensory nodes, and eight output nodes per code dimension are sampled from nodes with incoming edges after excluding both earlier sets. The sensory, token-input, and output sets are therefore disjoint. The four interfaces reuse the sensory groups and codebooks but place token and output nodes differently.

If $O_{d}$ is the eight-node output group for code dimension $d$, the readout is

$z_{t,d}=\frac{1}{8}\sum_{i\in O_{d}}h_{t,i},\qquad\ell_{t}=\frac{E_{\mathrm{out}}^{\top}z_{t}}{\tau\max(\lVert z_{t}\rVert_{2},10^{-6})}.$

(3)

Here $\ell_{t}$ contains the symbol logits and $\tau$ is the temperature.

The network first encodes the sensory sequence, then retains its recurrent state while reading the prompt and predicting the answer. During training, we supply a start symbol followed by the correct preceding answer symbols and minimize cross-entropy over answer symbols and the end symbol. Controlled text records instead provide next-symbol training without sensory input. Appendix B specifies the temporal schedule and loss normalization.

To test new combinations of familiar sensory channels, we partition the 276 unordered channel pairs into 228 training, 24 composition-validation, and 24 composition-test pairs before rendering any text. All orders and wordings of a pair inherit its partition. The deterministic generator contains 2 report families, 18 question-answer families, and 11 text families. It materializes 200,000 training records and 4,096 records for each of familiar-family validation, composition validation, and composition test. Appendix B gives the split rule and template families.

Each full run uses the same budget of four million processed tokens. The first quarter is a report-only warm-up, and the remainder follows a deterministic 60:20:20 token mixture of reports, question answering, and text. Primary evaluation uses the final checkpoint. The factorial crosses the four interfaces with the anatomical graph and four rewires under one shared initialization. Both this comparison and the 20-rewire ensemble reuse settings established during method development at the canonical interface I1.

#### Primary endpoint.

For each of 192 held-out two-event groups, we pair the original scene and its order reversal with their corresponding equal-length descriptions while leaving the question unchanged. 

# Biological Processing Units: Leveraging an Insect Connectome to Pioneer Biofidelic Neural Architectures
URL: https://arxiv.org/html/2507.10951v1
Published: 2025-07-15

Biological Processing Units: Leveraging an Insect Connectome to Pioneer Biofidelic Neural Architectures

# Biological Processing Units: Leveraging an Insect Connectome to Pioneer Biofidelic Neural Architectures

 Siyu Yu Affiliation: Johns Hopkins University, Baltimore MD 21218, USA Affiliation: Pomegranate Intelligence, Baltimore MD 21218, USA Zihan Qin Affiliation: Johns Hopkins University, Baltimore MD 21218, USA [-1ex] Tingshan Liu Affiliation: Johns Hopkins University, Baltimore MD 21218, USA Beiya Xu Affiliation: Johns Hopkins University, Baltimore MD 21218, USA [0.15ex] R. Jacob Vogelstein Affiliation: Catalio Capital Management, New York NY 10010, USA E-mail {syu80, zqin16, tliu68, bxu41, jovo}@jhu.edu (%7Bsyu80,%20zqin16,%20tliu68,%20bxu41,%20jovo%7D@jhu.edu) Jason Brown Affiliation: Pomegranate Intelligence, Baltimore MD 21218, USA [0.15ex] Joshua T. Vogelstein E-mail jason@pomintel.com E-mail rjv@cataliocapital.com Affiliation: Johns Hopkins University, Baltimore MD 21218, USA Affiliation: Pomegranate Intelligence, Baltimore MD 21218, USA 

###### Abstract

The complete connectome of the Drosophila larva brain offers a unique opportunity to investigate whether biologically evolved circuits can support artificial intelligence. We convert this wiring diagram into a Biological Processing Unit (BPU)—a fixed recurrent network derived directly from synaptic connectivity. Despite its modest size (3,000 neurons and 65,000 weights between them), the unmodified BPU achieves 98% accuracy on MNIST and 58% on CIFAR-10, surpassing size-matched MLPs. Scaling the BPU via structured connectome expansions further improves CIFAR-10 performance, while modality-specific ablations reveal the uneven contributions of different sensory subsystems. On the ChessBench dataset, a lightweight GNN-BPU model trained on only 10,000 games achieves 60% move accuracy, nearly 10x better than any size transformer. Moreover, CNN-BPU models with $\sim$ 2M parameters outperform parameter-matched Transformers, and with a depth-6 minimax search at inference, reach 91.7% accuracy, exceeding even a 9M-parameter Transformer baseline. These results demonstrate the potential of biofidelic neural architectures to support complex cognitive tasks and motivate scaling to larger and more intelligent connectomes in future work.

## 1 Introduction

The recent completion of the entire Drosophila larval connectome, comprising approximately 3000 neurons and 65,000 weights between them, provides a rare opportunity to examine a fully natural-optimized neural circuit [1]. In contrast to large-scale artificial models that often require extensive computation and tuning, biological systems like Drosophila achieve complex behaviors with minimal resources. This suggests that a complete biological connectome may serve as a biological lottery ticket [2, 3]: a compact, evolutionarily selected circuit capable of supporting a broad range of cognitive functions.

Previous studies [4, 5, 6] have leveraged partial connectome structures from adult Drosophila [7] to guide neural network design, demonstrating the promise of biologically inspired architectures. However, such approaches may miss critical dynamics and functional motifs present only in the complete connectome. With the full larval connectome now available, we hypothesize that a fully intact biological neural circuit can inform the design of efficient and generalizable artificial systems, as it embodies solutions to many of the same computational challenges neural networks aim to address. To test this, we directly employ the complete connectome without altering its structure or synaptic weights, assessing whether it can support diverse cognitive tasks without task-specific adaptation.

Here we directly leverage the complete Drosophila larval connectome to develop Biological Processing Units (BPUs). We evaluate BPU on two categories of tasks: sensory processing (MNIST, CIFAR-10) [4] and decision-making (chess puzzles) [8]. These tasks are chosen to reflect fundamental cognitive functions—perception, memory, and planning—that are intrinsic to both artificial and biological agents. By including peripheral sensors alongside the central BPU circuit, we test whether the BPU can support generalized cognition under realistic biological constraints. Finally, to understand how far this advantage can scale, we introduce a directed, signed degree–corrected Stochastic Block Model (DCSBM) that lets us expand the larval connectome up to 5× while faithfully preserving its block-level wiring statistics and synaptic polarity.

The BPU achieves competitive performance across all tasks, matching or surpassing baseline models with similar parameter counts. These results support the idea that intact biological connectomes can serve as effective, reusable substrates for intelligent computation.

### 2.1 BPU architecture

We embed the entire larval Drosophila connectome as a fixed-weight recurrent core. The synaptic weights are directly taken from the connectome and remain unchanged during training. Only the input and output projections are optimized via gradient descent. Over a fixed number of unrolled steps, activity propagates through the reservoir. The trainable projections map inputs to internal dynamics and decode them into task-relevant outputs.

Figure 1: Biological Processing Unit (BPU) architecture based on the larval Drosophila connectome. (A) Raw axon-to-dendrite adjacency matrix representing synaptic connectivity. (B) Signed connectivity matrix after applying neurotransmitter-derived polarities and partitioning neurons into sensory, internal, and output pools. (C) Schematic of the BPU: inputs project to sensory neurons, activity propagates through the fixed recurrent core, and outputs are read from designated output neurons. In (B) and (C), blue denotes excitatory connections and red denotes inhibitory ones.

As illustrated in Figure 1, the BPU utilizes the axon-to-dendrite connectivity adjacency matrix derived from electron microscopy reconstructions [4]. We assign directional polarity (excitatory or inhibitory) to each connection by multiplying synaptic counts with neurotransmitter-based annotations [9]. The neurons are partitioned into three functionally distinct pools based on anatomical annotations, while retaining all neurons within the recurrent computational core:

- $\bullet$

Sensory ($N=430$): neurons responsible for encoding external stimuli;
- $\bullet$

Output ($N=218$): descending neurons projecting to motor circuits (DN-SEZ) and ring gland neurons (RGN) targeting neuroendocrine structures;
- $\bullet$

Internal neurons ($N=2304$): all other neurons

The BPU’s recurrent dynamics evolve according to:

$\displaystyle S(t{+}1)$

$\displaystyle=f\big(W_{\text{ss}}S(t)+W_{\text{rs}}I(t)+W_{\text{os}}O(t)+E(t)\big)$

(1)

$\displaystyle I(t{+}1)$

$\displaystyle=f\big(W_{\text{sr}}S(t)+W_{\text{rr}}I(t)+W_{\text{or}}O(t)\big)$

$\displaystyle O(t{+}1)$

$\displaystyle=f\big(W_{\text{so}}S(t)+W_{\text{ro}}I(t)+W_{\text{oo}}O(t)\big)$

Here, $f(\cdot)$ denotes a nonlinear activation function (typically ReLU), and $\mathrm{W}_{xy}$ represent fixed, connectome-derived synaptic weight matrices. To preserve biological plausibility, we constrain the temporal depth of recurrent processing (i.e., the number of time steps $T$) to match the characteristic synaptic propagation path length observed in the Drosophila sensory pathways.

### 2.2 Connectome expansion via a directed, signed DCSBM

To explore how scale influences performance, we stochastically enlarge the larval connectome using a directed, signed degree–corrected stochastic block model (DCSBM) [10, 11]. Let $W\in\mathbb{R}^{N_{0}\times N_{0}}$ denote the signed adjacency of the empirical core and $z_{i}\!\in\!\{0,1,2\}$ its sensory/internal/output labels. We fit a DCSBM with separate out- and in-strengths $\theta^{\mathrm{out}}_{i},\theta^{\mathrm{in}}_{i}$, block–pair weight densities $\omega_{gh}$ (Eq. 2) and sign probabilities $p_{gh}$ (Eq. 3).

$\displaystyle\omega_{gh}$

$\displaystyle=\frac{\sum_{i\in g}\sum_{j\in h}|W_{ij}|}{\bigl(\sum_{i\in g}\theta^{\mathrm{out}}_{i}\bigr)\bigl(\sum_{j\in h}\theta^{\mathrm{in}}_{j}\bigr)},$

(2)

$\displaystyle p_{gh}$

$\displaystyle=\frac{\#\{\,W_{ij}>0\,|\,z_{i}=g,z_{j}=h\}}{\#\{\,W_{ij}\neq 0\,|\,z_{i}=g,z_{j}=h\}}.$

(3)

To obtain a target size $N=F\,N_{0}$ (expansion factor $F\!\in\!\{1,2,...,5\}$) we first bootstrap paired in- and out-degrees $(\theta^{\text{out}},\theta^{\text{in}})$ from core neurons within the same block and then rescale the two vectors so that $\sum\theta^{\text{out}}=\sum\theta^{\text{in}}$. Then we draw block labels by the empirical proportion

$\Pr(z=k)=|z_{i}=k|/N_{0}$

For every ordered node pair $(u,v)$, we sample a Poisson edge count

$\Lambda_{uv}\!\sim\!\mathrm{Poisson}(\theta^{\mathrm{out}}_{u}\theta^{\mathrm{in}}_{v}\omega_{z_{u}z_{v}})$

and assign its polarity by a Bernoulli draw with probability $p_{z_{u}z_{v}}$. Finally, the original $N_{0}\times N_{0}$ sub-matrix is restored exactly so all experiments remain anchored in the real connectome.

### 2.3 Baseline for image classification

To adapt standard image datasets for the BPU architecture, we flatten each image and project it into the BPU’s sensory neuron subspace. The MNIST input (784 dimensions) and the CIFAR-10 input (3,072 dimensions) are linearly mapped to match the size of the sensory input. The resulting vector serves as the external input $\mathrm{E}(t)$ in $t=0$, as defined in Equation 1.

To isolate architectural effects, we use a two- hidden- layer MLP in which only the input-to-first-hidden and second-hidden-to-output mappings are trainable, together matching exactly the BPU projection parameter count, while the intermediate hidden-to-hidden transform remains a fixed untrained random projection. Activations (ReLU) and optimization mirror BPU settings.

### 2.4 BPU for Chess Puzzle Solving

For the chess task, we evaluate the BPU using puzzle accuracy, the percentage of puzzles where the predicted move sequence exactly matches the full ground-truth solution. Each puzzle is drawn from a curated Lichess dataset [12], annotated with Elo difficulty ratings ranging from 399 to 2867 and complete solution sequences.

We use the ChessBench dataset [4], which provides $10\times 10^{6}$ board positions sourced from Lichess.org games. Each state is encoded using the Forsyth-Edwards Notation (FEN) [13], and annotated using Stockfish 16 under 50 ms per board constraints. The state value labels reflect the estimated win probabilities between 0% and 100%. To convert FEN strings into fixed-size neural inputs for the BPU, we implement two encoding pipelines:

GNN-based encoder. We represent each FEN position as a 65-node directed graph: the 64 board squares plus a central “hub”. Square nodes carry a 12-dimensional one-hot piece indicator, while the hub stores 22 global features (castling rights, en passant location, and scaled half- and full-move clocks), resulting in 34-dimensional feature vectors for all nodes. Edges comprise (i) all potential moves for both sides and (ii) bidirectional links between each square and the hub. Each edge is annotated with a 7-bit attribute indicating legality, capture, defense, promotion, side, forward/backward direction, and local vs. global connection.

We first project all node and edge features into $\mathbb{R}^{128}$ via learnable linear layers. The graph is then fed through two consecutive GINEConv layers [14], updating each node feature vector by aggregating its neighbors and edge attributes. Global average and max pooling of node features yield a 256-dimensional embedding, which is passed to the fixed-weight recurrent BPU.

CNN-based encoder. To match the parameter count of Transformer models in ChessBench [8], we tokenize FEN into a $[24,8,8]$ tensor comprising 22 semantic channels (12 piece types, side-to-move, castling rights, en passant, move counters, promotion indicators) and 2 spatial coordinate channels. The tensor is processed by a six-layer convolutional encoder: a two-layer convolutional stem $3\times 3$ followed by six residual blocks with alternating Squeeze-and-Excitation (SE) modules and stochastic depth. Global average pooling yields a 256-dimensional embedding. The embedding is passed to the fixed-weight recurrent BPU, with only the input and output projections trainable.

We evaluate three variants: GNN, CNN, and CNN enhanced with a minimax search and alpha-beta pruning during inference [15, 16, 17, 18], which refines move selection without increasing model capacity. The precision of the puzzle is measured under the training budgets of the games $\{10^{4}$, $10^{5}$, $10^{6}\}$, benchmarked against previous results from ChessBench [4]. Final evaluation is performed on 10,000 curated Lichess puzzles, each with full solution sequences and Elo scores.

### 3.1 Image Classification

Figure 2 A summarizes test accuracies on MNIST and CIFAR- 10 for two untrainable architectures: the full- connectome BPU and a two- layer MLP baseline with matched projection parameters. On MNIST, the full- connectome reservoir peaks at 98$\%$ test accuracy, compared to 97$\%$ for the MLP. On the more challenging CIFAR- 10 task, the full reservoir reaches 58$\%$ while the MLP achieves 52$\%$. These performance gaps persist across small to full training set sizes.

Figure 2: (A) Test accuracy on MNIST and CIFAR-10 for the original connectome-derived BPU. (B) CIFAR-10 test accuracy as a function of expansion factor for expanded BPUs via DCSBM. Shaded bands indicate average over five runs and are compared to a size-matched 2-layer MLP baseline.

To probe whether additional fly-like circuitry can push performance further, we expanded the connectome with the signed DCSBM generator and froze the resulting recurrent weights. Figure 2 B shows that CIFAR-10 accuracy grows monotonically with expansion factor: a $2{\times}$ graph already surpasses the original BPU, and performance continues to climb, remaining consistently above the size-matched MLP baseline. Thus, scaling the biological prior yields clear benefits without any extra training of the recurrent matrix.

Figure 3 shows an ablation study that evaluates the contribution of different sensory modalities to image classification. Performance does not scale directly with neuron count, e.g., the respiratory group (26 neurons) outperforms the larger sight-related group (29 neurons) when trained with a small training sample size, highlighting the role of functional specificity. This may reflect evolved relevance of certain modalities, or alternatively, developmental limitations of the 6-hour-old larva [1], where some circuits may be immature.

Figure 3: Test accuracy on MNIST and CIFAR-10 with modality-restricted reservoirs. Parentheses indicate (number of neurons / time steps) for each sensory subset.

### 3.2 Chess Puzzle Solving

Figure 4: Puzzle-solving ac

# (no title)
URL: https://raw.githubusercontent.com/cesp99/fly-chess/3c83567dfb6fa71cecc1556c75f17c8bb38fd5cf/docs/RETINA.md

# The fly's retina — how photoreceptors look at the chess board

`flychess/connectome/retina.py` · `BrainGraph.retina_*` (graph.py) · `load_column_assignment` (load.py) · tests in `tests/test_retina.py`

## 1. What the fly sees

Before v3 the board reached the brain through a dense learned projection `w_in (2048 x 1280)` into the
2048 best-connected sensory / ascending neurons — olfactory receptor neurons, Johnston's organ cells,
taste bristles… none of them visual. The retina replaces that for the visual system: every
**photoreceptor** of the connectome that can be placed on an ommatidial column looks at **exactly one
square** of the board, and the 20 board planes of that square are its only input
(`pre[retina_idx[k]] += w_ret[k] · planes[:, :, retina_square[k]] + b_ret[k]`, `w_ret: (n_ret, 20)`).
Neighbouring photoreceptors look at neighbouring squares, the two eyes split the board down the
middle, and the visual signal then flows through the real lamina → medulla → lobula → central-brain
wiring. The network is still the only thing that chooses moves; the retina only decides *where each
photoreceptor looks*.

The board is always encoded from the side to move's perspective (SPEC §3.1), so the fly sits behind
its own pieces looking up the board: rank 1 is at the bottom of its visual field (ventral), rank 8 at
the top (dorsal), file a to its left and file h to its right. With the default `retina_field='split'`
the **left eye sees files a–d** and the **right eye files e–h** (each eye's field is an 8 × 4 block of
squares); `retina_field='full'` makes both eyes see all 64 squares (a fully binocular fly), and
`retina_eyes='left' | 'right'` uses a single eye (which then always sees the whole board).

## 2. Data: the optic-lobe column assignment

`data/connectome/column_assignment.csv.gz` (FlyWire Codex, snapshot 783; Matsliah et al. 2024) has
45,528 rows `root_id, hemisphere, type, column_id, x, y, p, q`: for 31 columnar cell types
(R7, R8, L1–L5, Mi1, Mi4, Mi9, Tm1–4, Tm9, Tm20, Tm21, T1, T2, T2a, T3, T4a–d, T5a–d, C2, C3) the
ommatidial column each neuron belongs to. There are **785 columns in the left eye and 796 in the
right eye** (of ~800 ommatidia per eye); every (hemisphere, column_id) has exactly one R7 / R8 at most.

### Coordinate convention (checked on the table, `tests/test_retina.py::test_real_column_table_lattice`)

`(p, q)` are hex **axial** coordinates whose axes are 120° apart: the six neighbours of a column are
`(±1, 0)`, `(0, ±1)` and `±(1, 1)` (693 of the 796 right-eye columns have all six; with the other
convention `±(1, -1)` only 668 do). The file's `(x, y)` are the same lattice squashed to integers:
`y = p + q` and `x = floor((q - p) / 2)` hold for every row. The regular cartesian embedding used here is

 X = (q - p) · √3 / 2 Y = (p + q) / 2

which puts every column's nearest neighbour at distance exactly 1.000 (all 796 columns). Each eye spans
X ∈ [-15.6, 14.7] and Y ∈ [-14.5, 15.0] — a roughly circular field 30 columns across. Coordinates are
normalised per eye to `[0, 1]` with the min / max over that eye's *unique columns* (a crowded column
cannot bias the range; the lattice has no outliers).

**Orientation.** Correlating the column coordinates with the neurons' FAFB positions (`coordinates.csv.gz`):
`Y` correlates −0.98 / −0.99 with FAFB *y* (which grows ventrally) for R7, L1, Mi1 and T4 in both
hemispheres → **+Y is dorsal in both eyes**. `X` correlates +0.92 with FAFB *z* (posterior) for Mi1 in
both hemispheres → +X is the posterior medulla, i.e. — after the outer optic chiasm inverts the
anterior–posterior axis between lamina and medulla — the **frontal** part of the visual field, again in
both eyes. Hence

 v = Y normalised (0 = ventral = rank 1, 1 = dorsal = rank 8)
 u_board = X_n (left eye) (0 = lateral = file a, 1 = frontal = file d)
 = 1 − X_n (right eye) (0 = frontal = file e, 1 = lateral = file h)

so the frontal edges of the two eyes meet at the d|e boundary. A global flip of either axis would only
relabel which photoreceptor sees which square (the learned `w_ret` is per photoreceptor), so this
choice matters for the visualisation and the spatial-locality structure, not for what the network can
compute.

### `retina_uv` (visualisation)

The eye map drawn by the website: `u = 0.5 · u_board · 0.998` for the left eye (`u ∈ [0, 0.499]`, so it
stays below 0.5 after f16 rounding in the web export) and `u = 0.5 + 0.5 · u_board` for the right eye
(`u ∈ [0.5, 1]`); `v` as above. Both eyes side by side, lateral edges at the outside, dorsal up.

## 3. Placing photoreceptors on columns

| type | in connectome | placed directly (in the table) | via lamina partner | unplaced | no connection ≥ 5 syn | receive-only | **in the retina** |
|-------|--------------:|-------------------------------:|-------------------:|---------:|----------------------:|-------------:|------------------:|
| R1-6 | 8,456 | 0 | 4,141 | 4,315 | 0 | 0 | **4,141** |
| R7 | 1,338 | 1,253 | 0 | 85 | 223 | 376 | **654** |
| R8 | 1,357 | 1,276 | 0 | 81 | 235 | 293 | **748** |
| total | 11,151 | 2,529 | 4,141 | 4,481 | 458 | 669 | **5,543** |

* **R7 / R8** have column assignments directly (`direct`); the 85 + 81 without one are not in the table.
* **R1-6** (the outer photoreceptors, `consolidated_cell_types` primary type `R1-6`) are not in the
 table. Each takes the column of its **strongest postsynaptic lamina partner** among
 `retina_partner_types = ('L1', 'L2', 'L3')` (all of which are in the table): synapse counts are summed
 per (R1-6, column) over *all* its outgoing connections in the full connectome and the column with the
 most synapses wins — a plurality (argmax), ties → smaller column id. In practice the winning column
 holds almost all of a cell's lamina synapses: median 100 %, 5th percentile 100 %, minimum 37.7 %
 (a single cell below 50 %), no exact ties. 4,141 of the 8,456 R1-6 can be placed; the other 4,315
 have no L1/L2/L3 connection at all (2,993 of them have no outgoing connection whatsoever —
 reconstruction fragments; including L4/L5 or any table type as partner would add only 6). The 4,141
 sit on 1,200 distinct columns (the whole retina covers 1,416 of the 1,581). Every partner-placed cell
 lands in the eye its `side` annotation says (`side_mismatch = 0`).
* Placement is computed on the **full connectome**, independent of the graph selection (like the
 per-neuron transmitter rule), so a photoreceptor's square never depends on `GraphConfig`.
* Photoreceptors that end up without a column are ordinary sensory neurons: they stay candidates for the
 generic `input_idx` exactly as before.
* A photoreceptor only joins the retina if it has **at least one outgoing connection of ≥ `min_syn`
 synapses** on the filtered edge set — it must be able to drive something. 458 R7 / R8 have a column
 but no connection at all (they are not in the graph either, exactly as in v2), and another 669
 R7 / R8 only *receive* (mostly from the other photoreceptor of their column): they stay in the graph
 as ordinary sensory neurons, but a `w_ret` row for them would be dead weight. This is what keeps the
 neuron set of `full.npz` identical to v2 (§7).

## 4. Columns → squares

Each eye's columns are binned onto its block of squares (4 files × 8 ranks for `split`, 8 × 8 for
`full`). Binning is nested and rank-based: first the columns are cut into file bins along `u_board`,
then, within every file bin, into rank bins along `v` (ties broken by the other coordinate, then by
column id, so the result is fully deterministic). `retina_binning`:

| binning (`split`, full brain) | columns / square left (min · median · max) | right | photoreceptors / square (min · median · max) | empty squares |
|-------------------------------|-------------------------------------------:|------:|---------------------------------------------:|--------------:|
| `uniform` (equal rectangles) | 0 · 28 · 36 | 0 · 28 · 36 | 0 · 90.5 · 211 | 3 |
| `quantile` (equal column count) | 24 · 25 · 25 | 24 · 25 · 25 | **10** · 88 · 173 | 0 |
| **`weighted`** (default: equal photoreceptor count) | 9 · 17 · 80 | 14 · 23 · 53 | **67 · 87 · 107** | 0 |

Uniform binning of a round eye leaves corner squares empty, so it is only kept for reference.
Quantile binning gives every square 24–25 columns, but because R1-6 placement is incomplete and uneven
(the left eye has 2,259 retina photoreceptors, the right 3,284) some squares would receive only 10
photoreceptors and others 173. The default therefore balances the *photoreceptors that end up in the
graph* (weighted quantiles: bins are cut at equal cumulative photoreceptor count; every bin is forced to
keep at least one column). Squares are still contiguous patches of the eye — 9 to 80 columns each — and
every square gets 67–107 photoreceptors (left eye 67–77, right eye 97–107):

```
photoreceptors per square, full.npz (rank 8 at the top, files a…h)
 8 |   70   71   71   70  103  100  104  103
 7 |   72   69   68   70  104  104  101  103
 6 |   73   71   76   69  102  104  102  103
 5 |   69   72   70   70   97  107  102  102
 4 |   72   68   69   72  106   99  104  104
 3 |   73   77   68   68  104  103  104  103
 2 |   67   67   76   74   99  102  102  101
 1 |   69   70   68   70  104  104  103  101
```

Per type: R7 0–30 per square (median 9), R8 1–41 (median 10.5), R1-6 0–89 (median 70.5).

The rank bins are nested inside the file bins, so "every square gets ≥ 1 column" needs at least 8 columns
per file bin — 32 (`split`) / 64 (`full`) columns per eye; the real eyes have ~790. A smaller synthetic
table can leave squares empty; `square_stats` reports `empty_squares` and `retina_candidates` warns.

## 5. Graph format and options

`BrainGraph` gains optional fields (empty when absent from an older npz; `validate()` checks them):

| field | dtype / shape | meaning |
|-----------------|----------------------|---------|
| `nt_type` | str `(n,)` | per-neuron transmitter after the majority fallback (`''` unknown); `sign == NT_SIGN[nt_type[pre]]` |
| `retina_idx` | int32 `(n_ret,)` | graph index of every retina photoreceptor (unique, disjoint from `input_idx`) |
| `retina_square` | int8 `(n_ret,)` | board square `rank * 8 + file`, mover's perspective (index into `planes.view(B, 20, 64)`) |
| `retina_uv` | float32 `(n_ret, 2)` | eye-map coordinates in `[0, 1]`, left eye `u < 0.5`, right eye `u ≥ 0.5` |
| `retina_type` | str `(n_ret,)` | `'R1-6' | 'R7' | 'R8'` |
| `retina_eye` | int8 `(n_ret,)` | 0 = left, 1 = right |

Properties `n_ret`, `has_retina`, `has_nt_type`. `meta['retina']` records everything above: the options,
columns per eye, columns per square and photoreceptors per square (per eye and overall:
min / median / max / empty squares), the per-type placement table, `placed` (placeable photoreceptors),
`candidates` (after the connection filter), the cap, and the column table's path / size / mtime.

`GraphConfig` options (`fly build-brain` needs no new flags for the defaults):

| option | default | |
|------------------------|------------------------|---|
| `retina` | `True` | build the retina when `column_assignment.csv.gz` exists (otherwise a note in `meta['retina']`, no retina) |
| `retina_types` | `('R1-6', 'R7', 'R8')` | photoreceptor cell types |
| `retina_eyes` | `'both'` | `'left'` / `'right'` use one eye, which then sees the whole board |
| `retina_field` | `'split'` | `'full'`: both eyes see all 64 squares |
| `retina_binning` | `'weighted'` | `'quantile'` (equal columns per square), `'uniform'` |
| `retina_partner_types` | `('L1', 'L2', 'L3')` | lamina partners that place R1-6 |
| `retina_max` | `None` | cap `n_ret`, round-robin over squares (within a square: photoreceptors that share their strongest post-synaptic partner first, then most synapses); with `max_neurons` the cap defaults to `max_neurons / 8` rounded up to a multiple of 64 (tiny: 2000 → 256, 4 per square) |
| `retina_connect` | `True` | with `max_neurons`: force-keep a shortest path from every retina photoreceptor to an output neuron (§6) |

`meta['retina']` also records `hops_to_output` (synaptic hops from the photoreceptors to the nearest
output neuron in the final graph: min / median / max / unreachable) and `connect` (how many
photoreceptors were wired through and how many neurons the paths cost).

Selection changes in `build_brain_graph`: retina neurons are *roles* (kept through `max_neurons`
pruning, like inputs / outputs), and `input_idx` is chosen from the input super classes **minus the
retina** (5 of the 2048 v2 inputs were R7 / R8; they are replaced by the next sensory neurons in the
same deterministic order, so `n_in` stays 2048). `build_retina(conn, graph, cfg, columns)` computes the
same arrays for an existing graph.

## 6. Reaching the outputs

A photoreceptor is only useful if its activity can reach the neurons the heads read (`output_idx`:
descending / motor). In the full graph the retina's signal reaches an output in **2–6 synaptic hops**
(median 4; R1-6: 3–5 hops, mostly 4 — lamina → medulla → lobula / visual projection → descending;
R7 / R8: 2–6); 40 of the 5,543 photoreceptors (7 R1-6, 14 R7, 19 R8) cannot reach any output at all —
their only targets are the other photoreceptor of their column or a lamina fragment with no
downstream partner. With `BrainConfig.steps = 8` (16 for `runs/fly2`) every reachable photoreceptor
influences the heads within one forward pass.

A **pruned** graph is a different matter. `max_neurons` keeps the neurons with the most synapses, and
no lamina cell makes it into a 2000-neuron graph: in the first v3 `tiny.npz` only 12 of the 256
photoreceptors had any edge inside the graph — six closed R7 ↔ R8 pairs — so toggling `vision` changed
nothing outside the retina (max policy / value difference 0.0). `retina_connect` (default on) fixes
this in two steps, both deterministic:

1. **cap by shared partners** — `balanced_cap` still takes photoreceptors round-robin over the squares,
 but within a square it ranks them by the summed synapse count of the group sharing their strongest
 (non-photoreceptor) post-synaptic partner, then by their own synapse count. The 4 photoreceptors a
 tiny square gets therefore converge on the same L1 / L2 / Tm20 … instead of on 4 different cells;
2. **output paths** — a backward BFS from the output neurons over the filtered edge set gives every
 neuron its hop distance to the nearest output; from each retina photoreceptor (in the round-robin
 order) the builder walks to a neighbour one hop closer, preferring neurons that are kept anyway,
 then the strongest connection, then the smaller root id, and force-keeps the walked neurons as
 roles (paths merge). Path neurons displace the lowest-ranked top-k neurons; they never push `n`
 above `max_neurons` — a path that does not fit the remaining budget is skipped and its photoreceptor
 counted in `meta['retina']['connect']['unconnected']`.

`tiny.npz` now: 256 photoreceptors (R1-6 178 / R7 26 / R8 52, 4 per square) all wired through in
**3–5 hops** (5

# (no title)
URL: https://raw.githubusercontent.com/cesp99/fly-chess/3c83567dfb6fa71cecc1556c75f17c8bb38fd5cf/flychess/model/flybrain.py

"""FlyBrain: the fruit-fly connectome as a recurrent chess-playing network (docs/SPEC.md §4).

Every neuron of the :class:`BrainGraph` is a leaky rate unit; every synapse of the connectome is a
weight whose *existence* and *sign* (Dale's law) are fixed and whose magnitude is learned. The board
is injected each timestep into the sensory ``input_idx`` neurons (dense ``w_in``) and/or into the
photoreceptors of the graph's retina (``retina_idx``: each looks at one board square through
``w_ret``), and the move / value heads read the activity of the ``output_idx`` (descending & motor)
neurons at the readout timesteps (optionally plus a linear summary of the ``central`` neurons).
There is no other pathway from board to move: the fly brain is the player.

Dynamics (``h`` is kept neuron-major ``(n, B)`` internally, batch-first at the module boundary)::

 h_0 = 0
 for t in range(steps):
 ion = W_ion @ h_t # ionotropic synapses (all of them without neuromod)
 pre = ion * (1 + tanh(W_mod @ h_t)) [neuromod] # DA / SER / OCT synapses gate multiplicatively
 pre += bias ; pre[input_idx] += x @ w_in.T + b_in ; pre[retina_idx[k]] += w_ret[k] . planes[:, sq_k] + b_ret[k]
 h_{t+1} = (1 - a) * h_t + a * act(pre) # a = sigmoid(leak_logit), per neuron
 feat = concat_{t in readout_steps} h_t[output_idx] (+ central_proj(h_T[central_idx]))
 policy_logits = policy_head(feat) ; value = tanh(value_head(feat))
"""
from __future__ import annotations

import math
import os
import warnings
from collections.abc import Mapping
from typing import Any

import numpy as np
import torch
import torch.nn.functional as F
from torch import Tensor, nn
from torch.utils.checkpoint import checkpoint

from flychess.connectome.graph import BrainGraph
from flychess.model.config import BrainConfig
from flychess.model.spmm import SparseStructure, subset_csr

_DTYPES = {"float32": torch.float32, "bfloat16": torch.bfloat16, "float16": torch.float16, "float64": torch.float64}
_MIN_MAGNITUDE = 1e-6 # |w| floor before inverse_softplus (log1p(syn_count) is > 0 anyway)
MODULATORY_NT: tuple[str, ...] = ("DA", "SER", "OCT") # presynaptic transmitters whose synapses gate (neuromod)
NUM_SQUARES = 64

def inverse_softplus(x: Tensor) -> Tensor:
 """``y`` such that ``softplus(y) == x`` for ``x > 0``: ``y = x + log(-expm1(-x))``."""
 return x + torch.log(-torch.expm1(-x))

def _gelu_tanh(t: Tensor) -> Tensor:
 """GELU with the tanh approximation (module-level so that models stay picklable)."""
 return F.gelu(t, approximate="tanh")

class _SatReLUFn(torch.autograd.Function):
 """``sat * tanh(relu(t) / sat)`` saving only ``t`` for backward (one tensor per timestep instead of four)."""

 @staticmethod
 def forward(ctx, t: Tensor, sat: float) -> Tensor:
 ctx.save_for_backward(t)
 ctx.sat = sat
 return torch.tanh(torch.relu(t) * (1.0 / sat)).mul_(sat)

 @staticmethod
 def backward(ctx, g: Tensor):
 (t,) = ctx.saved_tensors
 y = torch.tanh(torch.relu(t) * (1.0 / ctx.sat))
 return g * (1.0 - y * y) * (t > 0), None

class SatReLU(nn.Module):
 """Saturating rectifier ``sat * tanh(relu(x) / sat)``: non-negative rates with a ceiling of ``sat``.

 Biologically a firing rate saturates; numerically it keeps the recurrent activity bounded, which
 an unbounded ReLU in an excitatory-loop network does not (activity drifted 65 -> 300 over one epoch).
 Linear (slope 1) for small inputs, so Dale's-law signs keep their meaning.
 """

 def __init__(self, sat: float) -> None:
 super().__init__()
 self.sat = float(sat)

 def forward(self, t: Tensor) -> Tensor:
 return _SatReLUFn.apply(t, self.sat)

 def extra_repr(self) -> str:
 return f"sat={self.sat}"

def activation_fn(name: str, sat: float = 10.0):
 """The recurrent non-linearity. GELU uses the tanh approximation so that JS/numpy can match it."""
 if name == "relu":
 return torch.relu
 if name == "satrelu":
 return SatReLU(sat)
 if name == "tanh":
 return torch.tanh
 if name == "gelu":
 return _gelu_tanh
 raise ValueError(f"unknown activation {name!r}")

def activation_module(name: str, sat: float = 10.0) -> nn.Module:
 """``nn.Module`` version of :func:`activation_fn` (same math), used inside the value MLP."""
 if name == "relu":
 return nn.ReLU()
 if name == "satrelu":
 return SatReLU(sat)
 if name == "tanh":
 return nn.Tanh()
 if name == "gelu":
 return nn.GELU(approximate="tanh")
 raise ValueError(f"unknown activation {name!r}")

def _act_plain(name: str, sat: float):
 """Plain (compilable) elementwise activation used inside the fused update functions."""
 if name == "relu":
 return torch.relu
 if name == "tanh":
 return torch.tanh
 if name == "gelu":
 return _gelu_tanh
 inv, s = 1.0 / float(sat), float(sat)
 return lambda z: torch.tanh(torch.relu(z) * inv) * s

def _make_update(name: str, sat: float):
 act = _act_plain(name, sat)

 def _update(h: Tensor, pre: Tensor, bias: Tensor, a: Tensor) -> Tensor:
 return torch.lerp(h, act(pre + bias), a)

 return _update

class _GateRowsFn(torch.autograd.Function):
 """``pre[rows] *= 1 + tanh(mod)`` IN PLACE on the (n, B) pre-activation (``mod: (len(rows), B)``).

 The neuromodulatory gate only touches the rows that receive DA/SER/OCT synapses; doing it in place
 on the SpMM output (which SpMM does not save) costs one small gather/scatter instead of several
 full (n, B) passes, and the backward saves only the two ``(rows, B)`` tensors it needs.
 """

 @staticmethod
 def forward(ctx, pre: Tensor, mod: Tensor, rows: Tensor) -> Tensor:
 y = torch.tanh(mod)
 ion_rows = pre.index_select(0, rows)
 pre.index_copy_(0, rows, ion_rows * (1.0 + y))
 ctx.save_for_backward(ion_rows, y, rows)
 ctx.mark_dirty(pre)
 return pre

 @staticmethod
 def backward(ctx, g: Tensor):
 ion_rows, y, rows = ctx.saved_tensors
 g_rows = g.index_select(0, rows)
 d_mod = g_rows * ion_rows * (1.0 - y * y)
 g_pre = g.index_copy(0, rows, g_rows * (1.0 + y))
 return g_pre, d_mod, None

def modulatory_edge_mask(graph: BrainGraph) -> np.ndarray | None:
 """Boolean ``(nnz,)`` mask of the synapses whose PRE-synaptic neuron releases DA / SER / OCT
 (``graph.nt_type``, canonical edge order), or ``None`` when the graph carries no ``nt_type``."""
 nt = getattr(graph, "nt_type", None)
 if nt is None or np.size(nt) != int(graph.n):
 return None
 return np.isin(np.asarray(nt).astype(str)[np.asarray(graph.csr_indices)], MODULATORY_NT)

def retina_slots(retina_square: np.ndarray) -> tuple[np.ndarray, int]:
 """Group the photoreceptors by board square for a batched matmul.

 Returns ``(slot, max_k)``: photoreceptor ``k`` sits at row ``slot[k] = square * max_k + j`` of a
 ``(64 * max_k, NUM_PLANES)`` padded weight matrix, ``j`` being its rank among the photoreceptors
 of the same square and ``max_k`` the largest number of photoreceptors on one square.
 """
 sq = np.asarray(retina_square).astype(np.int64)
 if sq.size == 0:
 return np.zeros(0, dtype=np.int64), 0
 order = np.argsort(sq, kind="stable")
 counts = np.bincount(sq, minlength=NUM_SQUARES)
 starts = np.concatenate([[0], np.cumsum(counts)])
 slot = np.empty(sq.size, dtype=np.int64)
 slot[order] = np.arange(sq.size) - starts[sq[order]]
 return sq * int(counts.max()) + slot, int(counts.max())

def compute_ordering(graph: BrainGraph):
 """Reverse-Cuthill-McKee neuron permutation for the recurrent loop.

 Returns ``(node_perm, edge_perm, structure)`` where ``node_perm[i]`` is the canonical index of the
 i-th neuron in compute order, ``edge_perm`` maps compute-order CSR entries to canonical entries
 (``values_c = values[edge_perm]``) and ``structure`` is the compute-order :class:`SparseStructure`
 (CPU). ``(None, None, None)`` when disabled (``FLYCHESS_REORDER=0``) or scipy is unavailable.
 Measured on the full brain: the three sparse kernels per timestep go from 7.6 ms to 5.7 ms.
 """
 if os.environ.get("FLYCHESS_REORDER", "1") == "0" or graph.nnz == 0:
 return None, None, None
 try:
 import scipy.sparse as sp
 from scipy.sparse.csgraph import reverse_cuthill_mckee
 except ImportError: # pragma: no cover
 return None, None, None
 n = int(graph.n)
 m = sp.csr_matrix((np.arange(graph.nnz, dtype=np.int64) + 1, graph.csr_indices, graph.csr_indptr), shape=(n, n))
 perm = np.asarray(reverse_cuthill_mckee(m + m.T, symmetric_mode=True), dtype=np.int64)
 mp = m[perm][:, perm].tocsr()
 mp.sort_indices()
 edge_perm = np.asarray(mp.data, dtype=np.int64) - 1
 return perm, edge_perm, SparseStructure.from_csr(mp.indptr.astype(np.int32), mp.indices.astype(np.int32), n)

_COMPILED: dict[tuple[str, float], Any] = {}

def _compiled_update(activation: str, sat: float):
 """One ``torch.compile``d update function per (activation, sat); ``dynamic=True`` so that any batch
 size (training, evaluation, MCTS leaves) reuses the same kernels."""
 key = (activation, float(sat) if activation == "satrelu" else 0.0)
 if key not in _COMPILED:
 _COMPILED[key] = torch.compile(_make_update(activation, sat), dynamic=True)
 return _COMPILED[key]

class FlyBrain(nn.Module):
 """Recurrent network on the fly connectome with policy and value heads.

 Parameters
 ----------
 syn_gain (nnz,) synapse magnitude logits over ALL synapses in canonical graph order;
 ``w = sign * softplus(syn_gain)`` (dale=True) or ``w = syn_gain`` (dale=False).
 With ``neuromod`` the DA/SER/OCT synapses are always ``softplus(syn_gain)`` (positive
 gains, whatever ``dale`` says) — the split is a fixed index partition of this one
 parameter, so checkpoints and exports do not depend on it.
 bias (n,) per-neuron bias, init 0.
 leak_logit (n,) per-neuron leak logit, init ``logit(alpha)``.
 w_in (n_in, input_dim), b_in (n_in,) board projection into the sensory neurons (``sensory_input``;
 absent — not created, not saved — when ``sensory_input=False``).
 w_ret (n_ret, num_planes), b_ret (n_ret,) per-photoreceptor plane weights (``vision``); photoreceptor
 ``k`` receives ``w_ret[k] . planes[:, retina_square[k]] + b_ret[k]``.
 Init ``N(0, 1/sqrt(num_planes))`` / 0.
 central_proj ``Linear(n_central, central_dim)`` on the final activity of the ``central``
 neurons (``central_dim > 0``), concatenated to the head input.
 policy_head ``Linear(head_in, num_moves)`` with ``head_in = n_out * len(readout_steps) + central_dim``.
 value_head ``Linear(head_in, value_hidden) → act → Linear(value_hidden, 1)`` (or ``Linear(head_in, 1)``),
 followed by ``tanh``. ``act`` is the *same* non-linearity as the recurrence
 (``config.activation``); the export records it as ``header['value_activation']``
 so the JS/numpy engines never have to guess it.
 ``syn_gain``, ``bias`` and ``leak_logit`` are always float32 regardless of ``config.dtype`` (which
 only sets the dtype of ``w_in``/``b_in``/``w_ret``/``b_ret`` and the heads): under bf16 their
 optimiser steps would be smaller than an ulp and the connectome would never learn.
 Buffers: ``sign (nnz,) float``, ``input_idx (n_in,) int64``, ``output_idx (n_out,) int64``,
 ``syn_count (nnz,) float`` (persistent); plus the non-persistent, graph-determined index data: the
 canonical CSR pattern (``csr_indptr``, ``csr_indices``, ``crow_t``, ``col_t``, ``perm_t``), the
 compute-order copies (``c_*``, ``node_perm``, ``node_inv``, ``edge_perm``), the ionotropic /
 modulatory split (``ion_*``, ``mod_*``, ``modr_*`` + ``mod_rows``/``mod_cols``, ``ion_edges``, ``mod_edges``,
 ``mod_mask``), the retina
 (``retina_idx``, ``retina_square``, ``ret_slot``) and ``central_idx``.
 """

 def __init__(self, graph: BrainGraph, config: BrainConfig) -> None:
 super().__init__()
 self.config = config
 self.n = int(graph.n)
 self.nnz = int(graph.nnz)
 self.n_in = int(graph.n_in)
 self.n_out = int(graph.n_out)
 self.steps = int(config.steps)
 self.dale = bool(config.dale)
 self.act = activation_fn(config.activation, config.sat)
 self.fused = os.environ.get("FLYCHESS_FUSED", "1") != "0" # torch.compile'd recurrent update on CUDA
 self._update_fn = None
 dtype = _DTYPES[config.dtype]
 self.num_planes = int(config.input_dim // NUM_SQUARES)
 self.readout_steps: tuple[int, ...] = tuple(config.effective_readout_steps)
 self.sensory_input = bool(config.sensory_input)

 # ---- fixed connectome data (buffers) ----
 self.register_buffer("sign", torch.as_tensor(graph.sign, dtype=torch.float32))
 self.register_buffer("syn_count", torch.as_tensor(graph.syn_count, dtype=torch.float32))
 self.register_buffer("input_idx", torch.as_tensor(graph.input_idx, dtype=torch.int64))
 self.register_buffer("output_idx", torch.as_tensor(graph.output_idx, dtype=torch.int64))
 structure = SparseStructure(graph, device="cpu")
 for name, tensor in structure.tensors().items():
 self.register_buffer({"crow": "csr_indptr", "col": "csr_indices"}.get(name, name), tensor, persistent=False)
 # Cache-friendly compute ordering: the recurrent loop runs on a reverse-Cuthill-McKee permutation
 # of the neurons (the sparse kernels gather one 1.5 KB state row per connection; neighbours
 # that sit close in memory hit L2). Parameters, buffers, checkpoints and the export keep the
 # canonical graph order — the permutation is applied on the way in and out of the loop only.
 node_perm, edge_perm, compute = compute_ordering(graph)
 self.reordered = node_perm is not None
 if self.reordered:
 self.register_buffer("node_perm", torch.as_tensor(node_perm, dtype=torch.int64), persistent=False)
 self.register_buffer("node_inv", torch.argsort(self.node_perm), persistent=False)
 self.register_buffer("edge_perm", torch.as_tensor(edge_perm, dtype=torch.int64), persistent=False)
 for name, tensor in compute.tensors().items():
 self.register_buffer(f"c_{name}", tensor, persistent=False)
 self._structures: dict[tuple[str, torch.device], SparseStructure] = {}
 # Recompute each recurrent step in backward instead of storing its activations: ~2x less
 # activation memory for ~+25 % time. Set by the trainer when batch size / VRAM demands it.
 self.grad_checkpoint: bool = False

 # ---- neuromodulation: split the synapses by the presynaptic transmitter ----
 self.neuromod = bool(config.neuromod)
 self.nnz_mod = 0
 if self.neuromod:
 mask = modulatory_edge_mask(graph)
 if mask is None:
 warnings.warn("neuromod=True but the graph has no nt_type: no modulatory synapses (plain dynamics)")
 mask = np.zeros(self.nnz, dtype=bool)
 self.nnz_mod = int(mask.sum())
 self.register_buffer("mod_mask", torch.as_tensor(mask), persistent=False)
 # the loop's CSRs (compute order when reordered) split into ionotropic / modulatory sub-CSRs;
 # ``ion_edges`` / ``mod_edges`` gather their values straight from the canonical ``w``
 if self.reordered:
 loop_indptr, loop_indices = _np(self.c_crow), _np(self.c_col)
 loop_to_canonical, loop_mask = edge_perm, mask[edge_perm]
 else:
 loop_indptr, loop_indices = np.asarray(graph.csr_indptr), np.asarray(graph.csr_indices)
 loop_to_canonical, loop_mask = np.arange(self.nnz, dtype=np.int64), mask
 for kind, keep in (("ion", ~loop_mask), ("mod", loop_mask)):
 indptr_s, indices_s, sel = subset_csr(loop_indptr, loop_indices, keep)
 sub = SparseStructure.from_csr(indptr_s.astype(np.int32), indices_s.astype(np.int32), self.n)
 for name, tenso
