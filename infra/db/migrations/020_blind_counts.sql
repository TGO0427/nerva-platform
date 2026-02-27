-- Migration 020: Add blind count support to cycle counts
ALTER TABLE cycle_counts ADD COLUMN is_blind boolean NOT NULL DEFAULT false;
