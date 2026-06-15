from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, date, time
from typing import List, Optional, Dict, Any

# Authentication
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    display_name: str
    username: str
    phone: str
    gender: str = "Unknown"
    relationship_intent: str = "Long Term"
    interests: List[str] = []
    goals: List[str] = []
    
    # Optional Birth info for Horoscope
    birth_date: Optional[date] = None
    birth_time: Optional[time] = None
    birth_location: Optional[str] = None
    digipin: Optional[str] = None

class RegisterResponse(BaseModel):
    success: bool
    message: str
    email: EmailStr

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp_code: str

class OTPResendRequest(BaseModel):
    email: EmailStr

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class RefreshToken(BaseModel):
    refresh_token: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Twin Configuration
class TwinCreate(BaseModel):
    name: str
    avatar: str # SVG representation code
    description: str
    voice_style: str = "Calm" # Calm, Expressive, Deep, Energetic
    emoji_style: str = "Minimalist" # Minimalist, Frequent, Sarcastic
    match_preferences: Dict[str, Any] = {}

class TwinResponse(BaseModel):
    agent_id: str
    name: str
    avatar: Optional[str]
    description: Optional[str]
    role_type: str
    reputation: float
    trust_score: float
    voice_style: str
    emoji_style: str
    match_preferences: Dict[str, Any]

    class Config:
        from_attributes = True

# Personality quiz
class AssessmentSubmission(BaseModel):
    answers: Dict[str, int] # Maps question ID (1 to 50) -> score (1 to 5)
    custom_inputs: Optional[Dict[str, Any]] = None

# Profile responder
class UserProfileSchema(BaseModel):
    display_name: str
    gender: str
    bio: Optional[str]
    relationship_intent: str
    birth_date: Optional[date]
    birth_time: Optional[time]
    birth_location: Optional[str]
    digipin: Optional[str] = None
    sun_sign: str
    moon_sign: str
    ascendant: str
    
    mbti_type: str
    mbti_confidence: float
    mbti_summary: Optional[str]
    mbti_growth_areas: List[str]
    mbti_communication_style: Optional[str]
    mbti_relationship_style: Optional[str]
    mbti_friendship_style: Optional[str]
    
    # Konvo DNA
    dna_behavior: float
    dna_personality: float
    dna_communication: float
    dna_relationship: float
    dna_emotional: float
    dna_lifestyle: float
    dna_interest: float
    dna_trust: float
    dna_values: float

    class Config:
        from_attributes = True

class NearbyUserResponse(BaseModel):
    id: int
    konvo_id: str
    username: str
    profile: Optional[UserProfileSchema] = None

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    konvo_id: str
    created_at: datetime
    otp_verified: bool
    premium_user: bool
    profile_completion: float = Field(default=0.0, description="Profile completion percentage (0-100%)")
    profile: Optional[UserProfileSchema] = None
    agent_twin: Optional[TwinResponse] = None

    class Config:
        from_attributes = True

# Swipe request
class SwipeRequest(BaseModel):
    target_user_id: int
    swipe_type: str # pass, interest

class SwipeResponse(BaseModel):
    success: bool
    message: str
    match_occurred: bool
    simulation_id: Optional[int] = None

class DiscoveryCard(BaseModel):
    user_id: int
    konvo_id: str
    display_name: str
    relationship_intent: str
    mbti_type: str
    sun_sign: str
    compatibility_score: float
    compatibility_tier: str
    interests: List[str]
    bio: Optional[str]
    avatar: Optional[str]
    voice_style: str
    emoji_style: str
    digipin: Optional[str] = None

# Virtual Date Simulation
class DateSimulationResponse(BaseModel):
    id: int
    user_a_id: int
    user_b_id: int
    environment: str
    dialogue_log: List[Dict[str, Any]]
    overall_compatibility: float
    match_detail_json: Dict[str, Any]
    approval_user_a: str
    approval_user_b: str
    created_at: datetime
    
    partner_name: str
    partner_konvo_id: str
    partner_avatar: Optional[str]

    class Config:
        from_attributes = True

class DateApprovalRequest(BaseModel):
    approval_action: str # approved, declined

# Direct Chats
class ChatMessageCreate(BaseModel):
    content: str

class ChatMessageResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    content: str
    reactions: List[Dict[str, Any]]
    read_status: bool
    timestamp: datetime

    class Config:
        from_attributes = True

# Trust Dashboard
class TrustDashboardResponse(BaseModel):
    otp_verified: bool
    trust_score: float
    profile_completion: float
    behavior_score: float
    safety_history: List[str]

class AstrologyResponse(BaseModel):
    sun_sign: str
    moon_sign: str
    ascendant: str
    location: str
    personality_insights: str
    communication_tendencies: str
    emotional_dna: str
    life_pattern_report: str
    disclaimer: str

class LiveSentimentRatios(BaseModel):
    positive: float
    neutral: float
    negative: float
    online_count: int
    male_ratio: float
    female_ratio: float
    unknown_ratio: float

class NodeDetail(BaseModel):
    konvo_id: str
    style: str
    debate: str
    trust: float

class NetworkNode(BaseModel):
    id: str
    label: str
    type: str
    details: NodeDetail

class NetworkEdge(BaseModel):
    source: str
    target: str
    type: str
    weight: float

class NetworkGraphResponse(BaseModel):
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]

# Communities
class CommunityCreate(BaseModel):
    name: str
    description: str

class CommunityResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str
    health_score: float
    quality_index: float
    top_contributors: List[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True

class ProfileUpdateRequest(BaseModel):
    display_name: str
    bio: str
    gender: str
    birth_date: Optional[date] = None
    birth_time: Optional[time] = None
    birth_location: Optional[str] = None
    digipin: Optional[str] = None
    interests: List[str] = []
    goals: List[str] = []
    relationship_intent: Optional[str] = "Long Term"

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str

class Notification(BaseModel):
    id: Optional[int] = None
    user_id: int
    message: str
    type: str = "info"  # e.g., "info", "warning", "success", "error"
    read: bool = False
    created_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class NotificationCreate(BaseModel):
    user_id: int
    message: str
    type: str = "info"

class NotificationResponse(BaseModel):
    message: str
    type: str
    read: bool
    created_at: datetime

class AIProviderStatus(BaseModel):
    status: str = Field(..., description="Overall status (e.g., 'Operational', 'Degraded', 'Offline')")
    api_health: str = Field(..., description="API health (e.g., 'Healthy', 'Unresponsive', 'Error')")
    usage_visibility: str = Field(..., description="Usage visibility (e.g., 'Visible', 'Limited', 'None')")

class AIDiagnosticsResponse(BaseModel):
    gemini: AIProviderStatus
    replicate: AIProviderStatus
    fal: AIProviderStatus

class AvatarGenerateRequest(BaseModel):
    prompt: str = Field(default="A futuristic digital twin representation")
    style: str = Field(default="photorealistic") # photorealistic | anime | digital-art

class UsernameCheckRequest(BaseModel):
    username: str

class OnboardingDraft(BaseModel):
    step: int
    data: Dict[str, Any]

class CalibrationInitRequest(BaseModel):
    gender: str
    birth_date: str
    birth_time: Optional[str] = None
    birth_location: Optional[str] = None
    digipin: str
    language: str

class CalibrationAnswerRequest(BaseModel):
    question_text: str
    question_type: str
    answer_text: str
    latency_ms: int



