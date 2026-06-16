/**
 * KONVO™ 3D REAL-TIME VIRTUAL DATES FEATURE
 * src/features/virtual-dates/virtual-dates.js
 *
 * Replaces simulated NPC dates with a real-time, mutual-consent WebSocket date room
 * between matched human users. Syncs environment, coffee clinks, and direct text chat.
 */

import { apiFetch } from '/src/services/api.js';
import { getState } from '/src/store/state.js';
import { KonvoToast } from '/src/components/toast.js';

// ─── Constants & Configuration ──────────────────────────────────────────────────

const VirtualDateScenarios = [
    {
        id: 'future_planning',
        name: 'Future Planning',
        npc: 'Evelyn (Advisor)',
        intro: 'How do you structure your long-term roadmap? Do you prioritize nesting and stability, or rapid career scaling and global nomadism?',
        choices: [
            { text: 'Settle in a vibrant city with local community roots.', outcome: 'You build a stable local support system with rich shared spaces.', insight: 'Nesting & Community. Planning Style: Structured.', delta: 10 },
            { text: 'Embrace a nomadic lifestyle, travel-working globally.', outcome: 'You explore global hubs, adapting to shifting contexts.', insight: 'Career & Nomadism. Planning Style: Spontaneous.', delta: 10 }
        ],
        neuralPrompts: [
            'Where do you see yourself living in five years?',
            'Do you prefer structured routines or highly variable days?',
            'What does stability mean to you in a relationship?'
        ]
    },
    {
        id: 'dream_home',
        name: 'Dream Home Builder',
        npc: 'Marcus (Architect)',
        intro: 'You are designing your ideal shared space. Do you prefer a minimalist smart-home condo in the metropolitan core, or a rustic off-grid cabin?',
        choices: [
            { text: 'A sleek, automated high-rise with skyline views.', outcome: 'You prioritize metropolitan access, high technology, and modern conveniences.', insight: 'Urban Active. Priorities: Access, technology, convenience.', delta: 10 },
            { text: 'A quiet, eco-friendly cabin surrounded by nature.', outcome: 'You focus on peace, sustainability, slow living, and self-reliance.', insight: 'Eco Sanctuary. Priorities: Peace, environment, slow living.', delta: 10 }
        ],
        neuralPrompts: [
            'What room in your house is the most important to you?',
            'Do you enjoy hosting people or keeping your home a private sanctuary?',
            'How clean or organized is your ideal living space?'
        ]
    },
    {
        id: 'weekend_simulation',
        name: 'Weekend Simulation',
        npc: 'Aria (Concierge)',
        intro: 'A free Saturday arises. Do you lock in a detailed itinerary of cultural activities, or turn off alarms and go completely unscheduled?',
        choices: [
            { text: 'A pre-planned cultural tour followed by dining reservations.', outcome: 'You maximize efficiency and ensure entry to high-demand venues.', insight: 'Structured. Planning Style: Curated, high productivity.', delta: 10 },
            { text: 'No alarms, no bookings-just wander and explore organically.', outcome: 'You prioritize surprise discoveries, high flexibility, and relaxed pacing.', insight: 'Fluid. Planning Style: Spontaneous, open to chance.', delta: 10 }
        ],
        neuralPrompts: [
            'What is your perfect Saturday morning routine?',
            'How do you recharge after a high-stress week?',
            'Do you prefer cozy nights in or energetic social outings?'
        ]
    },
    {
        id: 'team_challenges',
        name: 'Team Challenges',
        npc: 'Zara (Founder)',
        intro: 'You are co-organizing a charity event. Do you divide tasks cleanly and check in weekly, or work side-by-side in real-time collaborative sprints?',
        choices: [
            { text: 'Divide tasks by specialty and trust each other to execute.', outcome: 'You optimize for individual focus, checking in on milestone deadlines.', insight: 'Autonomous Work. Cooperation: Specialized, high trust.', delta: 10 },
            { text: 'Work together on everything in real-time sprints.', outcome: 'You build high-touch shared alignment and active joint decision-making.', insight: 'Collaborative Sprints. Cooperation: Combined, real-time.', delta: 10 }
        ],
        neuralPrompts: [
            'Are you a details-oriented person or a big-picture planner?',
            'How do you deal with group projects that go off-track?',
            'Do you prefer leading a project or working as a specialized builder?'
        ]
    },
    {
        id: 'conflict_resolution',
        name: 'Conflict Resolution',
        npc: 'Dax (Mediator)',
        intro: 'You disagree on a major life direction. Do you immediately talk through the friction point, or take personal cool-down space before conversing?',
        choices: [
            { text: 'Address and discuss the friction point immediately.', outcome: 'You process emotions dynamically in real time to reach early resolution.', insight: 'Direct Resolution. Emotional Maturity: Immediate closure.', delta: 10 },
            { text: 'Take a brief quiet period to organize thoughts first.', outcome: 'You step back to process rationally, arriving with calm perspectives.', insight: 'Reflective Resolution. Emotional Maturity: Regulated dialogue.', delta: 10 }
        ],
        neuralPrompts: [
            'How do you know when a conversation has become unproductive?',
            'Do you find it easy or difficult to apologize first?',
            'What is your boundary when dealing with disagreements?'
        ]
    },
    {
        id: 'financial_priorities',
        name: 'Financial Priorities',
        npc: 'Kaelen (Treasurer)',
        intro: 'A major windfall arrives. Do you invest it into aggressive, high-upside financial assets, or secure a protective emergency safety net first?',
        choices: [
            { text: 'Aggressive equity/crypto investments for high-growth potential.', outcome: 'You accept volatility in pursuit of compound growth.', insight: 'Wealth Builder. Risk Profile: High risk, growth-oriented.', delta: 10 },
            { text: 'Secure safety net in cash reserves, treasuries, and real assets.', outcome: 'You secure immediate downside protection and peace of mind.', insight: 'Safety Guard. Risk Profile: Risk averse, security-focused.', delta: 10 }
        ],
        neuralPrompts: [
            'Are you a saver, a builder, or an experience-driven spender?',
            'What is one investment you made that you are proud of?',
            'How do you feel about discussing finances early in relationships?'
        ]
    },
    {
        id: 'life_goals',
        name: 'Life Goals Alignment',
        npc: 'Sora (Guide)',
        intro: 'You are balancing career ambition and nesting priorities. Do you prioritize climbing career milestones or dedicating space for family and lifestyle?',
        choices: [
            { text: 'Prioritize career scaling and personal legacy building.', outcome: 'You chase global opportunities, putting career excellence in focus.', insight: 'Legacy Creator. Priorities: Career ambition, personal achievement.', delta: 10 },
            { text: 'Prioritize family life, lifestyle design, and rich shared hours.', outcome: 'You design hours around nesting, domestic peace, and deep human bonds.', insight: 'Family Aligned. Priorities: Shared life, lifestyle design.', delta: 10 }
        ],
        neuralPrompts: [
            'What does success look like for you in ten years?',
            'Is your work a major part of your identity or a way to fund your life?',
            'How do you balance professional goals with relationship energy?'
        ]
    },
    {
        id: 'social_situations',
        name: 'Social Situations',
        npc: 'Brix (Host)',
        intro: 'You host a weekend gathering. Do you throw an energetic cocktail party for a large circle, or host a quiet, curated dinner for three close friends?',
        choices: [
            { text: 'A dynamic, high-energy party welcoming diverse groups.', outcome: 'You thrive in extroverted circles, building broad network vibes.', insight: 'Extroverted. Social Energy: Broad, high variety.', delta: 10 },
            { text: 'A cozy, intimate dinner focusing on deep conversations.', outcome: 'You foster safe, quiet spaces for concentrated dialogue and trust.', insight: 'Introverted. Social Energy: Deep, curated networks.', delta: 10 }
        ],
        neuralPrompts: [
            'Do you feel recharged or drained after a large party?',
            'How do you meet new people in your day-to-day life?',
            'Who is the most interesting person you have met recently?'
        ]
    },
    {
        id: 'values_discovery',
        name: 'Values Discovery',
        npc: 'Luna (Philosopher)',
        intro: 'You face a complex dilemma. Do you prioritize raw honesty and objective truth, or social harmony and emotional consideration?',
        choices: [
            { text: 'Raw, uncompromising honesty and objective truth.', outcome: 'You build high trust through transparency, avoiding hidden variables.', insight: 'Truth Seeking. Ethics: Objective, direct, radical clarity.', delta: 10 },
            { text: 'Harmony, kindness, and protecting emotional safety.', outcome: 'You prioritize empathy, choosing phrasing that supports peace.', insight: 'Harmony Mindset. Alignment: Empathy and emotional care.', delta: 10 }
        ],
        neuralPrompts: [
            'Is there a time when raw honesty might be counterproductive?',
            'How do you define personal integrity in your life?',
            'What is a core value you will never compromise on?'
        ]
    },
    {
        id: 'communication_analysis',
        name: 'Communication Analysis',
        npc: 'Milo (Linguist)',
        intro: 'When sharing ideas, do you appreciate rapid, critical debate and feedback, or supportive confirmation and encouragement first?',
        choices: [
            { text: 'Direct critical debate to stress-test your thinking.', outcome: 'You engage in active dialectics, testing logic to reach refined systems.', insight: 'Critical Debate. Dialectic Style: Assertive, logic-first.', delta: 10 },
            { text: 'Encouraging support to build safe creative space.', outcome: 'You validate core feelings first, nurturing the confidence to build.', insight: 'Supportive Validation. Dialectic Style: Safe, growth-focused.', delta: 10 }
        ],
        neuralPrompts: [
            'Do you like debating topics for fun, or does it feel stressful?',
            'How do you prefer to receive feedback when working on a project?',
            'What communication style makes you feel shut down?'
        ]
    },
    {
        id: 'travel_planning',
        name: 'Travel Planning',
        npc: 'Talon (Pathfinder)',
        intro: 'You plan an overseas adventure. Do you pack broadly for all contingencies, or fly with a single light carry-on for agility?',
        choices: [
            { text: 'Pack broadly to ensure comfort for any weather or context.', outcome: 'You are prepared for all conditions, valuing security over weather.', insight: 'Preparedness. Priorities: Comfort, contingency backup.', delta: 10 },
            { text: 'Ultralight carry-on packing for maximum travel agility.', outcome: 'You bypass baggage gates and lines, moving with swift adaptability.', insight: 'Ultralight. Priorities: Speed, flexibility, minimal burden.', delta: 10 }
        ],
        neuralPrompts: [
            'What was your most adventurous travel experience?',
            'Do you prefer structured tours or exploring off-the-beaten-path?',
            'What is the first thing you do when arriving in a new country?'
        ]
    },
    {
        id: 'entrepreneurship',
        name: 'Entrepreneurship Ideas',
        npc: 'Vance (Venturer)',
        intro: 'You discuss launching a business. Do you pitch to venture capital for rapid scale, or bootstrap a self-sustaining cash flow asset?',
        choices: [
            { text: 'Pitch to venture capital for hyper-growth and scale.', outcome: 'You secure major leverage, trading equity for accelerated reach.', insight: 'Hyper Scale. Ambition: Venture-backed, high-growth risk.', delta: 10 },
            { text: 'Bootstrap a cash-flow positive lifestyle business.', outcome: 'You retain full control, optimizing for immediate profitability.', insight: 'Independent Builder. Ambition: Organic service, full equity.', delta: 10 }
        ],
        neuralPrompts: [
            'If you could start any business tomorrow, what would it be?',
            'How do you feel about high-stakes risks vs. steady progress?',
            'Do you prefer working inside structured systems or building them?'
        ]
    },
    {
        id: 'lifestyle_decisions',
        name: 'Lifestyle Decisions',
        npc: 'Yuna (Wellness Coach)',
        intro: 'How do you design your daily lifestyle rhythm? Do you choose high-energy career sprints or mindful, slow-paced living routines?',
        choices: [
            { text: 'High-energy career sprints and hyper-focused growth.', outcome: 'You maximize professional output and momentum, living fast-paced.', insight: 'Hustle Mindset. Rhythm: Fast, output-focused, ambitious.', delta: 10 },
            { text: 'Mindful, balanced routines focusing on wellness and slow living.', outcome: 'You protect calm routines, prioritizing grounding practices and pacing.', insight: 'Mindful Slow. Rhythm: Balanced, wellness-first, calm.', delta: 10 }
        ],
        neuralPrompts: [
            'How do you structure your typical morning to feel grounded?',
            'What does self-care look like to you on a busy day?',
            'Do you prefer living in quiet suburbs or buzzing metropolitan areas?'
        ]
    },
    {
        id: 'relationship_expectations',
        name: 'Relationship Expectations',
        npc: 'Orion (Counselor)',
        intro: 'How do you structure relationship bounds? Do you maintain separate spheres of independence, or merge day-to-day schedules deeply?',
        choices: [
            { text: 'Maintain personal hobbies, independent friends, and distinct spheres.', outcome: 'You preserve high individual autonomy, coming together as equals.', insight: 'Interdependent. Bounds: High autonomy, personal growth.', delta: 10 },
            { text: 'Merge daily lives, shared habits, and joint schedules deeply.', outcome: 'You create a unified core, making decisions and experiences together.', insight: 'Merged Lives. Bounds: Deep synergy, high coordination.', delta: 10 }
        ],
        neuralPrompts: [
            'How much alone time do you need to feel comfortable in a relationship?',
            'What is one hobby you love that you prefer doing alone?',
            'What does a perfect shared weekend look like to you?'
        ]
    },
    {
        id: 'shared_goal_building',
        name: 'Shared Goal Building',
        npc: 'Nova (Synthesizer)',
        intro: 'When supporting each other, do you prefer co-creating joint goals, or supporting each other’s separate individual dreams?',
        choices: [
            { text: 'Co-creating shared goals and projects to tackle as a team.', outcome: 'You align your maps to build combined achievements together.', insight: 'Unified Project. Goal Style: Joint creation, team build.', delta: 10 },
            { text: 'Supporting and championing each other\'s individual dreams.', outcome: 'You act as cheerleaders, giving space for personal accomplishments.', insight: 'Dream Supporters. Goal Style: Autonomy, mutual leverage.', delta: 10 }
        ],
        neuralPrompts: [
            'What is one personal dream you are currently working toward?',
            'How can a partner best support you when you are struggling?',
            'Do you like working on projects together or having separate domains?'
        ]
    }
];

const VirtualDateLocations = [
    { id: 'rooftop',     emoji: '🌃', name: 'Rooftop Under City Lights', bg: 'vd-bg-rooftop',    charA: '🧑', charB: '👩' },
    { id: 'cafe',        emoji: '☕', name: 'Midnight Café',             bg: 'vd-bg-cafe',       charA: '🧑', charB: '👩' },
    { id: 'beach',       emoji: '🏖️', name: 'Sunset Beach Walk',          bg: 'vd-bg-beach',      charA: '🧑', charB: '👩' },
    { id: 'bookstore',   emoji: '📚', name: 'Hidden Bookstore',          bg: 'vd-bg-bookstore',  charA: '🧑', charB: '👩' },
    { id: 'lantern',     emoji: '🏮', name: 'Lantern Garden Night',      bg: 'vd-bg-lantern',    charA: '🧑', charB: '👩' },
    { id: 'gallery',     emoji: '🖼️', name: 'Art Gallery Experience',    bg: 'vd-bg-gallery',    charA: '🧑', charB: '👩' },
    { id: 'mountain',    emoji: '🏔️', name: 'Mountain Escape',           bg: 'vd-bg-mountain',   charA: '🧑', charB: '👩' },
    { id: 'music',       emoji: '🎵', name: 'Music Lounge',              bg: 'vd-bg-music',      charA: '🧑', charB: '👩' },
    { id: 'futurecity',  emoji: '🏙️', name: 'Future City Exploration',   bg: 'vd-bg-futurecity', charA: '🧑', charB: '👩' },
    { id: 'observatory', emoji: '🌌', name: 'Stargazing Observatory',    bg: 'vd-bg-observatory',charA: '🧑', charB: '👩' }
];

const DateResponses = {
    positive: [
        "That's so sweet, you actually noticed that?",
        "Okay wait, you're kinda fun to talk to.",
        "No cap, I wasn't expecting tonight to go like this.",
        "You're making this really hard to leave early.",
        "Stop, you're going to make me actually like you.",
        "That's... actually one of the nicest things anyone's said to me.",
        "Okay I take back what I said before, you're actually great.",
        "This place suddenly got way more interesting."
    ],
    neutral: [
        "Hmm... I'll have to think about that one.",
        "That's... an interesting way to look at it.",
        "I don't know, what do you think?",
        "Tell me more, I'm listening.",
        "You know what, I never thought about it like that.",
        "That's a bold thing to say on a first date."
    ],
    negative: [
        "Wait, really? That's a bit much for a first date.",
        "Okay, let's change subjects before this gets weird.",
        "I... yeah I'm not sure how to respond to that.",
        "Is this going the direction I think it's going?",
        "Interesting choice. Points for boldness I guess."
    ],
    greetings: [
        "Oh hi! This place is amazing, right? The view is everything.",
        "I'm so glad you suggested this. I've always wanted to come here.",
        "You actually showed up! I half expected to be stood up.",
        "Hey! You look even better in person, just saying."
    ]
};

function scoreMessage(text) {
    const t = text.toLowerCase();
    const positiveWords = ['beautiful','love','amazing','wow','gorgeous','like you','miss','adore','dream','perfect','great','nice','wonderful','sweet','cute','funny','smart'];
    const negativeWords = ['hate','boring','whatever','leave','bad','ugly','lame','dumb','stupid','annoying','weird'];
    let score = 0;
    positiveWords.forEach(w => { if (t.includes(w)) score += 8; });
    negativeWords.forEach(w => { if (t.includes(w)) score -= 10; });
    if (t.length > 20) score += 3; 
    return Math.max(-15, Math.min(12, score));
}

function getResponse(score, detectedSlang) {
    const GenZPrefixes = [
        "No cap, ",
        "Lowkey, ",
        "Fr, ",
        "Bet, ",
        "That's so valid, ",
        "Real, ",
        "Honestly, "
    ];
    let response = "";
    if (score > 5) response = DateResponses.positive[Math.floor(Math.random() * DateResponses.positive.length)];
    else if (score < -5) response = DateResponses.negative[Math.floor(Math.random() * DateResponses.negative.length)];
    else response = DateResponses.neutral[Math.floor(Math.random() * DateResponses.neutral.length)];

    if (detectedSlang) {
        const prefix = GenZPrefixes[Math.floor(Math.random() * GenZPrefixes.length)];
        response = prefix + response.charAt(0).toLowerCase() + response.slice(1);
    }
    return response;
}

function getThreeJSThemeColors(locationId, theme) {
    const isDark = theme === 'dark';
    
    let platformColor = isDark ? 0x0a0a0f : 0xffffff;
    let platformEmissive = isDark ? 0x050508 : 0xe4e4e7;
    let tableColor = isDark ? 0x18181b : 0xf4f4f5;
    let tableEmissive = isDark ? 0x0c0c0e : 0xe4e4e7;

    let fog = isDark ? 0x080810 : 0xfaf9f6;
    let ambient = isDark ? 0x0d0d18 : 0xe4e4e7;

    switch (locationId) {
        case 'rooftop':
            fog = isDark ? 0x04040a : 0xf0f0f5;
            ambient = isDark ? 0x111124 : 0xe2e8f0;
            break;
        case 'cafe':
            fog = isDark ? 0x080604 : 0xfffaf5;
            ambient = isDark ? 0x271910 : 0xfff2e5;
            break;
        case 'beach':
            fog = isDark ? 0x0e0815 : 0xfff1f2;
            ambient = isDark ? 0x1f112c : 0xffe4e6;
            platformColor = isDark ? 0x0f172a : 0xffffff;
            platformEmissive = isDark ? 0x050810 : 0xe4e4e7;
            break;
        case 'bookstore':
            fog = isDark ? 0x050403 : 0xfefbeb;
            ambient = isDark ? 0x181410 : 0xfef3c7;
            break;
        case 'lantern':
            fog = isDark ? 0x060301 : 0xfff7ed;
            ambient = isDark ? 0x180b06 : 0xffedd5;
            break;
        case 'gallery':
            fog = isDark ? 0x01040a : 0xf0f9ff;
            ambient = isDark ? 0x0b1329 : 0xe0f2fe;
            break;
        case 'mountain':
            fog = isDark ? 0x020308 : 0xf0fdf4;
            ambient = isDark ? 0x054f75 : 0xdcfce7;
            break;
        case 'music':
            fog = isDark ? 0x04010a : 0xfaf5ff;
            ambient = isDark ? 0x1e0736 : 0xf3e8ff;
            break;
        case 'futurecity':
            fog = isDark ? 0x010402 : 0xecfdf5;
            ambient = isDark ? 0x064e3b : 0xd1fae5;
            break;
        case 'observatory':
            fog = isDark ? 0x010104 : 0xeef2ff;
            ambient = isDark ? 0x0a0c1a : 0xe0e7ff;
            break;
    }
    return { fog, ambient, platformColor, platformEmissive, tableColor, tableEmissive };
}

window.updateThreeJSTheme = function(theme) {
    if (!window.threeScene) return;
    const colors = getThreeJSThemeColors(window.currentVdLocationId || 'cafe', theme);
    
    if (window.threeScene.fog) {
        window.threeScene.fog.color.setHex(colors.fog);
    }
    if (window.threeAmbientLight) {
        window.threeAmbientLight.color.setHex(colors.ambient);
        window.threeAmbientLight.intensity = (theme === 'dark') ? 0.5 : 0.85;
    }
    if (window.threePlatformMat) {
        window.threePlatformMat.color.setHex(colors.platformColor);
        window.threePlatformMat.emissive.setHex(colors.platformEmissive);
    }
    if (window.threeTableMat) {
        window.threeTableMat.color.setHex(colors.tableColor);
        window.threeTableMat.emissive.setHex(colors.tableEmissive);
    }
};

// ─── Main Virtual Date Launcher ──────────────────────────────────────────────────

/**
 * showVirtualDateDeviceWarning(onContinue)
 * Shows a popup recommending tablet/laptop for the best virtual date experience.
 * Calls onContinue() when user proceeds.
 */
function showVirtualDateDeviceWarning(onContinue) {
    const isMobile = window.innerWidth < 1024; // Treat phone and small tablets as mobile
    
    // Remove any existing popup
    const existing = document.getElementById('vd-device-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'vd-device-popup';
    popup.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        padding: 1.5rem;
        animation: fadeIn 0.3s ease;
    `;

    const roastTitle = isMobile ? "Tiny Screen Energy Alert! 🚨" : "Elite Screen Energy! 💻";
    const roastEmoji = isMobile ? "💀" : "💅";
    
    let roastText = "";
    if (isMobile) {
        roastText = `
            Wait, are you seriously trying to enter a fully immersive 3D virtual date on a screen the size of a Pop-Tart? 😭<br><br>
            Bestie, squinting at your phone screen like a confused grandma is <strong>not</strong> a vibe. Your digital twin deserves better than being rendered in a microscopic pixel box.<br><br>
            For the actual best experience, go grab a <strong>laptop, iPad, tablet, or PC</strong>. But hey, if you love suffering, feel free to proceed on this tiny brick at your own optical risk!
        `;
    } else {
        roastText = `
            Look at you using a civilized screen! Laptops, iPads, tablets, and PCs are indeed the elite tier for high-fidelity matchmaking.<br><br>
            Thank you for not bringing small-screen energy into this pristine virtual date. You're about to run our full-blown Three.js cognitive simulator in its maximum visual glory.<br><br>
            Get ready to meet your AI Twin compatibility matches without needing a magnifying glass. Let's see if your digital twin actually has game!
        `;
    }

    popup.innerHTML = `
        <div style="
            background: var(--bg-card, #121214);
            border: 1px solid var(--border-color, rgba(255,255,255,0.08));
            border-radius: 24px;
            padding: 2.5rem;
            max-width: 440px;
            width: 100%;
            text-align: center;
            box-shadow: 0 30px 70px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.05);
            animation: slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both;
            position: relative;
            font-family: 'Outfit', sans-serif;
        ">
            <div style="
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #d97706, #14b8a6, #4f46e5);
                border-radius: 24px 24px 0 0;
            "></div>
            
            <div style="font-size: 3.5rem; margin-bottom: 1rem;">${roastEmoji}</div>
            
            <h3 style="
                font-family: 'Outfit', sans-serif;
                font-size: 1.5rem;
                font-weight: 700;
                color: var(--text-primary, #fff);
                margin-bottom: 1rem;
                letter-spacing: -0.02em;
            ">${roastTitle}</h3>

            <div style="
                background: rgba(255, 255, 255, 0.02);
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 14px;
                padding: 1.25rem;
                margin-bottom: 1.75rem;
                font-size: 0.9rem;
                color: var(--text-secondary, rgba(255,255,255,0.7));
                line-height: 1.6;
                text-align: left;
            ">
                ${roastText}
            </div>

            <div style="display:flex;flex-direction:column;gap:0.75rem;">
                <button id="vd-popup-continue" style="
                    padding: 0.9rem 2rem;
                    background: linear-gradient(135deg, #14b8a6, #4f46e5);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.95rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s, filter 0.2s;
                " onmouseover="this.style.transform='scale(1.02)';" onmouseout="this.style.transform='scale(1)';">
                    Enter Virtual Date 🚀
                </button>
                <button id="vd-popup-cancel" style="
                    padding: 0.65rem;
                    background: transparent;
                    color: var(--text-muted, rgba(255,255,255,0.4));
                    border: 1px solid var(--border-color, rgba(255,255,255,0.1));
                    border-radius: 10px;
                    font-size: 0.85rem;
                    cursor: pointer;
                    font-family: 'Outfit', sans-serif;
                    transition: background 0.2s;
                " onmouseover="this.style.background='rgba(255,255,255,0.03)';" onmouseout="this.style.background='transparent';">Abort Mission</button>
            </div>
        </div>
    `;

    document.body.appendChild(popup);

    popup.querySelector('#vd-popup-continue').addEventListener('click', () => {
        popup.style.opacity = '0';
        popup.style.transition = 'opacity 0.25s';
        setTimeout(() => { popup.remove(); onContinue(); }, 250);
    });

    popup.querySelector('#vd-popup-cancel').addEventListener('click', () => {
        popup.style.opacity = '0';
        popup.style.transition = 'opacity 0.25s';
        setTimeout(() => { popup.remove(); }, 250);
    });

    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.style.opacity = '0';
            popup.style.transition = 'opacity 0.25s';
            setTimeout(() => popup.remove(), 250);
        }
    });
}

function extractAvatarUrl(avatarStr) {
    if (!avatarStr) return '';
    const trimmed = avatarStr.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('/')) {
        return trimmed;
    }
    const imgMatch = trimmed.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
        return imgMatch[1];
    }
    if (trimmed.includes('<svg')) {
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(trimmed);
    }
    return '';
}

function getAvatarHtml(avatarStr) {
    if (!avatarStr) return '👤';
    const trimmed = avatarStr.trim();
    if (trimmed.includes('<svg') || trimmed.includes('<img')) {
        return trimmed;
    }
    const url = extractAvatarUrl(trimmed);
    if (url) {
        return `<img src="${url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />`;
    }
    return '👤';
}

async function openVirtualDate(startLocationId = 'rooftop', userData = {}) {
    const currentUser = window.currentUser || getState('currentUser');
    if (!currentUser) {
        KonvoToast.show("Please log in first.", "warning");
        return;
    }

    // Resolve Partner ID
    let partnerId = userData.partnerId || getState('chatPartnerId');
    let partnerName = userData.partnerName || 'Your Match';

    // Verify mutual consent or find an approved match if none selected
    if (!partnerId) {
        try {
            const matches = await apiFetch('/api/agents/simulations');
            const approved = matches.find(m => m.approval_user_a === 'approved' && m.approval_user_b === 'approved');
            if (approved) {
                partnerId = approved.user_a_id === currentUser.id ? approved.user_b_id : approved.user_a_id;
                partnerName = approved.partner_name;
            }
        } catch (err) {
            console.error("Failed to query matches for date:", err);
        }
    }

    if (!partnerId) {
        KonvoToast.show("Please select an approved mutual match from your Chat contacts to start a real-time virtual date.", "warning", 5000);
        return;
    }

    // Fetch user twin avatar & partner twin avatar
    let userAvatarStr = '';
    let partnerAvatarStr = '';

    if (currentUser && currentUser.profile && currentUser.profile.avatar_url) {
        userAvatarStr = currentUser.profile.avatar_url;
    } else {
        try {
            const userTwin = await apiFetch('/api/agents/twin');
            if (userTwin && userTwin.avatar) {
                userAvatarStr = userTwin.avatar;
            }
        } catch (err) {
            console.warn("Failed to fetch user twin avatar:", err);
        }
    }

    try {
        const simulations = await apiFetch('/api/agents/simulations');
        const targetSim = simulations.find(s => s.user_a_id == partnerId || s.user_b_id == partnerId);
        if (targetSim && targetSim.partner_avatar) {
            partnerAvatarStr = targetSim.partner_avatar;
        }
    } catch (err) {
        console.warn("Failed to fetch partner avatar from simulations list:", err);
    }

    const existing = document.getElementById('vd-fullscreen');
    if (existing) existing.remove();

    let currentLocIdx = VirtualDateLocations.findIndex(l => l.id === startLocationId);
    if (currentLocIdx < 0) currentLocIdx = 0;
    
    let dateScore = 50;
    let isThinking = false;
    let animationFrameId = null;
    let particles = [];
    let currentResizeHandler = null;
    let mouseMoveHandler = null;
    let audioCtx = null;
    let cheersActive = false;
    let isMicMuted = true;

    // WebSockets Setup
    const token = localStorage.getItem('konvo_token') || '';
    const sortedIds = [currentUser.id, partnerId].sort((a, b) => a - b);
    const channelName = `vdate_room_${sortedIds[0]}_${sortedIds[1]}`;
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const isLocal = window.location.hostname.includes('localhost') || 
                    window.location.hostname.includes('127.0.0.1') || 
                    window.location.hostname.startsWith('192.168.') || 
                    window.location.hostname.startsWith('10.') || 
                    window.location.hostname.startsWith('172.') || 
                    window.location.hostname.endsWith('.local');
    const wsHost = isLocal ? window.location.host : 'konvo-u5qb.onrender.com';
    const wsUrl = `${wsProto}//${wsHost}/ws/realtime?channel=${channelName}&token=${token}`;
    let socket = null;

    try {
        socket = new WebSocket(wsUrl);
    } catch (wsErr) {
        console.error("Failed to establish real-time date socket:", wsErr);
    }

    const el = document.createElement('div');
    el.id = 'vd-fullscreen';
    el.className = 'virtual-date-fullscreen entering';

    function buildLocationStrip() {
        return VirtualDateLocations.map((loc, i) => {
            return `<button class="vd-loc-btn ${i === currentLocIdx ? 'active' : ''}" data-idx="${i}" title="${loc.name}">${loc.emoji} ${loc.name}</button>`;
        }).join('');
    }

    function render() {
        const loc = VirtualDateLocations[currentLocIdx];
        const userRingHtml = getAvatarHtml(userAvatarStr);
        const partnerRingHtml = getAvatarHtml(partnerAvatarStr);

        el.innerHTML = `
        <div class="vd-bg ${loc.bg}"></div>
        <canvas class="vd-canvas-particles" id="vd-canvas" style="position: absolute; inset: 0; pointer-events: auto; z-index: 1;"></canvas>
        <button class="vd-close-btn" id="vd-close">✕</button>
        
        <!-- HUD Header -->
        <div class="vd-hud">
            <div class="vd-location-name">${loc.emoji} ${loc.name}</div>
            <div style="display:flex; align-items:center; gap:1rem; z-index: 50;">
                <button class="vd-loc-btn" id="btn-toggle-mic" style="border-color:var(--accent-teal);color:var(--accent-teal);font-weight:600;">🎙️ Mic: Muted</button>
                <button class="vd-loc-btn" id="btn-schedule-session" style="border-color:var(--accent-amber);color:var(--accent-amber);font-weight:600;">📅 Schedule Date</button>
                <div class="vd-score-meter">
                    <span>Date Vibe</span>
                    <div class="vd-score-bar"><div class="vd-score-fill" id="vd-score-fill" style="width:${dateScore}%"></div></div>
                    <span id="vd-score-num">${dateScore}%</span>
                </div>
            </div>
        </div>

        <!-- AI Avatars Panel -->
        <div class="vd-avatars-panel">
            <div class="vd-avatar-card">
                <div class="vd-avatar-ring" id="user-avatar-ring">${userRingHtml}</div>
                <div class="vd-avatar-info">
                    <div class="vd-avatar-role">YOU</div>
                    <div class="vd-avatar-mood" id="vd-avatar-mood-user">Calm</div>
                </div>
            </div>
            <div class="vd-avatar-card">
                <div class="vd-avatar-ring pink" id="partner-avatar-ring">${partnerRingHtml}</div>
                <div class="vd-avatar-info">
                    <div class="vd-avatar-role" id="partner-hud-name">${partnerName.toUpperCase()}</div>
                    <div class="vd-avatar-mood" id="vd-avatar-mood-partner">Calm</div>
                </div>
            </div>
        </div>

        <!-- Character Scene -->
        <div class="vd-scene">
            <div class="vd-characters" style="opacity:1; pointer-events:none;">
                <div class="vd-character" id="vd-char-user">
                    <div class="vd-character-avatar" style="background:rgba(79,70,229,0.3);border-color:rgba(79,70,229,0.5);">${loc.charA}</div>
                    <div class="vd-character-name">${currentUser.profile?.display_name || 'You'}</div>
                </div>
                <div class="vd-character" id="vd-char-partner">
                    <div class="vd-character-avatar" style="background:rgba(236,72,153,0.3);border-color:rgba(236,72,153,0.5);">${loc.charB}</div>
                    <div class="vd-character-name" id="partner-scene-name">${partnerName}</div>
                </div>
            </div>
            <div class="vd-speech-bubble left" id="vd-bubble-user"></div>
            <div class="vd-speech-bubble right" id="vd-bubble-partner"></div>
            <div class="vd-speech-bubble" id="vd-bubble-npc" style="bottom: 220px; left: 50%; transform: translateX(-50%) scale(0.9); text-align: center; max-width: 320px; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); pointer-events: none; opacity: 0; z-index: 20;"></div>
        </div>

        <!-- Scheduling Overlay Modal (Inline) -->
        <div id="vd-scheduler-overlay" style="display:none; position:absolute; inset:0; background:rgba(0,0,0,0.8); z-index:100; align-items:center; justify-content:center;">
            <div class="card" style="width:340px; padding:1.5rem; background:var(--bg-card); border:1px solid var(--border-color); text-align:center;">
                <h4 style="font-family:var(--font-serif); margin-top:0;">📅 Schedule Date Session</h4>
                <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:1rem;">Propose a real-world or virtual date coordinate to your match.</p>
                <input type="datetime-local" id="vd-schedule-time" style="width:100%; padding:0.5rem; background:var(--input-bg); color:var(--text-primary); border:1px solid var(--border-color); border-radius:4px; margin-bottom:1rem;">
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn btn-secondary" id="btn-cancel-schedule" style="flex:1;">Cancel</button>
                    <button class="btn btn-primary" id="btn-propose-schedule" style="flex:1.5; color:var(--bg-primary);">Propose</button>
                </div>
            </div>
        </div>

        <!-- Dialogue Input & Neural Prompts Area -->
        <div class="vd-dialogue-area">
            <div class="vd-badge-container" id="vd-badge-container"></div>
            <div class="vd-response-preview" id="vd-response-preview">💬 Connected to real-time date room. Type to start.</div>
            <div class="vd-input-row">
                <input type="text" class="vd-input" id="vd-input" placeholder="Type something to ${partnerName}..." maxlength="200">
                <button class="vd-send-btn" id="vd-send">➤</button>
            </div>
        </div>

        <!-- Location strip at the bottom -->
        <div class="vd-location-strip" id="vd-loc-strip">
            ${buildLocationStrip()}
        </div>`;
    }

    render();
    document.body.appendChild(el);
    initVdParticles(VirtualDateLocations[currentLocIdx].id);

    // ─── WebSocket Event Handling ─────────────────────────────────────────────────

    if (socket) {
        socket.onopen = () => {
            console.log("[Virtual Date WS] Connected to room:", channelName);
            // Broadcast join event
            sendSocketMessage({
                type: "join",
                userId: currentUser.id,
                displayName: currentUser.profile?.display_name || 'You',
                locationIdx: currentLocIdx
            });
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Ignore our own broadcast loops if we have user identity
                if (data.userId === currentUser.id) return;

                if (data.type === "join") {
                    KonvoToast.show(`✨ ${data.displayName || 'Partner'} joined the date!`, "success");
                    // Sync our current location to them
                    sendSocketMessage({
                        type: "sync_response",
                        userId: currentUser.id,
                        locationIdx: currentLocIdx
                    });
                } else if (data.type === "sync_response" || data.type === "location_change") {
                    if (data.locationIdx !== undefined && data.locationIdx !== currentLocIdx) {
                        applyLocationChange(data.locationIdx, false);
                    }
                } else if (data.type === "chat_message") {
                    showBubble('partner', data.text, 4000);
                    const preview = el.querySelector('#vd-response-preview');
                    if (preview) {
                        preview.textContent = `💬 ${partnerName}: ${data.text}`;
                    }
                } else if (data.type === "clink") {
                    triggerCheersClink(false);
                } else if (data.type === "typing") {
                    const preview = el.querySelector('#vd-response-preview');
                    if (preview) {
                        preview.textContent = data.typing ? `💬 ${partnerName} is typing...` : '';
                    }
                } else if (data.type === "mic_status") {
                    const ring = el.querySelector('#partner-avatar-ring');
                    if (ring) {
                        ring.style.borderColor = data.muted ? 'var(--border-color)' : 'var(--accent-teal)';
                    }
                } else if (data.type === "schedule_proposal") {
                    const formattedDate = new Date(data.datetime).toLocaleString();
                    KonvoToast.show(`📅 Partner proposed a scheduled date on: ${formattedDate}!`, "success", 6000);
                }
            } catch (err) {
                console.error("[Virtual Date WS] Message parse failed:", err);
            }
        };
    }

    function sendSocketMessage(payload) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(payload));
        }
    }

    // ─── Interaction & UI Handlers ───────────────────────────────────────────────

    function applyLocationChange(idx, notifyPartner = true) {
        if (idx === currentLocIdx) return;
        currentLocIdx = idx;
        const newBg = VirtualDateLocations[idx].bg;
        
        const bgDiv = el.querySelector('.vd-bg');
        if (bgDiv) {
            bgDiv.style.opacity = '0';
            setTimeout(() => {
                bgDiv.className = `vd-bg ${newBg}`;
                bgDiv.style.opacity = '1';
                
                const hud = el.querySelector('.vd-location-name');
                if (hud) hud.textContent = VirtualDateLocations[idx].emoji + ' ' + VirtualDateLocations[idx].name;
                
                el.querySelectorAll('.vd-loc-btn').forEach((b, i) => {
                    if (b.id !== 'btn-toggle-mic' && b.id !== 'btn-schedule-session') {
                        b.classList.toggle('active', i === idx);
                    }
                });
                initVdParticles(VirtualDateLocations[idx].id);
            }, 400);
        }

        if (notifyPartner) {
            sendSocketMessage({
                type: "location_change",
                userId: currentUser.id,
                locationIdx: idx
            });
            showBubble('partner', `Oh wow, ${VirtualDateLocations[idx].name}? Great choice!`, 3000);
        } else {
            showBubble('partner', `Let's check out ${VirtualDateLocations[idx].name}!`, 3000);
        }
    }

    function triggerCheersClink(notifyPartner = true) {
        if (cheersActive) return;
        cheersActive = true;

        if (audioCtx) {
            try {
                const osc1 = audioCtx.createOscillator();
                const osc2 = audioCtx.createOscillator();
                const cGain = audioCtx.createGain();
                osc1.type = 'sine';
                osc2.type = 'sine';
                osc1.frequency.setValueAtTime(1400, audioCtx.currentTime);
                osc2.frequency.setValueAtTime(2100, audioCtx.currentTime);
                cGain.gain.setValueAtTime(0.12, audioCtx.currentTime);
                cGain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.6);
                
                osc1.connect(cGain);
                osc2.connect(cGain);
                cGain.connect(audioCtx.destination);
                osc1.start();
                osc2.start();
                osc1.stop(audioCtx.currentTime + 0.7);
                osc2.stop(audioCtx.currentTime + 0.7);
            } catch(e) {}
        }

        if (typeof gsap !== 'undefined') {
            gsap.to(avatarA.position, { x: -1.8, y: 2.2, duration: 0.6, yoyo: true, repeat: 1, ease: "power2.out" });
            gsap.to(avatarB.position, { x: 1.8, y: 2.2, duration: 0.6, yoyo: true, repeat: 1, ease: "power2.out", onComplete: () => { cheersActive = false; } });
            gsap.to(avatarA.rotation, { z: -0.25, duration: 0.6, yoyo: true, repeat: 1 });
            gsap.to(avatarB.rotation, { z: 0.25, duration: 0.6, yoyo: true, repeat: 1 });
        } else {
            setTimeout(() => { cheersActive = false; }, 1200);
        }

        showBubble(notifyPartner ? 'user' : 'partner', `*Clinks coffee cup* Cheers! ☕`, 3000);
        updateScore(6);
        KonvoToast.show("Micro Interaction Unlocked: Coffee Cheers! ☕", "success", 3000);

        if (notifyPartner) {
            sendSocketMessage({
                type: "clink",
                userId: currentUser.id
            });
        }
    }

    function sendMessage(text) {
        if (!text.trim()) return;
        const input = el.querySelector('#vd-input');
        if (input) input.value = '';

        showBubble('user', text, 3000);

        // Analyze and adjust vibe score
        const analysis = analyzeMessage(text);
        let scoreDelta = scoreMessage(text);
        if (analysis.detectedSlang) {
            displayBadge('SLANG', analysis.detectedSlang.toUpperCase(), 'slang');
            scoreDelta += 3;
        }
        if (analysis.greenFlag) {
            displayBadge('GREEN FLAG', analysis.greenFlag, 'green');
            scoreDelta += 10;
            KonvoToast.show(`Green Flag: ${analysis.greenFlag}! Compatibility boosted.`, 'success', 3000);
        }
        if (analysis.redFlag) {
            displayBadge('RED FLAG', analysis.redFlag, 'red');
            scoreDelta -= 15;
            KonvoToast.show(`Boundary Check: Red Flag detected (${analysis.redFlag}).`, 'warning', 3000);
        }

        updateScore(scoreDelta);

        // Send to partner via WebSocket
        sendSocketMessage({
            type: "chat_message",
            userId: currentUser.id,
            text: text
        });

        // Trigger typing status false
        sendSocketMessage({
            type: "typing",
            userId: currentUser.id,
            typing: false
        });
    }

    // Parallax mouse movements
    if (typeof gsap !== 'undefined') {
        const bgDiv = el.querySelector('.vd-bg');
        const charsDiv = el.querySelector('.vd-characters');
        
        mouseMoveHandler = (e) => {
            const width = el.clientWidth || window.innerWidth;
            const height = el.clientHeight || window.innerHeight;
            
            const mouseX = (e.clientX / width) * 2 - 1;
            const mouseY = (e.clientY / height) * 2 - 1;
            
            if (bgDiv) {
                gsap.to(bgDiv, { x: mouseX * -20, y: mouseY * -20, duration: 0.8, ease: "power1.out" });
            }
            if (charsDiv) {
                gsap.to(charsDiv, {
                    x: mouseX * 15, y: mouseY * 10,
                    rotationY: mouseX * 12, rotationX: mouseY * -8,
                    transformPerspective: 1000, transformOrigin: "bottom center",
                    duration: 0.8, ease: "power1.out"
                });
            }
        };
        el.addEventListener('mousemove', mouseMoveHandler);
    }

    // Button Binds
    el.addEventListener('click', (e) => {
        if (e.target.id === 'vd-close') {
            el.style.opacity = '0';
            setTimeout(() => {
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                if (currentResizeHandler) window.removeEventListener('resize', currentResizeHandler);
                if (mouseMoveHandler) el.removeEventListener('mousemove', mouseMoveHandler);
                if (audioCtx) {
                    try { audioCtx.close(); } catch (err) {}
                    audioCtx = null;
                }
                if (socket) {
                    try { socket.close(); } catch (err) {}
                }

                // Three.js cleanup
                function cleanScene(obj) {
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) {
                        if (Array.isArray(obj.material)) {
                            obj.material.forEach(m => {
                                if (m.map) m.map.dispose();
                                m.dispose();
                            });
                        } else {
                            if (obj.material.map) obj.material.map.dispose();
                            obj.material.dispose();
                        }
                    }
                    if (obj.children) {
                        obj.children.forEach(child => cleanScene(child));
                    }
                }
                cleanScene(scene);
                if (window.vdRenderer) {
                    try { window.vdRenderer.dispose(); } catch (err) {}
                    window.vdRenderer = null;
                }

                el.remove();
            }, 500);
            return;
        }

        // Toggle Mic Status
        if (e.target.id === 'btn-toggle-mic') {
            isMicMuted = !isMicMuted;
            e.target.textContent = isMicMuted ? '🎙️ Mic: Muted' : '🎙️ Mic: Active';
            e.target.style.borderColor = isMicMuted ? 'var(--accent-teal)' : 'var(--accent-amber)';
            
            // Notify partner
            sendSocketMessage({
                type: "mic_status",
                userId: currentUser.id,
                muted: isMicMuted
            });
            KonvoToast.show(isMicMuted ? "Microphone muted." : "Microphone activated! Syncing voice indicators.", "success");
            return;
        }

        // Schedule Session Modal open
        if (e.target.id === 'btn-schedule-session') {
            const overlay = el.querySelector('#vd-scheduler-overlay');
            if (overlay) overlay.style.display = 'flex';
            return;
        }

        // Propose Schedule
        if (e.target.id === 'btn-propose-schedule') {
            const dateInput = el.querySelector('#vd-schedule-time');
            if (dateInput && dateInput.value) {
                sendSocketMessage({
                    type: "schedule_proposal",
                    userId: currentUser.id,
                    datetime: dateInput.value
                });
                KonvoToast.show("📅 Date proposal transmitted to match!", "success");
                const overlay = el.querySelector('#vd-scheduler-overlay');
                if (overlay) overlay.style.display = 'none';
            } else {
                alert("Please select a date and time first.");
            }
            return;
        }

        // Cancel Schedule
        if (e.target.id === 'btn-cancel-schedule') {
            const overlay = el.querySelector('#vd-scheduler-overlay');
            if (overlay) overlay.style.display = 'none';
            return;
        }

        // Location selection
        const locBtn = e.target.closest('.vd-loc-btn');
        if (locBtn && e.target.id !== 'btn-toggle-mic' && e.target.id !== 'btn-schedule-session') {
            const idx = parseInt(locBtn.dataset.idx);
            if (!isNaN(idx)) applyLocationChange(idx, true);
            return;
        }

        // Send Button
        if (e.target.id === 'vd-send') {
            const input = el.querySelector('#vd-input');
            if (input && input.value.trim()) sendMessage(input.value.trim());
        }
    });

    // Enter Key Bind
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const input = el.querySelector('#vd-input');
            if (input && input.value.trim()) sendMessage(input.value.trim());
        }
    });

    // Typing notifier
    let typingTimer = null;
    el.querySelector('#vd-input')?.addEventListener('input', () => {
        sendSocketMessage({
            type: "typing",
            userId: currentUser.id,
            typing: true
        });
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            sendSocketMessage({
                type: "typing",
                userId: currentUser.id,
                typing: false
            });
        }, 2000);
    });

    // Speech bubble helper
    function showBubble(side, text, duration = 3500) {
        const bubble = el.querySelector(`#vd-bubble-${side}`);
        if (!bubble) return;
        bubble.textContent = text;
        bubble.classList.add('visible');
        const char = el.querySelector(`#vd-char-${side}`);
        if (char) char.classList.add('speaking');
        
        setTimeout(() => {
            bubble.classList.remove('visible');
            if (char) char.classList.remove('speaking');
        }, duration);
    }

    // Score meter updater
    function updateScore(delta) {
        dateScore = Math.max(0, Math.min(100, dateScore + delta));
        const fill = el.querySelector('#vd-score-fill');
        const num = el.querySelector('#vd-score-num');
        if (fill) fill.style.width = dateScore + '%';
        if (num) num.textContent = dateScore + '%';
        
        // Update user moods UI
        const userMoodEl = el.querySelector('#vd-avatar-mood-user');
        const partnerMoodEl = el.querySelector('#vd-avatar-mood-partner');
        if (!userMoodEl || !partnerMoodEl) return;

        let userMood = 'Calm';
        let partnerMood = 'Calm';

        if (dateScore >= 80) {
            userMood = 'Excited';
            partnerMood = 'Excited';
        } else if (dateScore >= 60) {
            userMood = 'Smiling';
            partnerMood = 'Fascinated';
        } else if (dateScore >= 40) {
            userMood = 'Calm';
            partnerMood = 'Calm';
        } else if (dateScore >= 20) {
            userMood = 'Thoughtful';
            partnerMood = 'Pensive';
        } else {
            userMood = 'Concerned';
            partnerMood = 'Distant';
        }

        userMoodEl.textContent = userMood;
        partnerMoodEl.textContent = partnerMood;

        // Update Three.js meshes
        updateMeshMood(avatarA, userMood);
        updateMeshMood(avatarB, partnerMood);
    }

    function updateMeshMood(avatarMesh, mood) {
        if (avatarMesh && avatarMesh.userData && avatarMesh.userData.head) {
            const mat = avatarMesh.userData.head.material;
            if (mat) {
                if (mood === 'Excited') {
                    mat.emissive.setHex(0xec4899); 
                    mat.emissiveIntensity = 0.8;
                } else if (mood === 'Smiling' || mood === 'Fascinated') {
                    mat.emissive.setHex(0x06b6d4); 
                    mat.emissiveIntensity = 0.6;
                } else if (mood === 'Calm') {
                    mat.emissive.setHex(0x10b981); 
                    mat.emissiveIntensity = 0.4;
                } else if (mood === 'Thoughtful' || mood === 'Pensive') {
                    mat.emissive.setHex(0x8b5cf6); 
                    mat.emissiveIntensity = 0.35;
                } else {
                    mat.emissive.setHex(0x6b7280); 
                    mat.emissiveIntensity = 0.15;
                }
                mat.needsUpdate = true;
            }
        }
    }

    function analyzeMessage(text) {
        const t = text.toLowerCase();
        let detectedSlang = null;
        let greenFlag = null;
        let redFlag = null;

        const slangMap = { 'no cap': 'no cap', 'rizz': 'rizz', 'bet': 'bet', 'fr': 'fr', 'slay': 'slay', 'cooked': 'cooked' };
        for (const [key, val] of Object.entries(slangMap)) {
            if (t.includes(key)) { detectedSlang = val; break; }
        }

        const greenFlags = [
            { type: 'Active Listening', keywords: ['what do you think', 'how about you', 'tell me more'] },
            { type: 'Empathy', keywords: ['understand', 'i feel you', 'empathy'] }
        ];
        for (const gf of greenFlags) {
            if (gf.keywords.some(kw => t.includes(kw))) { greenFlag = gf.type; break; }
        }

        const redFlags = [
            { type: 'Aggression', keywords: ['shut up', 'stupid', 'fuck', 'bitch'] }
        ];
        for (const rf of redFlags) {
            if (rf.keywords.some(kw => t.includes(kw))) { redFlag = rf.type; break; }
        }

        return { detectedSlang, greenFlag, redFlag };
    }

    function displayBadge(type, label, className) {
        const container = el.querySelector('#vd-badge-container');
        if (!container) return;

        const badge = document.createElement('div');
        badge.className = `vd-flag-badge ${className}`;
        badge.innerHTML = `${className === 'green' ? '🟢' : (className === 'red' ? '🔴' : '✨')} ${type}: ${label}`;
        container.appendChild(badge);

        setTimeout(() => {
            badge.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            badge.style.opacity = '0';
            badge.style.transform = 'translateY(-5px)';
            setTimeout(() => badge.remove(), 500);
        }, 4000);
    }

    // ─── Three.js 3D Engine Setup ───────────────────────────────────────────────────

    function initVdParticles(locationId) {
        const canvas = el.querySelector('#vd-canvas');
        if (!canvas) return;

        if (window.vdRenderer) {
            try { window.vdRenderer.dispose(); } catch (e) {}
            window.vdRenderer = null;
        }
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (currentResizeHandler) window.removeEventListener('resize', currentResizeHandler);

        // Web Audio Synthesizer init
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            try {
                audioCtx = new AudioContext();
                const filter = audioCtx.createBiquadFilter();
                const gain = audioCtx.createGain();
                gain.gain.setValueAtTime(0.02, audioCtx.currentTime);

                const createNoiseNode = (ctx) => {
                    const bufferSize = 2 * ctx.sampleRate;
                    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                    const output = noiseBuffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
                    const whiteNoise = ctx.createBufferSource();
                    whiteNoise.buffer = noiseBuffer;
                    whiteNoise.loop = true;
                    return whiteNoise;
                };

                if (locationId === 'cafe') {
                    const noise = createNoiseNode(audioCtx);
                    filter.type = 'bandpass';
                    filter.frequency.value = 350;
                    noise.connect(filter);
                    filter.connect(gain);
                    noise.start();
                } else if (locationId === 'beach') {
                    const noise = createNoiseNode(audioCtx);
                    filter.type = 'lowpass';
                    filter.frequency.value = 200;
                    noise.connect(filter);
                    filter.connect(gain);
                    noise.start();
                } else {
                    const osc = audioCtx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.value = 110.0;
                    filter.type = 'lowpass';
                    filter.frequency.value = 150;
                    osc.connect(filter);
                    filter.connect(gain);
                    osc.start();
                }
                gain.connect(audioCtx.destination);
            } catch (e) {
                console.error("Web Audio Synthesizer failed:", e);
            }
        }

        const currentTheme = window.ThemeManager ? window.ThemeManager.getTheme() : 'dark';
        const initialColors = getThreeJSThemeColors(locationId, currentTheme);

        const scene = new THREE.Scene();
        window.threeScene = scene;
        window.currentVdLocationId = locationId;

        const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768;
        scene.fog = new THREE.FogExp2(initialColors.fog, isMobile ? 0.006 : 0.0035);

        const width = el.clientWidth || window.innerWidth;
        const height = el.clientHeight || window.innerHeight;
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        camera.position.set(0, 5, 23);
        camera.lookAt(0, 2.5, 0);

        const renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            alpha: true,
            antialias: !isMobile,
            powerPreference: 'high-performance'
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.2 : 2));
        window.vdRenderer = renderer;

        function resize() {
            const w = el.clientWidth || window.innerWidth;
            const h = el.clientHeight || window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        }
        window.addEventListener('resize', resize);
        currentResizeHandler = resize;

        const envGroup = new THREE.Group();
        scene.add(envGroup);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
        dirLight.position.set(12, 24, 12);
        scene.add(dirLight);

        const ambientLight = new THREE.AmbientLight(initialColors.ambient, currentTheme === 'dark' ? 0.5 : 0.85);
        scene.add(ambientLight);

        const gridHelper = new THREE.GridHelper(50, 40, 0x14b8a6, 0x1f1f2e);
        gridHelper.material.opacity = 0.15;
        gridHelper.material.transparent = true;
        envGroup.add(gridHelper);

        const platformGeo = new THREE.CylinderGeometry(8, 8.5, 0.4, 32);
        const platformMat = new THREE.MeshStandardMaterial({
            color: initialColors.platformColor,
            roughness: 0.2,
            metalness: 0.9,
            emissive: initialColors.platformEmissive
        });
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.position.set(0, -0.2, 0);
        envGroup.add(platform);
        window.threePlatformMat = platformMat;

        const tableGeo = new THREE.CylinderGeometry(1.5, 1.5, 2.2, 24);
        const tableMat = new THREE.MeshStandardMaterial({
            color: initialColors.tableColor,
            roughness: 0.25,
            metalness: 0.7,
            emissive: initialColors.tableEmissive
        });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.set(0, 1.1, 0);
        envGroup.add(table);
        window.threeTableMat = tableMat;

        // Composite Avatar Builder
        function create3DAvatar(roleType, baseColor, emissiveColor, avatarUrl) {
            const group = new THREE.Group();

            const bodyGeo = new THREE.CylinderGeometry(0.5, 0.7, 1.6, 16);
            const bodyMat = new THREE.MeshPhysicalMaterial({
                color: baseColor,
                roughness: 0.1,
                transmission: 0.7,
                thickness: 0.5,
                transparent: true,
                opacity: 0.9
            });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.set(0, 0.8, 0);
            group.add(body);

            const headGeo = new THREE.SphereGeometry(0.7, 32, 32);
            const headMat = new THREE.MeshStandardMaterial({
                color: baseColor,
                roughness: 0.15,
                metalness: 0.8,
                emissive: emissiveColor,
                emissiveIntensity: 0.4
            });

            if (avatarUrl) {
                const textureLoader = new THREE.TextureLoader();
                textureLoader.setCrossOrigin('anonymous');
                textureLoader.load(
                    avatarUrl,
                    (texture) => {
                        console.log(`[Three.js] Successfully loaded avatar texture for ${roleType}`);
                        headMat.map = texture;
                        headMat.color.setHex(0xffffff);
                        headMat.needsUpdate = true;
                    },
                    undefined,
                    (err) => {
                        console.warn(`[Three.js] Failed to load avatar texture for ${roleType}:`, err);
                    }
                );
            }

            const head = new THREE.Mesh(headGeo, headMat);
            head.position.set(0, 2.1, 0);
            group.add(head);

            const eyeGeo = new THREE.SphereGeometry(0.09, 16, 16);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0x060608 });
            
            const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
            eyeL.position.set(-0.2, 2.2, 0.58);
            group.add(eyeL);

            const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
            eyeR.position.set(0.2, 2.2, 0.58);
            group.add(eyeR);

            const handGeo = new THREE.SphereGeometry(0.15, 16, 16);
            const handMat = new THREE.MeshPhysicalMaterial({ color: baseColor, roughness: 0.1, transmission: 0.8 });
            
            const handL = new THREE.Mesh(handGeo, handMat);
            handL.position.set(-1.0, 0.6, 0.2);
            group.add(handL);

            const handR = new THREE.Mesh(handGeo, handMat);
            handR.position.set(1.0, 0.6, 0.2);
            group.add(handR);

            group.userData = {
                role: roleType,
                head: head,
                eyes: [eyeL, eyeR],
                hands: [handL, handR]
            };

            return group;
        }

        avatarA = create3DAvatar('user', 0x06b6d4, 0x0891b2, extractAvatarUrl(userAvatarStr));
        avatarA.position.set(-4.5, 2.4, 0);
        envGroup.add(avatarA);

        avatarB = create3DAvatar('partner', 0xec4899, 0xdb2777, extractAvatarUrl(partnerAvatarStr));
        avatarB.position.set(4.5, 2.4, 0);
        envGroup.add(avatarB);

        // Coffee Cup clink target
        const cupGroup = new THREE.Group();
        cupGroup.position.set(0, 2.2, 0);
        const cupBodyGeo = new THREE.CylinderGeometry(0.25, 0.2, 0.35, 12);
        const cupMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.1, metalness: 0.5 });
        const cupBody = new THREE.Mesh(cupBodyGeo, cupMat);
        cupBody.userData = { interactiveId: 'coffee_cup' };
        cupGroup.add(cupBody);
        envGroup.add(cupGroup);

        const animatedObjects = [];
        let locationColor = 0xffffff;

        // Custom environment items
        if (locationId === 'rooftop') {
            locationColor = 0xfacc15;
            for (let i = 0; i < 20; i++) {
                const bH = 10 + Math.random() * 20;
                const bGeo = new THREE.BoxGeometry(3, bH, 3);
                const bMat = new THREE.MeshStandardMaterial({ color: 0x0a0a16, roughness: 0.5, metalness: 0.8, emissive: 0x111827 });
                const bMesh = new THREE.Mesh(bGeo, bMat);
                bMesh.position.set((Math.random() - 0.5) * 40, bH/2 - 2, -15 - Math.random() * 15);
                envGroup.add(bMesh);
            }
        } else if (locationId === 'cafe') {
            locationColor = 0xd97706;
            const steamGeo = new THREE.BufferGeometry();
            const steamCount = 15;
            const steamPos = new Float32Array(steamCount * 3);
            for (let i = 0; i < steamCount * 3; i += 3) {
                steamPos[i] = (Math.random() - 0.5) * 0.4;
                steamPos[i+1] = 2.2 + Math.random() * 2;
                steamPos[i+2] = (Math.random() - 0.5) * 0.4;
            }
            steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
            const steamMat = new THREE.PointsMaterial({ color: 0xffedd5, size: 0.1, transparent: true, opacity: 0.4 });
            const steamPoints = new THREE.Points(steamGeo, steamMat);
            envGroup.add(steamPoints);
            animatedObjects.push({ mesh: steamPoints, type: 'steam', speed: 0.015, count: steamCount });
        } else if (locationId === 'beach') {
            locationColor = 0xf43f5e;
            const waveGeo = new THREE.PlaneGeometry(60, 60, 10, 10);
            const waveMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, wireframe: true });
            const waveMesh = new THREE.Mesh(waveGeo, waveMat);
            waveMesh.rotation.x = -Math.PI / 2;
            waveMesh.position.set(0, -0.4, -20);
            envGroup.add(waveMesh);
            animatedObjects.push({ mesh: waveMesh, type: 'waves', time: 0 });
        }

        const vibeLight = new THREE.PointLight(locationColor, 1.5, 12);
        vibeLight.position.set(0, 3, 0);
        scene.add(vibeLight);

        // Raycast click
        const raycaster = new THREE.Raycaster();
        const clickMouse = new THREE.Vector2();

        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            clickMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            clickMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(clickMouse, camera);
            const intersects = raycaster.intersectObjects(envGroup.children, true);
            if (intersects.length > 0) {
                const targetObj = intersects[0].object;
                if (targetObj.userData.interactiveId === 'coffee_cup') {
                    triggerCheersClink(true);
                }
            }
        });

        let targetCamX = 0;
        let targetCamY = 5;
        mouseMoveHandler = (e) => {
            const w = el.clientWidth || window.innerWidth;
            const h = el.clientHeight || window.innerHeight;
            const normX = (e.clientX / w) * 2 - 1;
            const normY = (e.clientY / h) * 2 - 1;
            targetCamX = normX * 3.5;
            targetCamY = 5 - normY * 1.8;
        };
        el.addEventListener('mousemove', mouseMoveHandler);

        let animTime = 0;
        function tick() {
            animationFrameId = requestAnimationFrame(tick);
            animTime += 0.01;

            camera.position.x += (targetCamX - camera.position.x) * 0.05;
            camera.position.y += (targetCamY - camera.position.y) * 0.05;
            camera.lookAt(0, 2.3, 0);

            // Floating avatars
            avatarA.position.y = 2.4 + Math.sin(animTime * 1.5) * 0.05;
            avatarB.position.y = 2.4 + Math.cos(animTime * 1.5) * 0.05;

            // Head tracking
            avatarA.userData.head.rotation.y += (targetCamX * 0.15 - avatarA.userData.head.rotation.y) * 0.08;
            avatarB.userData.head.rotation.y += (-0.5 - avatarB.userData.head.rotation.y) * 0.08;

            animatedObjects.forEach(obj => {
                if (obj.type === 'steam') {
                    const pos = obj.mesh.geometry.attributes.position;
                    for (let i = 0; i < obj.count; i++) {
                        let y = pos.getY(i) + obj.speed;
                        if (y > 4.5) y = 2.2 + Math.random() * 0.5;
                        pos.setY(i, y);
                    }
                    pos.needsUpdate = true;
                } else if (obj.type === 'waves') {
                    obj.time += 0.01;
                    const pos = obj.mesh.geometry.attributes.position;
                    for (let i = 0; i < pos.count; i++) {
                        const x = pos.getX(i);
                        const y = pos.getY(i);
                        pos.setZ(i, Math.sin(x * 0.2 + obj.time) * 0.3);
                    }
                    pos.needsUpdate = true;
                }
            });

            vibeLight.intensity = 1.2 + Math.sin(animTime * 2) * 0.2;
            renderer.render(scene, camera);
        }
        tick();
    }

    let avatarA, avatarB; // Global scoped within openVirtualDate context
}

// ─── Compatibility Stubs ─────────────────────────────────────────────────────────

let activeWsChat = null;

function initRatingPopup() {
    const lastRated = localStorage.getItem('konvo_last_rated');
    if (lastRated) {
        const daysSince = (Date.now() - parseInt(lastRated)) / (1000 * 60 * 60 * 24);
        if (daysSince < 30) return;
    }

    setTimeout(() => {
        const popup = document.createElement('div');
        popup.className = 'rating-popup';
        popup.id = 'konvo-rating-popup';
        let selectedStars = 0;

        popup.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem;">
            <div class="rating-popup-title">Enjoying Konvo? ✨</div>
            <button onclick="document.getElementById('konvo-rating-popup').remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1rem;">✕</button>
        </div>
        <div class="rating-popup-sub">You've been here a while! How's your experience so far?</div>
        <div class="star-rating-row" id="popup-star-row">
            <button class="star-btn" data-val="1">⭐</button>
            <button class="star-btn" data-val="2">⭐</button>
            <button class="star-btn" data-val="3">⭐</button>
            <button class="star-btn" data-val="4">⭐</button>
            <button class="star-btn" data-val="5">⭐</button>
        </div>
        <div class="rating-actions">
            <button onclick="document.getElementById('konvo-rating-popup').remove()" style="padding:0.4rem 0.75rem;border-radius:5px;border:1px solid var(--border-color);background:transparent;color:var(--text-secondary);font-family:var(--font-mono);font-size:0.75rem;cursor:pointer;">Later</button>
            <button id="popup-submit-rating" style="padding:0.4rem 0.75rem;border-radius:5px;background:linear-gradient(135deg,#4F46E5,#0D9488);color:white;border:none;font-family:var(--font-mono);font-size:0.75rem;cursor:pointer;">Submit</button>
        </div>`;

        document.body.appendChild(popup);

        popup.querySelector('#popup-star-row').addEventListener('click', (e) => {
            const btn = e.target.closest('.star-btn');
            if (!btn) return;
            selectedStars = parseInt(btn.dataset.val);
            popup.querySelectorAll('.star-btn').forEach((b, i) => {
                b.classList.toggle('active', i < selectedStars);
            });
        });

        popup.querySelector('#popup-submit-rating').addEventListener('click', () => {
            if (!selectedStars) { KonvoToast.show('Please select a star rating!', 'warning'); return; }
            localStorage.setItem('konvo_last_rated', Date.now().toString());
            popup.remove();
            KonvoToast.show(`Thank you for rating Konvo ${selectedStars}⭐ — you're the best!`, 'success', 4000);
        });
    }, 15000);
}

function animateStatCounters() {
    const counters = document.querySelectorAll('[data-count-to]');
    counters.forEach(el => {
        const target = parseInt(el.dataset.countTo);
        const duration = parseInt(el.dataset.countDuration) || 2000;
        const suffix = el.dataset.countSuffix || '';
        const prefix = el.dataset.countPrefix || '';
        let start = null;
        const startVal = 0;

        function step(ts) {
            if (!start) start = ts;
            const progress = Math.min((ts - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(startVal + (target - startVal) * eased);
            el.textContent = prefix + current.toLocaleString() + suffix;
            if (progress < 1) requestAnimationFrame(step);
        }

        const obs = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    requestAnimationFrame(step);
                    obs.unobserve(el);
                }
            });
        }, { threshold: 0.3 });
        obs.observe(el);
    });
}

// ─── Export Global API ───────────────────────────────────────────────────────────

window.openVirtualDate = openVirtualDate;
window.showVirtualDateDeviceWarning = showVirtualDateDeviceWarning;
window.initRatingPopup = initRatingPopup;
window.animateStatCounters = animateStatCounters;

export { openVirtualDate, showVirtualDateDeviceWarning, initRatingPopup, animateStatCounters };
