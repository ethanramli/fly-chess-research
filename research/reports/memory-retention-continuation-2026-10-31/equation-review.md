# Pre-implementation equation review

2026-10-31. Analytic review only: no candidate code, numerical assay, learner experiment or parameter sweep. The extra-cycle decision remains pending. The preceding turn made progress by locating the missing slow-to-fast coupling and writing the concrete protocol; it did not demonstrate a memory improvement.

## Exact transition and boundedness

For one held-input frame, center both variables on the same target: `x=u-gStar`, `y=s-gStar`. Then

```
d[x,y]/dz = M*[x,y]
M = [-(1+kappa),  kappa   ]
    [ kappa/C,   -kappa/C ]
```

Write `T=1+kappa+kappa/C`, `D=sqrt(T*T-4*kappa/C)`, and `lambdaPlus=(-T+D)/2`, `lambdaMinus=(-T-D)/2`. For the registered kappa=.125, C=2, these are exactly `(-19+sqrt(297))/32` and `(-19-sqrt(297))/32`. Both are negative. No numerical parameter choice was changed by this review.

The exact frame transition is

```
Eplus = exp(lambdaPlus*z)
Eminus = exp(lambdaMinus*z)
F = (Eplus-Eminus)/D
exp(M*z) = Eminus*I + F*(M-lambdaMinus*I)
```

It avoids the overflow risk of separately computing a growing hyperbolic cosine. Very small z needs a cancellation-aware implementation for F; `expm1` or an equivalent stable divided difference is appropriate. Do not substitute clipping for a correct integration step. The zero-coupling branch can call the original local step directly to preserve its exact floating-point behavior as well as mathematical equivalence.

Bounds follow from the vector field: at u=.2 its two terms are nonnegative, and at u=1 they are nonpositive; the corresponding statements hold for s. The rectangle [.2,1]^2 is invariant. This is a mathematical property to verify against the implementation after approval, not evidence that an unimplemented class is correct.

## Conservation claim has a narrow meaning

`d(u+C*s)/dz = gStar-u`. Exchange cancels in this sum, but teaching does not. The protocol's statement that exchange alone conserves the sum is an algebraic property of the coupling terms. The proposed operational clock makes z=0 without teaching, so it does not provide a separate period of passive consolidation to observe. Do not report an idle no-change test as a biological consolidation test or as an operational measurement of nontrivial exchange-only conservation.

## Acquisition and revisability are the principal risks

With a constant depression target below equal initial states, s initially remains above u and coupling resists the depression. It can therefore weaken finite-exposure acquisition. After the target reverses, the lagging hidden state can also oppose the new update. Neither effect establishes failure on the full task, whose policy, two channels and stimulus overlap matter; neither can be ignored in favor of a better retention ratio.

The slow eigenmode decays on a much larger event-clock scale than the fast mode. Fixed exposure may end before the hidden state has stored enough of A to protect it. This is a falsifiable explanation, not a result or permission to increase exposure. The paper's multi-variable results cannot settle this two-state, local-clock question.

After an approved run, inspect the existing snapshot state at T1 and T2: visible/hidden change on A's shared and unique edges, alongside absolute margins, acquisition and every joint gate. That identifies whether the added state actually stores an association or mostly retains its initialization. No answer-conditioned selector, new feedback or altered schedule is needed. A retention ratio alone cannot make this distinction.

## Decision

The equations are analytically stable and bounded, and the proposed ablation isolates coupling. The behavioral hypothesis remains unproved, with explicit acquisition and reversal risks. The original six-cycle limit is still the immediate boundary; there is no verified live experiment to wait on. Implementing or running the candidate requires the pending one-cycle extension.
