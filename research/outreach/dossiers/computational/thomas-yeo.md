# B. T. Thomas Yeo

## Snapshot

As of 2026-09-30, B. T. Thomas Yeo is Associate Professor at the NUS Centre for Sleep & Cognition and the NUS Department of Electrical & Computer Engineering. NUS lists `thomas.yeo@nus.edu.sg` as the project contact. Singapore uses SGT (UTC+8), with no seasonal clock change. Confidence: high for role and email on NUS institutional pages; high for timezone. ([NUS current faculty profile](https://cde.nus.edu.sg/ece/staff/yeo-boon-thye-thomas/), [NUS profile/team](https://medicine.nus.edu.sg/maccc/neuroimaging/), [NUS project contact](https://medicine.nus.edu.sg/trp/human-potential/projects/machine-learning-of-brain-mri-to-improve-mental-health-and-disorder/), [Singapore time](https://www.timeanddate.com/worldclock/singapore/singapore))

## Why relevant

Yeo's work develops computational models and machine-learning methods to infer brain organization and link network structure to behavior. This offers a useful comparison for the project's challenge of separating what can be inferred from a connectome from what must be experimentally validated. His primary focus is human neuroimaging, so the biological scale and methods differ substantially. ([NUS research overview](https://medicine.nus.edu.sg/trp/human-potential/projects/machine-learning-of-brain-mri-to-improve-mental-health-and-disorder/))

## Current/recent work

- In 2024, Yeo coauthored a PNAS study using an fMRI-derived whole-cortex excitation/inhibition marker to examine cortical maturation and cognitive ability in youth. ([PNAS DOI](https://doi.org/10.1073/pnas.2318641121))
- In 2025, Yeo coauthored *Brain Harmony*, a NeurIPS paper combining structural MRI morphology and functional MRI dynamics into compact representations for downstream brain-related prediction tasks. ([NeurIPS 2025 paper](https://proceedings.neurips.cc/paper_files/paper/2025/hash/b0832cc57899cfd2d3fedeb3f330ba80-Abstract-Conference.html))

## Specific overlap with this project

There is conceptual overlap around constrained neural representations, network-level inference and careful validation. The FlyChess project remains a distinct insect simulation: its gamma4 association is engineered, full acceptance failed at 3/6 correct reversal choices, reward/sensory/action mappings remain unresolved, and chess transfer is untested. Yeo's human MRI work should be presented as methodological context, not direct evidence for fly synaptic learning. ([NUS project overview](https://medicine.nus.edu.sg/trp/human-potential/projects/machine-learning-of-brain-mri-to-improve-mental-health-and-disorder/), [project validation](../../../../documentation/design/neural-learning/gamma4-association-tests.md))

## What to ask

What is one validation design you would recommend to distinguish generalizable structure-function inference from performance that depends on a fixed decoder or a narrow set of training examples?

## Reasons he may not be the best contact

His program centers on human brain MRI, population datasets and computational network modeling; it does not directly address fly mushroom-body anatomy or reward-modulated synaptic plasticity. A fly experimentalist or connectome-constrained learning researcher may be a closer biological contact. ([NUS overview](https://medicine.nus.edu.sg/trp/human-potential/projects/machine-learning-of-brain-mri-to-improve-mental-health-and-disorder/))

## Junior/assistant routes in the lab or close collaboration

- **Shaoshi Zhang — Research Fellow, NUS Neuroimaging.** The current NUS roster lists this role, and Zhang coauthored the 2024 E/I-marker study with Yeo. See [separate dossier](thomas-yeo-shaoshi-zhang.md), [NUS roster](https://medicine.nus.edu.sg/maccc/neuroimaging/), and [PNAS paper](https://doi.org/10.1073/pnas.2318641121).
- The NUS Neuroimaging roster is an official group route; its public listing does not publish a separate lab-administration email. ([NUS roster](https://medicine.nus.edu.sg/maccc/neuroimaging/))

## Personalized email draft

**Subject:** A validation-design question from a student connectome project

Dear Professor Yeo,

I’m a [grade/year] student working independently on a connectome-constrained fly simulation. I have been reading your group’s work on brain-network inference, including the 2024 PNAS study of an excitation/inhibition marker and the 2025 NeurIPS *Brain Harmony* paper. I’m interested in how to test whether a model’s internal representation supports a result beyond the specific decoder or training examples used.

Our project is at an early engineering stage. A gamma4 association prototype changes persistent state, but its reward and sensory/action mappings are not biologically established. The full acceptance gate failed because only 3 of 6 seeds selected correctly after reversal. The puzzle runner currently records feedback without applying learning, and no chess transfer has been shown.

Could you suggest one validation design that would most clearly test whether a structure-function model generalizes beyond its chosen readout and training set? I can send a one-page protocol and results summary if useful.

Thank you for your time.

Best,
[Name]
[School / location]

## Sources (accessed 2026-09-30)

- [NUS Neuroimaging team and current roles](https://medicine.nus.edu.sg/maccc/neuroimaging/)
- [NUS ECE faculty profile](https://cde.nus.edu.sg/ece/staff/yeo-boon-thye-thomas/)
- [NUS project overview and public contact](https://medicine.nus.edu.sg/trp/human-potential/projects/machine-learning-of-brain-mri-to-improve-mental-health-and-disorder/)
- [In vivo whole-cortex marker of excitation-inhibition ratio (PNAS, 2024)](https://doi.org/10.1073/pnas.2318641121)
- [Brain Harmony (NeurIPS 2025)](https://proceedings.neurips.cc/paper_files/paper/2025/hash/b0832cc57899cfd2d3fedeb3f330ba80-Abstract-Conference.html)
- [Singapore timezone](https://www.timeanddate.com/worldclock/singapore/singapore)
- [Project association-validation report](../../../../documentation/design/neural-learning/gamma4-association-tests.md)
