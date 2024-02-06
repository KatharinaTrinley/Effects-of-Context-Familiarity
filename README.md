# Effects-of-Context-Familiarity
This repository contains materials from my bachelor thesis, including R code for statistical analysis and PCIbex code for implementing the experiment on [PCIbex](https://farm.pcibex.net/).

## Materials
materials.csv: This CSV file contains all materials referenced in the bachelor thesis.

## Statistical Analysis in R
Statistical_analysis.R: This file contains R code for statistical analysis, including plots and linear mixed-effects regression models (LMERs) mentioned in the study.

results_anon.csv: Pre-processed data used for analysis. Subject Prolific IDs are anonymized, and PCIbex-specific columns are removed for readability. Data from one participant who returned their submission after sending results to the PCIbex server is excluded.

freq_target_words.csv: Log-transformed frequency of words in the critical region.

spill_freq.csv: Log-transformed frequency of words in the spillover region.

## PCIbex
#### data_includes: Contains the main javascript
main.js: The main javascript code which was used to implement our experiment on PCIbex, and which references all other files. 
### chunk_includes: Contains any csv files and html files referenced in main.js:
  prac_items.csv: This CSV file contains the practice items participants saw before the actual experiment started.
  materials.csv: This CSV file contains all materials.
  Pseudowords.csv: This CSV contains all target words as part of our post-experiment-questionnaire to test pseudoword definitions.
### css_includes: Contains css files for formatting inside PCIbex
