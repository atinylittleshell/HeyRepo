# HeyRepo CLI Tool

[![MIT License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![NPM Version](https://img.shields.io/npm/v/heyrepo-cli.svg)](https://www.npmjs.com/package/heyrepo-cli)
[![Build Status](https://github.com/atinylittleshell/HeyRepo/actions/workflows/publish.yml/badge.svg)](https://github.com/atinylittleshell/HeyRepo/actions/workflows/publish.yml)
[![Coverage Status](https://codecov.io/gh/atinylittleshell/HeyRepo/graph/badge.svg?token=6IZ7W3GZ1Z)](https://codecov.io/gh/atinylittleshell/HeyRepo)

HeyRepo is a command-line interface (CLI) tool designed to help you manage tasks within your code repository using the power of AI. It streamlines the process of executing complex tasks by interacting with you in a conversational manner and performing actions within the repo as instructed.

## Key Features

- Utilizes AI to understand and execute tasks within a code repository.
- Integrates with OpenAI's GPT models for natural language interaction.
- Provides a session-based approach to task handling, maintaining conversational context.

## Getting Started

To start using HeyRepo, you'll need Node.js version 16 or above installed on your system. If you don't have Node.js installed, [download and install it from the official website](https://nodejs.org/en).

## Usage

You can run HeyRepo directly using `npx` without installing it globally:

```bash
npx heyrepo-cli please list all TODOs in my project
```

Alternatively, if you prefer having it installed on your system, you can do so globally via npm:

```bash
npm install -g heyrepo-cli
```

After the installation, you can run it using:

```bash
heyrepo please list all TODOs in my project
```

## Session Handling

HeyRepo supports maintaining your conversational context in sessions. This allows for a more interactive experience, letting you give follow-up commands without repeating the context.

Here's an example of continuing an existing session:

```bash
# Start a new task to list all the TODO comments in the project
heyrepo please find all TODO comments

# Continue the session to refine your request further
heyrepo on the same topic, show me only the ones assigned to me
```

In the second command, `heyrepo` maintains the context of the ongoing session related to finding TODO comments, facilitating a continuous workflow.

### Contributions

If you're interested in contributing to HeyRepo, please refer to [CONTRIBUTING.md](./CONTRIBUTING.md).

## Support

If you like HeyRepo and want to support its development, consider [buying the author a coffee](https://www.buymeacoffee.com/onelittleshell).

## License

HeyRepo is available under the MIT License, see [LICENSE](./LICENSE) for more details.

