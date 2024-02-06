# Effects-of-Context-Familiarity
This repository contains materials from my bachelor thesis, including R code for statistical analysis and PCIbex code for implementing the experiment on [PCIbex](https://farm.pcibex.net/).

## Materials
'materials.csv': This CSV file contains all materials referenced in the bachelor thesis.

## Statistical Analysis in R
Statistical_analysis.R: This file contains R code for statistical analysis, including plots and linear mixed-effects regression models (LMERs) mentioned in the study.

results_anon.csv: Pre-processed data used for analysis. Subject Prolific IDs are anonymized, and PCIbex-specific columns are removed for readability. Data from one participant who returned their submission after sending results to the PCIbex server is excluded.

freq_target_words.csv: Log-transformed frequency of words in the critical region.

spill_freq.csv: Log-transformed frequency of words in the spillover region.

## PCIbex
#### data_includes: Contains the main javascript

main.js: The main javascript code which was used to implement our experiment on PCIbex, and which references all other files. 

#### chunk_includes: Contains any csv files and html files that were created for this experiment.

  ethics.html: This html file contains an ethics agreement, which participants have to agree to.
  
  instructions.html: This html file contains instructions related to the experiment.
  
  prac_items.csv: This CSV file contains the practice items participants saw before the actual experiment started.
  
  materials.csv: This CSV file contains all materials.
  
  pseudoword_instruction.html: This html file contains instructions for a post-experiment question.
  
  Pseudowords.csv: This CSV file contains all target words as part of our post-experiment-questionnaire to test pseudoword definitions.
  
#### css_includes: Contains internal PCIbex-related css files for formatting

#### js_includes: Contains internal PCIbex-related js files 
