# parse the result from pcibex
# https://doc.pcibex.net/advanced-tutorial/12_examining-data.html
###############################################################################################
# Libraries:
###############################################################################################
rm(list=ls())
library(rstudioapi)
library(xlsx)
library(dplyr)
library(readxl)
library(magick)
library(webshot2)
library(readtext)
library(tidyverse)
library(readr)
library(stringr) 
library(officer)
library(texreg)
library(car)
library(ggthemes)
library(broom)
library(nlme)
library(Rmisc) # for summarySE
library(ggplot2)
library(lme4)
library(afex)
library(Matrix)

# options(java.parameters = "-Xmx1000m")

###############################################################################################
# Environment setup:
###############################################################################################
Sys.setlocale(locale = "UTF-8")  # make sure that Umlaute can be read

# set working directory to current folder
setwd(dirname(rstudioapi::getActiveDocumentContext()$path))
getwd()

results <- read.csv("results_anon.csv")
###############################################################################################
#Add necessary columns
###############################################################################################

#Create chunkorder column
results<-results
results$chunkorder <- as.numeric(str_extract(results$PennElementName, "\\d+"))#extracting numeric values from PennElementName col
results <- results[c("PennElementName", "chunkorder", setdiff(names(results), c("PennElementName", "chunkorder")))] # Reorders cols so that "PennElementName" and "chunkorder" appear first
results <- results[trimws(results$PennElementName) != "", ] #Removes rows where "PennElementName" is empty or contains only whitespace.
results <- results[grepl("^exercise-start$|\\d+-\\D+", results$PennElementName), ] # results with PennElementName cleaned, s.t. only experiment-start & "0-xxx", ... are included:
results <- results[results$itemID != "", , drop = FALSE] # remove prac stories

# create trialID column
results$trialID <- paste(results$id, results$itemID)

# before, it skipped <br> tags but counted them in chunk order:
for(trialID in unique(results$trialID)){ # for-loop iterates over the values in trialID column in results.
  tmp = results[results$trialID == trialID,] # subset results "tmp", subset rows from "results" where the trialID matches the current value of trial
  tmp = tmp[order(tmp$chunkorder, decreasing = F),]
  tmp$chunkorder = 0:(nrow(tmp) - 1)
  results[results$trialID == trialID,] = tmp
  rm(tmp)
}
rm(trialID)

# Calculate Reading Time:
results$EventTime <- as.numeric(results$EventTime)
results <- results %>%
  group_by(id, itemID) %>%
  mutate(
    ReadingTime = EventTime - lag(EventTime, default = first(EventTime))
  ) %>%
  ungroup()
head(results[, c("id", "itemID", "EventTime", "ReadingTime")])

#Add col with log-transformed Frequency for critical region 
freq_data <- read.csv("freq_target_words.csv")
str(freq_data)
results$targetword <- as.character(results$targetword)

#create merged_data results
merged_data <- merge(results, freq_data, by.x = "targetword", by.y = "targetword", all.x = TRUE)

#SpilloverRegion_freq
spill_freqs <- read.csv("spill_freqs.csv")
colnames(spill_freqs)[5] = "natLogMannMlnSpill" 
merged_data <- merge(merged_data, spill_freqs[,c("itemID","natLogMannMlnSpill")], by = "itemID", all.x = TRUE)
merged_data$itemID = gsub(pattern = "everday", replacement = "everyday", x = merged_data$itemID)

# new column localid
merged_data$localid <- as.numeric(gsub("\\D", "", merged_data$itemID))

#create targetword_length column containing length critical targetword chunks
merged_data$targetword_length <- nchar(merged_data$targetword)
merged_data$targetwordchunk_string <- ifelse(merged_data$chunkorder == merged_data$targetwordchunk, 
                                             str_replace_all(str_extract(merged_data$PennElementName, "\\D+"), "[-%]", ""),
                                             NA)
merged_data$targetwordchunk_length <- nchar(gsub("\\s", "",merged_data$targetwordchunk_string))

#create spillover_length column containing length of spilloverRegion chunks
merged_data$targetwordchunk[merged_data$chunkorder == merged_data$targetwordchunk] 
merged_data$targetwordchunk <- as.numeric(merged_data$targetwordchunk)
merged_data$spilloverchunk <- merged_data$targetwordchunk + 1
merged_data$SpilloverRegion <- ifelse(merged_data$chunkorder == merged_data$spilloverchunk, 
                                      str_replace_all(str_extract(merged_data$PennElementName, "\\D+"), "[-%]", ""),
                                      NA)
merged_data$spillover_length <- nchar(gsub("\\s", "", merged_data$SpilloverRegion))
head(merged_data[!is.na(merged_data$spillover_length), c("spillover_length", "SpilloverRegion")])

#create associativechunk_length column containing length of chunks in region with associated word
merged_data$associatedword_length <- nchar(as.character(merged_data$associatedword))
merged_data$associativechunk_string <- ifelse(merged_data$chunkorder == merged_data$associativechunk, 
                                              str_replace_all(str_extract(merged_data$PennElementName, "\\D+"), "[-%]", ""),
                                              NA)
head(merged_data$associativechunk_string)
merged_data$associativechunk_length <- nchar(gsub("\\s", "",merged_data$associativechunk_string))

# create story condition (scientific vs. everyday) column
merged_data <- merged_data %>%
  mutate(story = ifelse(grepl("scientific", condition), "scientific", 
                        ifelse(grepl("everyday", condition), "everyday", NA)))

# create word condition (pseudo vs real) column
merged_data <- merged_data %>%
  mutate(word = ifelse(grepl("pseudo", condition), "pseudo", 
                       ifelse(grepl("real", condition), "real", NA)))

#head merged data
head(merged_data)

####################################################################################################
# Calculate Reading Time
####################################################################################################
#LogTransformed Reading Time: 
merged_data$logReadingTime=log(merged_data$ReadingTime)
head(merged_data$ReadingTime)
head(merged_data$logReadingTime)

####################################################################################################
# Create dataframes for critical regions
####################################################################################################

#Create critical region targetwords df
merged_data$chunkorder <- as.numeric(merged_data$chunkorder)
merged_data$targetwordchunk <- as.numeric(merged_data$targetwordchunk)
merged_data <- merged_data[complete.cases(merged_data[c("chunkorder", "targetwordchunk")]), ] 
targetwords <- merged_data[merged_data$chunkorder == merged_data$targetwordchunk, ]

head(targetwords)

#Create spillover df
merged_data$chunkorder <- as.numeric(merged_data$chunkorder)
merged_data$spilloverchunk <- as.numeric(merged_data$spilloverchunk)
merged_data <- merged_data[complete.cases(merged_data[c("chunkorder", "spilloverchunk")]), ]
spillover <- merged_data[merged_data$chunkorder == merged_data$chunkorder, ]

head(spillover)
´
#Create associativewords df:
merged_data$chunkorder <- as.numeric(merged_data$chunkorder)
merged_data$associativechunk <- as.numeric(merged_data$associativechunk)
merged_data <- merged_data[complete.cases(merged_data[c("chunkorder", "associativechunk")]), ] 
associatedwords <- merged_data[merged_data$chunkorder == merged_data$associativechunk, ]

head(associatedwords)

####################################################################################################
# Add cols with number of words in the critical regions
####################################################################################################
# Number of words in critical chunk
targetwords$targetwords_number <- str_count(targetwords$targetwordchunk_string, "\\b\\w+\\b")

#Number of words in spillover chunk
spillover$spillover_number <- str_count(spillover$SpilloverRegion, "\\b\\w+\\b")

####################################################################################################
# Plots
####################################################################################################
se.target     = summarySE(data = targetwords,     measurevar = "ReadingTime", groupvars = c("story","word"))
se.spillover  = summarySE(data = spillover,       measurevar = "ReadingTime", groupvars = c("story","word"))
se.associated = summarySE(data = associatedwords, measurevar = "ReadingTime", groupvars = c("story","word"))

plot_target <- ggplot(se.target, aes(x = word, y = ReadingTime, fill = story)) +
  geom_bar(position = position_dodge(), stat = "identity") + 
  geom_errorbar(aes(ymin = ReadingTime-se, ymax = ReadingTime+se), width = .2, 
                position = position_dodge(.9), size = 3) +
  labs(title = "Critical Region", y = "Mean Reading Time (in ms)", fill = "Story context:",
       x = "Word") +
  theme_minimal()
plot_target

plot_spillover <- ggplot(se.spillover, aes(x = word, y = ReadingTime, fill = story)) +
  geom_bar(position = position_dodge(), stat = "identity") + 
  geom_errorbar(aes(ymin = ReadingTime-se, ymax = ReadingTime+se), width = .2, 
                position = position_dodge(.9), size = 3) +
  labs(title = "Spillover Region", y = "Mean Reading Time (in ms)", fill = "Story context:",
       x = "Word") +
  theme_minimal()
plot_spillover

plot_associated <- ggplot(se.associated, aes(x = word, y = ReadingTime, fill = story)) +
  geom_bar(position = position_dodge(), stat = "identity") + 
  geom_errorbar(aes(ymin = ReadingTime-se, ymax = ReadingTime+se), width = .2, 
                position = position_dodge(.9), size = 3) +
  labs(title = "Associated word Region", y = "Mean Reading Time (in ms)", fill = "Story context:",
       x = "Word") +
  theme_minimal()
plot_associated


png("barplotCritical.png", width = 1142, height = 1142)
plot_target +
  theme(legend.position = "bottom",
        axis.text.x  = element_text(size = 50, colour = "black"),
        axis.text.y  = element_text(size = 50, colour = "black"),
        axis.title.y = element_text(size = 50),
        axis.title.x = element_text(size = 50),
        legend.text  = element_text(size = 50, face = "italic"),
        legend.title = element_text(size = 50),
        strip.text.x = element_text(size = 50), #
        strip.text.y = element_text(size = 50),
        plot.title   = element_blank()) # remove title
dev.off()

png("barplotSpillover.png", width = 1142, height = 1142)
plot_spillover +
  theme(legend.position = "bottom",
        axis.text.x  = element_text(size = 50, colour = "black"),
        axis.text.y  = element_text(size = 50, colour = "black"),
        axis.title.y = element_text(size = 50),
        axis.title.x = element_text(size = 50),
        legend.text  = element_text(size = 50, face = "italic"),
        legend.title = element_text(size = 50),
        strip.text.x = element_text(size = 50), #
        strip.text.y = element_text(size = 50),
        plot.title   = element_blank()) # remove title
dev.off()

png("barplotAssociated.png", width = 1142, height = 1142)
plot_associated +
  theme(legend.position = "bottom",
        axis.text.x  = element_text(size = 50, colour = "black"),
        axis.text.y  = element_text(size = 50, colour = "black"),
        axis.title.y = element_text(size = 50),
        axis.title.x = element_text(size = 50),
        legend.text  = element_text(size = 50, face = "italic"),
        legend.title = element_text(size = 50),
        strip.text.x = element_text(size = 50), #
        strip.text.y = element_text(size = 50),
        plot.title   = element_blank()) # remove title
dev.off()


###############################################################################################
# HISTOGRAMS:
###############################################################################################
hist.target = ggplot(targetwords, aes(x = ReadingTime)) +
  geom_histogram(position="dodge", fill="skyblue", color="black") + 
  labs(title = "Critical Region", y = "Frequency", x = "Reading Time (in ms)")
hist.target

hist.spillover = ggplot(spillover, aes(x = ReadingTime)) +
  geom_histogram(position="dodge", fill="lightgreen", color="black") + 
  labs(title = "Spillover Region", y = "Frequency", x = "Reading Time (in ms)")
hist.spillover

hist.associated = ggplot(associatedwords, aes(x = ReadingTime)) +
  geom_histogram(position="dodge", fill="lightcoral", color="black") + 
  labs(title = "Associated word Region", y = "Frequency", x = "Reading Time (in ms)")
hist.associated

png("histCritical.png", width = 1142, height = 1142)
hist.target +
  theme(legend.position = "bottom",
        axis.text.x  = element_text(size = 50, colour = "black"),
        axis.text.y  = element_text(size = 50, colour = "black"),
        axis.title.y = element_text(size = 50),
        axis.title.x = element_text(size = 50),
        legend.text  = element_text(size = 50, face = "italic"),
        legend.title = element_text(size = 50),
        strip.text.x = element_text(size = 50), #
        strip.text.y = element_text(size = 50),
        plot.title   = element_blank()) # remove title
dev.off()

png("histSpillover.png", width = 1142, height = 1142)
hist.spillover +
  theme(legend.position = "bottom",
        axis.text.x  = element_text(size = 50, colour = "black"),
        axis.text.y  = element_text(size = 50, colour = "black"),
        axis.title.y = element_text(size = 50),
        axis.title.x = element_text(size = 50),
        legend.text  = element_text(size = 50, face = "italic"),
        legend.title = element_text(size = 50),
        strip.text.x = element_text(size = 50), #
        strip.text.y = element_text(size = 50),
        plot.title   = element_blank()) # remove title
dev.off()

png("histAssociated.png", width = 1142, height = 1142)
hist.associated +
  theme(legend.position = "bottom",
        axis.text.x  = element_text(size = 50, colour = "black"),
        axis.text.y  = element_text(size = 50, colour = "black"),
        axis.title.y = element_text(size = 50),
        axis.title.x = element_text(size = 50),
        legend.text  = element_text(size = 50, face = "italic"),
        legend.title = element_text(size = 50),
        strip.text.x = element_text(size = 50), #
        strip.text.y = element_text(size = 50),
        plot.title   = element_blank()) # remove title
dev.off()

###############################################################################################
# BOXPLOTS:
###############################################################################################

box.target = ggplot(targetwords, aes(x = word, y = ReadingTime, fill = story)) + 
  geom_boxplot(outlier.size = 6, size = 2, outlier.colour="black", outlier.shape=16) + 
  labs(title = "Critical region", y = "Reading Time (in ms)", fill = "Story context:",
       x = "Word")
box.target

box.spillover = ggplot(spillover, aes(x = word, y = ReadingTime, fill = story)) + 
  geom_boxplot(outlier.size = 6, size = 2, outlier.colour="black", outlier.shape=16) + 
  labs(title = "Spillover region", y = "Reading Time (in ms)", fill = "Story context:",
       x = "Word")
box.spillover

box.associated = ggplot(associatedwords, aes(x = word, y = ReadingTime, fill = story)) + 
  geom_boxplot(outlier.size = 6, size = 2, outlier.colour="black", outlier.shape=16) + 
  labs(title = "Associated word region", y = "Reading Time (in ms)", fill = "Story context:",
       x = "Word")
box.associated


png("boxCritical.png", width = 1142, height = 1142)
box.target +
  theme(legend.position = "bottom",
        axis.text.x  = element_text(size = 50, colour = "black"),
        axis.text.y  = element_text(size = 50, colour = "black"),
        axis.title.y = element_text(size = 50),
        axis.title.x = element_text(size = 50),
        legend.text  = element_text(size = 50, face = "italic"),
        legend.title = element_text(size = 50),
        strip.text.x = element_text(size = 50), #
        strip.text.y = element_text(size = 50),
        plot.title   = element_blank()) # remove title
dev.off()

png("boxSpillover.png", width = 1142, height = 1142)
box.spillover +
  theme(legend.position = "bottom",
        axis.text.x  = element_text(size = 50, colour = "black"),
        axis.text.y  = element_text(size = 50, colour = "black"),
        axis.title.y = element_text(size = 50),
        axis.title.x = element_text(size = 50),
        legend.text  = element_text(size = 50, face = "italic"),
        legend.title = element_text(size = 50),
        strip.text.x = element_text(size = 50), #
        strip.text.y = element_text(size = 50),
        plot.title   = element_blank()) # remove title
dev.off()

png("boxAssociated.png", width = 1142, height = 1142)
box.associated +
  theme(legend.position = "bottom",
        axis.text.x  = element_text(size = 50, colour = "black"),
        axis.text.y  = element_text(size = 50, colour = "black"),
        axis.title.y = element_text(size = 50),
        axis.title.x = element_text(size = 50),
        legend.text  = element_text(size = 50, face = "italic"),
        legend.title = element_text(size = 50),
        strip.text.x = element_text(size = 50), #
        strip.text.y = element_text(size = 50),
        plot.title   = element_blank()) # remove title
dev.off()

####################################################################################################
# LMER Models for critical and spillover region
####################################################################################################
# Convert variables to factors
targetwords$word <- as.factor(targetwords$word)
targetwords$story <- as.factor(targetwords$story)
associatedwords$word <- as.factor(associatedwords$word)
associatedwords$story <- as.factor(associatedwords$story)
spillover$word <- as.factor(spillover$word)
spillover$story <- as.factor(spillover$story)

# sum contrast code word and story
contrasts(targetwords$word) <- c(-1, 1) 
contrasts(targetwords$story) <- c(-1, 1) 
# Maximal Random Structure, LMER in Critical Region: targetwords_model
targetwords_model <- lmer(logReadingTime ~ word * story + natLogMannMln + targetwordchunk_length+ (1|id) + (1|localid), data = targetwords)
print(summary(targetwords_model))

# sum contrast code word and story
contrasts(spillover$word) <- c(-1, 1)
contrasts(spillover$story) <- c(-1, 1)
# Maximal Random Structure, LMER in Spillover Region: spillover_model
spillover_model <- lmer(logReadingTime ~ word * story + natLogMannMln + spillover_length+ spillover_number+ (1|id), data = spillover)
print(summary(spillover_model))






