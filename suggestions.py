#!/usr/bin/env python3
"""AI Writing Suggestions Tool — sparks curiosity and unlocks new angles for your writing."""

import anthropic
import sys

client = anthropic.Anthropic()

SUGGESTION_TYPES = {
    "1": ("hooks", "Compelling opening hooks"),
    "2": ("questions", "Thought-provoking questions to explore"),
    "3": ("angles", "Surprising angles or perspectives"),
    "4": ("metaphors", "Vivid metaphors and analogies"),
    "5": ("what-ifs", "Imagination-igniting 'what if' scenarios"),
    "6": ("all", "All of the above"),
}

SYSTEM_PROMPT = """You are a creative writing coach who specializes in sparking curiosity and
helping writers discover unexpected angles. Your suggestions should feel fresh, surprising,
and intellectually alive — the kind that make a writer lean forward and think "I never considered that."

Avoid clichés. Prefer the specific over the generic, the concrete over the abstract,
and the unexpected over the obvious. Each suggestion should feel like a small doorway
into a larger, more interesting world."""

PROMPTS = {
    "hooks": """Generate 5 compelling opening hooks for writing about: {topic}

Each hook should immediately grab attention in a different way:
- One that starts with a startling fact or statistic
- One that opens with a vivid scene or image
- One that poses a disorienting question
- One that begins with a counterintuitive claim
- One that opens with a personal, specific moment

Keep each hook to 2-3 sentences max. Make them feel alive and urgent.""",

    "questions": """Generate 8 thought-provoking questions a writer could explore about: {topic}

These questions should:
- Challenge assumptions most people hold about this topic
- Point toward tensions, paradoxes, or overlooked dimensions
- Range from the intimate/personal to the cosmic/philosophical
- Make a curious person genuinely want to investigate

Don't ask obvious questions. Find the edges where things get interesting.""",

    "angles": """Generate 6 surprising angles or perspectives for writing about: {topic}

For each angle, briefly explain the lens through which to view the topic and why it's unexpected.
Consider: contrarian views, historical reversals, cross-disciplinary connections,
the view from an unlikely vantage point, or zooming in/out to an unusual scale.

Make each one feel like it could become a genuinely original piece.""",

    "metaphors": """Generate 5 vivid metaphors or analogies for understanding: {topic}

Each metaphor should:
- Come from an unexpected domain (not the obvious ones people already use)
- Illuminate something true and non-obvious about the subject
- Be specific and concrete, not vague and abstract
- Potentially serve as a structural metaphor for an entire piece

Explain briefly why each metaphor works and what it reveals.""",

    "what-ifs": """Generate 6 imagination-igniting 'what if' scenarios related to: {topic}

These should range from the near-plausible to the delightfully speculative.
Each 'what if' should:
- Reveal something real about the topic by changing one key assumption
- Open up interesting consequences worth exploring
- Make the reader see the actual world differently by contrast

Include a one-sentence note on what each scenario reveals about reality.""",

    "all": """Generate a rich set of writing suggestions to spark curiosity about: {topic}

Organize your response into these sections:

## Opening Hooks (3 options)
Brief, attention-grabbing openings using different techniques.

## Questions Worth Exploring (5 questions)
Non-obvious questions that point toward interesting territory.

## Surprising Angles (4 perspectives)
Unexpected lenses through which to view this topic.

## Metaphors & Analogies (3 options)
Vivid comparisons from unexpected domains.

## What-If Scenarios (3 scenarios)
Speculative prompts that illuminate the real by contrast.

Make everything feel alive, specific, and genuinely surprising."""
}


def stream_suggestions(topic: str, suggestion_type: str) -> None:
    prompt_template = PROMPTS[suggestion_type]
    prompt = prompt_template.format(topic=topic)

    print()
    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=2048,
        thinking={"type": "adaptive"},
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}]
    ) as stream:
        for text in stream.text_stream:
            print(text, end="", flush=True)
    print("\n")


def get_topic() -> str:
    print("\nWhat are you writing about?")
    print("(Enter a topic, a partial sentence, or paste some text you've already written)\n")
    print("> ", end="", flush=True)
    topic = sys.stdin.readline().strip()
    if not topic:
        print("Please enter a topic.")
        sys.exit(1)
    return topic


def choose_suggestion_type() -> str:
    print("\nWhat kind of suggestions would you like?\n")
    for key, (slug, label) in SUGGESTION_TYPES.items():
        print(f"  {key}. {label}")
    print()
    print("> ", end="", flush=True)
    choice = sys.stdin.readline().strip()
    if choice not in SUGGESTION_TYPES:
        print(f"Invalid choice. Pick 1-{len(SUGGESTION_TYPES)}.")
        sys.exit(1)
    slug, label = SUGGESTION_TYPES[choice]
    return slug


def main() -> None:
    print("=" * 60)
    print("  AI Writing Suggestions — Spark Your Curiosity")
    print("=" * 60)

    # Support quick invocation: python suggestions.py "my topic"
    if len(sys.argv) > 1:
        topic = " ".join(sys.argv[1:])
        print(f"\nTopic: {topic}")
        suggestion_type = choose_suggestion_type()
    else:
        topic = get_topic()
        suggestion_type = choose_suggestion_type()

    type_label = SUGGESTION_TYPES[[k for k, (s, _) in SUGGESTION_TYPES.items() if s == suggestion_type][0]][1]
    print(f"\nGenerating: {type_label} for \"{topic}\"")
    print("-" * 60)

    stream_suggestions(topic, suggestion_type)

    print("-" * 60)
    print("Run again to explore a different angle.\n")


if __name__ == "__main__":
    main()
