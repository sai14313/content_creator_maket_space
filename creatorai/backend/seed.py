"""
Seed the CreatorAI database with fictional demo data.

Run directly:      python seed.py
Run with reset:    python seed.py --reset
It also runs automatically at API startup when the DB is empty.

DEMO CREDENTIALS (all password: demo12345)
  Brands:   demo@novamedia.test, demo@pulseagency.test, demo@luminalabs.test
  Creators: aria@creatorai.test, kai@creatorai.test, mina@creatorai.test,
            leo@creatorai.test, sana@creatorai.test, theo@creatorai.test,
            yuki@creatorai.test, imani@creatorai.test
"""
import os
import sys
from datetime import date, timedelta

from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine
from models import (
    Brief,
    CreatorProfile,
    Deliverable,
    Invitation,
    Milestone,
    PortfolioItem,
    Project,
    ProjectEvent,
    Proposal,
    Review,
    Shortlist,
    User,
)
from security import hash_password

DEMO_PASSWORD = "demo12345"

GRADIENTS = [
    "from-violet-500 to-indigo-600",
    "from-fuchsia-500 to-purple-600",
    "from-indigo-500 to-blue-600",
    "from-purple-500 to-pink-500",
    "from-teal-500 to-indigo-600",
    "from-orange-500 to-rose-500",
    "from-sky-500 to-violet-600",
    "from-emerald-500 to-teal-600",
]


# name, email, headline, specialties, location, experience, price_range,
# availability, rating, reviews, completed, bio, skills, tools
CREATORS = [
    (
        "Aria Chen", "aria@creatorai.test",
        "AI filmmaker crafting cinematic brand stories with Runway & Sora",
        ["AI filmmaking"], "Lisbon, Portugal", 6, (2500, 9000), "available",
        4.9, 27, 64,
        "Ex-ad-film director turned AI filmmaker. I combine traditional "
        "cinematography instincts with generative video tools to produce "
        "brand films that feel hand-shot — at a fraction of the cost and time.",
        ["AI filmmaking", "Prompt engineering", "Video editing", "Color grading", "Storyboarding"],
        ["Runway", "Sora", "Kling", "Midjourney", "Luma"],
    ),
    (
        "Kai Morales", "kai@creatorai.test",
        "Motion designer & AI animator for playful explainer content",
        ["AI animation"], "Mexico City, Mexico", 4, (1200, 5000), "available",
        4.7, 19, 41,
        "I make characters move. Specialising in stylised 2D/3D explainers and "
        "social-first animated spots for consumer brands and apps.",
        ["AI animation", "Motion design", "Character design", "Storyboarding"],
        ["Pika", "Runway", "After Effects", "Blender", "Luma"],
    ),
    (
        "Mina Okafor", "mina@creatorai.test",
        "AI visual artist producing editorial-grade imagery at speed",
        ["AI-generated images"], "Lagos, Nigeria", 5, (800, 4000), "limited",
        4.8, 33, 88,
        "Editorial and campaign imagery generated with Midjourney & SDXL, then "
        "finished in Photoshop. Clients include fashion, beauty and lifestyle brands.",
        ["AI-generated images", "Prompt engineering", "Color grading"],
        ["Midjourney", "Stable Diffusion", "Adobe Firefly", "Photoshop"],
    ),
    (
        "Leo Petrov", "leo@creatorai.test",
        "Product ad specialist — AI packshots & scroll-stopping launch films",
        ["AI product advertisements"], "Berlin, Germany", 7, (3000, 12000), "busy",
        4.9, 41, 96,
        "Ten years in performance creative, last three fully AI-native. I build "
        "product visuals and short ads tuned for paid-social testing at scale.",
        ["AI product advertisements", "Prompt engineering", "Video editing", "Motion design"],
        ["Midjourney", "Runway", "Blender", "Cinema 4D", "Kling"],
    ),
    (
        "Sana Rai", "sana@creatorai.test",
        "AI storyteller weaving brand narratives across reel & static",
        ["AI storytelling"], "Bengaluru, India", 3, (600, 3000), "available",
        4.6, 14, 29,
        "I turn brand lore into episodic social stories — script, visuals, voice "
        "and edit — using generative toolchains end-to-end.",
        ["AI storytelling", "Prompt engineering", "Storyboarding", "Video editing"],
        ["Midjourney", "ElevenLabs", "Runway", "Pika"],
    ),
    (
        "Theo Lindqvist", "theo@creatorai.test",
        "Generative 3D designer — procedural assets & surreal product renders",
        ["Generative 3D design"], "Stockholm, Sweden", 5, (2000, 8000), "available",
        4.8, 22, 47,
        "Parametric and generative 3D for campaigns: sculptures, product "
        "configurators and dreamlike environments rendered in Cycles/Redshift.",
        ["Generative 3D design", "Character design", "Motion design"],
        ["Blender", "Cinema 4D", "Stable Diffusion", "Midjourney"],
    ),
    (
        "Yuki Tanaka", "yuki@creatorai.test",
        "Director of AI short films & music videos",
        ["AI filmmaking"], "Tokyo, Japan", 8, (4000, 15000), "limited",
        5.0, 18, 52,
        "Award-winning AI short-film director. My work blends Japanese "
        "aesthetics with generative pipelines for brands that want something rare.",
        ["AI filmmaking", "Color grading", "Storyboarding", "Prompt engineering"],
        ["Sora", "Runway", "Kling", "Midjourney", "DaVinci Resolve"],
    ),
    (
        "Imani Brooks", "imani@creatorai.test",
        "2D/3D AI animator for kids, education & lifestyle brands",
        ["AI animation"], "Atlanta, USA", 2, (500, 2500), "available",
        4.5, 9, 18,
        "Upcoming animator mixing frame-by-frame craft with AI in-betweens. "
        "Warm, character-led work for education and lifestyle clients.",
        ["AI animation", "Character design", "Motion design"],
        ["Pika", "Luma", "After Effects", "Procreate"],
    ),
]

# creator_index -> list of (title, description, category, tools, style_tags, emoji)
PORTFOLIO = {
    0: [
        ("Aurora — EV launch film", "60s cinematic launch film for a fictional EV brand, fully AI-generated.", "AI film", ["Runway", "Sora"], ["Cinematic", "Dark & moody"], "🚗"),
        ("Midnight Diner short", "Anthropic-style brand short about ritual and warmth.", "AI film", ["Kling", "Midjourney"], ["Cinematic", "Editorial"], "🍜"),
        ("Nova sneakers teaser", "15s vertical teaser cut from AI stock.", "AI film", ["Runway", "Kling"], ["Playful & vibrant"], "👟"),
    ],
    1: [
        ("Wallet-app explainer", "30s animated explainer for a fintech onboarding flow.", "AI animation", ["Pika", "After Effects"], ["Minimalist", "Playful & vibrant"], "💳"),
        ("Capy & Co. mascot spots", "Series of 6s mascot loops for social.", "AI animation", ["Luma", "After Effects"], ["Playful & vibrant"], "🦫"),
        ("Eco-habits stop-motion", "Hybrid stop-motion/AI short for an NGO.", "AI animation", ["Pika", "Blender"], ["Hand-drawn 2D"], "🌱"),
    ],
    2: [
        ("Lumen skincare campaign", "24 editorial packshots for a beauty launch.", "AI-generated images", ["Midjourney", "Photoshop"], ["Editorial", "Photorealistic"], "🧴"),
        ("Desert couture editorial", "High-fashion editorial set in salt flats.", "AI-generated images", ["Midjourney"], ["Editorial"], "🏜️"),
        ("Roastery menu visuals", "Warm still-life imagery for a coffee chain.", "AI-generated images", ["Stable Diffusion"], ["Photorealistic"], "☕"),
    ],
    3: [
        ("Pulse energy drink launch", "15s hero ad + 8 static variants for paid social.", "AI product advertisement", ["Runway", "Midjourney"], ["Playful & vibrant", "Photorealistic"], "🥤"),
        ("Halo headphones packshots", "Studio-grade AI packshots on gradient sets.", "AI product advertisement", ["Midjourney", "Blender"], ["Minimalist"], "🎧"),
        ("Sneaker drop countdown", "7-day teaser sequence for a limited drop.", "AI product advertisement", ["Kling", "Midjourney"], ["Dark & moody"], "🔥"),
    ],
    4: [
        ("Thread & Origin — brand saga", "5-part episodic story for a heritage textile brand.", "AI storytelling", ["Midjourney", "ElevenLabs"], ["Editorial", "Cinematic"], "🧵"),
        ("The Last Library", "Narrative micro-short about memory, voiced with AI.", "AI storytelling", ["ElevenLabs", "Runway"], ["Dark & moody"], "📚"),
        ("Founders' origin reels", "Docu-style founder stories for LinkedIn.", "AI storytelling", ["Runway"], ["Photorealistic"], "🎙️"),
    ],
    5: [
        ("Liquid chrome type sculptures", "Procedural chrome letterforms for a music festival.", "Generative 3D design", ["Blender", "Cinema 4D"], ["Retro-futuristic"], "🪩"),
        ("Sneaker configurator study", "Parametric sneaker with swappable materials.", "Generative 3D design", ["Blender"], ["Photorealistic"], "👟"),
        ("Dream terraces environment", "Surreal architectural environment piece.", "Generative 3D design", ["Blender", "Midjourney"], ["Cinematic"], "🏛️"),
    ],
    6: [
        ("Paper cranes", "AI short film, official selection at three festivals.", "AI film", ["Sora", "Runway"], ["Cinematic", "Hand-drawn 2D"], "🪶"),
        ("Neon Reverie music video", "3-minute music video for a synth-pop single.", "AI film", ["Kling", "Runway"], ["Retro-futuristic", "Dark & moody"], "🌆"),
        ("Whisky heritage spot", "Luxury 30s spot with liquid-simulation sequences.", "AI film", ["Sora", "Midjourney"], ["Dark & moody"], "🥃"),
    ],
    7: [
        ("Alphabet Animals series", "Letter-by-letter animated animal chars for kids.", "AI animation", ["Pika", "After Effects"], ["Hand-drawn 2D", "Playful & vibrant"], "🦁"),
        ("Yoga-flow loop set", "Calming loop animations for a wellness app.", "AI animation", ["Luma"], ["Minimalist"], "🧘"),
        ("Campus tour AR teaser", "Animated teaser with 2.5D parallax scenes.", "AI animation", ["Pika", "After Effects"], ["Playful & vibrant"], "🏫"),
    ],
}


# (company, contact_name, email)
BRANDS = [
    ("Nova Media", "Elena Voss", "demo@novamedia.test"),
    ("Pulse Agency", "Marcus Hale", "demo@pulseagency.test"),
    ("Lumina Labs", "Priya Nair", "demo@luminalabs.test"),
]

# brand_index, title, objective, audience, content_type, style,
# skills, tools, budget, deadline_offset_days, deliverables, usage_rights, status
BRIEFS = [
    (
        0, "Nova EV — 'Silent Roads' launch film",
        "Introduce Nova's first electric coupe to urban professionals with a "
        "60-second cinematic AI film that conveys quiet luxury and range confidence.",
        "Urban professionals 28–45, EV-curious, eco-minded",
        "AI film", "Cinematic",
        ["AI filmmaking", "Color grading", "Storyboarding"],
        ["Runway", "Sora", "Midjourney"],
        (6000, 14000), 24,
        "1 × 60s hero film (16:9), 2 × 15s vertical cutdowns, thumbnail set, captions",
        "12-month digital ads", "published",
    ),
    (
        0, "Nova Beauty — spring lookbook imagery",
        "Produce a cohesive set of editorial product and model visuals for the "
        "spring collection across site, email and paid social.",
        "Women 22–38 interested in clean beauty",
        "AI-generated images", "Editorial",
        ["AI-generated images", "Prompt engineering"],
        ["Midjourney", "Adobe Firefly"],
        (2500, 7000), 18,
        "20 × 4K key visuals + 6 aspect-ratio variants + 3 retouched hero shots",
        "3-month organic social", "published",
    ),
    (
        1, "Pulse Fitness — app onboarding explainer",
        "Explain Pulse's new adaptive workout plans in a playful 30s animated "
        "explainer for the App Store and Instagram.",
        "Millennial gym-goers & home-workout users",
        "AI animation", "Playful & vibrant",
        ["AI animation", "Motion design", "Character design"],
        ["Pika", "After Effects"],
        (1500, 5000), 14,
        "1 × 30s explainer (16:9 + 9:16), 3 × 6s loops, source files",
        "3-month organic social", "published",
    ),
    (
        2, "Lumina Labs — DevTools product ad series",
        "Create performance-ready product ads showcasing Lumina's AI code review "
        "tool for launch week paid campaigns.",
        "B2B: engineering managers & SaaS decision makers",
        "AI product advertisement", "Minimalist",
        ["AI product advertisements", "Prompt engineering"],
        ["Midjourney", "Runway"],
        (4000, 10000), 21,
        "3 × 15s product ads + 9 static variants for A/B testing",
        "12-month digital ads", "published",
    ),
    (
        2, "Lumina Labs — origin story series (draft)",
        "Tell the founding story of Lumina Labs as a 3-part narrative series.",
        "Developers & tech-press audiences",
        "AI storytelling", "Photorealistic",
        ["AI storytelling"],
        ["ElevenLabs", "Runway"],
        (2000, 6000), 30,
        "3 × 60s episodes",
        "Editorial / organic only", "draft",
    ),
]



def _seed_brands(db: Session) -> list[User]:
    users = []
    for company, contact, email in BRANDS:
        user = User(
            email=email,
            password_hash=hash_password(DEMO_PASSWORD),
            full_name=contact,
            role="brand",
            company=company,
        )
        db.add(user)
        users.append(user)
    db.flush()
    return users


def _seed_creators(db: Session) -> list[tuple[User, CreatorProfile]]:
    out = []
    for idx, data in enumerate(CREATORS):
        (
            name, email, headline, specialties, location, experience, price,
            availability, rating, reviews, completed, bio, skills, tools,
        ) = data
        user = User(
            email=email,
            password_hash=hash_password(DEMO_PASSWORD),
            full_name=name,
            role="creator",
            company=None,
        )
        db.add(user)
        db.flush()
        profile = CreatorProfile(
            user_id=user.id,
            headline=headline,
            bio=bio,
            location=location,
            specialties=specialties,
            skills=skills,
            ai_tools=tools,
            price_min=price[0],
            price_max=price[1],
            availability=availability,
            experience_years=experience,
            rating=rating,
            review_count=reviews,
            completed_projects=completed,
            response_time_hours=2 + (idx % 5) * 4,
            avatar_gradient=GRADIENTS[idx % len(GRADIENTS)],
        )
        db.add(profile)
        db.flush()
        out.append((user, profile))
    db.flush()
    return out


def _seed_portfolios(db: Session, profiles: list[CreatorProfile]) -> None:
    for idx, profile in enumerate(profiles):
        for j, (title, desc, category, tools, tags, emoji) in enumerate(
            PORTFOLIO.get(idx, [])
        ):
            db.add(
                PortfolioItem(
                    creator_id=profile.id,
                    title=title,
                    description=desc,
                    category=category,
                    tools_used=tools,
                    style_tags=tags,
                    gradient=GRADIENTS[(idx + j) % len(GRADIENTS)],
                    emoji=emoji,
                )
            )
    db.flush()


def _seed_briefs(db: Session, brands: list[User]) -> list[Brief]:
    briefs = []
    for (
        brand_idx, title, objective, audience, content_type, style,
        skills, tools, budget, deadline_days, deliverables, usage, status,
    ) in BRIEFS:
        brief = Brief(
            brand_id=brands[brand_idx].id,
            title=title,
            objective=objective,
            audience=audience,
            content_type=content_type,
            preferred_style=style,
            required_skills=skills,
            required_tools=tools,
            budget_min=budget[0],
            budget_max=budget[1],
            deadline=(date.today() + timedelta(days=deadline_days)).isoformat(),
            deliverables=deliverables,
            usage_rights=usage,
            status=status,
        )
        db.add(brief)
        briefs.append(brief)
    db.flush()
    return briefs



def _seed_workflow(
    db: Session, brands: list[User], profiles: list[CreatorProfile]
) -> None:
    """
    Demo engagements so dashboards aren't empty:
      Project A (brief 0 / Aria)  → proposal submitted, awaiting brand decision
      Project B (brief 2 / Kai)   → in production with milestones
      Project C (brief 1 / Mina)  → delivered + reviewed
      Plus: a shortlist and one pending invitation for the creator demo login.
    """
    nova, pulse, lumina = brands
    aria, kai, mina, leo = profiles[0], profiles[1], profiles[2], profiles[3]

    # Shortlist for Nova Media.
    db.add(Shortlist(brand_id=nova.id, creator_id=aria.id))
    db.add(Shortlist(brand_id=nova.id, creator_id=leo.id))
    db.flush()

    def _event(project, to_status, note, actor, from_status=None):
        db.add(ProjectEvent(
            project_id=project.id, from_status=from_status, to_status=to_status,
            note=note, actor=actor,
        ))

    # --- Project A: invitation accepted, proposal submitted -------------------
    brief_a = db.query(Brief).filter(Brief.title.contains("Silent Roads")).first()
    pa = Project(
        brief_id=brief_a.id, brand_id=nova.id, creator_id=aria.id,
        title=brief_a.title, status="proposal_submitted",
        agreed_budget=11000,
    )
    db.add(pa)
    db.flush()
    _event(pa, "invitation_sent", "Invitation sent to Aria Chen.", "brand", from_status=None)
    _event(pa, "invitation_sent", "Invitation accepted by Aria Chen.", "creator")
    _event(pa, "proposal_submitted",
           "Proposal submitted: ₹11,000 over 21 days.", "creator",
           from_status="invitation_sent")
    db.add(Invitation(
        project_id=pa.id, brief_id=brief_a.id, brand_id=nova.id, creator_id=aria.id,
        message="We loved your Aurora EV film — would you helm our Silent Roads launch?",
        status="accepted",
    ))
    db.add(Proposal(
        project_id=pa.id, brief_id=brief_a.id, brand_id=nova.id, creator_id=aria.id,
        cover_letter=(
            "Hi Nova Media team — the Silent Roads concept is exactly the kind of "
            "quiet-luxury storytelling I love. I'd shoot AI plates with Runway/Sora, "
            "grade for a cool-neutral palette, and deliver a 60s hero plus vertical "
            "cutdowns in 21 days."
        ),
        proposed_budget=11000, timeline_days=21, status="submitted",
    ))
    db.flush()


    # --- Project B: in production with milestones ------------------------------
    brief_b = db.query(Brief).filter(Brief.title.contains("onboarding explainer")).first()
    pb = Project(
        brief_id=brief_b.id, brand_id=pulse.id, creator_id=kai.id,
        title=brief_b.title, status="in_production", agreed_budget=4200,
    )
    db.add(pb)
    db.flush()
    _event(pb, "invitation_sent", "Invitation sent to Kai Morales.", "brand", from_status=None)
    _event(pb, "invitation_sent", "Invitation accepted.", "creator")
    _event(pb, "proposal_submitted", "Proposal: ₹4,200 over 14 days.", "creator",
           from_status="invitation_sent")
    _event(pb, "in_production", "Proposal accepted — production started.", "brand",
           from_status="proposal_submitted")
    db.add(Invitation(
        project_id=pb.id, brief_id=brief_b.id, brand_id=pulse.id, creator_id=kai.id,
        message="Kai — your mascot spots are perfect for our onboarding explainer.",
        status="accepted",
    ))
    db.add(Proposal(
        project_id=pb.id, brief_id=brief_b.id, brand_id=pulse.id, creator_id=kai.id,
        cover_letter=(
            "Thanks for considering me! I'll storyboard the adaptive-plans flow, "
            "build characters in Pika, animate in AE, and deliver in 14 days."
        ),
        proposed_budget=4200, timeline_days=14, status="accepted",
    ))
    for i, (title, due, status) in enumerate([
        ("Storyboard & styleframes", (date.today() + timedelta(days=3)).isoformat(), "completed"),
        ("Character animation pass", (date.today() + timedelta(days=7)).isoformat(), "in_progress"),
        ("Sound design & delivery", (date.today() + timedelta(days=12)).isoformat(), "pending"),
    ]):
        db.add(Milestone(project_id=pb.id, title=title, due_date=due,
                         status=status, position=i))
    db.flush()


    # --- Project C: delivered + reviewed --------------------------------------
    brief_c = db.query(Brief).filter(Brief.title.contains("lookbook")).first()
    pc = Project(
        brief_id=brief_c.id, brand_id=nova.id, creator_id=mina.id,
        title=brief_c.title, status="delivered", agreed_budget=5400,
    )
    db.add(pc)
    db.flush()
    for actor, frm, to, note in [
        ("brand", None, "invitation_sent", "Invitation sent to Mina Okafor.",),
        ("creator", "invitation_sent", "invitation_sent", "Invitation accepted."),
        ("creator", "invitation_sent", "proposal_submitted", "Proposal: ₹5,400 over 18 days."),
        ("brand", "proposal_submitted", "in_production", "Proposal accepted — production started."),
        ("creator", "in_production", "in_review", "First cut submitted for review."),
        ("brand", "in_review", "revision_requested", "Warmer grade on hero shots, please."),
        ("creator", "revision_requested", "in_production", "Regrading in progress."),
        ("creator", "in_production", "in_review", "Revised cut submitted."),
        ("brand", "in_review", "approved", "Approved!"),
        ("brand", "approved", "delivered", "Final files delivered."),
    ]:
        _event(pc, to, note, actor, from_status=frm)
    db.add(Invitation(
        project_id=pc.id, brief_id=brief_c.id, brand_id=nova.id, creator_id=mina.id,
        message="Mina — your Lumen campaign is exactly our spring aesthetic.",
        status="accepted",
    ))
    db.add(Proposal(
        project_id=pc.id, brief_id=brief_c.id, brand_id=nova.id, creator_id=mina.id,
        cover_letter="I'd love to build your spring lookbook — cohesive editorial AI "
                     "imagery with hand-retouched heroes.",
        proposed_budget=5400, timeline_days=18, status="accepted",
    ))
    db.add(Deliverable(
        project_id=pc.id, title="Spring lookbook — final selects",
        file_name="seed_lookbook_final.txt",
        original_name="spring_lookbook_final.txt",
        file_size=1024, status="approved",
        notes="20 finals + 6 variants delivered.",
    ))
    db.add(Review(
        project_id=pc.id, brand_id=nova.id, creator_id=mina.id, rating=5.0,
        comment="Mina delivered a stunning, cohesive set two days early. "
                "Communication was flawless — already briefing her on the next drop.",
    ))
    db.flush()

    # --- Pending invitation for the CREATOR demo login (Aria) -----------------
    brief_d = db.query(Brief).filter(Brief.title.contains("DevTools")).first()
    pd = Project(
        brief_id=brief_d.id, brand_id=lumina.id, creator_id=aria.id,
        title=brief_d.title, status="invitation_sent", agreed_budget=10000,
    )
    db.add(pd)
    db.flush()
    _event(pd, "invitation_sent", "Invitation sent to Aria Chen.", "brand", from_status=None)
    db.add(Invitation(
        project_id=pd.id, brief_id=brief_d.id, brand_id=lumina.id, creator_id=aria.id,
        message="Aria — Lumina Labs launch week needs a scroll-stopping product ad. "
                "You're our top match at 92%. Interested?",
        status="sent",
    ))
    db.commit()



def _write_seed_deliverable() -> None:
    """Place a tiny placeholder file so the seeded deliverable can be downloaded."""
    from routers.projects import UPLOAD_DIR
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    path = os.path.join(UPLOAD_DIR, "seed_lookbook_final.txt")
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(
                "CreatorAI demo deliverable\n"
                "==========================\n"
                "Spring lookbook — final selects (demo placeholder file).\n"
                "Real projects upload actual media through the UI.\n"
            )


def seed_database(db: Session) -> None:
    """Populate an empty database with demo brands, creators, briefs & projects."""
    brands = _seed_brands(db)
    creators = _seed_creators(db)
    profiles = [p for _, p in creators]
    _seed_portfolios(db, profiles)
    _seed_briefs(db, brands)
    db.flush()
    _seed_workflow(db, brands, profiles)
    _write_seed_deliverable()
    print(
        f"Seeded {len(brands)} brands, {len(profiles)} creators, "
        f"{len(BRIEFS)} briefs and demo projects."
    )


def run_seed_if_empty() -> None:
    """Called at API startup — seeds only when the users table is empty."""
    db = SessionLocal()
    try:
        if db.query(User).first() is None:
            seed_database(db)
    finally:
        db.close()


def run_seed(reset: bool = False) -> None:
    """CLI entry: python seed.py [--reset]"""
    if reset:
        Base.metadata.drop_all(bind=engine)
        print("Dropped all tables.")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).first() is not None and not reset:
            print("Database already seeded — nothing to do. Use --reset to re-seed.")
            return
        if db.query(User).first() is not None and reset:
            db.query(User).delete()
            db.commit()
        seed_database(db)
        print("Done. Demo password for all accounts: " + DEMO_PASSWORD)
    finally:
        db.close()


if __name__ == "__main__":
    run_seed(reset="--reset" in sys.argv)


