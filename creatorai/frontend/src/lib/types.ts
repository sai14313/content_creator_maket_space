// Shared API types mirroring the FastAPI schemas.

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "brand" | "creator";
  company: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface PortfolioItem {
  id: number;
  title: string;
  description: string;
  category: string;
  tools_used: string[];
  style_tags: string[];
  gradient: string;
  emoji: string;
}

export interface Creator {
  id: number;
  user_id: number;
  full_name: string;
  company: string | null;
  headline: string;
  bio: string;
  location: string;
  specialties: string[];
  skills: string[];
  ai_tools: string[];
  price_min: number;
  price_max: number;
  availability: "available" | "limited" | "busy";
  experience_years: number;
  rating: number;
  review_count: number;
  completed_projects: number;
  response_time_hours: number;
  avatar_gradient: string;
  portfolio: PortfolioItem[];
}

export interface Brief {
  id: number;
  brand_id: number;
  title: string;
  objective: string;
  audience: string;
  content_type: string;
  preferred_style: string;
  required_tools: string[];
  required_skills: string[];
  budget_min: number;
  budget_max: number;
  deadline: string;
  deliverables: string;
  usage_rights: string;
  status: "draft" | "published" | "closed";
  created_at: string;
}

export interface ScoreComponent {
  key: string;
  label: string;
  weight: number;
  score: number;
  max_points: number;
  earned_points: number;
  explanation: string;
}

export interface MatchResult {
  creator: Creator;
  match_score: number;
  tier: string;
  components: ScoreComponent[];
  reasons: string[];
}

export interface MatchResponse {
  brief: Brief;
  algorithm: string;
  weights: Record<string, string>;
  results: MatchResult[];
}

export interface Invitation {
  id: number;
  brief_id: number;
  brief_title: string;
  project_id: number;
  brand_id: number;
  brand_name: string;
  creator_id: number;
  creator_name: string;
  message: string;
  status: "sent" | "accepted" | "declined";
  created_at: string;
}

export interface Proposal {
  id: number;
  project_id: number;
  brief_id: number;
  brief_title: string;
  brand_id: number;
  brand_name: string;
  creator_id: number;
  creator_name: string;
  cover_letter: string;
  proposed_budget: number;
  timeline_days: number;
  status: "submitted" | "accepted" | "rejected";
  created_at: string;
}

export type ProjectStatus =
  | "invitation_sent"
  | "proposal_submitted"
  | "in_production"
  | "in_review"
  | "revision_requested"
  | "approved"
  | "delivered"
  | "declined";

export interface ProjectEvent {
  id: number;
  from_status: string | null;
  to_status: string;
  note: string;
  actor: string;
  created_at: string;
}

export interface Milestone {
  id: number;
  title: string;
  due_date: string;
  status: "pending" | "in_progress" | "completed";
  position: number;
}

export interface Deliverable {
  id: number;
  title: string;
  original_name: string;
  file_name: string;
  file_size: number;
  status: "pending" | "approved" | "revision_requested";
  notes: string;
  created_at: string;
}

export interface Project {
  id: number;
  brief_id: number;
  brief_title: string;
  title: string;
  status: ProjectStatus;
  agreed_budget: number;
  brand_id: number;
  brand_name: string;
  creator_id: number;
  creator_name: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetail extends Project {
  events: ProjectEvent[];
  milestones: Milestone[];
  deliverables: Deliverable[];
  invitations: Invitation[];
  proposals: Proposal[];
  review: { rating: number; comment: string; created_at: string } | null;
}

export const STATUS_LABELS: Record<string, string> = {
  invitation_sent: "Invitation Sent",
  proposal_submitted: "Proposal Submitted",
  in_production: "In Production",
  in_review: "In Review",
  revision_requested: "Revision Requested",
  approved: "Approved",
  delivered: "Delivered",
  declined: "Declined",
};

export const WORKFLOW_STEPS = [
  "invitation_sent",
  "proposal_submitted",
  "in_production",
  "in_review",
  "revision_requested",
  "approved",
  "delivered",
] as const;
