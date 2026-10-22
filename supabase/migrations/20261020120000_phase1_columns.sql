-- Approved by Matt 2026-10-20 (see DECISIONS.md).
-- Conditional GET validators, so unchanged feeds cost a 304 instead of a full download.
alter table sources add column etag text;
alter table sources add column last_modified text;

-- Native lead-image size, so the Board reserves the right space before the image loads.
alter table items add column lead_image_width integer;
alter table items add column lead_image_height integer;
