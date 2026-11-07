#!/usr/bin/env python

import sys
import os

import neuprint
from neuprint import Client, queries, SegmentCriteria

c = Client('neuprint.janelia.org', dataset='hemibrain:v1.1', token='[REDACTED_PUBLIC_SOURCE_LITERAL_NOT_USED]')
print(c.fetch_version())


KCs = SegmentCriteria(type="^KC.*",regex=True)
APL = SegmentCriteria(bodyId=425790257)
print("Searching for KC to APL synapses")
KCtoAPL = neuprint.queries.fetch_synapse_connections(source_criteria=KCs,target_criteria=APL)
print(f"Found {len(KCtoAPL)} KC to APL synapses")
print("Saving KC to APL synapses to csv")
KCtoAPL.to_csv(path_or_buf="KCtoAPLv1.1.csv")
print("Searching for APL to KC synapses")
APLtoKC = neuprint.queries.fetch_synapse_connections(source_criteria=APL,target_criteria=KCs)
print ("Saving APL to KC synapses to csv")
APLtoKC.to_csv(path_or_buf="APLtoKCv1.1.csv")
print(f"Found {len(APLtoKC)} APL to KC synapses")

APLskel=c.fetch_skeleton(425790257,format='pandas',heal=True)
APLskel.to_csv(path_or_buf="APLskelv1.1.csv")
