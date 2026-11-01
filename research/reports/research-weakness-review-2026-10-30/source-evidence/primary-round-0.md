Accessed 2026-10-30 via connected Exa; extraction capped per page. Excerpts and omissions are not full-figure coverage.

# Lateral Axonal Modulation is Required for Stimulus-Specific Olfactory Conditioning in Drosophila - PMC
URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC9613607/
Published: 2022-09-20
Author: Julia E Manoim, Andrew M Davidson, Shirley Weiss, Toshihide Hige, Moshe Parnas

Lateral Axonal Modulation is Required for Stimulus-Specific Olfactory Conditioning in Drosophila - PMC 

# Lateral Axonal Modulation is Required for Stimulus-Specific Olfactory Conditioning in Drosophila 

Julia E Manoim

 1, Andrew M Davidson

 2, Shirley Weiss

 1, Toshihide Hige

 2, 3, 4, #, Moshe Parnas

 2. Department of Biology, University of North Carolina at Chapel Hill, Chapel Hill, NC 27599, USA

Lead Contact: Moshe Parnas, mparnas@tauex.tau.ac.il

Author contributions

JEM: Conceptualization, methodology, investigation, formal analysis, writing–review & editing, visualization. AMD: Methodology, investigation, writing–original draft, writing–review & editing. TH: methodology, investigation, formal analysis, writing–original draft, writing–review & editing, supervision, funding acquisition. MP: Initiated the project, conceptualization, methodology, investigation, formal analysis, software, writing–original draft, writing–review & editing, visualization, supervision, funding acquisition.

Co-corresponding authors: mparnas@tauex.tau.ac.il, hige@email.unc.edu

## Summary

Effective and stimulus-specific learning is essential for animals’ survival. Two major mechanisms are known to aid stimulus specificity of associative learning. One is accurate stimulus-specific representations in neurons. The second is a limited effective temporal window for the reinforcing signals to induce neuromodulation after sensory stimuli. However, these mechanisms are often imperfect in preventing unspecific associations; different sensory stimuli can be represented by overlapping populations of neurons, and more importantly, the reinforcing signals alone can induce neuromodulation even without coincident sensory-evoked neuronal activity. Here we report a crucial neuromodulatory mechanism that counteracts both limitations and is thereby essential for stimulus specificity of learning. In Drosophila, olfactory signals are sparsely represented by cholinergic Kenyon cells (KCs), which receive dopaminergic reinforcing input. We find that KCs have numerous axo-axonic connections mediated by the muscarinic type-B receptor (mAChR-B). By using functional imaging and optogenetic approaches, we show that these axo-axonic connections suppress both odor-evoked calcium responses and dopamine-evoked cAMP signals in neighboring KCs. Strikingly, behavior experiments demonstrate that mAChR-B knockdown in KCs impairs olfactory learning by inducing undesired changes to the valence of an odor that was not associated with the reinforcer. Thus, this local neuromodulation acts in concert with sparse sensory representations and global dopaminergic modulation to achieve effective and accurate memory formation.

## Graphical Abstract

## eTOC

Manoim et al. show that the abundant axo-axonic synapses between Kenyon cells in Drosophila mushroom body are mediated by muscarinic type-B receptors, which suppress Ca 2+ and cAMP signals in neighboring cells. Since both signals are essential for synaptic plasticity, the lateral suppression enhances the stimulus specificity of associative learning.

## Introduction

An animal’s survival critically depends on its capacity for sensory discrimination, which enables stimulus-specific modulation of behavior. In associative learning, a particular sensory input is associated with reward or punishment. Across animal phyla, dopamine (DA) plays a central role in mediating those reinforcement signals and inducing synaptic plasticity 1. The majority of DA signaling is mediated by volume transmission 2, but this only provides coarse spatial specificity. Neuromodulation must be further restricted to the few synapses whose activity represents the specific sensory stimulus that is being associated with the reinforcer. One important contributing mechanism to such synapse specificity is the requirement of temporal coincidence of DA input and synaptic activity for plasticity. That is, plasticity only occurs at synapses that are co-active with (or were active immediately before) DA input 3– 5. Another important mechanism observed in many cortical areas to help synapse specificity is the sparse coding of sensory representations 6– 10, which minimizes overlap between neuronal subpopulations whose activity represents distinct stimuli. This combination of a short eligibility time window and segregated sensory representation is assumed to underlie stimulus specificity of learning 11, 12. However, it is known that as sensory signals ascend to higher brain areas, there is an inherent increase in trial-to-trial variability 13– 15 that might risk the reliability of sparse representation as well as stimulus specificity of learning. In this study, we identified additional novel processes acting locally at axons to enhance synapse specificity of plasticity induction beyond that which can be accomplished at the neuronal population level.

In Drosophila olfactory learning, convergence of sensory and reinforcement signals takes place at axons of Kenyon cells (KCs), which are the third-order olfactory neurons constituting the principal neurons of the mushroom body (MB) 16. Specific DA neurons (DANs) densely innervate specific segments of the KC axon bundles 17– 19. The spatial arrangement of DAN-KC synapses revealed in the EM connectome suggests that DA modulation occurs by volume, rather than local, transmission 20. Thus, like in vertebrate brains, release of DA is unlikely to be target specific in the MB. Associative learning in flies almost completely depends on G s -coupled DA receptor, Dop1R1, expressed in KCs 21, 22. Since one of the classical learning mutant genes identified by genetic screen was rutabaga (rut), which encodes Ca 2+ -dependent adenylate cyclase abundantly expressed in KCs 23– 25, it is believed that coincidence of odor-evoked Ca 2+ influx in KCs and DA input triggers cyclic adenosine monophosphate (cAMP)-dependent plasticity 26. Indeed, KC activation and DA application can synergistically elevate cAMP level in KC axons in a rut-dependent manner 27. Furthermore, simultaneous activation of KCs and DANs can induce robust long-term depression (LTD) at KC to MB output neuron (MBON) synapses, and the plasticity induction strictly depends on the temporal sequence of KC and DAN activity 5, 28– 30.

Just like pyramidal neurons of the olfactory cortex, KCs show sparse responses to odors 31, 32. The sparseness of the KC response depends at least in part on a single, key inhibitory neuron in the MB called anterior paired lateral (APL) neuron 33. Impairment of sparse coding by inactivating APL neuron causes learning defects, demonstrating that sparse coding at KCs is essential for stimulus-specific learning 33, 34. However, sparse coding alone is not enough to prevent unspecific association. First, there are significant overlaps between representations of odors whether or not they are chemically related 35. The degree of such overlap directly correlates with the degree of crosstalk in plasticity 5. Second, while, on average, only about 5 % of KCs reliably respond to multiple presentations of a given odor, there are up to 15 % additional KCs that unreliably respond in a given trial 32. Those unreliable responders show smaller Ca 2+ responses than reliable ones 32. While the former phenomena (i.e. reliable overlap) could be beneficial for animals by contributing to biologically important generalization across stimuli 5, 35, the latter (i.e. unreliable overlap) will be only detrimental for learning by causing unspecific learning. This is important because dopamine-induced plasticity at KC-MBON synapses is so effective that even a single, brief odor-DA pairing can induce a long-lasting change in odor responses in some MBONs 5, 28, 29. Furthermore, despite the prevailing model of coincidence detection of Ca 2+ and DA signals by Rutabaga, DA alone can elevate cAMP level in KCs to some extent even without activation of KCs 27, 36. These considerations prompted us to search for additional mechanisms at synaptic terminals to prevent unspecific association.

Recently reported ultrastructural connectomics of the MB circuit revealed that there are surprisingly large numbers of KC-KC connections. In fact, more than 80% of local synaptic inputs to the KC axons are provided by the cholinergic KCs themselves 20. Since no excitatory role was found for acetylcholine (ACh) in KC axons 37, it suggests that ACh most likely acts as a neuromodulator rather than fast excitatory neurotransmitter. Although ACh is the main excitatory neurotransmitter in the Drosophila brain, its modulatory action has been understudied. The Drosophila brain expresses only two types of metabotropic muscarinic ACh receptors: mAChR-A, coupled to G q, and mAChR-B, coupled to G i/o 38, 39. Because of the distinct downstream pathways, genetic manipulations of one of the receptors do not result in functional compensation by the other. Furthermore, mAChR-A is expressed only in KC dendrites 40, suggesting a possible role for mAChR-B in KC-KC axonal neuromodulation.

Here we show that KC-KC axonal interaction is mediated by mAChR-B. This mAChR-B-mediated neuromodulation has two roles: it decreases both odor-evoked Ca 2+ elevation and DA-induced cAMP elevation. Thus, this neuromodulation acts to reduce both signals that are required for KC-MBON synaptic plasticity. We further show that knocking down mAChR-B results in unspecific learning. That is, an odor that was not coupled to a punishment signal is perceived as being coupled to one. We therefore suggest that active KCs release ACh on cognate KCs that are less or non-active. This lateral neuromodulation enhances stimulus specificity of learning.

### γ KCs have extensive lateral axo-axonal connections.

Our central hypothesis is that abundant axonal interactions between KCs mediate essential neuromodulation for learning. We therefore used the recently published Drosophila brain connectome 41 to examine KC-KC interactions. Our goal was to uncover which type of KCs has the most lateral connections and to examine the cellular compartment in which these lateral KC-KC connections occur. As expected, almost no KC-KC interactions are observed between dendrites, and the vast majority of KC-KC interactions are between axons (Figure S1A). There are three types of KCs (α/β, α’/β’ and γ), which are defined according to their innervation pattern 17, 18. αβ and α’β’ KCs bifurcate and send axons to the vertical (α and α’) and horizontal (β and β’) lobes, whereas γ KCs send axons only to the horizontal γ lobe. These different KCs play different roles in olfactory learning 26, 42. KC-KC interactions were mostly limited to within-subtypes (Figure S1A). γ KCs showed the most robust connectivity, with each KC synapsing on average with 190 other KCs, whereas α/β and α’/β’ synapsed on average on 145 and 109 KCs respectively (Figure S1B, C).

### mAChR-B is expressed in γ KC axonal terminals.

Recently, KCs were found to be cholinergic 37. It has been also suggested that KC axons are essentially devoid of nicotinic receptors, as local application of ACh or nicotine on KC axons generated no Ca 2+ signal 37. Although we recently showed that mAChR-A is expressed in KCs, it is localized at the dendrites 40. As the fly brain only expresses two muscarinic receptors 43, 44, mAChR-B is the most logical candidate to mediate KC-KC axonal interactions. We therefore first examined which types of KCs express mAChR-B. To this end, we used two driver lines that can express GAL4 wherever mAChR-B is endogenously expressed; one is from the Minos-mediated integration cassette (MiMIC) collection 45, and the other from the collection of T2A-GAL4 knockins 46. The MiMIC insertion resides in the 5’-untranslated region of the mAChR-B gene, and we used recombinase-mediated cassette exchange (RMCE) to replace the original MiMIC cassette that contains GFP with a MiMIC cassette containing GAL4 45 to generate a new mAChR-B-MiMIC-GAL4 driver line. In the case of the mAChR-B-T2A-GAL4 knockins, the T2A-GAL4 cassette is inserted immediately upstream of the mAChR-B stop codon. Enhancer-driven eGFP expression using those two independent lines was evident in α/β and γ but not α’/β’ KCs (Figure 1). Consistent with these results, single-cell or cell-type-specific transcriptomic analyses of the Drosophila brain 43, 44, 47 suggest that mAChR-B is expressed more strongly in αβ and γ than in α’β’ KCs (Figure S1D– F). To determine which subcellular compartments express mAChR-B, we generated a transgene of UAS-mAChR-B tagged with the hemagglutinin (HA) tag in its C-terminal and used the pan-KC driver line, OK107-GAL4. Overexpression of mAChR-B-HA revealed expression in the axonal lobes and cell bodies but not in the dendrites at the calyx (Figure 1). These results suggest that in the MB, mAChR-B is preferentially expressed in the axons of α/β and γ KCs.

#### Figure 1: mAChR-B expression pattern.

Open in a new tab

Maximum intensity projection of confocal sections through the central brain of a fly carrying MiMIC-mAChR-B-GAL4 (left) or mAChR-B-T2A-GAL4 (middle), and UAS-GFP transgenes. MB αβ and γ lobes are clearly observed (bottom, 80 and 71 confocal sections respectively, 1 μm). Very weak GFP expression is observed in α’β’ lobes. As expected from soluble GFP labeling, the calyx is clearly observed (top, 44 and 24 confocal sections respectively, 1 μm). Right, the pan KC driver, OK107-GAL4 was used to overexpress UAS-mAChR-B-HA (with an HA tag). While KC axons at the MB lobes are clearly visible (bottom, 43 confocal sections, 0.5 μm), there is no expression at the calyx (compare to left and middle panels, 44 confocal sections, 0.5 μm) indicating mAChR-B is normally expressed in the axonal compartment. See also Figure S1 and Data S1.

### mAChR-B expression in KCs is required for efficient aversive olfactory learning

To test our central hypothesis, we next examined whether mAChR-B is required for aversive associative olfactory conditioning. To this end, we knocked down mAChR-B expression using one of two UAS-RNAi lines, “RNAi 1” or “RNAi 2,” the latter of which required co-expression of Dicer-2 (Dcr-2) for optimal knockdown (KD). To evaluate the RNAi efficiency, we performed quantitative real-time polymerase chain reaction (qRT-PCR). We knocked down mAChR-B expression using the pan-neuronal driver elav-GAL4. Both RNAi 1 and RNAi 2 significantly reduced mAChR-B levels, to about 55% and 25% of the original mAChR-B level (Figure S2A). To knock down mAChR-B in KCs, we used the pan-KC driver OK107-GAL4. Short-term aversive memory was examined using two odors, 4-methylcyclohexanol (MCH) and 3-octanol (OCT), which are standard in the field 48. For both UAS-RNAi transgenes, similar reduction in memory performance was observed, whether training was against MCH or OCT (Figure 2A). To verify that the reduced learning does not arise from defects in odor or electric shock perception, we examined naïve odor valence and preference as well as reaction to electric shock. Both UAS-RNAi transgenes had no effect on these properties (Figure S2B– D). To rule out the possibility that developmental effects may underlie the learning defect observed in mAChR-B KD flies, we used tub-GAL80 ts to suppress RNAi 1 expression during development. GAL80 ts blocks the GAL4 transcription factor at 23°C but allows for normal expression of the UAS transgene at 31°C 49. Flies were grown at 23°C until post-eclosion to block RNAi expression and allow for normal development and were then transferred to 31°C for 7 days to allow for the RNAi to be expressed and take effect. KD of mAChR-B only at the adult stage recapitulated the effect of constitutive KD of mAChR-B (Figure 2B). As a control to verify that GAL80 ts efficiently blocks RNAi expression, flies were constantly grown at 23°C (i.e., without transferring them to 31°C), thus blocking the RNAi expression also in adult flies. These flies showed normal olfactory associative learning (Figure 2B). Together, these results indicate that mAChR-B has a physiological role in associative olfactory aversive conditioning.

#### Figure 2: mAChR-B is required in γ KCs for short term aversive olfactory learning.

Open in a new tab

A. Learning scores in flies with mAChR-B RNAi 1 or 2 driven by OK107-GAL4. mAChR-B KD reduced learning scores compared to controls (mean ± SEM), n (left to right): 49, 162, 77, 66, 61, 60, 63, 51; * p < 0.05, ** p<0.01, *** p<0.001; (Kruskal-Wallis with Dunn’s correction for multiple comparisons). For detailed statistical analysis see Table S1. B. Learning scores in flies with mAChR-B RNAi 1 driven by OK107-GAL4 with GAL80 ts repression. Flies raised at 23 °C and heated to 31 °C as adults (red horizontal bar) had impaired learning compared to controls. Control flies kept at 23 °C throughout (blue horizontal bar), thus blocking mAChR-B RNAi expression, showed no learning defects (mean ± SEM), n (left to right): 63, 60, 69, 61; * p < 0.05, ** p<0.01, *** p<0.001; (Kruskal-Wallis with Dunn’s correction for multiple comparisons). For detailed statistical analysis see Table S1. C. mAChR-B RNAi 1 was targeted to different subpopulations of KCs using c305a-GAL4 (α’β’ KCs), MB247-GAL4 (αβγ KCs), R28H05-GAL4 (αβ KCs), and R71G10-GAL4 (γ KCs). Learning scores were reduced compared to controls when mAChR-B RNAi 1 was expressed in αβ and γ KCs or γ KCs alone, but not when mAChR-B RNAi 1 was expressed in αβ or α’β’ KCs (mean ± SEM), n (left to right): 162, 73, 70, 54, 61, 72, 60, 91, 69; * p < 0.05, ** p<0.01, (Kruskal-Wallis with Dunn’s correction for multiple comparisons). For detailed statistical analysis see Table S1. The data for the UAS-mAChR-B RNAi 1 control are duplicated from panel A. See also Figure S2, Data S1 and Table S1.

### mAChR-B is required for olfactory learning in γ KCs, but not in αβ or α’β’ KCs

Following the expression pattern of mAChR-B that is limited to αβ and γ KCs (Figure 1), we sought to examine in which KCs mAChR-B has a role in olfactory learning. To this end, we knocked down mAChR-B expression using RNAi 1 in different KC subtypes. As expected from the anatomical expression pattern of mAChR-B (Figure 1), aversive olfactory conditioning was impaired when mAChR-B was knocked down in αβ and γ KCs using MB247-GAL4, but not by KD in α’β’ KCs using c305a-GAL4 (Figure 2C). To examine if mAChR-B is required for aversive olfactory conditioning in both αβ and γ KCs, we used R28H05-GAL4 and R71G10-GAL4 lines, which drives expression only in αβ KCs or in γ KCs, respectively. Aversive olfactory conditioning was impaired when mAChR-B was knocked down in γ, but not αβ, KCs (Figure 2C). The combined expression pattern, anatomical connectivity, and behavioral results all point to a role of mAChR-B in the context of aversive olfactory conditioning, specifically in γ KCs axons.

### mAChR-B suppresses odor responses only in γ KC axons

To gain mechanistic understanding of the role played by mAChR-B in olfactory learning, we next examined whether mAChR-B contributes to olfactory responses in KCs. To this end, we expressed the genetically encoded Ca 2+ indicator, GCaMP6f 50, with or without mAChR-B RNAi 1 using MB247-GAL4 (labels α/β and γ KCs), c305a-GAL4 (labels α’/β’ KCs), or R71G10-GAL4 (labels only γ KCs) and examined, using in vivo 2-photon functional imaging, the effect mAChR-B KD has on responses to MCH and OCT. To check for various effects on the odor response, we examined three different parameters: the peak of the “On” and “Off” responses and the overall strength of the odor response as measured by the integral of the response (see methods). Following mAChR-B KD, we found a significant and reliable increase in odor responses in γ KCs (Figure 3). The increase was observed in all three parameters. Importantly, consistent with our observation that mAChR-B is expressed in the axons, no effect was observed in the dendritic arborizations in the calyx. This was true for both the broad MB247-GAL4 driver line and the γ-KC-specific driver line, R71G10-GAL4 (Figure 3). The fact that no effect was observed in KC dendritic arborization (Figure 3) indicates that KC recruitment by upstream projection neurons is not impaired by mAChR-B KD and that mAChR-B neuromodulation occurs locally at KC presynaptic axonal terminals. To test whether the observed increase in Ca 2+ response affects synaptic release, we used the genetically encoded ACh sensor, ACh3.0 51 that reports ACh level in the synaptic cleft. We expressed ACh3.0 in KCs using the MB247-GAL4 driver line and examined KC synaptic release following odor application (MCH and OCT). Consistent with the above result, a significant increase of all three examined parameters (as above), except for OCT off response, was observed also for released ACh levels (Figure S3).

#### Figure 3: mAChR-B knockdown increases odor responses only in γ KC axons.

Open in a new tab

Odor responses to MCH and OCT were measured in control flies

# Client Challenge
URL: https://elifesciences.org/articles/16135

Client Challenge

A required part of this site couldn’t load. This may be due to a browser extension, network issues, or browser settings. Please check your connection, disable any ad blockers, or try using a different browser.

# Distinct dopamine receptor pathways underlie the temporal sensitivity of associative learning
URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC9012144/

Distinct dopamine receptor pathways underlie the temporal sensitivity of associative learning - PMC

Cell

. Author manuscript; available in PMC: 2022 Apr 15.

Published in final edited form as: Cell. 2019 Jun 20;178(1):60–75.e19. doi: 10.1016/j.cell.2019.05.040

# Distinct dopamine receptor pathways underlie the temporal sensitivity of associative learning

Annie Handler

1, Thomas GW Graham

1, Raphael Cohn

1, Ianessa Morantte

1, Andrew F Siliciano

1, Jianzhi Zeng

2, Yulong Li

2, Vanessa Ruta

1,*

- Copyright and License information
- Article notes
- Author information

1Laboratory of Neurophysiology and Behavior, The Rockefeller University, New York, NY, 10065, USA

2State Key Laboratory of Membrane Biology, Peking University School of Life Sciences, PKU-IDG/McGovern Institute for Brain Research, Peking-Tsinghua Center for Life Sciences, 100871 Beijing, China

Author Contributions

A.H. performed all experiments and data analysis with input from T.G., R.C., I.M., and A.S. T.G. designed and created the fly chamber assay and wrote custom code for data acquisition and analysis. R.C. designed and created the closed-loop system and wrote custom code for data analysis. I.M. generated and characterized the DopR1 mutant. A.S. performed preliminary characterization of dopamine receptor second messenger signaling. J.Z. and Y.L. generated the UAS-GRABDA flies. A.H. and V.R. wrote the manuscript with input from T.G., R.C., I.M., and A.S.

*

Correspondence and lead contact: ruta@rockefeller.edu

Issue date 2019 Jun 27.

PMC Copyright notice

PMCID: PMC9012144 NIHMSID: NIHMS1739428 PMID: 31230716

## Abstract

Animals rely on the relative timing of events in their environment to form and update predictive associations, but the molecular and circuit mechanisms for this temporal sensitivity remain incompletely understood. Here we show that olfactory associations in Drosophila can be written and reversed on a trial-by-trial basis depending on the temporal relationship between an odor cue and dopaminergic reinforcement. Through the synchronous recording of neural activity and behavior, we show that reversals in learned odor attraction correlate with bidirectional neural plasticity in the mushroom body, the associative olfactory center of the fly. Two dopamine receptors, DopR1 and DopR2, contribute to this temporal sensitivity by coupling to distinct second-messengers and directing either synaptic depression or potentiation. Our results reveal how dopamine receptor signaling pathways can detect the order of events to instruct opposing forms of synaptic and behavioral plasticity, allowing animals to flexibly update their associations in a dynamic environment.

## Introduction

To survive in a complex environment, animals must learn which sensory cues are predictive of reward or punishment and which are irrelevant. Associative circuits must therefore be sensitive to the relative timing and order of events in their environment, as this allows animals to infer the meaningful relationships between cues and outcomes.

Neural circuits involved in associative learning integrate sensory signals with rewarding or punishing reinforcement cues, frequently encoded by neuromodulatory dopaminergic neurons (Aso et al., 2014a; Bromberg-Martin et al., 2010; Lerner et al., 2015; Schultz et al., 1997; Waddell, 2016). This convergence of sensory and reinforcement pathways is thought to induce the circuit plasticity that underlies adaptive changes in behavior (Owald and Waddell, 2015; Pignatelli and Bonci, 2015; Surmeier et al., 2009). A strict temporal relationship between a sensory signal, such as an odor, and a reinforcement is required to drive learning: in order for the odor to predict an ensuing positive or negative outcome, it must consistently precede the reinforcement in time. This tight temporal contiguity represents a core principle of classical conditioning (Kandel et al., 1983; Mauk and Donegan, 1997; Pavlov, 1927; Rescorla, 1988; Tully and Quinn, 1985), as it permits animals to learn about the causal structure of the world around them.

Behavioral experiments in diverse species, from flies to humans, indicate that animals can form opposing associations with a sensory stimulus depending on its timing relative to a reinforcement cue (Gerber et al., 2014). Drosophila, for example, can form either negative or positive associations with an odor depending on whether the odor precedes or follows an aversive reinforcement during conditioning (Aso and Rubin, 2016; König et al., 2018; Tanimoto et al., 2004). This capacity suggests that the mushroom body, the associative olfactory center of Drosophila, is sensitive to the temporal ordering of an odor stimulus and a reinforcement, allowing flies to endow odors with distinct meaning depending on whether they predict a reinforcement or are associated with its termination. Such sensitivity may also provide a mechanism to overwrite inaccurate or obsolete associations as the temporal structure of the olfactory environment changes. Yet while the modulatory mechanisms for memory formation in the mushroom body have been extensively investigated (Heisenberg, 2003; Hige, 2018; Owald and Waddell, 2015), the underlying molecular or circuit basis for this temporal sensitivity remains incompletely understood.

In the mushroom body, odor identity is encoded by the activity of sparse ensembles of Kenyon Cells (KCs) (Campbell et al., 2013; Turner et al., 2008) whose parallel axons bundle together to form output lobes. The mushroom body lobes are tiled by discrete anatomic compartments defined by the segregated axons of a subset of dopaminergic neurons (DANs) and the dendrites of one or two mushroom body output neurons (MBONs) (Aso et al., 2014a; Tanaka et al., 2008). Positive and negative reinforcements are conveyed by distinct DANs that innervate different compartments, with the protocerebral posterior lateral (PPL) DANs carrying predominantly aversive signals (Aso et al., 2012; 2010; Claridge-Chang et al., 2009; Mao and Davis, 2009) and the protocerebral anterior medial (PAM) DANs conveying reward information (Burke et al., 2012; Liu et al., 2012; Yamagata et al., 2015). As a consequence of this compartmentalized organization, DANs can independently tune the strength of KC-MBON synapses within each compartment (Cohn et al., 2015; Hige et al., 2015; Owald et al., 2015; Séjourné et al., 2011), reweighting the net activity of the output population to bias an animal’s attraction to an odor through learning.

Here we combine high-resolution behavioral analysis with functional imaging to investigate how the Drosophila mushroom body detects the precise temporal ordering of events to extract meaningful relationships from the environment. We show that flies can write opposing olfactory associations on a trial-by-trial basis depending on the relative timing of odor cues and a dopaminergic reinforcement. Using a closed-loop olfactory system to monitor neural activity as an animal navigates in a virtual olfactory environment, we reveal that bidirectional plasticity in KC-MBON signaling correlates with the emergence of these learned behaviors. Furthermore, we show that the temporal specificity of this circuit relies on two dopamine receptors that couple to distinct intracellular signaling cascades and play opposing roles in regulating KC-MBON synaptic strength. Loss of either receptor renders the synapses of the mushroom body capable of only unidirectional plasticity, preventing this behavioral flexibility. By examining dopamine receptor second messenger signaling and neural and behavioral plasticity on the same timescales, our experiments reveal how biochemical pathways confer temporal sensitivity to this circuit, allowing animals to form and maintain accurate predictions in a complex and changing environment.

## Results

### Rapid and repeated updating of olfactory associations

To explore how Drosophila adapt to changes in the temporal structure of their environment, we developed methods to monitor the olfactory preferences of flies while precisely varying the timing of odor stimuli and dopaminergic reinforcement. An advantage of this assay over traditional paradigms like the T-maze is that it allows for repeated training and testing of the same individuals over several hours, permitting longitudinal examination of how odor attraction is altered in response to ongoing experience. We placed a cohort of 4–7 flies in a small chamber (Figure S1A) in constant laminar airflow and analyzed their walking trajectories in response to a brief pulse of the appetitive odor, apple cider vinegar (ACV) (see Supplementary Movie 1). A common navigational strategy many animals employ is to reorient and increase their upwind velocity when they encounter an attractive olfactory plume (Álvarez-Salvado et al., 2018; Bell and Wilson, 2016; Steck et al., 2012). Likewise, naïve flies exhibited robust upwind tracking of ACV, evident from visualizing the trajectories of individual animals (Figure 1B) or measuring the upwind velocity of the population’s center of mass within the chamber (Figure 1C).

#### Figure 1. Forward and Backward Conditioning Drives the Formation of Opposing Olfactory Associations.

Open in a new tab

(A) Anatomy of PPL (teal) and PAM (magenta) dopamine neuron (DAN) drivers that selectively innervate the mushroom body.

(B) Top: Behavioral protocol to compare tracking of apple cider vinegar (ACV) odor after forward pairing (FP) and backward pairing (BP) with optogenetic activation of PPL>CsChrimson flies. Bottom: Trajectories of individual flies from a representative experiment, aligned to common origin and wind direction. Flies that did not move in response to the odor were positioned at origin. The odor-evoked upwind displacement of all flies in odor is measured as a change in their center of mass (teal bar).

(C) Upwind velocity of PPL>CsChrimson flies in baseline, post-FP, and post-BP trials (odor indicated by gray box) measured as a change in the center of mass in the upwind direction of flies over the course of a trial. Gray lines: individual experiments; teal line: representative example from (B); black line: mean upwind velocity (n=8 experiments).

(D) Left: Raster plot of mean upwind velocity of PPL>CsChrimson flies across trials. The first row corresponds to the baseline response of naïve flies. Subsequent rows show behavioral response to odor after alternating FP and BP trials. Right: Mean odor-evoked upwind displacement for the corresponding row in the raster plot.

(E) Same as (D) using PAM>CsChrimson flies.

(F-G) Change in upwind displacement in odor after FP and BP for PPL conditioned (F) and PAM conditioned (G) animals measured relative to the preceding odor trial. n=8 experiments. One-sample t-test against zero with Bonferroni correction: ***p≤0.001. For (D-G) data presented as mean±SEM.

We began by asking whether we could suppress the innate attraction to ACV by pairing it with optogenetic activation of the PPL dopaminergic neurons that encode punitive cues and are sufficient to drive aversive memory formation (Aso et al., 2010; 2012; Claridge-Chang et al., 2009; König et al., 2018) (Figures 1A–B). We used an intersectional genetic strategy (Aso et al., 2014a) to selectively express the opsin, CsChrimson, in a subset of PPL neurons innervating six compartments of the mushroom body, allowing for temporally precise, light-evoked dopaminergic reinforcement. After just a single forward conditioning trial, in which the ACV stimulus preceded the onset of PPL activation, flies showed significantly reduced odor tracking (Figures 1B–C and S1B). This aversive conditioning resulted in both fewer flies tracking upwind in response to the odor and lower walking speeds for those that did track (Figures 1B–C and S2A–J).

The attenuated attraction to ACV after forward conditioning persisted for tens of minutes with little erosion due to passive decay (Figure S1B), underscoring that a single aversive reinforcement can drive lasting behavioral modulation. However, if animals subsequently experienced a single backward conditioning trial, in which ACV now followed PPL stimulation, the weakened attraction was immediately reversed, rendering flies strongly attracted to the odor again (Figures 1B–C and S1C). Interleaving forward and backward pairing reliably modulated the animals’ attraction to ACV for 50 conditioning trials by reversibly modifying multiple facets of tracking behavior (Figures S2A–J). Plotting the upwind displacement of animals over time generated a saw-tooth pattern, as their upwind tracking was alternately suppressed or enhanced with each conditioning trial (Figures 1D,F). This systematic modulation was not evident in control animals, in which light alone had a minimal effect on behavior (Figures S1D–E). Flies therefore have the capacity to write and update odor associations on a trial-by-trial basis as the predictive value of an odor changes. This reversal in odor tracking with forward and backward conditioning parallels previous observations that animals will avoid odors that predict punishment but become attracted to odors associated with its termination (Aso and Rubin, 2016; König et al., 2018; Tanimoto et al., 2004).

We next asked whether olfactory associations could be similarly modulated via activation of the PAM cluster of dopaminergic neurons responsive to rewarding stimuli that drive appetitive learning (Burke et al., 2012; Liu et al., 2012; Yamagata et al., 2015) (Figure 1A). Forward pairing of ACV with PAM activation modestly enhanced the upwind tracking of ACV in naïve animals. However, a single backward conditioning trial robustly suppressed odor tracking, independently of whether they had been previously conditioned or not (Figures 1E and S1F). This suggests that backward pairing, in which the odor becomes associated with the cessation of reward, instructs the formation of an aversive memory that can both suppress naïve attraction and overwrite a prior appetitive association. As with PPL conditioning, alternating forward and backward pairing of ACV with PAM activation modulated odor attraction with each trial, enhancing upwind tracking after forward pairing and suppressing tracking after backward pairing (Figures 1E,G and S2A–J). Thus both PAM and PPL DANs are sufficient to bidirectionally modify behavior such that activation of either dopaminergic population can produce appetitive or aversive associations depending on whether the odor precedes or follows the reinforcement in time.

A learned olfactory association can be weakened if an animal encounters the odor in the absence of the anticipated reinforcement or the reinforcement in the absence of the conditioned odor, violating the expected contingency between these cues (Aso and Rubin, 2016; Berry et al., 2012; Bouton, 2002; Felsenberg et al., 2017). However, in our assay interleaving forward pairing with either odor exposure or DAN activation alone was insufficient to drive the strong behavioral modulation observed with backward pairing (Figures S1G–J). Together, these observations reveal that during backward pairing input from both olfactory and dopaminergic pathways is required to rapidly overwrite a prior association and instruct a new odor association of the opposite valence in its place.

### Relating behavioral and neural modulation

To examine the temporal sensitivity of associative conditioning, we trained animals for 50 trials while varying the timing between odor and dopaminergic reinforcement, randomly selecting from a set of five different inter-stimulus intervals (ISIs) for each conditioning trial to account for any dependence on the trial structure. Shifting the relative timing between odor presentation and PPL or PAM DAN activation by only a few hundred milliseconds was sufficient to induce a switch from conditioned avoidance to attraction (Figures 2A–B), highlighting that individual flies can dynamically update their associations on a trial-by-trial basis to reflect changes in the predictive value of an odor cue.

#### Figure 2. Relating Behavioral and Neural Modulation.

Open in a new tab

(A) Top: Protocol varying inter-stimulus interval (ISI) between ACV odor and optogenetic activation of DANs during behavioral conditioning. Bottom: Change in upwind displacement after conditioning, measured relative to the preceding odor trial. PPL>CsChrimson (teal), PAM>CsChrimson (magenta), and CsChrimson only controls (black). n=6–7 experiments. Mann-Whitney test with Bonferroni correction: **p≤0.01, *<0.05, NS≥0.05.

(B) Overlay of data from (A) to compare temporal dependence of conditioning using PPL and PAM DANs.

(C) Schematic of mushroom body preparation used to measure KC-MBON plasticity.

(D) Top: Protocol varying inter-stimulus interval (ISI) between KC stimulation and chemogenetic activation of DANs during conditioning. Bottom: Average KC-evoked responses in the γ4 MBON pre and post conditioning with different ISIs. Arrowhead denotes time of KC stimulation.

(E) Black: Change in mean peak γ4 MBON response plotted as a function of ISI. n=5–6 flies for each ISI tested. Magenta: Behavioral data for PAM>CsChrimson animals re-plotted from (B). Significant change in γ4 MBON response after pairing was detected for the following ISI: −1.2 s p≤0.001, 0 s p<0.05, and 0.5 s p≤0.01; one-sample t-test against zero with Bonferroni correction. All data shown are presented as mean±SEM.

What neural mechanism might account for this bidirectional behavioral modulation? One possibility is that distinct compartments within the mushroom body could be sensitive to forward and backward conditioning such that opposing memories are written in parallel at different sites within the circuit as proposed for memory extinction (Felsenberg et al., 2018). Alternatively, this bidirectional behavioral modulation could reflect reversible plasticity of KC-MBON synapses within the same compartment. Indeed, dopamine has been shown to bidirectionally tune the strength of KC-MBON signaling, with forward conditioning driving depression of KC-MBON synapses (Cohn et al., 2015; Hige et al., 2015; Owald et al., 2015; Séjourné et al., 2011) while strong dopamine release in the absence of odor leads to synaptic potentiation (Berry et al., 2018; Cohn et al., 2015).

To explore how the timing of dopaminergic input shapes KC-MBON signaling, we initially examined the γ4 compartment whose olfactory signaling undergoes robust dopamine-dependent modulation (Cohn et al., 2015). To gain precise temporal control over both KC and DAN activation, we used a brain explant preparation and directly stimulated KCs by iontophoresing acetylcholine onto their dendrites in the mushroom body calyx, simulating olfactory input (Figure 2C). Similarly, γ4 DANs were stimulated by expressing the ATP-gated P2X2 channel in the PAM dopaminergic cluster and iontophoresing ATP onto their dendrites. We expressed the genetically encoded indicator GCaMP6s in the γ4 MBON and used KC-evoked dendritic calcium within the γ4 compartment to assess how the strength of KC-MBON signaling was altered following conditioning.

We found that a single forward conditioning trial led to depression of KC-MBON signaling that decayed slowly but could be reversed through a single backward conditioning trial (Figure S3A). Conversely, backward pairing led to lasting synaptic potentiation that could be reversed by a single forward conditioning trial (Figure S3B). Forward and backward pairing therefore bidirectionally regulate KC-MBON signaling on a trial-by-trial basis, mirroring the observed behavioral flexibility (Figures 1B–G and 2A–B). Varying the timing between KC and DAN stimulation during conditioning revealed a narrow temporal window over which the strength of KC-MBON signaling was bidirectionally modulated, shifting from potentiation when DAN stimulation preceded KC activation to depression when DAN stimulation was concurrent or followed KC activation (Figure 2D). While stronger or more prolonged dopamine release in the absence of an odor has been shown to potentiate KC-MBON signaling (Berry et al., 2018; Cohn et al., 2015), extending the KC-DAN inter-stimulus interval to 6 seconds resulted in minimal plasticity (Figure 2D). Importantly, the temporal dependence of KC-MBON plasticity within this compartment matched the timescale of behavioral plasticity evoked using the same PAM dopaminergic reinforcement (Figure 2E) suggesting that bidirectional regulation of KC-MBON signaling may contribute to reversals in behavioral preference.

Bidirectional tuning of KC-MBON synapses appears to represent a shared characteristic of different mushroom body compartments as γ2 and γ5 DANs could also instruct reversible plasticity within their cognate compartments with similar temporal sensitivity (Figures S3C–D). Furthermore, comparable synaptic modulation could be driven by DANs when activated by a naturalistic ave

# FIDE Handbook FIDE Laws of Chess taking effect from 1 January 2023
URL: https://handbook.fide.com/chapter/e012023

FIDE Handbook FIDE Laws of Chess taking effect from 1 January 2023

#### Content

FIDE Laws of Chess taking effect from 1 January 2023

Laws of Chess: For competitions starting from 1 January 2018 till 31 December 2022

Laws of Chess: For competitions starting before 1 July 2014

01. Laws of Chess (translation in Russian)

#### FIDE Laws of Chess taking effect from 1 January 2023

FIDE LAWS OF CHESS

Approved by the FIDE General Assembly on 07/08/2022

Applied from 01/01/2023

0.1 Introduction

FIDE Laws of Chess cover over-the-board play.

The Laws of Chess have two parts: 1. Basic Rules of Play and 2. Competitive Rules of Play.

The English text is the authentic version of the Laws of Chess (which were adopted at the 93 rd FIDE Congress at Chennai, India) coming into force on 1 January 2023.

0.2 Preface

The Laws of Chess cannot cover all possible situations that may arise during a game, nor can they regulate all administrative questions. Where cases are not precisely regulated by an Article of the Laws, it should be possible to reach a correct decision by studying analogous situations which are regulated in the Laws.

The Laws assume that arbiters have the necessary competence, sound judgement and absolute objectivity. Too detailed a rule might deprive the arbiter of his/her freedom of judgement and thus prevent him/her from finding a solution to a problem dictated by fairness, logic and special factors. FIDE appeals to all chess players and federations to accept this view.

A necessary condition for a game to be rated by FIDE is that it shall be played according to the FIDE Laws of Chess.

It is recommended that competitive games not rated by FIDE be played according to the FIDE Laws of Chess.

Member federations may ask FIDE to give a ruling on matters relating to the Laws of Chess.

BASIC RULES OF PLAY

Article 1: The Nature and Objectives of the Game of Chess

1.1 The game of chess is played between two opponents who move their pieces on a square board called a ‘chessboard’.

1.2 The player with the light-coloured pieces (White) makes the first move, then the players move alternately, with the player with the dark-coloured pieces (Black) making the next move.

1.3 A player is said to ‘have the move’ when his/her opponent’s move has been ‘made’.

1.4 The objective of each player is to place the opponent’s king ‘under attack’ in such a way that the opponent has no legal move.

1.4.1 The player who achieves this goal is said to have ‘checkmated’ the opponent’s king and to have won the game. Leaving one’s own king under attack, exposing one’s own king to attack and also ’capturing’ the opponent’s king is not allowed.

1.4.2 The opponent whose king has been checkmated has lost the game.

1.5 If the position is such that neither player can possibly checkmate the opponent’s king, the game is drawn (see Article 5.2.2).

Article 2: The Initial Position of the Pieces on the Chessboard

2.1 The chessboard is composed of an 8 x 8 grid of 64 equal squares alternately light (the ‘white’ squares) and dark (the ‘black’ squares).

The chessboard is placed between the players in such a way that the near corner square to the right of the player is white.

2.2 At the beginning of the game White has 16 light-coloured pieces (the ‘white’ pieces); Black has 16 dark-coloured pieces (the ‘black’ pieces).

| These pieces are as follows: | | | |
| --- | --- | --- | --- |
| A white king | usually indicated by the symbol | | K |
| A white queen | usually indicated by the symbol | | Q |
| Two white rooks | usually indicated by the symbol | | R |
| Two white bishops | usually indicated by the symbol | | B |
| Two white knights | usually indicated by the symbol | | N |
| Eight white pawns | usually indicated by the symbol | | |
| A black king | usually indicated by the symbol | | K |
| A black queen | usually indicated by the symbol | | Q |
| Two black rooks | usually indicated by the symbol | | R |
| Two black bishops | usually indicated by the symbol | | B |
| Two black knights | usually indicated by the symbol | | N |
| Eight black pawns | usually indicated by the symbol | | |

Staunton Pieces 

p Q K B N R

2.3 The initial position of the pieces on the chessboard is as follows:

2.4 The eight vertical columns of squares are called ‘files’. The eight horizontal rows of squares are called ‘ranks’. A straight line of squares of the same colour, running from one edge of the board to an adjacent edge, is called a ‘diagonal’.

Article 3: The Moves of the Pieces

3.1 It is not permitted to move a piece to a square occupied by a piece of the same colour.

3.1.1 If a piece moves to a square occupied by an opponent’s piece the latter is captured and removed from the chessboard as part of the same move.

3.1.2 A piece is said to attack an opponent’s piece if the piece could make a capture on that square according to Articles 3.2 to 3.8.

3.1.3 A piece is considered to attack a square even if this piece is constrained from moving to that square because it would then leave or place the king of its own colour under attack.

3.2 The bishop may move to any square along a diagonal on which it stands.

3.3 The rook may move to any square along the file or the rank on which it stands.

3.4 The queen may move to any square along the file, the rank or a diagonal on which it stands.

3.5 When making these moves, the bishop, rook or queen may not move over any intervening pieces.

3.6 The knight may move to one of the squares nearest to that on which it stands but not on the same rank, file or diagonal.

3.7 The pawn:

3.7.1 The pawn may move forward to the square immediately in front of it on the same file, provided that this square is unoccupied, or

3.7.2 on its first move the pawn may move as in 3.7.1 or alternatively it may advance two squares along the same file, provided that both squares are unoccupied, or

3.7.3 the pawn may move to a square occupied by an opponent’s piece diagonally in front of it on an adjacent file, capturing that piece.

3.7.3.1 A pawn occupying a square on the same rank as and on an adjacent file to an opponent’s pawn which has just advanced two squares in one move from its original square may capture this opponent’s pawn as though the latter had been moved only one square.

3.7.3.2 This capture is only legal on the move following this advance and is called an ‘en passant’ capture.

3.7.3.3 When a player, having the move, plays a pawn to the rank furthest from its starting position, he/she must exchange that pawn as part of the same move for a new queen, rook, bishop or knight of the same colour on the intended square of arrival. This is called the square of ‘promotion’.

3.7.3.4 The player's choice is not restricted to pieces that have been captured previously.

3.7.3.5 This exchange of a pawn for another piece is called promotion, and the effect of the new piece is immediate.

3.8 There are two different ways of moving the king:

3.8.1 by moving to an adjoining square

3.8.2 by ‘castling’. This is a move of the king and either rook of the same colour along the player’s first rank, counting as a single move of the king and executed as follows: the king is transferred from its original square two squares towards the rook on its original square, then that rook is transferred to the square the king has just crossed.

Before white kingside castling Before black queenside castling

After white kingside castling After black queenside castling

Before white queenside castling Before black kingside castling

After white queenside castling After black kingside castling

3.8.2.1 The right to castle has been lost:

1) If the king has already moved, or

2) With a rook that has already moved.

3.8.2.2 Castling is prevented temporarily:

3) If the square on which the king stands, or the square which it must cross, or the square which it is to occupy, is attacked by one or more of the opponent's pieces, or

4) If there is any piece between the king and the rook with which castling is to be effected.

3.9 The king in check:

3.9.1 The king is said to be 'in check' if it is attacked by one or more of the opponent's pieces, even if such pieces are constrained from moving to the square occupied by the king because they would then leave or place their own king in check.

3.9.2 No piece can be moved that will either expose the king of the same colour to check or leave that king in check.

3.10 Legal and illegal moves; illegal positions:

3.10.1 A move is legal when all the relevant requirements of Articles 3.1 – 3.9 have been fulfilled.

3.10.2 A move is illegal when it fails to meet the relevant requirements of Articles 3.1 – 3.9.

3.10.3 A position is illegal when it cannot have been reached by any series of legal moves.

Article 4: The Act of Moving the Pieces

4.1 Each move must be played with one hand only.

4.2 Adjusting the pieces or other physical contact with a piece:

4.2.1 Only the player having the move may adjust one or more pieces on their squares, provided that he/she first expresses his/her intention (for example by saying “j’adoube” or “I adjust”).

4.2.2 Any other physical contact with a piece, except for clearly accidental contact, shall be considered to be intent.

4.3 Except as provided in Article 4.2.1, if the player having the move touches on the chessboard, with the intention of moving or capturing:

4.3.1 one or more of his/her own pieces, he/she must move the first piece touched that can be moved.

4.3.2 one or more of his/her opponent’s pieces, he/she must capture the first piece touched that can be captured.

4.3.3 one or more pieces of each colour, he/she must capture the first touched opponent’s piece with his/her first touched piece or, if this is illegal, move or capture the first piece touched that can be moved or captured. If it is unclear whether the player’s own piece or his/her opponent’s piece was touched first, the player’s own piece shall be considered to have been touched before his/her opponent’s.

4.4 If a player having the move:

4.4.1 touches his/her king and a rook he/she must castle on that side if it is legal to do so

4.4.2 deliberately touches a rook and then his/her king he/she is not allowed to castle on that side on that move and the situation shall be governed by Article 4.3.1.

4.4.3 intending to castle, touches the king and then a rook, but castling with this rook is illegal, the player must make another legal move with his/her king (which may include castling with the other rook). If the king has no legal move, the player is free to make any legal move.

4.4.4 promotes a pawn, the choice of the piece is finalised when the piece has touched the square of promotion.

4.5 If none of the pieces touched in accordance with Article 4.3 or Article 4.4 can be moved or captured, the player may make any legal move.

4.6 The act of promotion may be performed in various ways:

4.6.1 the pawn does not have to be placed on the square of arrival.

4.6.2 removing the pawn and putting the new piece on the square of promotion may occur in any order.

4.6.3 If an opponent’s piece stands on the square of promotion, it must be captured.

4.7 When, as a legal move or part of a legal move, a piece has been released on a square, it cannot be moved to another square on this move. The move is considered to have been made in the case of:

4.7.1 A capture, when the captured piece has been removed from the chessboard and the player, having placed his/her own piece on its new square, has released this capturing piece from his/her hand.

4.7.2 Castling, when the player's hand has released the rook on the square previously crossed by the king. When the player has released the king from his/her hand, the move is not yet made, but the player no longer has the right to make any move other than castling on that side, if this is legal. If castling on this side is illegal, the player must make another legal move with his/her king (which may include castling with the other rook). If the king has no legal move, the player is free to make any legal move.

4.7.3 Promotion, when the player's hand has released the new piece on the square of promotion and the pawn has been removed from the board.

4.8 A player forfeits his/her right to claim against his/her opponent’s violation of Articles 4.1 – 4.7 once the player touches a piece with the intention of moving or capturing it.

4.9 If a player is unable to move the pieces, an assistant, who shall be acceptable to the arbiter, may be provided by the player to perform this operation.

Article 5: The Completion of the Game

5.1.1 The game is won by the player who has checkmated his/her opponent’s king. This immediately ends the game, provided that the move producing the checkmate position was in accordance with Article 3 and Articles 4.2 – 4.7.

5.1.2 The game is lost by the player who declares he/she resigns (this immediately ends the game), unless the position is such that the opponent cannot checkmate the player’s king by any possible series of legal moves. In this case the result of the game is a draw.

5.2.1 The game is drawn when the player to move has no legal move and his/her king is not in check. The game is said to end in ‘stalemate’. This immediately ends the game, provided that the move producing the stalemate position was in accordance with Article 3 and Articles 4.2 – 4.7.

5.2.2 The game is drawn when a position has arisen in which neither player can checkmate the opponent’s king with any series of legal moves. The game is said to end in a ‘dead position’. This immediately ends the game, provided that the move producing the position was in accordance with Article 3 and Articles 4.2 – 4.7.

5.2.3 The game is drawn upon agreement between the two players during the game, provided both players have made at least one move. This immediately ends the game.

Article 6: The Chessclock

6.1 ‘Chessclock’ means a clock with two time displays, connected to each other in such a way that only one of them can run at a time. ‘Clock’ in the Laws of Chess means one of the two time displays. Each time display has a ‘flag’.

‘Flag-fall’ means the expiration of the allotted time for a player.

6.2 Handling the chessclock:

6.2.1 During the game each player, having made his/her move on the chessboard, shall pause his/her own clock and start his/her opponent’s clock (that is to say, he/she shall press his/her clock). This ‘completes’ the move. A move is also completed if:

6.2.1.1 the move ends the game (see Articles 5.1.1, 5.2.1, 5.2.2, 9.2.1, 9.6.1 and 9.6.2), or

6.2.1.2 the player has made his/her next move, when his/her previous move was not completed.

6.2.2 A player must be allowed to pause his/her clock after making his/her move, even after the opponent has made his/her next move. The time between making the move on the chessboard and pressing the clock is regarded as part of the time allotted to the player.

6.2.3 A player must press his/her clock with the same hand with which he/she made his/her move. It is forbidden for a player to keep his/her finger on the clock or to ‘hover’ over it.

6.2.4 The players must handle the chessclock properly. It is forbidden to press it forcibly, to pick it up, to press the clock before moving or to knock it over. Improper clock handling shall be penalised in accordance with Article 12.9.

6.2.5 Only the player whose clock is running is allowed to adjust the pieces.

6.2.6 If a player is unable to use the clock, an assistant, who must be acceptable to the arbiter, may be provided by the player to perform this operation. His/Her clock shall be adjusted by the arbiter in an equitable way. This adjustment of the clock shall not apply to the clock of a player with a disability.

6.3 Allotted time:

6.3.1 When using a chessclock, each player must complete a minimum number of moves or all moves in an allotted period of time including any additional amount of time added with each move. All these must be specified in advance.

6.3.2 The time saved by a player during one period is added to his/her time available for the next period, where applicable. In the time-delay mode both players receive an allotted ‘main thinking time’. Each player also receives a ‘fixed extra time’ with every move. The countdown of the main thinking time only commences after the fixed extra time has expired. Provided the player presses his/her clock before the expiration of the fixed extra time, the main thinking time does not change, irrespective of the proportion of the fixed extra time used.

6.4 Immediately after a flag falls, the requirements of Article 6.3.1 must be checked.

6.5 Before the start of the game the arbiter shall decide where the chessclock is placed.

6.6 At the time determined for the start of the game White’s clock is started.

6.7 Default time:

6.7.1 The regulations of an event shall specify a default time in advance. If the default time is not specified, then it is zero. Any player who arrives at the chessboard after the default time shall lose the game unless the arbiter decides otherwise.

6.7.2 If the regulations of an event specify that the default time is not zero and if neither player is present initially, White shall lose all the time that elapses until he/she arrives, unless the regulations of an event specify or the arbiter decides otherwise.

6.8 A flag is considered to have fallen when the arbiter observes the fact or when either player has made a valid claim to that effect.

6.9 Except where one of Articles 5.1.1, 5.1.2, 5.2.1, 5.2.2, 5.2.3 applies, if a player does not complete the prescribed number of moves in the allotted time, the game is lost by that player. However, the game is drawn if the position is such that the opponent cannot checkmate the player’s king by any possible series of legal moves.

6.10 Chessclock setting:

6.10.1 Every indication given by the chessclock is considered to be conclusive in the absence of any evident defect. A chessclock with an evident defect shall be replaced by the arbiter, who shall use his/her best judgement when determining the times to be shown on the replacement chessclock.

6.10.2 If during a game it is found that the setting of either or both clocks is incorrect, either player or the arbiter shall stop the chessclock immediately. The arbiter shall install the correct setting and adjust the times and move-counter, if necessary. He/She shall use his/her best judgement when determining the clock settings.

6.11.1 If the game needs to be interrupted, the arbiter shall pause the chessclock.

6.11.2 A player may pause the chessclock only in order to seek the arbiter’s assistance, for example when promotion has taken place and the piece required is not available.

6.11.3 The arbiter shall decide when the game restarts.

6.11.4 If a player pauses the chessclock in order to seek the arbiter’s assistance, the arbiter shall determine whether the player had any valid reason for doing so. If the player has no valid reason for pausing the chessclock, the player shall be penalised in accordance with Article 12.9.

6.12.1 Screens, monitors, or demonstration boards showing the current position on the chessboard, the moves and the number of moves made/completed, and clocks which also show the number of moves, are allowed in the playing hall.

6.12.2 The player may not make a claim relying only on information shown in this manner.

Article 7: Irregularities

7.1 If an irregularity occurs and the pieces have to be restored to a previous position, the arbiter shall use his/her best judgement to determine the times to be shown on the chessclock. This includes the right not to change the clock times. He/She shall also, if necessary, adjust the clock’s move-counter.

7.2.1 If during a game it is found that the initial position of the pieces was incorrect, the game shall be cancelled and a new game shall be played.

7.2.2 If during a game it is found that the chessboard has been placed contrary to Article 2.1, the game shall continue but the position reached must be transferred to a correctly placed chessboard.

7.3 If a game has started with colours reversed then, if less than 10 moves have been made by both players, it shall be discontinued and a new game played with the correct colours. After 10 moves or more, the game shall continue.

7.4 Dispaced pieces:

7.4.1 If a player displaces one or more pieces, he/she shall re-establish the correct position in his/her own time.

7.4.2 If necessary, either the player or his/her opponent shall pause the chessclock and ask for the arbiter’s assistance.

7.4.3 The arbiter may penalise the player who displaces the pieces.

7.5 Illegal moves:

7.5.1 An illegal move is completed once the player has pressed his/her clock. If during a game it is found that an illegal move has been completed, the position immediately before the irregularity shall be reinstated. If the position immediately before the irregularity cannot be determined, the game shall continue from the last id
