-- Add onboarding_progress JSONB column to profiles table
-- Stores onboarding step completion state for managers

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_progress JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN profiles.onboarding_progress IS 'Tracks onboarding progress for managers: { checklist_completed: boolean, tour_taken: boolean, welcome_seen: boolean }';