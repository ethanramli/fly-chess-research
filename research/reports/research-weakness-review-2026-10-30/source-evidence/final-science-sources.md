Retrieved 2026-10-30. Tool-extracted primary-source text, including access failures. Read scope is specified in source-and-claim-checks.md.

# Learning with reinforcement prediction errors in a model of the Drosophila mushroom body | Nature Communications
URL: https://www.nature.com/articles/s41467-021-22592-4
Published: 2021-05-07
Author: Bennett, James E. M., Philippides, Andrew, Nowotny, Thomas

Learning with reinforcement prediction errors in a model of the Drosophila mushroom body | Nature Communications

- Article
- Open access
- Published: 07 May 2021

# Learning with reinforcement prediction errors in a model of the Drosophila mushroom body

- James E. M. Bennett ORCID: orcid.org/0000-0002-9474-4726 1, 
- Andrew Philippides ORCID: orcid.org/0000-0001-5503-0467 1 & 
- Thomas Nowotny ORCID: orcid.org/0000-0002-4451-915X 1 

## Abstract

Effective decision making in a changing environment demands that accurate predictions are learned about decision outcomes. In Drosophila, such learning is orchestrated in part by the mushroom body, where dopamine neurons signal reinforcing stimuli to modulate plasticity presynaptic to mushroom body output neurons. Building on previous mushroom body models, in which dopamine neurons signal absolute reinforcement, we propose instead that dopamine neurons signal reinforcement prediction errors by utilising feedback reinforcement predictions from output neurons. We formulate plasticity rules that minimise prediction errors, verify that output neurons learn accurate reinforcement predictions in simulations, and postulate connectivity that explains more physiological observations than an experimentally constrained model. The constrained and augmented models reproduce a broad range of conditioning and blocking experiments, and we demonstrate that the absence of blocking does not imply the absence of prediction error dependent learning. Our results provide five predictions that can be tested using established experimental methods.

## Introduction

Effective decision making benefits from an organism’s ability to accurately predict the rewarding and punishing outcomes of each decision, so that it can meaningfully compare the available options and act to bring about the greatest reward. In many scenarios, an organism must learn to associate the valence of each outcome with the sensory cues predicting it. A broadly successful theory of reinforcement learning is the delta rule 1, 2, whereby reinforcement predictions (RPs) are updated in proportion to reinforcement prediction errors (RPEs): the difference between predicted and received reinforcements. RPEs are more effective as a learning signal than absolute reinforcement signals because RPEs diminish as the prediction becomes more accurate, adding stability to the learning process. In mammals, RPEs related to rewards are signalled by dopamine neurons (DANs) in the ventral tegmental area and substantia nigra, enabling the brain to implement approximations to the delta rule 3, 4. In Drosophila melanogaster, DANs that project to the mushroom body (MB) (Fig. 1a) provide both reward and punishment modulated signals that are required for associative learning 5. However, to date, MB DAN activity is typically interpreted as signalling absolute reinforcements (either positive or negative) for two reasons: (i) a lack of direct evidence for RPE signals in DANs, and (ii) limited evidence in insects for the blocking phenomenon, in which conditioning of one stimulus can be impaired if it is presented alongside a previously conditioned stimulus, an effect that is indicative of RPE-dependent learning 2, 6, 7. Here, we incorporate anatomical and functional data from recent experiments into a computational model of the MB, in which MB DANs do compute RPEs. The model provides a circuit-level description for delta rule learning in the MB, which we use to demonstrate why the absence of blocking does not necessarily imply the absence of RPEs.

Fig. 1: Valence-specific model of the mushroom body.

Full size image

a Schematic of several neuropils that comprise the brain of Drosophila melanogaster. The green region highlights the MB in the right hemisphere. Labels: MB mushroom body, AL antennal lobe, SOG suboesophogeal ganglion, ME medulla. b Outlines of the multiple compartments that tile the lobes of the MB, colour-coded by a broad classification of cell function. Blue: approach MBONs (mushroom body output neurons); orange: avoidance MBONs; purple: aversive DANs (dopamine neurons); green: appetitive DANs; black: KCs. Inset: schematic of the three MB lobes and their compartmentalisation. Top: \({\alpha }^{\prime}\)/\({\beta }^{\prime}\) lobes; middle: α/β lobes; bottom: γ lobe. MBON functions (approach or avoidance) are as determined in 15. Pale colours in the inset correspond to MBONs that exhibit a non-significant bias on behaviour in 15. c Schematic of the VS model. Units are colour-coded according to the cell types in (b). KCs connect to MBONs through plastic synapses, and connect to DANs through fixed synapses. Labels: M + —approach MBON; M −, avoidance MBON; D −, aversive DAN, D +, appetitive DAN, K, Kenyon cells, R −, negative reinforcement, R +, positive reinforcement. Lines with arrows: excitatory synapse. Lines with filled circles: synapse releasing dopamine. Downward white arrows: dopamine enhances synaptic long term depression (LTD). d Schematic of a single trial for the experimental paradigm in which the model is examined. Panel 1: the model is exposed to some number of cues that are evaluated to yield a cue-specific RP. Panel 2: using the relative RPs, the model makes a decision over which cue to choose. Panel 3: the model receives a reinforcement signal that is associated with the chosen cue, and its RPs for that cue are updated.

The MB is organised into lateral and medial lobes of neuropil in which sensory encoding Kenyon cells (KCs) innervate the dendrites of MB output neurons (MBONs), which modulate behaviour (Fig. 1b). Consistent with its role in associative learning, DAN signals modulate MBON activity via synaptic plasticity at KC → MBON synapses 8, 9, 10. Current models of MB function posit that the MB lobes encode either positive or negative valences of reinforcement signals and actions 10, 11, 12, 13, 14, 15, 16. Most DANs in the protocerebral anterior medial (PAM) cluster (called D + in the model presented here, Fig. 1c) are activated by rewards, or positive reinforcement (R +), and their activation results in depression at synapses between coactive KCs (K) and MBONs that are thought to induce avoidance behaviours (M −). DANs in the protocerebral posterior lateral 1 (PPL1) cluster (D −) are activated by punishments, i.e. negative reinforcement (R −), and their activation results in depression at synapses between coactive KCs and MBONs that induce approach behaviours (M +). A fly can therefore learn to approach rewarding cues or avoid punishing cues as a result of synaptic depression at KC inputs to avoidance or approach MBONs, respectively.

To date, there is only indirect evidence for RPE signals in MB DANs. DAN activity is modulated by feedforward reinforcement signals, but some DANs also receive excitatory feedback from MBONs 17, 18, 19, 20, and it is likely this extends to all MBONs whose axons are proximal to DAN dendrites 21. We interpret the difference between approach and avoidance MBON firing rates as a RP that motivates behaviour, consistent with the observation that behavioural valence scales with the difference between approach and avoidance MBON firing rates 15. As such, DANs that integrate feedforward reinforcement signals and feedback RPs from MBONs are primed to signal RPEs for learning. To the best of our knowledge, these latter two features have yet to be incorporated in computational models of the MB 22, 23, 24.

Here, we incorporate the experimental data described above to formulate a reduced computational model of the MB circuitry, demonstrate how DANs may compute RPEs, derive a plasticity rule for KC → MBON synapses that minimises RPEs, and verify in simulations that our MB model learns accurate RPs. We identify a limitation to the model that imposes an upper bound on RP magnitudes, and demonstrate how putative connections between DANs, KCs and MBONs 25, 26 help circumvent this limitation. Introducing these additional connections yields testable predictions for future experiments as well as explaining a broader range of existing experimental observations that connect DAN and MBON stimulus responses to learning. Lastly, we show that both incarnations of the model—with and without additional connections—capture a wide range of observations from classical conditioning and blocking experiments in Drosophila. Different behavioural outcomes in the two models for specific experiments provide further strong experimental predictions.

### A model of the mushroom body that minimises reinforcement prediction errors

The MB lobes comprise multiple compartments, each innervated by a different set of MBONs and DANs (Fig. 1b), and each encoding memories for different forms of reinforcement 27, with different longevities 28, and for different stages of memory formation 29. Nevertheless, compartments appear to contribute to learning by similar mechanisms 9, 10, 30, and it is reasonable to assume that the process of learning RPs is similar for different forms of reinforcement. We therefore reduce the multicompartmental MB into two compartments, and assign a single, rate-based unit to each class of MBON and DAN (colour-coded in Fig. 1b, c). KCs, however, are modelled as a population, in which each sensory cue selectively activates a unique subset of ten cells. Given that activity in approach and avoidance MBONs—denoted M + and M − in our model—respectively bias flies to approach or avoid a cue, i, we interpret the difference in their firing rates, \({\hat{m}}^{i}\,=\,{m}_{+}^{i}\,-\,{m}_{-}^{i}\), as the fly’s RP for that cue.

For the purpose of this work, we assume that the MB has only a single objective: to form RPs that are as accurate as possible, i.e. that minimise the RPE. We do this within a multiple-alternative forced choice (MAFC) paradigm (Fig. 1d; also known as a multi-armed bandit) in which a fly is exposed to one or more sensory cues in a given trial, and is forced to choose one. The fly then receives a reinforcement signal, \({\hat{r}}^{i}\,=\,{r}_{+}^{i}\,-\,{r}_{-}^{i}\), which has both rewarding and punishing components (coming from sources R + and R −, respectively), and which is specific to the chosen cue. Over several trials, the fly must learn to predict the reinforcements for each cue, and use these predictions to reliably choose the most rewarding cue. We formalise this objective with a cost function that penalises differences between RPs and reinforcements

$${C}^{{\rm{RPE}}}\,=\,\frac{1}{2}\mathop{\sum}\limits_{i}{\left({\hat{r}}^{i}\,-\,{\hat{m}}^{i}\right)}^{2},$$

 ( 1) 

where the sum is over all cues, i. To minimise C RPE through learning, we derived a plasticity rule, \({{\mathcal{P}}}^{{\rm{RPE}}}\) (full derivation in Methods: Synaptic plasticity):

$${{\mathcal{P}}}_{\pm }^{{\rm{RPE}}}\,=\,\eta {\bf{k}}\left({d}_{\pm }\,-\,{d}_{\mp }\right).$$

 ( 2) 

whereby synaptic weights are updated according to \({{\bf{w}}}_{\pm }\left(t\,+\,1\right)\,=\,{{\bf{w}}}_{\pm }\left(t\right)\,+\,{{\mathcal{P}}}_{\pm }^{{\rm{RPE}}}\). Here, k is a vector of KC firing rates, and we use subscripts ‘±’ to denote the valence of the neuron: if + (−) is considered in ±, then ∓ refers to − (+), and vice versa. As such, d ± refers to the firing rate of either D + or D −. The learning rate, η, must be small (see Methods: Synaptic plasticity) to allow the plasticity rule to average over multiple stimuli as well as stochasticity in the reinforcement schedule (see Methods: Reinforcement schedule). Note that a single DAN, D ±, only has access to half of the reinforcement and RP information, and by itself does not compute the full RPE. However, the difference between D + and D − firing rates does yield the full RPE (see Methods: DAN firing rates):

$${d}_{+}^{i}\,-\,{d}_{-}^{i}\,=\,{\hat{r}}^{i}\,-\,{\hat{m}}^{i}.$$

 ( 3) 

Three features of Eq. (2) are worth highlighting here. First, elevations in d ± increase the net amount of synaptic depression at active synapses that impi

# Integration of Parallel Opposing Memories Underlies Memory Extinction
URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC6198041/

Integration of Parallel Opposing Memories Underlies Memory Extinction - PMCSkip to main content

An official website of the United States government
Here's how you know
Here's how you know

**Official websites use .gov**
A**.gov**website belongs to an official
government organization in the United States.

**Secure .gov websites use HTTPS**
A**lock**(LockLocked padlock icon) or**https://**means you've safely
connected to the .gov website. Share sensitive
information only on official, secure websites.

NCBI home page

Search
Log in
* Dashboard
* Publications
* Account settings
* Log out
Search…Search NCBI

Search PMC Full-Text ArchiveSearch in PMCSearch
* Advanced Search
* Journal List
* User GuideNewTry this search in PMC Beta Search
* * 
* 
* * * ## PERMALINK
Copy
As a library, NLM provides access to scientific literature. Inclusion in an NLM database does not imply endorsement of, or agreement with,
the contents by NLM or the National Institutes of Health.
Learn more:PMC Disclaimer|PMC Copyright Notice
Elsevier Sponsored Documents logo
Cell
. 2018 Oct 18;175(3):709–722.e15. doi:10.1016/j.cell.2018.08.021
# Integration of Parallel Opposing Memories Underlies Memory Extinction
Johannes Felsenberg
### Johannes Felsenberg
1Centre for Neural Circuits and Behaviour, The University of Oxford, Tinsley Building, Mansfield Road, Oxford OX1 3SR, UK
Find articles byJohannes Felsenberg
1,6,Pedro F Jacob
### Pedro F Jacob
1Centre for Neural Circuits and Behaviour, The University of Oxford, Tinsley Building, Mansfield Road, Oxford OX1 3SR, UK
Find articles byPedro F Jacob
1,Thomas Walker
### Thomas Walker
1Centre for Neural Circuits and Behaviour, The University of Oxford, Tinsley Building, Mansfield Road, Oxford OX1 3SR, UK
Find articles byThomas Walker
1,Oliver Barnstedt
### Oliver Barnstedt
1Centre for Neural Circuits and Behaviour, The University of Oxford, Tinsley Building, Mansfield Road, Oxford OX1 3SR, UK
Find articles byOliver Barnstedt
1,Amelia J Edmondson-Stait
### Amelia J Edmondson-Stait
2Drosophila Connectomics, Department of Zoology, University of Cambridge, Cambridge CB2 3EJ, UK
Find articles byAmelia J Edmondson-Stait
2,Markus W Pleijzier
### Markus W Pleijzier
2Drosophila Connectomics, Department of Zoology, University of Cambridge, Cambridge CB2 3EJ, UK
Find articles byMarkus W Pleijzier
2,Nils Otto
### Nils Otto
1Centre for Neural Circuits and Behaviour, The University of Oxford, Tinsley Building, Mansfield Road, Oxford OX1 3SR, UK
2Drosophila Connectomics, Department of Zoology, University of Cambridge, Cambridge CB2 3EJ, UK
Find articles byNils Otto
1,2,Philipp Schlegel
### Philipp Schlegel
2Drosophila Connectomics, Department of Zoology, University of Cambridge, Cambridge CB2 3EJ, UK
Find articles byPhilipp Schlegel
2,Nadiya Sharifi
### Nadiya Sharifi
3Janelia Research Campus, Howard Hughes Medical Institute, Ashburn, VA 20147, USA
Find articles byNadiya Sharifi
3,Emmanuel Perisse
### Emmanuel Perisse
1Centre for Neural Circuits and Behaviour, The University of Oxford, Tinsley Building, Mansfield Road, Oxford OX1 3SR, UK
Find articles byEmmanuel Perisse
1,Carlas S Smith
### Carlas S Smith
1Centre for Neural Circuits and Behaviour, The University of Oxford, Tinsley Building, Mansfield Road, Oxford OX1 3SR, UK
Find articles byCarlas S Smith
1,J Scott Lauritzen
### J Scott Lauritzen
3Janelia Research Campus, Howard Hughes Medical Institute, Ashburn, VA 20147, USA
Find articles byJ Scott Lauritzen
3,Marta Costa
### Marta Costa
2Drosophila Connectomics, Department of Zoology, University of Cambridge, Cambridge CB2 3EJ, UK
Find articles byMarta Costa
2,Gregory SXE Jefferis
### Gregory SXE Jefferis
2Drosophila Connectomics, Department of Zoology, University of Cambridge, Cambridge CB2 3EJ, UK
4Division of Neurobiology, MRC Laboratory of Molecular Biology, Cambridge CB2 0QH, UK
Find articles byGregory SXE Jefferis
2,4,7,Davi D Bock
### Davi D Bock
3Janelia Research Campus, Howard Hughes Medical Institute, Ashburn, VA 20147, USA
Find articles byDavi D Bock
3,8,Scott Waddell
### Scott Waddell
1Centre for Neural Circuits and Behaviour, The University of Oxford, Tinsley Building, Mansfield Road, Oxford OX1 3SR, UK
Find articles byScott Waddell
1,5,9,∗
* Author information
* Article notes
* Copyright and License information
1Centre for Neural Circuits and Behaviour, The University of Oxford, Tinsley Building, Mansfield Road, Oxford OX1 3SR, UK
2Drosophila Connectomics, Department of Zoology, University of Cambridge, Cambridge CB2 3EJ, UK
3Janelia Research Campus, Howard Hughes Medical Institute, Ashburn, VA 20147, USA
4Division of Neurobiology, MRC Laboratory of Molecular Biology, Cambridge CB2 0QH, UK
∗Corresponding authorscott.waddell@cncb.ox.ac.uk
5
Twitter: @scottishwaddell
6
Twitter: @FelsenbergJ
7
Twitter: @gsxej
8
Twitter: @dddavi
9
Lead Contact
Received 2018 Jan 24; Revised 2018 Aug 7; Accepted 2018 Aug 13.
©2018 The Author(s)
This is an open access article under the CC BY license (http://creativecommons.org/licenses/by/4.0/).
PMC Copyright notice
PMCID: PMC6198041  PMID:30245010
## Summary
Accurately predicting an outcome requires that animals learn supporting and conflicting evidence from sequential experience. In mammals and invertebrates, learned fear responses can be suppressed by experiencing predictive cues without punishment, a process called memory extinction. Here, we show that extinction of aversive memories in*Drosophila*requires specific dopaminergic neurons, which indicate that omission of punishment is remembered as a positive experience. Functional imaging revealed co-existence of intracellular calcium traces in different places in the mushroom body output neuron network for both the original aversive memory and a new appetitive extinction memory. Light and ultrastructural anatomy are consistent with parallel competing memories being combined within mushroom body output neurons that direct avoidance. Indeed, extinction-evoked plasticity in a pair of these neurons neutralizes the potentiated odor response imposed in the network by aversive learning. Therefore, flies track the accuracy of learned expectations by accumulating and integrating memories of conflicting events.
**Keywords:**memory, extinction, dopamine, neural plasticity, parallel memory, competition, neural circuit, connectomics,*Drosophila*
## Graphical Abstract
graphic file with name fx1.jpg
Open in a new tab
## Highlights
* •Omission of expected punishment extinguishes learned avoidance behavior
* •Lack of punishment is learned as a positive experience
* •The original aversive and the new appetitive memory co-exist in different places
* •Opposing memories are integrated within specific output neurons to steer behavior
The omission of punishment is remembered as a rewarding experience, and this positive memory then competes against prior aversive memory to mediate the extinction of avoidance behavior.
## Introduction
Learning allows animals to predict future events. However, sometimes things do not happen when expected. Therefore, animals must also learn when expectations are not met, so that their behavior remains most appropriately directed by life experience. When humans have problems recognizing that a traumatic episode is unlikely to recur they may exhibit pathological manifestations of anxiety (Lissek and van Meurs, 2015).
A wide variety of animals can be trained to recognize that a specific sensory cue predicts pending punishment. When encountering the cue after training, they exhibit avoidance or escape behaviors, and if there is nowhere to go, they sometimes freeze. In almost all cases, learning that the cue is not such a reliable predictor, following repeated exposure without penalty, reduces the behavioral response, through a process called extinction learning. This new learning is thought to produce a parallel extinction memory, which competes with the initial aversive memory (Bouton, 2004). Many studies have indicated that extinction memory involves neural circuitry and molecular pathways different than those required for initial learning (e.g.,Berman and Dudai, 2001,Bahar et al., 2003,Repa et al., 2001,Herry et al., 2010). However, it is unclear how and where extinction memories are formed and what neural network mechanisms allow extinction memories to be integrated with the initial memory, to neutralize learned behavior.
Studying extinction of olfactory memory in*Drosophila*provides an opportunity to understand the underlying neural processes at cellular resolution. Recent progress has uncovered mechanisms for the formation and expression of aversive and appetitive memories (Cognigni et al., 2018). Anatomically discrete dopaminergic neurons (DANs) provide punishment or reward teaching signals to different compartments in the mushroom body (MB) network (Claridge-Chang et al., 2009,Aso et al., 2010,Liu et al., 2012,Burke et al., 2012,Lin et al., 2014). There, dopamine release acts through dopamine receptors, especially DopR1, to drive cAMP-dependent plasticity of odor-evoked activity and ultimately presynaptic depression of specific output synapses from odor-activated Kenyon cells (KCs) (Yu et al., 2006,Kim et al., 2007,Tomchik and Davis, 2009,Qin et al., 2012,Zhang and Roman, 2013,Boto et al., 2014,Hige et al., 2015). Aversive learning depresses the relative conditioned odor drive from KCs to mushroom body output neurons (MBONs) whose activity favors approach behavior, whereas reward learning weakens connections onto MBONs directing avoidance (Séjourné et al., 2011,Owald et al., 2015,Hige et al., 2015,Perisse et al., 2016). Therefore, in simplistic terms, learning switches off certain odor-specific connections in the overall MBON network, which skews odor-driven activity toward the remaining MBON pathways either directing avoidance or approach (Aso et al., 2014b,Owald and Waddell, 2015).
An important consequence of this skewed MBON network model is that after learning, re-exposure of the trained odor drives a different configuration of the MBON network to that driven prior to and during learning. Since aversive learning switches the network into an avoidance configuration, all circuitry that lies downstream of avoidance directing MBONs should also be preferentially driven by the conditioned odor when the fly re-experiences it without punishment.
Here, we describe a neural mechanism for extinction of aversive olfactory memory in*Drosophila*. Re-experiencing a trained odor, without expected punishment drives acquisition of extinction memory. Extinction learning requires activity of a population of dopaminergic neurons, some of which are known to encode reward and are downstream of avoidance directing MBONs. Imaging odor-evoked calcium responses in the MBON network established that traces of the original aversive and new extinction memories co-exist. Anatomy and physiology demonstrate that the two memories interact within a pair of MBONs, which direct avoidance behavior. Extinction driven plasticity, measured in the dendrites of these specific MBONs (M6 or MBON-γ5β′2a), neutralizes potentiation of the trained-odor response that was imposed by aversive learning, via the release of feedforward inhibition to the M6 axons. Aversive memory performance is therefore extinguished by competition with a new memory of positive valence, formed at a different place in the MBON network.
## Results
### Aversive Memory Extinction
*Drosophila*can learn to associate an odor as a predictor of forthcoming electric shock (Tully and Quinn, 1985). Following training, flies exhibit odor-specific avoidance in a T-maze. Aversive olfactory memory performance can be partially extinguished (Quinn et al., 1974,Dudai, 1977,Tully and Quinn, 1985). We first established conditions that most effectively extinguished aversive memory (Figures S1A and S1B). Flies were trained by pairing odor with 90 V shock (CS+ odor) followed by another odor alone (CS− odor). 30 min after training, flies were re-exposed to CS+ wi

# Computational principles of synaptic memory consolidation
URL: https://pubmed.ncbi.nlm.nih.gov/27694992/
Author: Marcus K Benna, Stefano Fusi

Computational principles of synaptic memory consolidation

# Computational principles of synaptic memory consolidation 

 Nat Neurosci. 2016 Dec;19(12):1697-1706. doi: 10.1038/nn.4401. Epub 2016 Oct 3. 

### Authors 

 Marcus K Benna 1, Stefano Fusi 1 2 

### Affiliations 

- 1 Center for Theoretical Neuroscience, College of Physicians and Surgeons, Columbia University, New York, New York, USA.
- 2 Mortimer B. Zuckerman Mind Brain Behavior Institute, College of Physicians and Surgeons, Columbia University, New York, New York, USA.

## Abstract 

 Memories are stored and retained through complex, coupled processes operating on multiple timescales. To understand the computational principles behind these intricate networks of interactions, we construct a broad class of synaptic models that efficiently harness biological complexity to preserve numerous memories by protecting them against the adverse effects of overwriting. The memory capacity scales almost linearly with the number of synapses, which is a substantial improvement over the square root scaling of previous models. This was achieved by combining multiple dynamical processes that initially store memories in fast variables and then progressively transfer them to slower variables. Notably, the interactions between fast and slow variables are bidirectional. The proposed models are robust to parameter perturbations and can explain several properties of biological memory, including delayed expression of synaptic modifications, metaplasticity, and spacing effects.

# eLife’s transparent reporting form
URL: https://cdn.elifesciences.org/xpub/guides/transparent_reporting.pdf
Author: Dan Gould

## eLife’s transparent reporting form

We encourage authors to provide detailed information within their submission to facilitate the interpretation and replication of experiments. Authors can upload supporting documentation to indicate the use of appropriate reporting guidelines for health-related research (see EQUATOR Network), life science research (see the BioSharing Information Resource), or the ARRIVE guidelines for reporting work involving animal research. Where applicable, authors should refer to any relevant reporting standards documents in this form.

If you have any questions, please consult our Journal Policies and/or contact us: editorial@elifesciences.org.

Sample-size estimation

• You should state whether an appropriate sample size was computed when the study was being designed 
• You should state the statistical method of sample size computation and any required assumptions 
• If no explicit power analysis was used, you should describe how you decided what sample (replicate) size (number) to use 

Please outline where this information can be found within the submission (e.g., sections or figure legends), or explain why this information doesn’t apply to your submission:

Replicates

• You should report how often each experiment was performed 
• You should include a definition of biological versus technical replication 
• The data obtained should be provided and sufficient information should be provided to indicate the number of independent biological and/or technical replicates 
• If you encountered any outliers, you should describe how these were handled 
• Criteria for exclusion/inclusion of data should be clearly stated 
• High-throughput sequence data should be uploaded before submission, with a private link for reviewers provided (these are available from both GEO and ArrayExpress) 

Please outline where this information can be found within the submission (e.g., sections or figure legends), or explain why this information doesn’t apply to your submission:

Statistical reporting

• Statistical analysis methods should be described and justified 
• Raw data should be presented in figures whenever informative to do so (typically when N per group is less than 10) 
• For each experiment, you should identify the statistical tests used, exact values of N, definitions of center, methods of multiple test correction, and dispersion and precision measures (e.g., mean, median, SD, SEM, confidence intervals; and, for the major substantive results, a measure of effect size (e.g., Pearson's r, Cohen's d) 
• Report exact p-values wherever possible alongside the summary statistics and 95% confidence intervals. These should be reported for all key questions and not only when the p-value is less than 0.05. 

Please outline where this information can be found within the submission (e.g., sections or figure legends), or explain why this information doesn’t apply to your submission:

| | | (For large |
| --- | --- | --- |
| datasets, or papers with a very large number of statistical tests, you may upload a single table file with tests, Ns, etc., with reference to sections Group allocation Please outline where this information can be found within the submission (e.g., sections or figure legends), or explain why this information doesn’t apply to your submission: | • • | in the manuscript.) Indicate how samples were allocated into experimental groups (in the case of clinical studies, please specify allocation to treatment method); if randomization was used, please also state if restricted randomization was applied Indicate if masking was used during group allocation, data collection and/or data analysis |
| | | |
| Additional data Please indicate the figures or tables for which source data files have been provided: | • • • • • | files (“source data”) We encourage you to upload relevant additional data files, such as numerical data that are represented as a graph in a figure, or as a summary table Where provided, these should be in the most useful format, and they can be uploaded as “Source data” files linked to a main figure or table Include model definition files including the full list of parameters used Include code used for data analysis (e.g., R, MatLab) Avoid stating that data files are “available upon request” |
| | | |
