#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
plugin_source="${script_dir}/rollbar.ts"
plugin_destination="${HOME}/.config/amp/plugins/rollbar.ts"
skill_source="${script_dir}/.skills/using-rollbar/SKILL.md"
skill_destination="${HOME}/.config/agents/skills/using-rollbar/SKILL.md"

if [[ ! -f "${plugin_source}" ]]; then
  echo "Plugin source not found: ${plugin_source}" >&2
  exit 1
fi

if [[ ! -f "${skill_source}" ]]; then
  echo "Skill source not found: ${skill_source}" >&2
  exit 1
fi

mkdir -p -- "$(dirname -- "${plugin_destination}")"
install -m 0644 "${plugin_source}" "${plugin_destination}"

mkdir -p -- "$(dirname -- "${skill_destination}")"
install -m 0644 "${skill_source}" "${skill_destination}"

echo "Installed Rollbar plugin to ${plugin_destination}"
echo "Installed Rollbar skill to ${skill_destination}"
echo "Reload plugins and skills in Amp to activate them."
