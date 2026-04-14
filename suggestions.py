#!/usr/bin/env python3
"""AI Writing Suggestions Tool — sparks curiosity and unlocks new angles for your writing."""

import anthropic
import argparse
import sys

client = anthropic.Anthropic()

SUGGESTION_TYPES = {
    "1": ("hooks",     "Compelling opening hooks"),
    "2": ("questions", "Thought-provoking questions to explore"),
    "3": ("angles",    "Surprising angles or perspectives"),
    "4": ("metaphors", "Vivid metaphors and analogies"),
    "5": ("what-ifs",  "Imagination-igniting 'what if' scenarios"),
    "6": ("develop",   "Develop a suggestion further"),
    "7": ("all",       "All of the above"),
}

SLUG_TO_KEY = {slug: key for key, (slug, _) in SUGGESTION_TYPES.items()}

# Stable system prompt — cached on every request so subsequent calls are cheap.
SYSTEM_PROMPT = """You are a creative writing coach who specializes in sparking curiosity and
helping writers discover unexpected angles. Your suggestions should feel fresh, surprising,
and intellectually alive — the kind that make a writer lean forward and think "I never considered that."

Avoid clichés. Prefer the specific over the generic, the concrete over the abstract,
and the unexpected over the obvious. Each suggestion should feel like a small doorway
into a larger, more interesting world."""

PROMPTS = {
    "hooks": """Generate 5 compelling opening hooks for writing about: {topic}

Each hook should grab attention in a different way:
- One that starts with a startling fact or statistic
- One that opens with a vivid scene or image
- One that poses a disorienting question
- One that begins with a counterintuitive claim
- One that opens with a personal, specific moment

Keep each hook to 2–3 sentences max. Make them feel alive and urgent.""",

    "questions": """Generate 8 thought-provoking questions a writer could explore about: {topic}

These questions should:
- Challenge assumptions most people hold about this topic
- Point toward tensions, paradoxes, or overlooked dimensions
- Range from the intimate/personal to the cosmic/philosophical
- Make a curious person genuinely want to investigate

Don't ask obvious questions. Find the edges where things get interesting.""",

    "angles": """Generate 6 surprising angles or perspectives for writing about: {topic}

For each angle, briefly explain the lens and why it's unexpected.
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

    "develop": """The writer is working on: {topic}

They want to develop this idea further into a full piece. Help them by providing:

## The Core Insight
In 2–3 sentences, articulate the single most interesting thing about this topic or idea —
the insight that should drive the whole piece.

## A Structural Approach
Suggest one compelling structure or narrative arc for developing this into a full essay,
article, or story. Be specific about the shape of the piece.

## The Opening Paragraph
Write a full draft opening paragraph that embodies the best hook and angle.
This should be something the writer could actually use or build from.

## Three Things to Research
Specific facts, stories, or examples worth tracking down that would make this piece richer.

## The Ending Question
One resonant question or image to leave the reader with.""",

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

Make everything feel alive, specific, and genuinely surprising.""",
}


def stream_suggestions(topic: str, suggestion_type: str) -> None:
    prompt = PROMPTS[suggestion_type].format(topic=topic)
    print()
    try:
        with client.messages.stream(
            model="claude-opus-4-6",
            max_tokens=2048,
            thinking={"type": "adaptive"},
            system=[{
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }],
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            for text in stream.text_stream:
                print(text, end="", flush=True)
    except anthropic.AuthenticationError:
        print("\nError: Invalid or missing ANTHROPIC_API_KEY.", file=sys.stderr)
        sys.exit(1)
    except anthropic.RateLimitError:
        print("\nError: Rate limit reached. Please wait a moment and try again.", file=sys.stderr)
        sys.exit(1)
    except anthropic.APIConnectionError:
        print("\nError: Could not connect to the Anthropic API. Check your internet connection.", file=sys.stderr)
        sys.exit(1)
    except anthropic.APIStatusError as e:
        print(f"\nAPI error ({e.status_code}): {e.message}", file=sys.stderr)
        sys.exit(1)
    print("\n")


def prompt_input(label: str) -> str:
    print(label, end="", flush=True)
    value = sys.stdin.readline().strip()
    return value


def choose_suggestion_type(exclude_develop: bool = False) -> str:
    print("\nWhat kind of suggestions would you like?\n")
    for key, (slug, label) in SUGGESTION_TYPES.items():
        if exclude_develop and slug == "develop":
            continue
        print(f"  {key}. {label}")
    print()
    choice = prompt_input("> ")
    if choice not in SUGGESTION_TYPES:
        print(f"Invalid choice. Please pick a number from the menu.")
        return choose_suggestion_type(exclude_develop=exclude_develop)
    slug, _ = SUGGESTION_TYPES[choice]
    if exclude_develop and slug == "develop":
        print("Please pick another option first.")
        return choose_suggestion_type(exclude_develop=exclude_develop)
    return slug


def post_run_menu(topic: str) -> tuple[str | None, str | None]:
    """Return (new_topic, suggestion_type) or (None, None) to quit."""
    print("What would you like to do next?\n")
    print("  1. Try a different suggestion type for the same topic")
    print("  2. Develop this topic into a full piece")
    print("  3. Enter a new topic")
    print("  4. Quit")
    print()
    choice = prompt_input("> ")
    if choice == "1":
        return topic, choose_suggestion_type(exclude_develop=True)
    if choice == "2":
        return topic, "develop"
    if choice == "3":
        new_topic = prompt_input("\nWhat are you writing about?\n> ").strip()
        if not new_topic:
            return None, None
        return new_topic, choose_suggestion_type()
    return None, None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="AI Writing Suggestions — spark curiosity for any topic.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="\n".join(
            f"  {slug:<12} {label}"
            for _, (slug, label) in SUGGESTION_TYPES.items()
        ),
    )
    parser.add_argument("topic", nargs="*", help="Topic to generate suggestions for")
    parser.add_argument(
        "-t", "--type",
        choices=[slug for _, (slug, _) in SUGGESTION_TYPES.items()],
        default=None,
        metavar="TYPE",
        help="Suggestion type (see below). Skips the interactive menu.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    print("=" * 60)
    print("  AI Writing Suggestions — Spark Your Curiosity")
    print("=" * 60)

    # Resolve initial topic
    if args.topic:
        topic = " ".join(args.topic)
        print(f"\nTopic: {topic}")
    else:
        print()
        topic = prompt_input(
            "What are you writing about?\n"
            "(A topic, a partial sentence, or text you've already written)\n\n> "
        ).strip()
        if not topic:
            print("Please enter a topic.")
            sys.exit(1)

    # Resolve initial suggestion type
    if args.type:
        suggestion_type = args.type
    else:
        suggestion_type = choose_suggestion_type()

    # Main loop
    while True:
        label = SUGGESTION_TYPES[SLUG_TO_KEY[suggestion_type]][1]
        print(f"\nGenerating: {label} for \"{topic}\"")
        print("-" * 60)

        stream_suggestions(topic, suggestion_type)

        print("-" * 60)

        # Non-interactive mode (CLI args provided): exit after one run
        if args.topic and args.type:
            break

        next_topic, next_type = post_run_menu(topic)
        if next_topic is None:
            print("\nHappy writing.\n")
            break
        topic = next_topic
        suggestion_type = next_type
        print()


if __name__ == "__main__":
    main()
