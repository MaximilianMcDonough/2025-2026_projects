#!/usr/bin/env python3
"""Website generator - scaffolds complete websites from templates."""

import argparse
import os
import shutil
import sys
from pathlib import Path

TEMPLATES_DIR = Path(__file__).parent / "templates"
TEMPLATE_TYPES = ["landing", "portfolio", "blog"]


def render(template_str: str, vars: dict) -> str:
    for key, value in vars.items():
        template_str = template_str.replace(f"{{{{{key}}}}}", value)
    return template_str


def generate_site(template: str, output_dir: str, site_vars: dict):
    src = TEMPLATES_DIR / template
    dest = Path(output_dir)

    if dest.exists():
        print(f"Error: output directory '{dest}' already exists.")
        sys.exit(1)

    dest.mkdir(parents=True)

    for src_file in src.rglob("*"):
        if src_file.is_dir():
            continue
        rel = src_file.relative_to(src)
        dest_file = dest / rel
        dest_file.parent.mkdir(parents=True, exist_ok=True)
        content = src_file.read_text()
        dest_file.write_text(render(content, site_vars))

    print(f"Site generated at: {dest.resolve()}")
    print(f"Template: {template}")
    print(f"Files created:")
    for f in sorted(dest.rglob("*")):
        if f.is_file():
            print(f"  {f.relative_to(dest)}")


def main():
    parser = argparse.ArgumentParser(description="Generate a website from a template.")
    parser.add_argument("template", choices=TEMPLATE_TYPES, help="Template to use")
    parser.add_argument("output", help="Output directory for the generated site")
    parser.add_argument("--title", default="My Website", help="Site title")
    parser.add_argument("--author", default="Your Name", help="Author name")
    parser.add_argument("--description", default="A website.", help="Site description")
    parser.add_argument("--color", default="#2563eb", help="Primary color (hex)")

    args = parser.parse_args()

    site_vars = {
        "TITLE": args.title,
        "AUTHOR": args.author,
        "DESCRIPTION": args.description,
        "COLOR": args.color,
    }

    generate_site(args.template, args.output, site_vars)


if __name__ == "__main__":
    main()
